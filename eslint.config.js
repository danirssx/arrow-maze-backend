import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";

export default [
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "prisma/seed-data/**"]
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["error", { "allow": ["warn", "error"] }],
      "import/no-restricted-paths": [
        "error",
        {
          "zones": [
            {
              "target": "./src/domain",
              "from": "./src/application",
              "message": "Domain must not depend on application."
            },
            {
              "target": "./src/domain",
              "from": "./src/infrastructure",
              "message": "Domain must not depend on infrastructure."
            },
            {
              "target": "./src/domain",
              "from": "./src/framework",
              "message": "Domain must not depend on framework code."
            },
            {
              "target": "./src/application",
              "from": "./src/infrastructure",
              "message": "Application must depend on ports, not infrastructure."
            },
            {
              "target": "./src/application",
              "from": "./src/framework",
              "message": "Application must not depend on framework code."
            },
            {
              "target": "./src/infrastructure",
              "from": "./src/framework",
              "message": "Infrastructure must not depend on Express/framework code."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["crypto", "node:crypto"],
              "message": "Domain must not import crypto. Use IdGenerator/Clock ports instead."
            },
            {
              "group": ["**/shared/errors/AppError*"],
              "message": "Domain must not import AppError (HTTP semantics). Use DomainError instead."
            }
          ]
        }
      ]
    }
  }
];
