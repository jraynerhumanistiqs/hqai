/**
 * generate_ref_check.js
 * Reference Check Summary Generator — Wellness Partners Foundation
 *
 * Usage:
 *   node generate_ref_check.js <input.json> <output.docx>
 *
 * The input JSON schema is documented in HANDOVER.md.
 * Dependencies: npm install docx
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Validate CLI args ──────────────────────────────────────────────────────
const [,, inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('Usage: node generate_ref_check.js <input.json> <output.docx>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const { candidate_name, position, organisation, reference_date,
        referee_name, relationship, narrative } = data;

// ─── Layout constants ───────────────────────────────────────────────────────
const PAGE_W   = 11906;          // A4 width in DXA
const MARGIN   = 1080;           // ~1.9 cm
const CW       = PAGE_W - MARGIN * 2;  // usable content width

// ─── Style constants ────────────────────────────────────────────────────────
const BLACK    = "000000";
const GREY_HDR = "D9D9D9";       // table label cells
const GREY_ALT = "F2F2F2";       // alternating rows
const WHITE    = "FFFFFF";

const bdr  = { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
const BDRS = { top: bdr, bottom: bdr, left: bdr, right: bdr };

// ─── Helper elements ────────────────────────────────────────────────────────
const space = (pts = 120) =>
  new Paragraph({ spacing: { before: 0, after: pts }, children: [] });

const sectionTitle = (text) =>
  new Paragraph({
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 22, color: BLACK })]
  });

const bodyPara = (text) =>
  new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: BLACK })]
  });

const bulletItem = (text) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: BLACK })]
  });

// ─── Table helpers ──────────────────────────────────────────────────────────
const labelCell = (text, w, alt = false) => new TableCell({
  borders: BDRS,
  width: { size: w, type: WidthType.DXA },
  shading: { fill: GREY_HDR, type: ShadingType.CLEAR },
  margins: { top: 80, bottom: 80, left: 140, right: 140 },
  children: [new Paragraph({
    children: [new TextRun({ text, bold: true, font: "Arial", size: 20, color: BLACK })]
  })]
});

const valueCell = (text, w, alt = false) => new TableCell({
  borders: BDRS,
  width: { size: w, type: WidthType.DXA },
  shading: { fill: alt ? GREY_ALT : WHITE, type: ShadingType.CLEAR },
  margins: { top: 80, bottom: 80, left: 140, right: 140 },
  children: [new Paragraph({
    children: [new TextRun({ text, font: "Arial", size: 20, color: BLACK })]
  })]
});

const infoRow = (label, value, alt = false) => {
  const c1 = Math.round(CW * 0.3);
  const c2 = CW - c1;
  return new TableRow({ children: [labelCell(label, c1), valueCell(value, c2, alt)] });
};

const ratingRow = (label, value) => {
  const c1 = Math.round(CW * 0.55);
  const c2 = CW - c1;
  return new TableRow({
    children: [
      labelCell(label, c1),
      new TableCell({
        borders: BDRS,
        width: { size: c2, type: WidthType.DXA },
        shading: { fill: WHITE, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({ text: value, bold: true, font: "Arial", size: 20, color: BLACK })]
        })]
      })
    ]
  });
};

const ratingTable = (rows) => new Table({
  width: { size: CW, type: WidthType.DXA },
  columnWidths: [Math.round(CW * 0.55), CW - Math.round(CW * 0.55)],
  rows: rows.map(([l, v]) => ratingRow(l, v))
});

// ─── Build ratings rows from narrative data ──────────────────────────────────
function buildRatingRows(n) {
  const rows = [];
  if (n.finance_rating)
    rows.push(["Finance Officer Ability (Transactional, Reconciliations, Reporting)", n.finance_rating]);
  return rows;
}

// ─── Build document ──────────────────────────────────────────────────────────
function buildDocument(data) {
  const n = data.narrative;

  const infoTable = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [Math.round(CW * 0.3), CW - Math.round(CW * 0.3)],
    rows: [
      infoRow("Position",                 data.position,        false),
      infoRow("Candidate",                data.candidate_name,  true),
      infoRow("Referee",                  data.referee_name,    false),
      infoRow("Relationship to Candidate",data.relationship,    true),
      infoRow("Reference Date",           data.reference_date,  false),
    ]
  });

  // Rating tables — only rendered if the narrative supplies the value
  const financeRatingRows = [];
  if (n.finance_rating)
    financeRatingRows.push(["Finance Officer Ability (Transactional, Reconciliations, Reporting)", n.finance_rating]);

  const timelinessRatingRows = [];
  if (n.timeliness_rating)
    timelinessRatingRows.push(["Accuracy & Timeliness of Key Task Delivery", n.timeliness_rating]);

  const attentionRatingRows = [];
  if (n.attention_to_detail)
    attentionRatingRows.push(["Attention to Detail & Adherence to Internal Controls", n.attention_to_detail]);

  const softwareRatingRows = [];
  if (n.software_rating)
    softwareRatingRows.push(["Financial Software Proficiency", n.software_rating]);
  if (n.software_used && n.software_used.length)
    softwareRatingRows.push(["Systems Used", n.software_used.join(", ")]);

  // Conditionally build rating table blocks
  const maybeRatingTable = (rows) =>
    rows.length ? [space(60), ratingTable(rows), space()] : [space()];

  const children = [
    // Document title
    new Paragraph({
      spacing: { before: 0, after: 200 },
      children: [new TextRun({ text: "Reference Check Summary", bold: true, font: "Arial", size: 36, color: BLACK })]
    }),

    infoTable,
    space(200),

    // ── Sections ──────────────────────────────────────────────────────────
    sectionTitle("Role Overview"),
    bodyPara(n.role_overview),
    space(),

    sectionTitle("Workplace Integration & Cultural Contribution"),
    bodyPara(n.workplace_integration),
    space(),

    sectionTitle("Financial Capability & Performance"),
    bodyPara(n.financial_capability),
    ...maybeRatingTable(financeRatingRows),

    sectionTitle("Accuracy & Timeliness"),
    bodyPara(n.accuracy_timeliness),
    ...maybeRatingTable(timelinessRatingRows),

    sectionTitle("Attention to Detail & Internal Controls"),
    bodyPara(n.attention_detail),
    ...maybeRatingTable(attentionRatingRows),

    sectionTitle("Financial Systems Proficiency"),
    bodyPara(n.systems_proficiency),
    ...maybeRatingTable(softwareRatingRows),

    sectionTitle("Independence & Initiative"),
    bodyPara(n.independence),
    space(),

    sectionTitle("Deadline Management & Prioritisation"),
    bodyPara(n.deadline_management),
    space(),

    sectionTitle("Stakeholder Engagement & Communication"),
    bodyPara(n.stakeholder_communication),
    space(),

    sectionTitle("Key Strengths"),
    ...(n.key_strengths || []).map(s => bulletItem(s)),
    space(),

    sectionTitle("Areas for Development"),
    bodyPara(n.areas_for_development),
    space(),

    sectionTitle("Referee's Recommendation"),
    bodyPara(n.recommendation),
    space(),

    sectionTitle("Overall Assessment"),
    bodyPara(n.overall_assessment),
  ];

  return new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 240 } } }
        }]
      }]
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } }
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: 16838 },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
        }
      },
      children
    }]
  });
}

// ─── Run ─────────────────────────────────────────────────────────────────────
Packer.toBuffer(buildDocument(data)).then(buf => {
  fs.writeFileSync(outputPath, buf);
  console.log(`✓ Written: ${outputPath}`);
}).catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
