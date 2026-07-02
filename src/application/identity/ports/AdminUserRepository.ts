import type { User } from "../../../domain/identity/User.js";

export type AdminUserPage = {
  users: User[];
  total: number;
};

/**
 * Narrow read port (ISP) for the admin user listing. Kept separate from the write-heavy
 * `UserRepository` so unrelated identity use cases and their fakes stay untouched.
 */
export interface AdminUserRepository {
  /** All users, paginated by offset/limit, ordered by createdAt asc, plus the grand total. */
  findAll(offset: number, limit: number): Promise<AdminUserPage>;
}
