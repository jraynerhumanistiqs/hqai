#!/usr/bin/env python3
"""
Drive the hr_challenge_answers authoring loop.

  python answers_tool.py status          progress + what is left
  python answers_tool.py map             match every challenge to its report
                                         subsection, report low-confidence ones
  python answers_tool.py next [-n 5]     print the next batch brief to paste
                                         into the answering agent
  python answers_tool.py check FILE.csv  validate the agent's output
  python answers_tool.py merge FILE.csv  merge validated rows into
                                         hr_challenge_answers.csv

Why a tool and not "point the agent at the repo": the agent must answer from
the report subsection that actually governs the challenge. Making it go and
find that itself is where grounding quietly fails. `next` extracts the exact
text and puts it in the prompt.
"""
import argparse
import csv
import io
import os
import re
import sys
from difflib import SequenceMatcher

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)

WORKSHEET = os.path.join(HERE, "hr_challenge_answers_worksheet.csv")
CHALLENGES = os.path.join(HERE, "hr_challenges.csv")
ANSWERS = os.path.join(HERE, "hr_challenge_answers.csv")
WATCHLIST = os.path.join(HERE, "hr_regulatory_watchlist.csv")

SECTION_FILES = {
    "Section 4A": "04a-people-foundations.md",
    "Section 4B": "04b-people-management.md",
    "Section 5A": "05a-recruit-plan-attract.md",
    "Section 5B": "05b-recruit-screen-onboard.md",
    "Section 6": "06-crosscutting.md",
}

ANSWER_COLS = ["challenge_code", "jurisdiction", "answer_text", "source_refs",
               "escalation_guidance", "is_escalate_default", "status"]

# Keyword FLOOR. The calibrated gate in run_tier_gate() adds recall on top of
# this but never clears it. "performance improvement" is here because the gate
# scores "Designing & running a defensible PIP" at +0.019, just under t_lo,
# and a PIP is the pre-dismissal process the boundary map warns SMEs cannot
# distinguish from a routine performance chat.
ALWAYS_ESCALATE = [
    "dismiss", "termination", "terminate", "redundan", "misconduct",
    "general protections", "adverse action", "discriminat", "harass",
    "bully", "underpay", "wage theft", "investigation", "psychosocial",
    "contractor", "sham", "pregnan", "parental leave", "injur", "illness",
    "union", "lawyer", "abandonment", "restructure",
    "performance improvement", "disciplinary", "procedural fairness",
]

BANNED_WORDS = ["navigate", "leverage", "comprehensive", "robust", "holistic",
                "synergy", "ensure", "utilise", "utilize", "facilitate",
                "as per", "pursuant to"]

AMERICAN = ["organize", "recognize", "minimize", "behavior", "color", "labor",
            "center", "defense", "license to", "practicing"]

# A dollar figure, a percentage, or a bare rate-looking number.
RATE_PAT = re.compile(r"(\$\s?\d|\d+(\.\d+)?\s?%|\d+(\.\d+)?\s?per cent)", re.I)
DASH_PAT = re.compile("[–—]")


