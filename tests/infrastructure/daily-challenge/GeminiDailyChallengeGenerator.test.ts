import { jest } from "@jest/globals";
import { GeminiDailyChallengeGenerator } from "../../../src/infrastructure/daily-challenge/GeminiDailyChallengeGenerator.js";

// Subject to human review — Gemini adapter test for MAZ-218 @s1, @s2, @s4.

const INPUT = {
  date: "2026-07-10",
  seed: "daily-2026-07-10",
  targetDifficulty: "MEDIUM",
  expiresAt: "2026-07-11T00:00:00.000Z",
};

describe("GeminiDailyChallengeGenerator", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("should_return_null_without_fetching_when_api_key_is_missing", async () => {
    // Arrange
    const fetchMock = jest.fn<typeof fetch>();
    global.fetch = fetchMock;
    const generator = new GeminiDailyChallengeGenerator(undefined, "gemini-test");

    // Act
    const result = await generator.generate(INPUT);

    // Assert
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should_parse_json_candidate_from_gemini_text_response", async () => {
    // Arrange
    const candidate = {
      date: INPUT.date,
      seed: INPUT.seed,
      targetDifficulty: INPUT.targetDifficulty,
      level: { name: "Daily", description: "", difficulty: INPUT.targetDifficulty, definition: { arrows: [] } },
    };
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: `\`\`\`json\n${JSON.stringify(candidate)}\n\`\`\`` }] } }],
      }),
    } as Response);
    const generator = new GeminiDailyChallengeGenerator("local-secret", "gemini-test");

    // Act
    const result = await generator.generate(INPUT);

    // Assert
    expect(result).toEqual(candidate);
    const [url] = (global.fetch as jest.Mock).mock.calls[0]!;
    expect(String(url)).toContain("gemini-test");
    expect(String(url)).not.toContain("local-secret");
  });

  it("should_return_null_when_provider_returns_non_json_text", async () => {
    // Arrange
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "not json" }] } }],
      }),
    } as Response);
    const generator = new GeminiDailyChallengeGenerator("local-secret", "gemini-test");

    // Act / Assert
    await expect(generator.generate(INPUT)).resolves.toBeNull();
  });
});
