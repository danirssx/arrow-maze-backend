import type { UserRole } from "../../../domain/identity/enums/UserRole.js";

export type TokenPayload = {
  userId: string;
  role: UserRole;
};

export interface TokenService {
  generate(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