def read_csv(path):
    with io.open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def norm(s):
    s = (s or "").lower()
    # Headings carry label prefixes the challenge titles do not:
    # "E1. Reading a bifurcated market", "Challenge 17 - Retention", "3.2 Right
    # to Disconnect". Strip them or every such pair scores artificially low.
    s = re.sub(r"^\s*(challenge\s+)?[a-z]?\d+(\.\d+)?[.)]?\s*[-–—:]?\s*", "", s)
    s = s.replace("&", " and ")
    s = re.sub(r"\byr\b", "year", s)
    s = re.sub(r"\b2-yr\b", "2 year", s)
    s = re.sub(r"\bgovt\b", "government", s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


STOP = {"the", "a", "an", "of", "and", "or", "to", "in", "for", "do", "i",
        "my", "is", "it", "what", "how", "need", "s", "at", "on", "with"}


def _pair_score(na, nb):
    if not na or not nb:
        return 0.0
    seq = SequenceMatcher(None, na, nb).ratio()
    ta, tb = set(na.split()) - STOP, set(nb.split()) - STOP
    if not (ta | tb):
        return seq
    jac = len(ta & tb) / len(ta | tb)
    # Containment catches the common case where the heading restates the
    # challenge title and then elaborates on it.
    cont = len(ta & tb) / min(len(ta), len(tb)) if (ta and tb) else 0.0
    return max(0.5 * seq + 0.5 * jac, 0.35 * seq + 0.65 * cont)


def _head(s):
    """The part before an elaborating dash or colon."""
    return re.split(r"\s[-–—:]\s|:\s", s, maxsplit=1)[0]


def score(a, b):
    na, nb = norm(a), norm(b)
    # Compare whole-to-whole and head-to-head, take the best. Challenge titles
    # and report headings elaborate after a dash inconsistently, so neither
    # form alone is reliable.
    return max(_pair_score(na, nb), _pair_score(norm(_head(a)), norm(_head(b))))


def parse_sections(path):
    """Return [(level, title, body)] for ## and ### headings."""
    with io.open(path, encoding="utf-8") as f:
        lines = f.read().split("\n")
    heads = []
    for i, line in enumerate(lines):
        m = re.match(r"^(#{2,4})\s+(.*)$", line)
        if m:
            heads.append((i, len(m.group(1)), m.group(2).strip()))
    out = []
    for idx, (ln, lvl, title) in enumerate(heads):
        end = len(lines)
        for ln2, lvl2, _ in heads[idx + 1:]:
            if lvl2 <= lvl:
                end = ln2
                break
        clean = re.sub(r"^\d+(\.\d+)?\.?\s*", "", title)
        out.append({"level": lvl, "title": clean, "raw_title": title,
                    "body": "\n".join(lines[ln:end]).strip()})
    return out


_SECTION_CACHE = {}


def sections_for(ref):
    fn = SECTION_FILES.get((ref or "").strip())
    if not fn:
        return []
    if fn not in _SECTION_CACHE:
        p = os.path.join(RESEARCH, fn)
        _SECTION_CACHE[fn] = parse_sections(p) if os.path.exists(p) else []
    return _SECTION_CACHE[fn]


def best_match(challenge):
    secs = sections_for(challenge.get("section_ref"))
    best, best_s = None, 0.0
    for s in secs:
        if s["level"] < 3 and not re.match(r"^\d+\.\d+", s["raw_title"]):
            continue  # skip sub-domain group headers in 04x/05x
        sc = score(challenge["title"], s["title"])
        if sc > best_s:
            best, best_s = s, sc
    return best, best_s


def load_state():
    ch = {c["code"]: c for c in read_csv(CHALLENGES)}
    ws = read_csv(WORKSHEET)
    existing = {r["challenge_code"] for r in read_csv(ANSWERS)} if os.path.exists(ANSWERS) else set()
    return ch, ws, existing


def pending(ch, ws, existing):
    out = []
    for r in ws:
        code = r["challenge_code"]
        if code in existing:
            continue
        if (r.get("answer_text") or "").strip():
            continue
        c = ch.get(code, {})
        out.append({**r, "stage": c.get("stage", ""),
                    "sub_domain": c.get("sub_domain", ""),
                    "section_ref": c.get("section_ref", ""),
                    "prevalence_rank": int(c.get("prevalence_rank") or 0),
                    "trending": c.get("trending", "")})
    # Highest prevalence first, then grouped by sub-domain so a batch is
    # internally coherent and the agent keeps one frame of reference.
    out.sort(key=lambda r: (-r["prevalence_rank"], r["section_ref"],
                            r["sub_domain"], r["challenge_code"]))
    return out


def cmd_status(_):
    ch, ws, existing = load_state()
    todo = pending(ch, ws, existing)
    done = len(ws) - len(todo)
    print(f"\n  {done}/{len(ws)} answered, {len(todo)} to go\n")
    by = {}
    for r in todo:
        by.setdefault((r["stream"], r["prevalence"]), []).append(r["challenge_code"])
    for (stream, prev), codes in sorted(by.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        print(f"  {stream:<14} {prev:<10} {len(codes):>3}  {' '.join(codes[:10])}"
              + (" ..." if len(codes) > 10 else ""))
    if os.path.exists(ANSWERS):
        rows = read_csv(ANSWERS)
        st = {}
        for r in rows:
            st[r.get("status", "?")] = st.get(r.get("status", "?"), 0) + 1
        print(f"\n  statuses in hr_challenge_answers.csv: {st}")
        print("  (nothing goes to customers until an employment-law reviewer "
              "moves rows to approved)")
    print()


def cmd_map(_):
    ch, ws, existing = load_state()
    rows = pending(ch, ws, existing)
    weak = []
    for r in rows:
        m, s = best_match({"title": r["title"], "section_ref": r["section_ref"]})
        if not m or s < 0.45:
            weak.append((r["challenge_code"], r["title"], r["section_ref"], round(s, 2),
                         m["title"] if m else "-"))
    print(f"\n  {len(rows) - len(weak)}/{len(rows)} matched to a report subsection "
          f"with confidence >= 0.45")
    if weak:
        print(f"\n  {len(weak)} need a manual section_ref or will come back "
              f"NEEDS_RESEARCH:\n")
        for code, title, ref, s, got in weak:
            print(f"   {code:<5} {s:<5} {ref:<11} {title[:48]:<50} -> {got[:40]}")
    print()


def build_brief(rows, out):
    """Write the grounding brief for `rows` to the `out` list of lines."""
    watch = read_csv(WATCHLIST) if os.path.exists(WATCHLIST) else []
    approved = [r for r in (read_csv(ANSWERS) if os.path.exists(ANSWERS) else [])
                if (r.get("answer_text") or "").strip()
                and not r["answer_text"].startswith("NEEDS_RESEARCH")]

    if approved:
        out.append("\n## VOICE CALIBRATION - match the register and shape of these\n")
        for r in approved[:3]:
            out.append(f"**[{r['challenge_code']}] answer_text:**\n")
            out.append(f"> {r['answer_text']}\n")
            out.append(f"- source_refs: `{r['source_refs']}`")
            out.append(f"- escalation_guidance: {r['escalation_guidance']}")
            out.append(f"- is_escalate_default: {r['is_escalate_default']}\n")

    if watch:
        out.append("\n## REGULATORY WATCHLIST")
        out.append("Check every commencement date you mention against this list.\n")
        for w in watch:
            vals = [f"{k}={v}" for k, v in w.items() if v and k != "id"]
            out.append("- " + "; ".join(vals))

    for r in rows:
        m, s = best_match(r)
        out.append("\n\n" + "=" * 74)
        out.append(f"\n# {r['challenge_code']} - {r['title']}\n")
        out.append(f"- stream: {r['stream']}  |  stage: {r['stage']}  |  "
                   f"sub_domain: {r['sub_domain']}")
        out.append(f"- prevalence: {r['prevalence']}  |  trending: {r['trending']}  |  "
                   f"jurisdiction: {r['jurisdiction']}")
        out.append(f"\n## GROUNDING SOURCE for {r['challenge_code']} - answer from this text only\n")
        if m and s >= 0.45:
            out.append(f"_(report subsection '{m['title']}', match confidence {s:.2f})_\n")
            out.append(m["body"])
        else:
            out.append("**NO CONFIDENT MATCH in the research report.**")
            out.append(f"Set answer_text for {r['challenge_code']} to "
                       f"`NEEDS_RESEARCH: <what is missing>`. Do not improvise.")


def cmd_next(args):
    ch, ws, existing = load_state()
    rows = pending(ch, ws, existing)[: args.n]
    if not rows:
        print("Nothing pending.")
        return
    watch = read_csv(WATCHLIST) if os.path.exists(WATCHLIST) else []

    print("=" * 78)
    print(f"BATCH: {len(rows)} challenges -> {' '.join(r['challenge_code'] for r in rows)}")
    print("Follow ANSWER-AGENT-PROMPT.md. Emit CSV only. status must be 'review'.")
    print("=" * 78)

    # Voice calibration: the agent has no file access, so the exemplars have
    # to travel with the brief.
    approved = [r for r in (read_csv(ANSWERS) if os.path.exists(ANSWERS) else [])
                if (r.get("answer_text") or "").strip()
                and not r["answer_text"].startswith("NEEDS_RESEARCH")]
    if approved:
        print("\n### VOICE CALIBRATION - match the register and shape of these\n")
        for r in approved[:3]:
            print(f"  [{r['challenge_code']}] answer_text:\n    {r['answer_text']}\n")
            print(f"    source_refs: {r['source_refs']}")
            print(f"    escalation_guidance: {r['escalation_guidance']}")
            print(f"    is_escalate_default: {r['is_escalate_default']}\n")

    if watch:
        print("\n### REGULATORY WATCHLIST (check every commencement date against this)\n")
        for w in watch:
            vals = [f"{k}={v}" for k, v in w.items() if v and k != "id"]
            print("  - " + "; ".join(vals))

    for r in rows:
        m, s = best_match(r)
        print("\n" + "=" * 78)
        print(f"## {r['challenge_code']} - {r['title']}")
        print(f"stream={r['stream']} | stage={r['stage']} | sub_domain={r['sub_domain']}")
        print(f"prevalence={r['prevalence']} | trending={r['trending']} | "
              f"jurisdiction={r['jurisdiction']} | section_ref={r['section_ref']}")
        print("\n### GROUNDING SOURCE - answer from this text only")
        if m and s >= 0.45:
            print(f"[matched '{m['title']}' confidence {s:.2f}]\n")
            print(m["body"])
        else:
            print("NO CONFIDENT MATCH in the research report.")
            print("Emit NEEDS_RESEARCH for this row. Do not improvise.")
    print("\n" + "=" * 78)
    print("END OF BATCH. Emit the CSV fragment now, header row first.")
    print("=" * 78)


def validate(rows):
    ch, ws, existing = load_state()
    valid_codes = {r["challenge_code"] for r in ws}
    errs, warns = [], []
    seen = set()

    for r in rows:
        code = (r.get("challenge_code") or "").strip()
        tag = code or "<no code>"
        a = (r.get("answer_text") or "").strip()
        needs_research = a.startswith("NEEDS_RESEARCH")

        if code not in valid_codes:
            errs.append(f"{tag}: not a challenge_code in the worksheet")
        if code in seen:
            errs.append(f"{tag}: duplicate row in this batch")
        seen.add(code)
        if code in existing:
            errs.append(f"{tag}: already present in hr_challenge_answers.csv")

        if (r.get("status") or "").strip() != "review":
            errs.append(f"{tag}: status is '{r.get('status')}', must be 'review'")

        esc = (r.get("is_escalate_default") or "").strip().upper()
        if esc not in ("TRUE", "FALSE"):
            errs.append(f"{tag}: is_escalate_default must be TRUE or FALSE")

        # Cheap topical backstop. The authoritative check is the calibrated
        # 3-tier gate in run_tier_gate(), which runs separately in cmd_check
        # because it needs the embedding model loaded.
        title = next((w["title"] for w in ws if w["challenge_code"] == code), "")
        hay = (title + " " + a).lower()
        if esc == "FALSE" and any(k in hay for k in ALWAYS_ESCALATE):
            hit = next(k for k in ALWAYS_ESCALATE if k in hay)
            errs.append(f"{tag}: is_escalate_default FALSE but topic matches "
                        f"always-escalate term '{hit}'")

        if needs_research:
            if (r.get("source_refs") or "").strip():
                warns.append(f"{tag}: NEEDS_RESEARCH row has source_refs set")
            continue

        if not a:
            errs.append(f"{tag}: answer_text empty")
            continue

        wc = len(a.split())
        if wc < 70 or wc > 170:
            warns.append(f"{tag}: answer_text is {wc} words (target 80-150)")

        if RATE_PAT.search(a):
            errs.append(f"{tag}: answer_text contains a rate/figure - "
                        f"'{RATE_PAT.search(a).group(0)}'. Never state rates.")
        if DASH_PAT.search(a) or DASH_PAT.search(r.get("escalation_guidance") or ""):
            errs.append(f"{tag}: em-dash or en-dash present, plain hyphens only")
        if not (r.get("source_refs") or "").strip():
            errs.append(f"{tag}: source_refs empty")
        if not (r.get("escalation_guidance") or "").strip():
            errs.append(f"{tag}: escalation_guidance empty")
        if re.search(r"^\s*[-*#]|\*\*", a, re.M):
            errs.append(f"{tag}: markdown in answer_text, prose only")

        for w in BANNED_WORDS:
            if re.search(r"\b" + re.escape(w) + r"\b", a, re.I):
                warns.append(f"{tag}: banned word '{w}'")
        for w in AMERICAN:
            if re.search(r"\b" + re.escape(w), a, re.I):
                warns.append(f"{tag}: American spelling '{w}'")
        if re.search(r"\b(we advise|legal advice|our legal view)\b", a, re.I):
            errs.append(f"{tag}: reads as legal advice - reword")
    return errs, warns


PROMPT_FILE = os.path.join(HERE, "ANSWER-AGENT-PROMPT.md")
BATCH_DIR = os.path.join(HERE, "batches")


def system_prompt_text():
    """Everything below the first '---' line of ANSWER-AGENT-PROMPT.md."""
    with io.open(PROMPT_FILE, encoding="utf-8") as f:
        body = f.read()
    parts = body.split("\n---\n", 1)
    return (parts[1] if len(parts) > 1 else body).strip()


ANSWER_TEMPLATE_HEAD = """<!--
HOW TO FILL THIS FILE

Replace every line marked TODO. Do not add, remove, rename or reorder blocks,
and do not change the `## CODE` headings - the parser matches on them.

Leave `status: review` exactly as it is. You do not approve anything.

If the brief said there was no confident match for a challenge, put
`NEEDS_RESEARCH: <what is missing>` as the whole answer_text, leave
source_refs empty, and set is_escalate_default to TRUE.

Return this entire file, filled in. Return nothing else.
-->

# Answers - batch {batch}

"""

ANSWER_BLOCK = """
## {code}
<!-- {title} -->

- jurisdiction: {jurisdiction}
- is_escalate_default: TODO
- status: review

### answer_text
TODO

### source_refs
TODO

### escalation_guidance
TODO

"""


def parse_answers_md(path):
    """Parse the filled ANSWERS.md back into answer rows."""
    with io.open(path, encoding="utf-8") as f:
        text = f.read()
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)

    rows = []
    blocks = re.split(r"\n##\s+(?=[A-Z]{1,3}\d+\s*$)", "\n" + text, flags=re.M)
    for blk in blocks:
        m = re.match(r"\s*([A-Z]{1,3}\d+)\s*\n", blk)
        if not m:
            continue
        code = m.group(1)
        row = {"challenge_code": code, "jurisdiction": "federal", "status": "review",
               "is_escalate_default": "", "answer_text": "", "source_refs": "",
               "escalation_guidance": ""}
        for key in ("jurisdiction", "is_escalate_default", "status"):
            km = re.search(rf"^\s*-\s*{key}\s*:\s*(.+?)\s*$", blk, re.M)
            if km:
                row[key] = km.group(1).strip()
        for field in ("answer_text", "source_refs", "escalation_guidance"):
            fm = re.search(rf"^###\s+{field}\s*$\n(.*?)(?=^###\s|\Z)", blk, re.M | re.S)
            if fm:
                val = fm.group(1).strip()
                if field == "source_refs":
                    lines = [l.strip().lstrip("-*").strip()
                             for l in val.split("\n") if l.strip()]
                    val = "|".join(l for l in lines if l and l != "TODO")
                else:
                    val = " ".join(val.split())
                row[field] = "" if val == "TODO" else val
        rows.append(row)
    return rows


def read_answer_file(path):
    if path.lower().endswith(".md"):
        return parse_answers_md(path)
    return read_csv(path)


def cmd_pack(args):
    ch, ws, existing = load_state()
    todo = pending(ch, ws, existing)
    if not todo:
        print("Nothing pending.")
        return
    os.makedirs(BATCH_DIR, exist_ok=True)
    prompt = system_prompt_text()

    made = 0
    skipped = []
    for i in range(0, len(todo), args.n):
        batch_no = i // args.n + 1
        if args.batch and batch_no != args.batch:
            continue
        rows = todo[i:i + args.n]
        d = os.path.join(BATCH_DIR, f"batch-{batch_no:02d}")
        os.makedirs(d, exist_ok=True)

        # Never clobber answers. A bare `pack` regenerates every batch, and
        # an ANSWERS.md that has been filled in - by an agent or by hand - is
        # work that cannot be recovered by re-running anything. This guard
        # exists because a careless `pack` destroyed 20 generated answers.
        ans_path = os.path.join(d, "ANSWERS.md")
        if os.path.exists(ans_path) and not args.force:
            try:
                existing_rows = parse_answers_md(ans_path)
                if any((r.get("answer_text") or "").strip() for r in existing_rows):
                    skipped.append(batch_no)
                    continue
            except Exception:  # noqa: BLE001
                pass

        out = [f"# Batch {batch_no:02d} - answering brief",
               "",
               f"Challenges in this batch: {' '.join(r['challenge_code'] for r in rows)}",
               "",
               "Fill in `ANSWERS.md` and return it. Follow the instructions below exactly.",
               "",
               "=" * 74, "", prompt, "", "=" * 74,
               "", "# THE BATCH", ""]
        build_brief(rows, out)
        with io.open(os.path.join(d, "PROMPT.md"), "w", encoding="utf-8") as f:
            f.write("\n".join(out) + "\n")

        tpl = [ANSWER_TEMPLATE_HEAD.format(batch=f"{batch_no:02d}")]
        for r in rows:
            tpl.append(ANSWER_BLOCK.format(code=r["challenge_code"],
                                           title=r["title"].replace("-->", "--"),
                                           jurisdiction=r["jurisdiction"] or "federal"))
        with io.open(os.path.join(d, "ANSWERS.md"), "w", encoding="utf-8") as f:
            f.write("".join(tpl))
        made += 1

    print(f"\n  wrote {made} batch pack(s) under batches/\n")
    print("  Each batch-NN/ holds:")
    print("    PROMPT.md   give this to the agent (prompt + grounding, self-contained)")
    print("    ANSWERS.md  the agent fills this in and returns it\n")
    print("  Then:  python answers_tool.py check batches/batch-01/ANSWERS.md")
    print("         python answers_tool.py merge batches/batch-01/ANSWERS.md")
    if skipped:
        print(f"\n  SKIPPED {len(skipped)} batch(es) that already hold answers: "
              f"{', '.join(f'{b:02d}' for b in skipped)}")
        print("  Those files were left alone. --force overwrites them, which")
        print("  throws that work away and cannot be undone.")
    print()


def run_tier_gate(rows):
    """Run the calibrated 3-tier gate as a ONE-WAY RATCHET on is_escalate_default.

    It can only ADD escalation. A 'safe' verdict from the gate means nothing
    here and never downgrades the keyword floor in validate().

    Why not let the gate own the field outright: it was calibrated on
    conversational user questions ("This happened right after they told us
    about it"), and the anchors are long contextual sentences. Challenge
    titles are terse noun phrases, a different input distribution. Measured
    on real titles it fires correctly on redundancy (+0.40), bullying (+0.44)
    and underpayment (+0.38), but scores "Dismissing an employee for poor
    performance" at -0.036, i.e. SAFE - because the SAFE anchors include
    "routine performance conversation" and "first written warning", which sit
    semantically close to it.

    So: gate for recall, ALWAYS_ESCALATE keyword list for the floor. The union
    catches the performance-dismissal case the gate alone would miss. Do not
    re-wire this so a 'safe' verdict clears a keyword hit.
    """
    try:
        sys.path.insert(0, HERE)
        import escalation_anchors as ea
    except Exception as e:  # noqa: BLE001
        return [("info", f"tier gate skipped ({e})")]

    _, ws, _ = load_state()
    titles = {w["challenge_code"]: w["title"] for w in ws}
    out = []
    for r in rows:
        code = r.get("challenge_code", "?")
        title = titles.get(code)
        if not title:
            continue
        declared = (r.get("is_escalate_default") or "").strip().upper() == "TRUE"
        try:
            tier = ea.classify(title)
        except Exception as e:  # noqa: BLE001
            return out + [("info", f"tier gate skipped ({e})")]
        if tier == "escalate" and not declared:
            out.append(("error", f"{code}: the calibrated gate scores this ESCALATE but "
                                 f"is_escalate_default is FALSE. The gate wins."))
        elif tier == "caution" and not declared:
            out.append(("warn", f"{code}: the gate scores this CAUTION and the row says "
                                f"FALSE. Confirm a human is not needed here."))
        elif tier == "safe" and declared:
            out.append(("info", f"{code}: gate says SAFE, row escalates anyway. Fine, "
                                f"just noting it."))
    return out


def full_check(rows, no_gate=False, no_citations=False):
    """Mechanical validation + calibrated escalation gate + citation verification."""
    errs, warns = validate(rows)
    infos = []
    if not no_gate:
        for lv, m in run_tier_gate(rows):
            (errs if lv == "error" else warns if lv == "warn" else infos).append(m)
    if not no_citations:
        try:
            sys.path.insert(0, HERE)
            import verify_citations as vc
            for lv, m in vc.verify_rows(rows):
                (errs if lv == "error" else warns if lv == "warn" else infos).append(m)
        except Exception as e:  # noqa: BLE001
            infos.append(f"citation check skipped ({e})")
    return errs, warns, infos


def cmd_check(args):
    rows = read_answer_file(args.file)
    if not rows:
        print("FAIL: no answer blocks found in that file")
        sys.exit(1)
    missing = [c for c in ANSWER_COLS if c not in rows[0].keys()]
    if missing:
        print(f"FAIL: missing columns {missing}")
        sys.exit(1)
    # parse_answers_md blanks the TODO sentinel, so an unfilled block shows up
    # as an empty answer or a literal TODO left in is_escalate_default.
    todo_left = [r["challenge_code"] for r in rows
                 if not (r.get("answer_text") or "").strip()
                 or (r.get("is_escalate_default") or "").strip().upper() == "TODO"
                 or "TODO" in (r.get("escalation_guidance") or "")]
    if todo_left:
        print(f"\n  FAIL: {len(todo_left)} block(s) still unfilled: "
              f"{', '.join(todo_left)}")
        print("  Send the file back to the agent - it has not completed it.\n")
        sys.exit(1)
    errs, warns, infos = full_check(rows, args.no_gate, args.no_citations)
    print(f"\n  {len(rows)} rows checked")
    for i in infos:
        print(f"  INFO  {i}")
    for w in warns:
        print(f"  WARN  {w}")
    for e in errs:
        print(f"  ERROR {e}")
    if errs:
        print(f"\n  {len(errs)} errors - send these back to the agent, do not merge.\n")
        sys.exit(1)
    print(f"\n  clean{' (' + str(len(warns)) + ' warnings to eyeball)' if warns else ''}. "
          f"Safe to merge.\n")


def cmd_merge(args):
    rows = read_answer_file(args.file)
    # Full gate, not just the mechanical pass, so merge can never accept a
    # batch that `check` would have rejected.
    errs, _, _ = full_check(rows)
    if errs:
        print(f"\nRefusing to merge - {len(errs)} error(s). Run `check` and fix them:")
        for e in errs[:8]:
            print(f"  ERROR {e}")
        sys.exit(1)
    have = read_csv(ANSWERS) if os.path.exists(ANSWERS) else []
    with io.open(ANSWERS, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=ANSWER_COLS)
        w.writeheader()
        for r in have + rows:
            w.writerow({k: r.get(k, "") for k in ANSWER_COLS})
    print(f"\n  merged {len(rows)} rows -> {len(have) + len(rows)} total in "
          f"hr_challenge_answers.csv\n")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("status").set_defaults(fn=cmd_status)
    sub.add_parser("map").set_defaults(fn=cmd_map)
    n = sub.add_parser("next"); n.add_argument("-n", type=int, default=5); n.set_defaults(fn=cmd_next)
    pk = sub.add_parser("pack")
    pk.add_argument("-n", type=int, default=5, help="challenges per batch")
    pk.add_argument("-b", "--batch", type=int, default=None, help="only this batch number")
    pk.add_argument("--force", action="store_true",
                    help="overwrite batches that already hold answers (destroys them)")
    pk.set_defaults(fn=cmd_pack)
    c = sub.add_parser("check")
    c.add_argument("file")
    c.add_argument("--no-gate", action="store_true",
                   help="skip the calibrated escalation gate (offline / fast)")
    c.add_argument("--no-citations", action="store_true",
                   help="skip corpus citation verification (offline / fast)")
    c.set_defaults(fn=cmd_check)
    m = sub.add_parser("merge"); m.add_argument("file"); m.set_defaults(fn=cmd_merge)
    a = p.parse_args()
    a.fn(a)
