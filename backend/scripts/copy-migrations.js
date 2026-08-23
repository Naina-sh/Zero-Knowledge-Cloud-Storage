/**
 * Post-build step: copy SQL migrations into dist/.
 * tsc only compiles TypeScript — .sql files in src/ would otherwise be
 * missing from the production build, breaking runMigrations().
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const src = path.join(__dirname, '..', 'src', 'database', 'migrations');
const dest = path.join(__dirname, '..', 'dist', 'database', 'migrations');

if (!fs.existsSync(src)) {
  console.error('copy-migrations: source migrations dir not found:', src);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src).filter((f) => f.endsWith('.sql'))) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
  console.log(`copy-migrations: copied ${file}`);
}