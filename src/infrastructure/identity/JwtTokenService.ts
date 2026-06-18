// Pattern: Adapter
import jwt from "jsonwebtoken";
import type { TokenPayload, TokenService } from "../../application/identity/ports/TokenService.js";
import { UnauthorizedError } from "../../shared/errors/ApplicationError.js";

export class JwtTokenService implements TokenService {
  constructor(private readonly secret: string) {}

  generate(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: "7d" });
  }

  verify(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
  }
}
