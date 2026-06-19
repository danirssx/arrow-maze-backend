import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const groups = {
  migrations: join(root, "src", "infrastructure", "database", "migrations"),
  seeds: join(root, "src", "infrastructure", "database", "seeds"),
};

const group = process.argv[2];
if (group !== "migrations" && group !== "seeds") {
  process.stderr.write("Usage: node scripts/run-sql-files.mjs <migrations|seeds>\n");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write("Missing required env var: DATABASE_URL\n");
  process.exit(1);
}

const sqlFiles = readdirSync(groups[group])
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => join(groups[group], file));

for (const file of sqlFiles) {
  process.stdout.write(`Applying ${file.replace(`${root}/`, "")}\n`);
  const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", file], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
