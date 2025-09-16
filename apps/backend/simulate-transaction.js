/**
 * Script to simulate transaction execution for Stellar Explorer demo
 * 
 * This script updates a transaction with a mock Stellar hash to demonstrate
 * the Stellar Explorer integration functionality.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function simulateTransactionExecution(transactionId) {
  try {
    console.log(`🔄 Simulating execution for transaction: ${transactionId}`);
    
    // Generate a mock Stellar hash for demonstration
    const mockStellarHash = `stellar_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'SUCCESS',
        stellarHash: mockStellarHash,
        executedAt: new Date(),
        requiredApprovals: 0,
      },
    });

    console.log('✅ Transaction execution simulated successfully!');
    console.log(`📊 Transaction ID: ${updatedTransaction.id}`);
    console.log(`🔗 Stellar Hash: ${updatedTransaction.stellarHash}`);
    console.log(`⏰ Executed At: ${updatedTransaction.executedAt}`);
    console.log(`🌐 Stellar Expert URL: https://stellar.expert/explorer/testnet/tx/${updatedTransaction.stellarHash}`);
    console.log(`🧪 Stellar Lab URL: https://laboratory.stellar.org/#explorer?resource=transactions&endpoint=testnet&values=${updatedTransaction.stellarHash}`);
    
    return updatedTransaction;
  } catch (error) {
    console.error('❌ Error simulating transaction execution:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get transaction ID from command line arguments
const transactionId = process.argv[2];

if (!transactionId) {
  console.error('❌ Please provide a transaction ID as an argument');
  console.log('Usage: node scripts/simulate-transaction.js <transaction-id>');
  process.exit(1);
}

simulateTransactionExecution(transactionId)
  .then(() => {
    console.log('🎉 Demo transaction ready! You can now test the Stellar Explorer links.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });
