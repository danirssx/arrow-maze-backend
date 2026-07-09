import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dynamic import to get the spec at runtime
const { openApiSpec } = await import('../src/framework/swagger/openApiSpec.js');

const outputPath = join(__dirname, '..', 'docs', 'openapi.json');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2));
process.stdout.write('OpenAPI contract exported to docs/openapi.json\n');
