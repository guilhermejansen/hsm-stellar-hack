import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service";

/**
 * 🔢 TOTP Authentication Guard - Requires TOTP for sensitive actions
 *
 * Used for guardian-specific actions that require additional TOTP verification
 * beyond JWT authentication.
 */
@Injectable()
export class TOTPAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("User not authenticated");
    }

    // Get TOTP code from header
    const totpCode = request.headers["x-totp-code"];
    if (!totpCode) {
      throw new UnauthorizedException("TOTP code required");
    }

    // Verify TOTP
    const action =
      this.reflector.get<string>("totp-action", context.getHandler()) ||
      "general";
    const isValid = await this.authService.verifyTOTP(
      user.userId,
      totpCode,
      action,
    );

    if (!isValid) {
      throw new UnauthorizedException("Invalid TOTP code");
    }

    return true;
  }
}
