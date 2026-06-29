import { UserId } from "../../../domain/shared/UserId.js";
import { NotFoundError, UnauthorizedError } from "../../../shared/errors/ApplicationError.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { UserRepository } from "../ports/UserRepository.js";

export type GetCurrentUserInput = {
  userId: string;
};

export type GetCurrentUserOutput = {
  userId: string;
  email: string;
  username: string;
  role: string;
};

export class GetCurrentUserUseCase implements UseCase<GetCurrentUserInput, GetCurrentUserOutput> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: GetCurrentUserInput): Promise<GetCurrentUserOutput> {
    let userId: UserId;

    try {
      userId = UserId.create(input.userId);
    } catch {
      // A token whose subject id is not a valid UUID is an authentication
      // problem, not a domain validation error — keep the surface as 401.
      throw new UnauthorizedError("Invalid credentials");
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return {
      userId: user.id.value,
      email: user.email.value,
      username: user.username.value,
      role: user.role,
    };
  }
}
