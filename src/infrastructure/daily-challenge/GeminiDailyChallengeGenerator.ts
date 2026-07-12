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
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
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
  const boardSize = boardSizeFor(input.targetDifficulty);
  const timeLimitSeconds = input.targetDifficulty === "HARD" ? 150 : 180;

  return [
    "Generate exactly one Arrow Maze daily challenge as valid JSON only.",
    "Do not include markdown, commentary, explanations, provider metadata, or extra keys.",
    "Use this exact JSON shape:",
    "{",
    `  "date": "${input.date}",`,
    `  "seed": "${input.seed}",`,
    `  "targetDifficulty": "${input.targetDifficulty}",`,
    '  "level": {',
    `    "name": "Daily Challenge ${input.date}",`,
    '    "description": "A generated Arrow Maze puzzle.",',
    `    "difficulty": "${input.targetDifficulty}",`,
    '    "definition": {',
    '      "attempts": 5,',
    '      "arrows": [',
    '        { "id": "arrow-0", "color": "#4B6BFB", "path": [{ "row": 0, "col": 0 }], "direction": "UP" }',
    "      ],",
    `      "boardSize": { "rows": ${boardSize.rows}, "cols": ${boardSize.cols} }`,
    "    },",
    `    "timeLimitSeconds": ${timeLimitSeconds}`,
    "  }",
    "}",
    "Rules:",
    `- Generate ${arrowCountFor(input.targetDifficulty)} arrows.`,
    "- Direction must be exactly one of UP, DOWN, LEFT, RIGHT.",
    "- Colors must be hex strings.",
    "- Every path item must be an object with numeric row and col properties; never use arrays.",
    `- Keep all row values from 0 to ${boardSize.rows - 1} and col values from 0 to ${boardSize.cols - 1}.`,
    "- Use only boardSize; do not use boardShape, gridSize, width, height, diagonal directions, or expiresAt.",
    "- Make the puzzle solvable by keeping every arrow on an edge or clear lane pointing out of the board.",
  ].join("\n");
}

function boardSizeFor(difficulty: string): { rows: number; cols: number } {
  if (difficulty === "HARD") return { rows: 7, cols: 7 };
  if (difficulty === "MEDIUM") return { rows: 6, cols: 6 };
  return { rows: 5, cols: 5 };
}

function arrowCountFor(difficulty: string): number {
  if (difficulty === "HARD") return 10;
  if (difficulty === "MEDIUM") return 7;
  return 4;
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
