# Reference Check Summary Tool — Handover Document
**Humanistiqs | Internal Tool**
*For integration into your Claude Code project*

---

## What This Tool Does

Takes a Microsoft Forms reference check PDF export and produces a formatted `.docx` Reference Check Summary document — automatically extracting form responses, synthesising professional narrative sections via the Claude API, and generating the final Word document.

**Input:** One MS Forms PDF export per referee (as downloaded from the Forms response view)
**Output:** One `.docx` Reference Check Summary per referee

---

## Project File Structure

```
ref_check_tool/
├── generate_ref_check.js   # Node.js docx generator — accepts JSON, outputs .docx
├── process_ref_check.py    # Python orchestrator — full pipeline (PDF → docx)
├── example_input.json      # Full schema reference / manual override file
├── HANDOVER.md             # This document
└── package.json            # Created after: npm install docx
```

---

## Setup

### 1. Dependencies

```bash
# Node (docx generator)
cd ref_check_tool
npm init -y
npm install docx

# Python (PDF extraction + Claude API)
pip install anthropic pymupdf
```

### 2. API Key

The tool reads your Anthropic API key from the environment:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Add this to your shell profile (`~/.zshrc` or `~/.bashrc`) or your Claude Code environment config so it's always available.

### 3. Node must be on PATH

Confirm with:
```bash
node --version   # v18+ recommended
```

---

## Usage

### Fully Automated (Recommended)

Run the Python orchestrator. It handles PDF extraction, Claude API calls, narrative generation, and docx output in a single command.

```bash
python process_ref_check.py \
  "/path/to/Reference_Check_-_Olivia_Zhao_(Andrew_Vivian).pdf" \
  "/path/to/output/" \
  --candidate "Olivia Zhao" \
  --position "Finance Officer" \
  --organisation "Wellness Partners Foundation"
```

**Output files written to the output directory:**
- `Reference_Check_Summary_-_Olivia_Zhao_(Andrew_Vivian).docx`
- `Reference_Check_Summary_-_Olivia_Zhao_(Andrew_Vivian)_data.json` *(audit trail)*

Run once per referee PDF. If a candidate has two referees, run the command twice with the respective PDFs.

---

### Manual Override (Advanced)

If you want to hand-edit the narrative before generating the docx — useful for edge cases or where you want to review/adjust the AI-generated content before committing to a file:

**Step 1:** Run extraction only (comment out the `generate_docx` call in `process_ref_check.py`, or use the saved `_data.json` from a prior run).

**Step 2:** Edit the `narrative` block in the JSON file directly.

**Step 3:** Call the Node generator directly:
```bash
node generate_ref_check.js edited_input.json output.docx
```

---

## How Claude Code Should Invoke This Tool

When operating inside your Claude Code project, Claude should:

1. **Identify the PDF(s)** — confirm the file path(s) for each referee's form export.
2. **Run the pipeline** — execute `process_ref_check.py` with the correct `--candidate`, `--position`, and `--organisation` flags for the engagement.
3. **Review the `_data.json` audit file** — this contains the raw extracted form responses and the generated narrative, useful for QA.
4. **Present the `.docx` file** to the user.

**Example Claude Code task prompt:**
```
Generate reference check summaries for [candidate] applying for [position] at [organisation].
PDFs are in [folder]. Run process_ref_check.py for each PDF and save outputs to [output folder].
```

---

## The Two-Step Pipeline (What Happens Under the Hood)

### Step 1 — PDF → Structured JSON (Claude Vision)

`process_ref_check.py` renders each PDF page as a PNG image (at 2× resolution for legibility) and sends them to the Claude API with an extraction prompt. Claude reads the MS Forms layout and returns a structured JSON object containing the referee's name, relationship, and all 21 question responses.

The extraction schema maps directly to the MS Forms question numbering used in the Wellness Partners Foundation reference check form:

| Field | Source Question |
|---|---|
| `referee_name` | Q1 |
| `candidate_name` | Q2 |
| `relationship` | Q3 |
| `q4_responsibilities` | Q4 |
| `q5_culture` | Q5 |
| `q6_finance_rating` | Q6 (radio) |
| `q7_finance_examples` | Q7 |
| `q8_timeliness_rating` | Q8 (checkbox) |
| `q9_timeliness_examples` | Q9 |
| `q10_attention_detail` | Q10 (radio) |
| `q11_attention_examples` | Q11 |
| `q12_software_rating` | Q12 (radio) |
| `q13_software_examples` | Q13 |
| `q14_independence` | Q14 |
| `q15_deadlines` | Q15 |
| `q16_stakeholders` | Q16 |
| `q17_communication` | Q17 |
| `q18_strengths` | Q18 |
| `q19_development` | Q19 |
| `q20_rehire` | Q20 |
| `q21_final` | Q21 |

