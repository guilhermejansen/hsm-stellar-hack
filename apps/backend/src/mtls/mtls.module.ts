import { Module } from '@nestjs/common';
import { MTLSService } from './mtls.service';

/**
 * 🔒 mTLS Module - Mutual TLS Certificate Management
 * 
 * Features:
 * - Certificate generation
 * - Certificate validation
 * - Expiry monitoring
 * - Certificate revocation
 */
@Module({
  providers: [MTLSService],
  exports: [MTLSService]
})
export class MTLSModule {}
