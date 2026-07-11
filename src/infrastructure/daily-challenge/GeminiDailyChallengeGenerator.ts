// Pattern: Adapter
import type {
  DailyChallengeGenerator,
  DailyChallengeGeneratorInput,
} from "../../application/daily-challenge/ports/DailyChallengeGenerator.js";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiDailyChallengeGenerator implements DailyChallengeGenerator {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string
  ) {}

  async generate(input: DailyChallengeGeneratorInput): Promise<unknown> {
    if (this.apiKey === undefined || this.apiKey.trim().length === 0) {
      return null;
    }

    try {
      const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(this.model)}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildPrompt(input) }],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });
      if (!response.ok) {
        return null;
      }
      const body = await response.json() as unknown;
      const text = extractText(body);
      return text === null ? null : parseJsonText(text);
    } catch {
      return null;
    }
  }
}

function buildPrompt(input: DailyChallengeGeneratorInput): string {
  return [
    "Generate exactly one Arrow Untangle daily challenge as JSON.",
    `date: ${input.date}`,
    `seed: ${input.seed}`,
    `targetDifficulty: ${input.targetDifficulty}`,
    `expiresAt: ${input.expiresAt}`,
    "Return only JSON with keys date, seed, targetDifficulty, level.",
    "level.definition.arrows must contain ArrowSpec records with id, color, path, direction.",
    "Do not include markdown, commentary, secrets, or provider metadata.",
  ].join("\n");
}

function extractText(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const candidates = (value as Record<string, unknown>)["candidates"];
  if (!Array.isArray(candidates)) return null;
  const first = candidates[0];
  if (typeof first !== "object" || first === null) return null;
  const content = (first as Record<string, unknown>)["content"];
  if (typeof content !== "object" || content === null) return null;
  const parts = (content as Record<string, unknown>)["parts"];
  if (!Array.isArray(parts)) return null;
  const part = parts[0];
  if (typeof part !== "object" || part === null) return null;
  const text = (part as Record<string, unknown>)["text"];
  return typeof text === "string" ? text : null;
}

function parseJsonText(text: string): unknown | null {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/u, "")
    .replace(/^```\s*/u, "")
    .replace(/\s*```$/u, "")
    .trim();
  try {
    return JSON.parse(withoutFence);
  } catch {
    return null;
  }
}
