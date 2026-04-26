// One-shot scaffolder. Safe to delete after running.
// Creates an empty .md stub for every Modern Award listed below.
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const awards = [
  ['MA000018', 'Aged Care Award'],
  ['MA000049', 'Airport Employees Award'],
  ['MA000118', 'Animal Care and Veterinary Services Award'],
  ['MA000079', 'Architects Award'],
  ['MA000019', 'Banking, Finance and Insurance Award'],
  ['MA000091', 'Broadcasting, Recorded Entertainment and Cinemas Award'],
  ['MA000020', 'Building and Construction General On-site Award'],
  ['MA000055', 'Cement, Lime and Quarrying Award'],
  ['MA000120', "Children's Services Award"],
  ['MA000002', 'Clerks - Private Sector Award'],
  ['MA000075', 'Educational Services (Post-Secondary Education) Award'],
  ['MA000076', 'Educational Services (Schools) General Staff Award'],
  ['MA000077', 'Educational Services (Teachers) Award'],
  ['MA000025', 'Electrical, Electronic and Communications Contracting Award'],
  ['MA000088', 'Electrical Power Industry Award'],
  ['MA000003', 'Fast Food Industry Award'],
  ['MA000073', 'Food, Beverage and Tobacco Manufacturing Award'],
  ['MA000004', 'General Retail Industry Award'],
  ['MA000026', 'Graphic Arts, Printing and Publishing Award'],
  ['MA000006', 'Higher Education Industry - Academic Staff - Award'],
  ['MA000007', 'Higher Education Industry - General Staff - Award'],
  ['MA000009', 'Hospitality Industry (General) Award'],
  ['MA000116', 'Legal Services Award'],
  ['MA000010', 'Manufacturing and Associated Industries and Occupations Award'],
  ['MA000093', 'Marine Tourism and Charter Vessels Award'],
  ['MA000031', 'Medical Practitioners Award'],
  ['MA000011', 'Mining Industry Award'],
  ['MA000104', 'Miscellaneous Award'],
  ['MA000034', 'Nurses Award'],
  ['MA000035', 'Pastoral Award'],
  ['MA000069', 'Pharmaceutical Industry Award'],
  ['MA000012', 'Pharmacy Industry Award'],
  ['MA000036', 'Plumbing and Fire Sprinklers Award'],
  ['MA000119', 'Restaurant Industry Award'],
  ['MA000038', 'Road Transport and Distribution Award'],
  ['MA000039', 'Road Transport (Long Distance Operations) Award'],
  ['MA000100', 'Social, Community, Home Care and Disability Services Industry Award'],
  ['MA000082', 'Sporting Organisations Award'],
  ['MA000043', 'Waste Management Award'],
  ['MA000113', 'Water Industry Award'],
  ['MA000090', 'Wine Industry Award'],
];

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const dir = path.resolve(here, '..', 'data', 'awards');
await mkdir(dir, { recursive: true });

let created = 0, skipped = 0;
for (const [code, name] of awards) {
  const file = path.join(dir, `${code}.md`);
  if (existsSync(file)) { skipped++; continue; }
  const body = `# ${code} — ${name} 2020\n\n<!--\nSource: https://www.fwc.gov.au/agreements-awards/awards/find-award\nPaste the verbatim award text below this comment block.\nKeep the H1 above unchanged — the ingestion script parses it.\n-->\n\n`;
  await writeFile(file, body, 'utf8');
  created++;
}
console.log(`Awards scaffolded: ${created} created, ${skipped} already existed.`);