### Step 2 — JSON → Narrative (Claude Text)

A second Claude API call receives the structured form data and generates professional third-person narrative paragraphs for each document section. The prompt instructs Claude to stay within what the referee stated and not embellish beyond the source responses.

The narrative JSON produced maps directly to the sections in the final document:

| Narrative key | Document section |
|---|---|
| `role_overview` | Role Overview |
| `workplace_integration` | Workplace Integration & Cultural Contribution |
| `financial_capability` | Financial Capability & Performance |
| `accuracy_timeliness` | Accuracy & Timeliness |
| `attention_detail` | Attention to Detail & Internal Controls |
| `systems_proficiency` | Financial Systems Proficiency |
| `independence` | Independence & Initiative |
| `deadline_management` | Deadline Management & Prioritisation |
| `stakeholder_communication` | Stakeholder Engagement & Communication |
| `key_strengths` | Key Strengths (bulleted list) |
| `areas_for_development` | Areas for Development |
| `recommendation` | Referee's Recommendation |
| `overall_assessment` | Overall Assessment |

### Step 3 — JSON → .docx (Node.js)

`generate_ref_check.js` takes the assembled JSON payload and builds the Word document using the `docx` npm library. It handles all layout, table construction, font styling, bullet lists, and spacing. The generator is fully data-driven — all content comes from the JSON; no hardcoded candidate or referee names exist in the generator itself.

---

## Adapting for Different Roles or Divisions

The form question set (Q1–Q21) is specific to the Finance Officer reference check form used at Wellness Partners Foundation. If you use a different MS Forms template for a different role:

**What to update in `process_ref_check.py`:**
- `EXTRACTION_PROMPT` — update the JSON schema to match the new form's questions
- `build_narrative_prompt` — update the section headings to match the new role context (e.g., swap "Finance Officer responsibilities" for the relevant role)

**`generate_ref_check.js` requires no changes** — it only reads from the `narrative` block, which is role-agnostic. New roles simply populate different narrative content into the same section keys.

---

## Document Styling Reference

All styling is controlled by constants at the top of `generate_ref_check.js`:

| Constant | Current value | Purpose |
|---|---|---|
| `PAGE_W` | 11906 (A4) | Page width in DXA |
| `MARGIN` | 1080 | Margin on all sides (~1.9 cm) |
| `GREY_HDR` | `D9D9D9` | Table label cell shading |
| `GREY_ALT` | `F2F2F2` | Alternating table row shading |
| `BLACK` | `000000` | All text and heading colour |

To apply a brand colour (e.g., if Wellness Partners Foundation provides a hex code), replace `GREY_HDR` with their primary colour and update `BLACK` to `WHITE` for header cell text contrast.

---

## Troubleshooting

**"Missing dependency" on startup**
Run `pip install anthropic pymupdf` and confirm `node` is on your PATH.

**Claude returns malformed JSON**
The extraction and narrative prompts both strip markdown fences before parsing. If a model response is still unparseable, the raw text is printed to stderr. Check the prompt in `EXTRACTION_PROMPT` or `build_narrative_prompt` — the model may need a more explicit instruction to avoid preamble for the specific form layout.

**PDF pages render blank or garbled**
The PDFs from MS Forms use a custom font encoding that breaks text extraction tools. This is expected and why the tool renders pages as images for vision-based extraction rather than using text extraction. Do not switch to `pdfminer` or `pdfplumber` for this use case — they will produce unreadable output for these specific exports.

**Node script errors**
Run the Node script directly with a known-good JSON file (use `example_input.json`) to isolate whether the issue is in the Python pipeline or the docx generator:
```bash
node generate_ref_check.js example_input.json test_output.docx
```

---

## API Cost Estimate

Per referee PDF (two Claude API calls):
- Step 1 (vision, ~3 images): ~3,000–4,000 input tokens + image tokens (~2,000 per page)
- Step 2 (narrative generation): ~2,000 input tokens + ~1,500 output tokens

**Approximate cost per referee: $0.05–0.10 AUD** at current Claude Sonnet pricing.

---

*Last updated: 30 April 2026 | Tool version: 1.0*
*Built for Humanistiqs by Claude (Anthropic)*
