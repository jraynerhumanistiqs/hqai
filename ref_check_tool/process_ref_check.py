#!/usr/bin/env python3
"""
process_ref_check.py
Full pipeline: PDF → image → Claude extraction → Claude narrative → .docx

Usage:
    python process_ref_check.py <pdf_path> <output_dir> \
        --candidate "Olivia Zhao" \
        --position "Finance Officer" \
        --organisation "Wellness Partners Foundation"

Requirements:
    pip install anthropic pymupdf
    npm install docx  (in the same directory as generate_ref_check.js)
"""

import argparse
import base64
import json
import os
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

try:
    import fitz          # PyMuPDF
    import anthropic
except ImportError as e:
    sys.exit(f"Missing dependency: {e}\nRun: pip install anthropic pymupdf")


# ─── Auto-load .env.local from the hqai project root ─────────────────────────
def _load_env_local():
    """Walk up from this script to find a .env.local and inject ANTHROPIC_API_KEY
    into os.environ if it's not already set. No external dotenv dependency."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        return
    here = Path(__file__).resolve().parent
    for candidate_dir in [here, *here.parents]:
        env_path = candidate_dir / ".env.local"
        if env_path.is_file():
            try:
                for raw in env_path.read_text(encoding="utf-8").splitlines():
                    line = raw.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k and k not in os.environ:
                        os.environ[k] = v
            except Exception:
                pass
            return

_load_env_local()


# ─── Config ──────────────────────────────────────────────────────────────────
MODEL          = "claude-sonnet-4-20250514"
GENERATOR_JS   = Path(__file__).parent / "generate_ref_check.js"
ZOOM           = 2          # render PDF pages at 2× for legibility


# ─── PDF → base64 images ─────────────────────────────────────────────────────
def pdf_to_images(pdf_path: str) -> list[dict]:
    """Render each PDF page as a base64-encoded PNG for the Claude API."""
    doc = fitz.open(pdf_path)
    images = []
    for page in doc:
        pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM))
        b64 = base64.standard_b64encode(pix.tobytes("png")).decode()
        images.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png", "data": b64}
        })
    return images


# ─── Step 1: Extract structured form data via Claude vision ──────────────────
EXTRACTION_PROMPT = """
You are reading a Microsoft Forms reference check submission rendered as images.
Extract all question responses and return ONLY a valid JSON object with this exact schema.
Use null for any question where the respondent left no answer or wrote "No answer provided."

{
  "referee_name": "string",
  "candidate_name": "string",
  "relationship": "string",
  "q4_responsibilities": "string",
  "q5_culture": "string",
  "q6_finance_rating": "one of: Extraordinary | Above Average | Satisfactory | Poor | Very Poor",
  "q7_finance_examples": "string or null",
  "q8_timeliness_rating": "one of: Always | Usually | Occasional Issues | Frequent Issues",
  "q9_timeliness_examples": "string or null",
  "q10_attention_detail": "one of: Yes | Mostly | Hardly ever | No",
  "q11_attention_examples": "string or null",
  "q12_software_rating": "one of: Extraordinary | Above Average | Satisfactory | Poor | Very Poor",
  "q13_software_examples": "string or null",
  "q14_independence": "string",
  "q15_deadlines": "string",
  "q16_stakeholders": "string",
  "q17_communication": "string",
  "q18_strengths": "string",
  "q19_development": "string",
  "q20_rehire": "string",
  "q21_final": "string or null"
}

Return ONLY the JSON object. No markdown, no preamble.
"""

def extract_form_data(client: anthropic.Anthropic, images: list[dict]) -> dict:
    content = images + [{"type": "text", "text": EXTRACTION_PROMPT}]
    response = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        messages=[{"role": "user", "content": content}]
    )
    raw = response.content[0].text.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ─── Step 2: Generate narrative sections via Claude ──────────────────────────
def build_narrative_prompt(form_data: dict, candidate: str, position: str, org: str) -> str:
    return f"""
You are a professional talent acquisition specialist writing a formal reference check summary
document for {org}.

The candidate is {candidate}, applying for the position of {position}.
The referee is {form_data['referee_name']}, whose relationship to the candidate is: {form_data['relationship']}.

Below are the raw form responses from the reference check questionnaire.
Write professional, neutral, third-person narrative paragraphs for each section.
Do not invent information. Do not embellish beyond what the referee stated.
Where an answer is null or "No answer provided", note that no supporting detail was provided.

