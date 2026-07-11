import { execFileSync } from "node:child_process";

// @s1 — Gemini stays server-side and only behind backend configuration/infrastructure.

function rg(pattern: string): string[] {
  const output = execFileSync("rg", ["-n", pattern, "."], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

describe("daily challenge Gemini boundary", () => {
  it("should_keep_gemini_api_key_references_in_backend_configuration_docs_and_tests_only", () => {
    const matches = rg("GEMINI_API_KEY");

    expect(matches).toEqual(
      expect.arrayContaining([
        expect.stringContaining(".env.example"),
        expect.stringContaining("src/framework/config/environment.ts"),
        expect.stringContaining("tests/framework/environment.test.ts"),
        expect.stringContaining("specs/backend-daily-challenge-MAZ-218.spec.md"),
      ])
    );
    expect(matches.every((line) => !line.includes("src/domain/"))).toBe(true);
    expect(matches.every((line) => !line.includes("src/application/"))).toBe(true);
  });

  it("should_keep_direct_gemini_adapter_inside_backend_infrastructure", () => {
    const matches = rg("GeminiDailyChallengeGenerator");

    expect(matches.some((line) => line.includes("src/infrastructure/daily-challenge/GeminiDailyChallengeGenerator.ts"))).toBe(true);
    expect(matches.some((line) => line.includes("src/framework/app.ts"))).toBe(true);
    expect(matches.every((line) => !line.includes("src/domain/"))).toBe(true);
    expect(matches.every((line) => !line.includes("src/application/"))).toBe(true);
  });
});
