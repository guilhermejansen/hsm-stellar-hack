import { Injectable, Logger } from '@nestjs/common';
import { StrKey } from '@stellar/stellar-sdk';

/**
 * ✅ Validation Service - Input validation and security checks
 * 
 * Following security-practices.mdc validation requirements
 */
@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  /**
   * Validate Stellar address format
   */
  isValidStellarAddress(address: string): boolean {
    try {
      return StrKey.isValidEd25519PublicKey(address);
    } catch {
      return false;
    }
  }

  /**
   * Validate Stellar secret key format
   */
  isValidStellarSecret(secret: string): boolean {
    try {
      return StrKey.isValidEd25519SecretSeed(secret);
    } catch {
      return false;
    }
  }

  /**
   * Validate XLM amount format and limits
   */
  isValidAmount(amount: string, maxAmount?: number): boolean {
    try {
      const numAmount = parseFloat(amount);
      
      // Check format (max 7 decimal places)
      if (!/^\d+(\.\d{1,7})?$/.test(amount)) {
        return false;
      }
      
      // Check positive
      if (numAmount <= 0) {
        return false;
      }
      
      // Check maximum if provided
      if (maxAmount && numAmount > maxAmount) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate TOTP code format
   */
  isValidTOTPCode(code: string): boolean {
    return /^[0-9]{6}$/.test(code);
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }

  /**
   * Validate BIP32 derivation path
   */
  isValidDerivationPath(path: string): boolean {
    return /^m(\/\d+'?)*$/.test(path);
  }

  /**
   * Sanitize input for security
   */
  sanitizeInput(input: string): string {
    return input.replace(/[^\w\s@.-]/g, '').trim();
  }

  /**
   * Validate memo text
   */
  isValidMemo(memo: string): boolean {
    if (!memo) return true;
    return memo.length <= 28 && /^[a-zA-Z0-9\s]*$/.test(memo);
  }
}
