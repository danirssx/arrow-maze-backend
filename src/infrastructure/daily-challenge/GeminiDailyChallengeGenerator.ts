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
          generationConfig: { responseMimeType: "application/json", temperature: 0.35 },
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
  const profile = profileFor(input.targetDifficulty);

  return [
    "Generate exactly one Arrow Maze daily challenge as valid JSON only.",
    "Do not include markdown, commentary, explanations, provider metadata, or extra keys.",
    "The puzzle must feel like a handcrafted figurative level, inspired by a catalog of silhouettes such as rocket, anchor, butterfly, apple, boat, camera, crown, duck, fish, glasses, mushroom, key, lightning, space invader, trophy, and diamond.",
    "Do not create a plain rectangle. Use a recognizable CELL_MASK silhouette and populate it densely with arrows.",
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
    `      "attempts": ${profile.attempts},`,
    '      "arrows": [',
    '        { "id": "arrow-0", "color": "#4B6BFB", "path": [{ "row": 0, "col": 0 }, { "row": 0, "col": 1 }], "direction": "RIGHT" }',
    "      ],",
    '      "boardShape": { "type": "CELL_MASK", "cells": [{ "row": 0, "col": 0 }, { "row": 0, "col": 1 }] }',
    "    },",
    `    "timeLimitSeconds": ${profile.timeLimitSeconds}`,
    "  }",
    "}",
    "Silhouette examples from the target style. Use these as shape grammar, not as exact copies:",
    '- Rocket: narrow nose at top, 3-cell body column, fins near bottom, flame cell below; often 8x8 with about 22 mask cells and 8-10 arrows.',
    '- Anchor: ring/stem vertical spine, horizontal crossbar, two hooks at bottom; often 8x8 with about 18 mask cells and 5-7 arrows.',
    '- Butterfly: centered body, two antennae, symmetric upper/lower wings; often 7x8 with about 26 mask cells and 7-9 arrows.',
    '- Camera/trophy/crown/apple/boat/fish are also good: use a sparse figurative mask, not a filled rectangle.',
    "Rules:",
    `- Generate ${profile.minArrows} to ${profile.maxArrows} arrows.`,
    `- Use ${profile.minCells} to ${profile.maxCells} boardShape cells inside a bounding box no larger than ${profile.maxRows} rows by ${profile.maxCols} cols.`,
    "- Every boardShape cell should normally be occupied by exactly one arrow path cell; cover at least 80% of the mask.",
    "- Prefer multi-cell arrows. At least 75% of arrows must have path length 2 or more, and at least two arrows should have path length 3 or more.",
    "- Arrow paths may bend orthogonally, but each consecutive path cell must be adjacent up/down/left/right.",
    "- Each path cell must be inside boardShape.cells. Do not place arrows outside the mask.",
    "- Keep the dependency graph solvable: avoid two arrows directly blocking each other in opposite directions. Prefer many arrows already on an outer contour pointing out of the silhouette, plus a few interior arrows that clear after contour arrows leave.",
    "- Direction must be exactly one of UP, DOWN, LEFT, RIGHT.",
    "- Colors must be hex strings.",
    "- Every path item must be an object with numeric row and col properties; never use arrays.",
    `- Keep all row values from 0 to ${profile.maxRows - 1} and col values from 0 to ${profile.maxCols - 1}.`,
    "- Use only boardShape; do not use boardSize, gridSize, width, height, diagonal directions, or expiresAt.",
    "- The level name may mention the silhouette, for example Daily Rocket, Daily Anchor, Daily Crown, or Daily Butterfly.",
    "- Make it fun: recognizable silhouette, dense but readable population, varied colors, and no trivial one-arrow puzzle.",
  ].join("\n");
}

function profileFor(difficulty: string): {
  attempts: number;
  timeLimitSeconds: number;
  minArrows: number;
  maxArrows: number;
  minCells: number;
  maxCells: number;
  maxRows: number;
  maxCols: number;
} {
  if (difficulty === "HARD") {
    return {
      attempts: 12,
      timeLimitSeconds: 150,
      minArrows: 7,
      maxArrows: 10,
      minCells: 21,
      maxCells: 31,
      maxRows: 8,
      maxCols: 9,
    };
  }
  if (difficulty === "MEDIUM") {
    return {
      attempts: 10,
      timeLimitSeconds: 180,
      minArrows: 6,
      maxArrows: 9,
      minCells: 18,
      maxCells: 24,
      maxRows: 8,
      maxCols: 9,
    };
  }
  return {
    attempts: 8,
    timeLimitSeconds: 210,
    minArrows: 5,
    maxArrows: 7,
    minCells: 14,
    maxCells: 20,
    maxRows: 6,
    maxCols: 9,
  };
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
