// Pattern: Adapter
import jwt, { type SignOptions } from "jsonwebtoken";
import type { TokenPayload, TokenService } from "../../application/identity/ports/TokenService.js";
import { UnauthorizedError } from "../../shared/errors/ApplicationError.js";

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly accessExpiresIn: string | number = "15m",
  ) {}

  generate(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.accessExpiresIn as NonNullable<SignOptions["expiresIn"]>,
    });
  }

  verify(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
  }
}
