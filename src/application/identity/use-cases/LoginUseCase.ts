import { Email } from "../../../domain/identity/value-objects/Email.js";
import { RawPassword } from "../../../domain/identity/value-objects/RawPassword.js";
import type { UseCase } from "../../aspects/UseCase.js";
import { ForbiddenError, UnauthorizedError } from "../../../shared/errors/ApplicationError.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";
import type { TokenService } from "../ports/TokenService.js";
import type { UserRepository } from "../ports/UserRepository.js";

export type LoginInput = {
  email: string;
  rawPassword: string;
};

export type LoginOutput = {
  accessToken: string;
  userId: string;
  username: string;
  role: string;
};

export class LoginUseCase implements UseCase<LoginInput, LoginOutput> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    let email: Email;
    let rawPassword: RawPassword;

    try {
      email = Email.create(input.email);
      rawPassword = RawPassword.create(input.rawPassword);
    } catch {
      throw new UnauthorizedError("Invalid credentials");
    }

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const isValid = await this.passwordHasher.verify(rawPassword, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!user.isActive) {
      throw new ForbiddenError("Account is suspended");
    }

    const accessToken = this.tokenService.generate({
      userId: user.id.value,
      role: user.role
    });

    return {
      accessToken,
      userId: user.id.value,
      username: user.username.value,
      role: user.role
    };
  }
}
