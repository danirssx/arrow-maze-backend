// Pattern: Repository, Adapter
import type { Pool } from "pg";
import type { UserRepository } from "../../application/identity/ports/UserRepository.js";
import { User } from "../../domain/identity/User.js";
import type { UserRole } from "../../domain/identity/enums/UserRole.js";
import type { UserStatus } from "../../domain/identity/enums/UserStatus.js";
import { Email } from "../../domain/identity/value-objects/Email.js";
import { PasswordHash } from "../../domain/identity/value-objects/PasswordHash.js";
import type { UserId } from "../../domain/identity/value-objects/UserId.js";
import { UserId as UserIdVO } from "../../domain/identity/value-objects/UserId.js";
import type { Username } from "../../domain/identity/value-objects/Username.js";
import { Username as UsernameVO } from "../../domain/identity/value-objects/Username.js";
import { InfrastructureError } from "../../shared/errors/InfrastructureError.js";

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
    UserIdVO.create(row.id),
    Email.create(row.email),
    UsernameVO.create(row.username),
    PasswordHash.fromHash(row.password_hash),
    row.role as UserRole,
    row.status as UserStatus,
    row.created_at,
    row.updated_at
  );
}

export class PgUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async save(user: User): Promise<void> {
    const query = `
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
      await this.pool.query(query, [
        user.id.getValue(),
        user.email.getValue(),
        user.username.getValue(),
        user.passwordHash.getValue(),
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
      const result = await this.pool.query<UserRow>(
        "SELECT * FROM users WHERE id = $1",
        [id.getValue()]
      );
      return result.rows[0] ? rowToUser(result.rows[0]) : null;
    } catch (err) {
      throw new InfrastructureError("Failed to find user by id", { cause: String(err) });
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    try {
      const result = await this.pool.query<UserRow>(
        "SELECT * FROM users WHERE email = $1",
        [email.getValue()]
      );
      return result.rows[0] ? rowToUser(result.rows[0]) : null;
    } catch (err) {
      throw new InfrastructureError("Failed to find user by email", { cause: String(err) });
    }
  }

  async existsByEmail(email: Email): Promise<boolean> {
    try {
      const result = await this.pool.query<{ exists: boolean }>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) AS exists",
        [email.getValue()]
      );
      return result.rows[0]?.exists ?? false;
    } catch (err) {
      throw new InfrastructureError("Failed to check email existence", { cause: String(err) });
    }
  }

  async existsByUsername(username: Username): Promise<boolean> {
    try {
      const result = await this.pool.query<{ exists: boolean }>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE username = $1) AS exists",
        [username.getValue()]
      );
      return result.rows[0]?.exists ?? false;
    } catch (err) {
      throw new InfrastructureError("Failed to check username existence", { cause: String(err) });
    }
  }
}
