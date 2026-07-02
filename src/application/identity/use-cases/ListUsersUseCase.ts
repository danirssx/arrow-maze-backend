import type { UseCase } from "../../aspects/UseCase.js";
import type { AdminUserRepository } from "../ports/AdminUserRepository.js";

export type ListUsersInput = { page: number; limit: number };

export type AdminUserDto = {
  userId: string;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: Date;
};

export type ListUsersOutput = {
  users: AdminUserDto[];
  page: number;
  limit: number;
  total: number;
};

/**
 * Admin read: a paginated user list. The DTO deliberately omits `passwordHash`.
 * Authorization is the coarse `requireAdmin` route gate (MAZ-195); this is a pure query.
 */
export class ListUsersUseCase implements UseCase<ListUsersInput, ListUsersOutput> {
  constructor(private readonly repo: AdminUserRepository) {}

  async execute(input: ListUsersInput): Promise<ListUsersOutput> {
    const offset = (input.page - 1) * input.limit;
    const { users, total } = await this.repo.findAll(offset, input.limit);
    return {
      users: users.map((u) => ({
        userId: u.id.value,
        email: u.email.value,
        username: u.username.value,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      })),
      page: input.page,
      limit: input.limit,
      total,
    };
  }
}