RAW FORM DATA:
{json.dumps(form_data, indent=2)}

Return ONLY a valid JSON object with this exact schema. No markdown. No preamble.

{{
  "role_overview": "2-3 sentence paragraph introducing the referee and the candidate's role/responsibilities",
  "workplace_integration": "1-2 sentence paragraph covering Q5",
  "financial_capability": "2-3 sentence paragraph covering Q6 and Q7",
  "finance_rating": "exact rating string from Q6",
  "accuracy_timeliness": "2-3 sentence paragraph covering Q8 and Q9",
  "timeliness_rating": "exact rating string from Q8",
  "attention_detail": "2 sentence paragraph covering Q10 and Q11",
  "attention_to_detail": "exact answer string from Q10",
  "systems_proficiency": "2-3 sentence paragraph covering Q12 and Q13",
  "software_rating": "exact rating string from Q12",
  "software_used": ["array of any specific software names mentioned, or empty array"],
  "independence": "1-2 sentence paragraph covering Q14",
  "deadline_management": "1-2 sentence paragraph covering Q15",
  "stakeholder_communication": "2 sentence paragraph covering Q16 and Q17",
  "key_strengths": ["array of 5-7 concise bullet point strings drawn from Q18 and overall responses"],
  "areas_for_development": "1-2 sentence paragraph covering Q19. If null, state no areas were identified.",
  "recommendation": "1-2 sentence paragraph covering Q20 and Q21",
  "overall_assessment": "2-3 sentence closing paragraph synthesising the reference overall"
}}
"""

def generate_narrative(client: anthropic.Anthropic, form_data: dict,
                        candidate: str, position: str, org: str) -> dict:
    prompt = build_narrative_prompt(form_data, candidate, position, org)
    response = client.messages.create(
        model=MODEL,
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ─── Step 3: Assemble JSON and call Node generator ───────────────────────────
def generate_docx(payload: dict, output_path: str):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json',
                                     delete=False, encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        tmp = f.name
    try:
        result = subprocess.run(
            ["node", str(GENERATOR_JS), tmp, output_path],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            raise RuntimeError(f"Node error:\n{result.stderr}")
        print(result.stdout.strip())
    finally:
        os.unlink(tmp)


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Generate a reference check summary .docx from a PDF form export.")
    parser.add_argument("pdf_path",       help="Path to the MS Forms PDF export")
    parser.add_argument("output_dir",     help="Directory to write the output .docx")
    parser.add_argument("--candidate",    required=True, help='Candidate full name, e.g. "Olivia Zhao"')
    parser.add_argument("--position",     required=True, help='Role being applied for, e.g. "Finance Officer"')
    parser.add_argument("--organisation", required=True, help='Hiring organisation, e.g. "Wellness Partners Foundation"')
    parser.add_argument("--date",         default=None,  help="Reference date string (defaults to today)")
    args = parser.parse_args()

    today = date.today()
    ref_date = args.date or f"{today.day} {today.strftime('%B %Y')}"
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("Error: ANTHROPIC_API_KEY environment variable not set.")
    client = anthropic.Anthropic(api_key=api_key)

    print(f"[1/3] Rendering PDF pages → images: {args.pdf_path}")
    images = pdf_to_images(args.pdf_path)

    print(f"[2/3] Extracting form data via Claude vision...")
    form_data = extract_form_data(client, images)
    print(f"      Referee: {form_data.get('referee_name', 'unknown')}")

    print(f"[3/3] Generating narrative sections...")
    narrative = generate_narrative(client, form_data, args.candidate, args.position, args.organisation)

    # Assemble final payload
    referee_safe = form_data.get("referee_name", "Referee").replace(" ", "_")
    candidate_safe = args.candidate.replace(" ", "_")
    filename = f"Reference_Check_Summary_-_{candidate_safe}_({referee_safe}).docx"
    output_path = str(output_dir / filename)

    payload = {
        "candidate_name":  args.candidate,
        "position":        args.position,
        "organisation":    args.organisation,
        "reference_date":  ref_date,
        "referee_name":    form_data.get("referee_name", ""),
        "relationship":    form_data.get("relationship", ""),
        "form_data":       form_data,
        "narrative":       narrative
    }

    generate_docx(payload, output_path)

    # Optionally save the intermediate JSON for audit/debugging
    json_path = output_path.replace(".docx", "_data.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"  Data saved: {json_path}")


if __name__ == "__main__":
    main()
