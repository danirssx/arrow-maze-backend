import { readdirSync } from "node:fs";
import { join } from "node:path";

// Subject to human review — architecture boundary test

const ROOT = process.cwd();

function listPortFiles(boundedContext: string): string[] {
  const dir = join(ROOT, "src", "application", boundedContext, "ports");
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".ts"));
  } catch {
    return [];
  }
}

const BOUNDED_CONTEXTS = ["identity", "level-catalog", "leaderboard", "progress"];

describe("port naming convention", () => {
  it("should_not_use_I_prefix_in_port_filenames", () => {
    for (const ctx of BOUNDED_CONTEXTS) {
      const files = listPortFiles(ctx);
      for (const file of files) {
        expect(file).not.toMatch(
          /^I[A-Z]/,
          `Port file ${ctx}/ports/${file} must not use the I prefix. Rename to ${file.replace(/^I/, "")}.`
        );
      }
    }
  });
});
