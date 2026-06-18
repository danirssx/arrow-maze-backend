// Pattern: Repository, Adapter
import type { Pool } from "pg";
import type { UserRepository } from "../../application/identity/ports/UserRepository.js";
import { User } from "../../domain/identity/User.js";
import { UserRole } from "../../domain/identity/enums/UserRole.js";
import { UserStatus } from "../../domain/identity/enums/UserStatus.js";
import { Email } from "../../domain/identity/value-objects/Email.js";
import { PasswordHash } from "../../domain/identity/value-objects/PasswordHash.js";
import { Username } from "../../domain/identity/value-objects/Username.js";
import { UserId } from "../../domain/shared/UserId.js";
import { InfrastructureError } from "../../shared/errors/InfrastructureError.js";
import { getQueryRunner } from "../../infrastructure/database/transactionContext.js";
import { parseEnumFromDb } from "../../shared/parseEnum.js";
import type { Email as EmailType } from "../../domain/identity/value-objects/Email.js";
import type { Username as UsernameType } from "../../domain/identity/value-objects/Username.js";

type UserRow = {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};

function rowToUser(row: UserRow): User {
  return User.reconstitute(
    UserId.create(row.id),
    Email.create(row.email),
    Username.create(row.username),
    PasswordHash.fromHash(row.password_hash),
    parseEnumFromDb(UserRole, row.role, 'user role'),
    parseEnumFromDb(UserStatus, row.status, 'user status'),
    row.created_at,
    row.updated_at
  );
}

export class PgUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async save(user: User): Promise<void> {
    const sql = `
      INSERT INTO users (id, email, username, password_hash, role, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE
        SET email         = EXCLUDED.email,
            username      = EXCLUDED.username,
            password_hash = EXCLUDED.password_hash,
            role          = EXCLUDED.role,
            status        = EXCLUDED.status,
            updated_at    = EXCLUDED.updated_at
    `;
    try {
      await getQueryRunner(this.pool).query(sql, [
        user.id.value,
        user.email.value,
        user.username.value,
        user.passwordHash.value,
        user.role,
        user.status,
        user.createdAt,
        user.updatedAt
      ]);
    } catch (err) {
      throw new InfrastructureError("Failed to save user", { cause: String(err) });
    }
  }

  async findById(id: UserId): Promise<User | null> {
    try {
      const result = await getQueryRunner(this.pool).query<UserRow>(
        "SELECT * FROM users WHERE id = $1",
        [id.value]
      );
      return result.rows[0] ? rowToUser(result.rows[0]) : null;
    } catch (err) {
      throw new InfrastructureError("Failed to find user by id", { cause: String(err) });
    }
  }

  async findByEmail(email: EmailType): Promise<User | null> {
    try {
      const result = await getQueryRunner(this.pool).query<UserRow>(
        "SELECT * FROM users WHERE email = $1",
        [email.value]
      );
      return result.rows[0] ? rowToUser(result.rows[0]) : null;
    } catch (err) {
      throw new InfrastructureError("Failed to find user by email", { cause: String(err) });
    }
  }

  async existsByEmail(email: EmailType): Promise<boolean> {
    try {
      const result = await getQueryRunner(this.pool).query<{ exists: boolean }>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) AS exists",
        [email.value]
      );
      return result.rows[0]?.exists ?? false;
    } catch (err) {
      throw new InfrastructureError("Failed to check email existence", { cause: String(err) });
    }
  }

  async existsByUsername(username: UsernameType): Promise<boolean> {
    try {
      const result = await getQueryRunner(this.pool).query<{ exists: boolean }>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE username = $1) AS exists",
        [username.value]
      );
      return result.rows[0]?.exists ?? false;
    } catch (err) {
      throw new InfrastructureError("Failed to check username existence", { cause: String(err) });
    }
  }
}
