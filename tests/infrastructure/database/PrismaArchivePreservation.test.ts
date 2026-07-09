import fs from 'node:fs';
import path from 'node:path';

// Subject to human review — persistence relationship regression test

function readPrismaSchema(): string {
  return fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
}

describe('Prisma archive preservation relations', () => {
  it('should_restrict_level_history_relations_when_levels_are_archived', () => {
    // Arrange
    const schema = readPrismaSchema();

    // Act / Assert
    expect(schema).toContain(
      'level      Level              @relation(fields: [levelId], references: [id], onDelete: Restrict, onUpdate: NoAction)',
    );
    expect(schema).toContain(
      'level           Level          @relation(fields: [levelId], references: [id], onDelete: Restrict, onUpdate: NoAction)',
    );
  });
});
