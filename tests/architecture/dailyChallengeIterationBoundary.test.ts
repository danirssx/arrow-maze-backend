import { readFileSync } from "node:fs";
import { join } from "node:path";

// Subject to human review — architecture boundary test for MAZ-224 @s12.

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const APPLICATION_ITERATION_FILES = [
  "src/application/daily-challenge/DailyChallengeIterationTypes.ts",
  "src/application/daily-challenge/DailyChallengeIterationErrors.ts",
  "src/application/daily-challenge/use-cases/StartDailyChallengeIterationUseCase.ts",
  "src/application/daily-challenge/use-cases/GetDailyChallengeIterationUseCase.ts",
  "src/application/daily-challenge/ports/DailyChallengeIterationRepository.ts",
  "src/application/daily-challenge/ports/IterationTaskScheduler.ts",
  "src/application/daily-challenge/DailyChallengeGeneration.ts",
];

describe("daily challenge iteration architecture boundary", () => {
  it("should_keep_application_iteration_code_free_of_framework_infrastructure_and_provider_imports", () => {
    for (const file of APPLICATION_ITERATION_FILES) {
      const source = readSource(file);
      expect(source).not.toMatch(/from\s+["'].*infrastructure/);
      expect(source).not.toMatch(/from\s+["'].*framework/);
      expect(source).not.toContain("@prisma/client");
      expect(source).not.toContain("express");
      expect(source).not.toMatch(/@google\/|GoogleGenerativeAI|GEMINI_API_KEY/);
      expect(source).not.toMatch(/process\.env/);
    }
  });

  it("should_keep_generation_pipeline_out_of_transport_controllers_and_routes", () => {
    const controller = readSource(
      "src/framework/daily-challenge/AdminDailyChallengeIterationController.ts"
    );
    const routes = readSource(
      "src/framework/daily-challenge/adminDailyChallengeIterationRoutes.ts"
    );

    expect(controller).not.toMatch(/GeminiDailyChallengeGenerator|DeterministicDailyChallengeGenerator/);
    expect(controller).not.toContain("solvab");
    expect(routes).toContain("requireAdmin");
    expect(routes).toContain("authMiddleware");
  });

  it("should_never_expose_provider_secrets_prompts_or_stack_traces_in_iteration_files", () => {
    // Scoped to MAZ-224 iteration files; the Gemini adapter legitimately handles
    // the API key inside infrastructure and is out of this ticket's scope.
    const iterationFiles = [
      ...APPLICATION_ITERATION_FILES,
      "src/infrastructure/daily-challenge/PrismaDailyChallengeIterationRepository.ts",
      "src/infrastructure/daily-challenge/ImmediateIterationTaskScheduler.ts",
      "src/framework/daily-challenge/AdminDailyChallengeIterationController.ts",
      "src/framework/daily-challenge/adminDailyChallengeIterationRoutes.ts",
    ];

    for (const file of iterationFiles) {
      const text = readSource(file);
      expect(text).not.toMatch(/apiKey\s*[:.]/);
      expect(text).not.toMatch(/prompt\s*[:.]/);
      expect(text).not.toMatch(/\.stack\b/);
      expect(text).not.toContain("GEMINI_API_KEY");
    }
  });
});
