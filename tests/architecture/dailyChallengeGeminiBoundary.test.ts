import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// @s1 — Gemini stays server-side and only behind backend configuration/infrastructure.

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".stryker-tmp",
  "coverage",
  "dist",
  "node_modules",
  "reports",
]);

const SEARCHABLE_EXTENSIONS = new Set([
  ".example",
  ".json",
  ".md",
  ".prisma",
  ".sql",
  ".ts",
]);

function projectMatches(pattern: string): string[] {
  const root = process.cwd();
  const matches: string[] = [];
  visit(root);
  return matches;

  function visit(directory: string): void {
    for (const entry of readdirSync(directory)) {
      if (IGNORED_DIRECTORIES.has(entry)) continue;
      const path = join(directory, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        visit(path);
        continue;
      }
      if (!isSearchable(entry)) continue;
      const text = readFileSync(path, "utf8");
      text.split("\n").forEach((line, index) => {
        if (line.includes(pattern)) {
          matches.push(`${relative(root, path)}:${index + 1}:${line.trim()}`);
        }
      });
    }
  }
}

function isSearchable(fileName: string): boolean {
  return Array.from(SEARCHABLE_EXTENSIONS).some((extension) => fileName.endsWith(extension));
}

describe("daily challenge Gemini boundary", () => {
  it("should_keep_gemini_api_key_references_in_backend_configuration_docs_and_tests_only", () => {
    const matches = projectMatches("GEMINI_API_KEY");

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
    const matches = projectMatches("GeminiDailyChallengeGenerator");

    expect(matches.some((line) => line.includes("src/infrastructure/daily-challenge/GeminiDailyChallengeGenerator.ts"))).toBe(true);
    expect(matches.some((line) => line.includes("src/framework/app.ts"))).toBe(true);
    expect(matches.every((line) => !line.includes("src/domain/"))).toBe(true);
    expect(matches.every((line) => !line.includes("src/application/"))).toBe(true);
  });
});
