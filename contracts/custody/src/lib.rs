#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contractmeta, log,
    Address, Env, Vec, Map, Symbol,
};

// Contract metadata
contractmeta!(
    key = "Description",
    val = "Stellar Custody Multi-Sig Contract (2-of-3) with HSM integration"
);

contractmeta!(
    key = "Version", 
    val = "1.0.0"
);

// ==================== DATA STRUCTURES ====================

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Guardian {
    pub address: Address,
    pub role: Symbol,
    pub is_active: bool,
    pub daily_limit: i128,
    pub monthly_limit: i128,
    pub approval_count: u32,
    pub last_approval: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Transaction {
    pub id: u64,
    pub from_wallet: Address,
    pub to_address: Address,
    pub amount: i128,
    pub memo: Symbol,
    pub tx_type: TxType,
    pub status: TxStatus,
    pub approvals: Vec<Address>,
    pub created_at: u64,
    pub executed_at: Option<u64>,
    pub requires_approval: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct WalletInfo {
    pub address: Address,
    pub wallet_type: WalletType,
    pub balance: i128,
    pub reserved_balance: i128,
    pub is_active: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct SystemLimits {
    pub daily_limit: i128,
    pub monthly_limit: i128,
    pub high_value_threshold: i128,
    pub required_approvals: u32,
    pub cold_wallet_percentage: u32, // 95%
    pub hot_wallet_percentage: u32,  // 5%
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum WalletType {
    Hot,
    Cold,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum TxType {
    Payment,
    Rebalance,
    Withdrawal,
    Emergency,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum TxStatus {
    Pending,
    AwaitingApproval,
    Approved,
    Executed,
    Failed,
    Cancelled,
}

// ==================== STORAGE KEYS ====================

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    // System configuration
    Initialized,
    SystemLimits,
    TransactionCounter,
    
    // Guardians
    Guardians,
    GuardianCount,
    
    // Wallets
    HotWallet,
    ColdWallet,
    WalletInfo(Address),
    
    // Transactions
    Transaction(u64),
    
    // Spending tracking
    DailySpent(u64), // date as key
    MonthlySpent(u64), // year-month as key
    
    // Emergency
    EmergencyMode,
    EmergencyInitiator,
}

// ==================== MAIN CONTRACT ====================

#[contract]
pub struct CustodyContract;

#[contractimpl]
impl CustodyContract {
    
    /// Initialize the contract with 3 guardians and wallet addresses
    pub fn initialize(
        env: Env,
        guardians: Vec<Guardian>,
        hot_wallet: Address,
        cold_wallet: Address,
        system_limits: SystemLimits,
    ) {
        // Check if already initialized
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("Contract already initialized");
        }
        
        // Validate we have exactly 3 guardians
        if guardians.len() != 3 {
            panic!("Must have exactly 3 guardians");
        }
        
        // Validate system limits
        if system_limits.cold_wallet_percentage + system_limits.hot_wallet_percentage != 100 {
            panic!("Wallet percentages must equal 100%");
        }
        
        // Store guardians
        let mut guardians_map: Map<Address, Guardian> = Map::new(&env);
        for guardian in guardians.iter() {
            guardians_map.set(guardian.address.clone(), guardian.clone());
        }
        
        // Initialize storage
        env.storage().instance().set(&DataKey::Guardians, &guardians_map);
        env.storage().instance().set(&DataKey::GuardianCount, &3u32);
        env.storage().instance().set(&DataKey::HotWallet, &hot_wallet);
        env.storage().instance().set(&DataKey::ColdWallet, &cold_wallet);
        env.storage().instance().set(&DataKey::SystemLimits, &system_limits);
        env.storage().instance().set(&DataKey::TransactionCounter, &0u64);
        env.storage().instance().set(&DataKey::EmergencyMode, &false);
        env.storage().instance().set(&DataKey::Initialized, &true);
        
        // Initialize wallet info
        let hot_wallet_info = WalletInfo {
            address: hot_wallet.clone(),
            wallet_type: WalletType::Hot,
            balance: 0,
            reserved_balance: 0,
            is_active: true,
        };
        
        let cold_wallet_info = WalletInfo {
            address: cold_wallet.clone(),
            wallet_type: WalletType::Cold,
            balance: 0,
            reserved_balance: 0,
            is_active: true,
        };
        
        env.storage().instance().set(&DataKey::WalletInfo(hot_wallet), &hot_wallet_info);
        env.storage().instance().set(&DataKey::WalletInfo(cold_wallet), &cold_wallet_info);
        
        log!(&env, "Custody contract initialized with 3 guardians");
    }
    
    /// Create a new transaction
    pub fn create_transaction(
        env: Env,
        from_wallet: Address,
        to_address: Address,
        amount: i128,
        memo: Symbol,
        tx_type: TxType,
    ) -> u64 {
        Self::check_initialized(&env);
        Self::check_emergency_mode(&env);
        
        // Validate amount
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        
        // Get wallet info and check balance
        let wallet_key = DataKey::WalletInfo(from_wallet.clone());
        let mut wallet_info: WalletInfo = env.storage().instance()
            .get(&wallet_key)
            .unwrap_or_else(|| panic!("Wallet not found"));
            
        if wallet_info.balance < amount {
            panic!("Insufficient balance");
        }
        
        // Check if requires approval
        let system_limits: SystemLimits = env.storage().instance().get(&DataKey::SystemLimits).unwrap();
        let requires_approval = amount > system_limits.high_value_threshold || 
                               matches!(wallet_info.wallet_type, WalletType::Cold);
        
        // Check spending limits if requires approval
        if requires_approval {
            Self::check_spending_limits(&env, amount);
        }
        
        // Get transaction counter and increment
        let counter: u64 = env.storage().instance().get(&DataKey::TransactionCounter).unwrap_or(0);
        let tx_id = counter + 1;
        
        // Create transaction
        let transaction = Transaction {
            id: tx_id,
            from_wallet: from_wallet.clone(),
            to_address,
            amount,
            memo,
            tx_type,
            status: if requires_approval { TxStatus::AwaitingApproval } else { TxStatus::Pending },
            approvals: Vec::new(&env),
            created_at: env.ledger().timestamp(),
            executed_at: None,
            requires_approval,
        };
        
        // Reserve balance
        wallet_info.reserved_balance += amount;
        env.storage().instance().set(&wallet_key, &wallet_info);
        
        // Store transaction
        env.storage().instance().set(&DataKey::Transaction(tx_id), &transaction);
        env.storage().instance().set(&DataKey::TransactionCounter, &tx_id);
        
        // If doesn't need approval, execute immediately
        if !requires_approval {
            Self::execute_transaction_internal(&env, tx_id);
        }
        
        log!(&env, "Transaction {} created, requires_approval: {}", tx_id, requires_approval);
        tx_id
    }
    
    /// Guardian approves a transaction
    pub fn approve_transaction(
        env: Env,
        guardian: Address,
        tx_id: u64,
    ) -> bool {
        guardian.require_auth();
        
        Self::check_initialized(&env);
        Self::check_emergency_mode(&env);
        
        // Check if guardian exists and is active
        let guardians: Map<Address, Guardian> = env.storage().instance()
            .get(&DataKey::Guardians)
            .unwrap_or_else(|| panic!("Contract not initialized"));
            
        let mut guardian_info = guardians.get(guardian.clone()).unwrap_or_else(|| panic!("Not a guardian"));
        
        if !guardian_info.is_active {
            panic!("Guardian not active");
        }
        
        // Get transaction
        let tx_key = DataKey::Transaction(tx_id);
        let mut transaction: Transaction = env.storage().instance()
            .get(&tx_key)
            .unwrap_or_else(|| panic!("Transaction not found"));
            
        // Check if already approved by this guardian
        if transaction.approvals.contains(&guardian) {
            panic!("Already approved");
        }
        
        // Check if transaction is in correct status
        if !matches!(transaction.status, TxStatus::AwaitingApproval) {
            panic!("Transaction not awaiting approval");
        }
        
        // Add approval
        transaction.approvals.push_back(guardian.clone());
        
        // Update guardian stats
        guardian_info.approval_count += 1;
        guardian_info.last_approval = env.ledger().timestamp();
        
        // Check if we have enough approvals
        let system_limits: SystemLimits = env.storage().instance().get(&DataKey::SystemLimits).unwrap();
        let has_enough_approvals = transaction.approvals.len() >= system_limits.required_approvals;
        
        if has_enough_approvals {
            transaction.status = TxStatus::Approved;
            Self::execute_transaction_internal(&env, tx_id);
        }
        
        // Update storage
        env.storage().instance().set(&tx_key, &transaction);
        
        let mut updated_guardians = guardians;
        updated_guardians.set(guardian.clone(), guardian_info);
        env.storage().instance().set(&DataKey::Guardians, &updated_guardians);
        
        log!(&env, "Transaction {} approved by guardian, total approvals: {}", 
             tx_id, transaction.approvals.len());
             
        has_enough_approvals
    }
    
    /// Get transaction details
    pub fn get_transaction(env: Env, tx_id: u64) -> Option<Transaction> {
        env.storage().instance().get(&DataKey::Transaction(tx_id))
    }
    
    /// Get guardian information
    pub fn get_guardian(env: Env, guardian_address: Address) -> Option<Guardian> {
        let guardians: Option<Map<Address, Guardian>> = env.storage().instance().get(&DataKey::Guardians);
        guardians?.get(guardian_address.clone())
    }
    
    /// Get wallet balance
    pub fn get_wallet_balance(env: Env, wallet_address: Address) -> Option<i128> {
        let wallet_info: Option<WalletInfo> = env.storage().instance()
            .get(&DataKey::WalletInfo(wallet_address));
        wallet_info.map(|w| w.balance)
    }
    
    /// Get hot wallet balance
    pub fn get_hot_balance(env: Env) -> i128 {
        let hot_wallet: Address = env.storage().instance().get(&DataKey::HotWallet).unwrap();
        Self::get_wallet_balance(env, hot_wallet).unwrap_or(0)
    }
    
    /// Get cold wallet balance
    pub fn get_cold_balance(env: Env) -> i128 {
        let cold_wallet: Address = env.storage().instance().get(&DataKey::ColdWallet).unwrap();
        Self::get_wallet_balance(env, cold_wallet).unwrap_or(0)
    }
    
    /// Emergency shutdown
    pub fn emergency_shutdown(env: Env, guardian: Address) {
        guardian.require_auth();
        
        Self::check_initialized(&env);
        
        // Verify guardian
        let guardians: Map<Address, Guardian> = env.storage().instance()
            .get(&DataKey::Guardians)
            .unwrap_or_else(|| panic!("Contract not initialized"));
        
        let guardian_info = guardians.get(guardian.clone()).unwrap_or_else(|| panic!("Not a guardian"));
        if !guardian_info.is_active {
            panic!("Guardian not active");
        }
        
        // Activate emergency mode
        env.storage().instance().set(&DataKey::EmergencyMode, &true);
        env.storage().instance().set(&DataKey::EmergencyInitiator, &guardian);
        
        log!(&env, "Emergency shutdown activated by guardian");
    }
    
    /// Get system info
    pub fn get_system_limits(env: Env) -> SystemLimits {
        env.storage().instance().get(&DataKey::SystemLimits).unwrap()
    }
    
    /// Check if emergency mode is active
    pub fn is_emergency_mode(env: Env) -> bool {
        env.storage().instance().get(&DataKey::EmergencyMode).unwrap_or(false)
    }
    
    /// Get transaction counter
    pub fn get_transaction_counter(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TransactionCounter).unwrap_or(0)
    }
    
    // ==================== INTERNAL FUNCTIONS ====================
    
    fn execute_transaction_internal(env: &Env, tx_id: u64) {
        let tx_key = DataKey::Transaction(tx_id);
        let mut transaction: Transaction = env.storage().instance()
            .get(&tx_key)
            .unwrap_or_else(|| panic!("Transaction not found"));
        
        // Update wallet balances
        let from_wallet_key = DataKey::WalletInfo(transaction.from_wallet.clone());
        let mut from_wallet: WalletInfo = env.storage().instance()
            .get(&from_wallet_key)
            .unwrap_or_else(|| panic!("Wallet not found"));
        
        // Execute the transfer
        from_wallet.balance -= transaction.amount;
        from_wallet.reserved_balance -= transaction.amount;
        
        // Update transaction status
        transaction.status = TxStatus::Executed;
        transaction.executed_at = Some(env.ledger().timestamp());
        
        // Update spending tracking
        Self::update_spending_tracking(env, transaction.amount);
        
        // Store updates
        env.storage().instance().set(&from_wallet_key, &from_wallet);
        env.storage().instance().set(&tx_key, &transaction);
        
        log!(env, "Transaction {} executed successfully", tx_id);
    }
    
    fn check_initialized(env: &Env) {
        if !env.storage().instance().has(&DataKey::Initialized) {
            panic!("Contract not initialized");
        }
    }
    
    fn check_emergency_mode(env: &Env) {
        let emergency_mode: bool = env.storage().instance()
            .get(&DataKey::EmergencyMode)
            .unwrap_or(false);
            
        if emergency_mode {
            panic!("Emergency mode active");
        }
    }
    
    fn check_spending_limits(env: &Env, amount: i128) {
        let system_limits: SystemLimits = env.storage().instance().get(&DataKey::SystemLimits).unwrap();
        
        // Check daily limit
        let today = env.ledger().timestamp() / 86400; // Convert to days
        let daily_spent: i128 = env.storage().instance()
            .get(&DataKey::DailySpent(today))
            .unwrap_or(0);
            
        if daily_spent + amount > system_limits.daily_limit {
            panic!("Exceeds daily limit");
        }
        
        // Check monthly limit
        let current_month = today / 30; // Approximate month
        let monthly_spent: i128 = env.storage().instance()
            .get(&DataKey::MonthlySpent(current_month))
            .unwrap_or(0);
            
        if monthly_spent + amount > system_limits.monthly_limit {
            panic!("Exceeds monthly limit");
        }
    }
    
    fn update_spending_tracking(env: &Env, amount: i128) {
        let today = env.ledger().timestamp() / 86400;
        let current_month = today / 30;
        
        // Update daily spending
        let daily_spent: i128 = env.storage().instance()
            .get(&DataKey::DailySpent(today))
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::DailySpent(today), &(daily_spent + amount));
        
        // Update monthly spending
        let monthly_spent: i128 = env.storage().instance()
            .get(&DataKey::MonthlySpent(current_month))
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::MonthlySpent(current_month), &(monthly_spent + amount));
    }
}

// ==================== TESTS ====================

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, Vec};
    
    fn create_test_guardians(env: &Env) -> Vec<Guardian> {
        let mut guardians = Vec::new(env);
        guardians.push_back(Guardian {
            address: Address::generate(env),
            role: Symbol::new(env, "CEO"),
            is_active: true,
            daily_limit: 100000,
            monthly_limit: 1000000,
            approval_count: 0,
            last_approval: 0,
        });
        guardians.push_back(Guardian {
            address: Address::generate(env),
            role: Symbol::new(env, "CFO"),
            is_active: true,
            daily_limit: 100000,
            monthly_limit: 1000000,
            approval_count: 0,
            last_approval: 0,
        });
        guardians.push_back(Guardian {
            address: Address::generate(env),
            role: Symbol::new(env, "CTO"),
            is_active: true,
            daily_limit: 100000,
            monthly_limit: 1000000,
            approval_count: 0,
            last_approval: 0,
        });
        guardians
    }
    
    fn create_test_system_limits() -> SystemLimits {
        SystemLimits {
            daily_limit: 100000,
            monthly_limit: 1000000,
            high_value_threshold: 1000,
            required_approvals: 2,
            cold_wallet_percentage: 95,
            hot_wallet_percentage: 5,
        }
    }
    
    #[test]
    fn test_initialize_contract() {
        let env = Env::default();
        let contract_id = env.register(CustodyContract, ());
        let client = CustodyContractClient::new(&env, &contract_id);
        
        let guardians = create_test_guardians(&env);
        let hot_wallet = Address::generate(&env);
        let cold_wallet = Address::generate(&env);
        let system_limits = create_test_system_limits();
        
        client.initialize(
            &guardians,
            &hot_wallet,
            &cold_wallet,
            &system_limits,
        );
        
        // Test that contract is initialized
        let first_guardian = guardians.get(0).unwrap();
        let guardian_count = client.get_guardian(&first_guardian.address);
        assert!(guardian_count.is_some());
    }
    
    #[test]
    fn test_create_transaction() {
        let env = Env::default();
        let contract_id = env.register(CustodyContract, ());
        let client = CustodyContractClient::new(&env, &contract_id);
        
        let guardians = create_test_guardians(&env);
        let hot_wallet = Address::generate(&env);
        let cold_wallet = Address::generate(&env);
        let system_limits = create_test_system_limits();
        
        // Initialize
        client.initialize(
            &guardians,
            &hot_wallet,
            &cold_wallet,
            &system_limits,
        );
        
        // Add some balance to hot wallet for testing (simulate funding)
        let hot_wallet_key = DataKey::WalletInfo(hot_wallet.clone());
        let hot_wallet_info = WalletInfo {
            address: hot_wallet.clone(),
            wallet_type: WalletType::Hot,
            balance: 10000, // Add sufficient balance
            reserved_balance: 0,
            is_active: true,
        };
        env.as_contract(&contract_id, || {
            env.storage().instance().set(&hot_wallet_key, &hot_wallet_info);
        });
        
        // Create transaction
        let to_address = Address::generate(&env);
        let amount = 500i128; // Below threshold
        let memo = Symbol::new(&env, "test_tx");
        
        let tx_id = client.create_transaction(
            &hot_wallet,
            &to_address,
            &amount,
            &memo,
            &TxType::Payment,
        );
        
        assert_eq!(tx_id, 1);
        
        // Check transaction exists
        let transaction = client.get_transaction(&tx_id);
        assert!(transaction.is_some());
    }
    
    #[test]
    fn test_system_queries() {
        let env = Env::default();
        let contract_id = env.register(CustodyContract, ());
        let client = CustodyContractClient::new(&env, &contract_id);
        
        let guardians = create_test_guardians(&env);
        let hot_wallet = Address::generate(&env);
        let cold_wallet = Address::generate(&env);
        let system_limits = create_test_system_limits();
        
        // Initialize
        client.initialize(
            &guardians,
            &hot_wallet,
            &cold_wallet,
            &system_limits,
        );
        
        // Test query functions
        assert_eq!(client.get_transaction_counter(), 0);
        assert!(!client.is_emergency_mode());
        assert_eq!(client.get_hot_balance(), 0);
        assert_eq!(client.get_cold_balance(), 0);
        
        let limits = client.get_system_limits();
        assert_eq!(limits.required_approvals, 2);
    }
}