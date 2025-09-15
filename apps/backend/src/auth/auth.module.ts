import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TOTPAuthGuard } from './totp-auth.guard';

/**
 * 🔐 Authentication Module - JWT + TOTP Security (Global)
 * 
 * Features:
 * - JWT authentication
 * - TOTP verification
 * - Guardian-specific auth
 * - Session management
 * - Security guards
 */
@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '24h')
        }
      }),
      inject: [ConfigService]
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    TOTPAuthGuard
  ],
  exports: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    TOTPAuthGuard
  ]
})
export class AuthModule {}
