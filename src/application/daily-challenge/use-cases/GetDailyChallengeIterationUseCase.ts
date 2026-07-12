import type { UseCase } from "../../aspects/UseCase.js";
import { DailyChallengeIterationNotFoundError } from "../DailyChallengeIterationErrors.js";
import type { DailyChallengeIterationDto } from "../DailyChallengeIterationTypes.js";
import type { DailyChallengeIterationRepository } from "../ports/DailyChallengeIterationRepository.js";

export type GetDailyChallengeIterationInput = { readonly operationId: string };
export type GetDailyChallengeIterationOutput = {
  readonly operation: DailyChallengeIterationDto;
};

/**
 * Reads a single admin manual iteration operation so the admin dashboard can
 * poll its ordered, sanitized event log until the operation reaches a terminal
 * status. Unknown operations raise a sanitized not-found error.
 */
export class GetDailyChallengeIterationUseCase
  implements
    UseCase<GetDailyChallengeIterationInput, GetDailyChallengeIterationOutput>
{
  constructor(private readonly iterations: DailyChallengeIterationRepository) {}

  async execute(
    input: GetDailyChallengeIterationInput
  ): Promise<GetDailyChallengeIterationOutput> {
    const operation = await this.iterations.findById(input.operationId);
    if (operation === null) {
      throw new DailyChallengeIterationNotFoundError();
    }
    return { operation };
  }
}
