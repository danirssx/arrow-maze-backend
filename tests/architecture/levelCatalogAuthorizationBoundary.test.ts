import { readFileSync } from "node:fs";
import { join } from "node:path";

// Subject to human review — architecture boundary test

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("level catalog authorization boundary", () => {
  it("should_not_decide_admin_authorization_in_framework_level_catalog_files", () => {
    // Arrange
    const controller = readSource("src/framework/level-catalog/LevelCatalogController.ts");
    const routes = readSource("src/framework/level-catalog/levelCatalogRoutes.ts");

    // Act / Assert
    expect(controller).not.toContain("ForbiddenError");
    expect(controller).not.toMatch(/role\s*[!=]==\s*['"]ADMIN['"]/);
    expect(controller).not.toMatch(/ADMIN['"]\s*[!=]==\s*role/);
    expect(routes).not.toMatch(/ADMIN|ForbiddenError|requireAdmin|isAdmin/);
  });

  it("should_enforce_admin_authorization_in_application_mutation_use_cases", () => {
    // Arrange
    const useCaseFiles = [
      "src/application/level-catalog/use-cases/CreateLevelUseCase.ts",
      "src/application/level-catalog/use-cases/UpdateLevelDefinitionUseCase.ts",
      "src/application/level-catalog/use-cases/PublishLevelUseCase.ts",
      "src/application/level-catalog/use-cases/ArchiveLevelUseCase.ts",
    ];

    // Act / Assert
    for (const file of useCaseFiles) {
      const source = readSource(file);
      expect(source).toContain("actorRole");
      expect(source).toContain("assertAdminActor(input.actorRole)");
    }
  });
});
