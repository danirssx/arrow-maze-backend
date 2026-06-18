import { UserFactory } from "../../../domain/identity/UserFactory.js";
import { Email } from "../../../domain/identity/value-objects/Email.js";
import { RawPassword } from "../../../domain/identity/value-objects/RawPassword.js";
import { Username } from "../../../domain/identity/value-objects/Username.js";
import type { UseCase } from "../../aspects/UseCase.js";
import { ConflictError } from "../../../shared/errors/ApplicationError.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";
import type { UserRepository } from "../ports/UserRepository.js";

export type RegisterUserInput = {
  email: string;
  username: string;
  rawPassword: string;
};

export type RegisterUserOutput = {
  userId: string;
};

export class RegisterUserUseCase implements UseCase<RegisterUserInput, RegisterUserOutput> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const email = Email.create(input.email);
    const username = Username.create(input.username);
    const rawPassword = RawPassword.create(input.rawPassword);

    if (await this.userRepository.existsByEmail(email)) {
      throw new ConflictError("Email already registered");
    }

    if (await this.userRepository.existsByUsername(username)) {
      throw new ConflictError("Username already taken");
    }

    const passwordHash = await this.passwordHasher.hash(rawPassword);
    const user = UserFactory.create(email, username, passwordHash);

    await this.userRepository.save(user);

    return { userId: user.id.value };
  }
}
