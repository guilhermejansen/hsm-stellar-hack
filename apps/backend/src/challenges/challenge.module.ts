import { Module } from '@nestjs/common';
import { ChallengeService } from './challenge.service';

/**
 * 🎯 Challenge Module - OCRA-like Challenge-Response System
 * 
 * Features:
 * - Transaction-specific challenges
 * - TOTP + contextual secret validation
 * - Redis-based challenge storage
 * - Automatic expiry (5 minutes)
 * - Replay protection
 */
@Module({
  providers: [ChallengeService],
  exports: [ChallengeService]
})
export class ChallengeModule {}
