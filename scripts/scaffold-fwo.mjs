// One-shot scaffolder for FWO/NES stub files based on manifest.json.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'data', 'fwo');
await mkdir(dir, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));

let created = 0, skipped = 0;
for (const entry of manifest) {
  const file = path.join(dir, entry.file);
  if (existsSync(file)) { skipped++; continue; }
  const body = `# ${entry.title}\n\nSource: ${entry.url}\n\n<!--\nPaste the verbatim page content below. The H1 and Source line above\nare parsed by the ingest script — keep them unchanged.\n-->\n\n`;
  await writeFile(file, body, 'utf8');
  created++;
}
console.log(`FWO stubs scaffolded: ${created} created, ${skipped} already existed.`);
