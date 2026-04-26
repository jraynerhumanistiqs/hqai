import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

const baseDir = String.raw`C:\Users\JamesRayner\OneDrive - humanistiqs.com.au\Documents - Humanistiqs\Humanistiqs\Client Folders\Trowse Constructions\HR365 - TC\HR_ER Support Package\Trowse Constructions -  Templates`;

async function extractText(filePath) {
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) return '';
  const matches = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  let parts = [];
  for (const m of matches) {
    const t = m.replace(/<[^>]+>/g, '');
    parts.push(t);
  }
  return parts.join('').substring(0, 4000);
}

async function main() {
  const dirs = fs.readdirSync(baseDir).filter(d => {
    try { return fs.statSync(path.join(baseDir, d)).isDirectory(); } catch { return false; }
  });

  const results = {};
  for (const dir of dirs) {
    const dirPath = path.join(baseDir, dir);
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.docx') && f.includes('Template'));
    results[dir] = {};
    for (const file of files) {
      try {
        const text = await extractText(path.join(dirPath, file));
        results[dir][file] = text;
      } catch(e) {
        results[dir][file] = 'ERROR: ' + e.message;
      }
    }
  }

  // Output as JSON
  console.log(JSON.stringify(results, null, 2));
}

main();
