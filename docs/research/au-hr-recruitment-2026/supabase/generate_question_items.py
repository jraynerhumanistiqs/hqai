#!/usr/bin/env python3
"""
HQ.ai | Question-item generation pipeline (scaffold).

Expands the 102-challenge register into structured, deduplicated draft question
items along axes: persona x intent x jurisdiction x template. Output is CSV that
loads straight into public.hr_question_items (embedding left NULL for the ONNX job,
status = 'draft' for the QA workflow).

This is deterministic template expansion - the reliable spine. For phrasing VARIETY
(the "hundreds of thousands" volume), swap `expand_templates()` for `expand_with_llm()`
and point it at your ONNX/LLM. The rest of the pipeline (axes, dedupe, safety tags,
CSV/SQL emit) stays identical.

Usage:
    python generate_question_items.py            # -> question_items_generated.csv
    python generate_question_items.py --sql      # also -> 05_question_items_seed.sql
    python generate_question_items.py --cap 3    # max templates per (challenge,persona,intent)
"""
import csv, hashlib, re, sys, os

REGISTER_CSV = "hr_challenges.csv"
OUT_CSV = "question_items_generated.csv"
OUT_SQL = "05_question_items_seed.sql"

PERSONAS = ["accidental_hr", "owner", "office_manager", "manager"]

# Which challenges vary by state/territory -> expand across jurisdictions.
JURISDICTION_SENSITIVE = {"PF17", "PM14", "PM15", "PF11"}
JURISDICTIONS = ["federal", "nsw", "vic", "qld", "wa", "sa", "tas", "act", "nt"]

# High-risk challenges: flag generated drafts for an escalation-review pass.
HIGH_RISK = {"PM9", "PF26", "PF27", "RA17", "PM10", "PM7", "RS22"}

# Intent applicability by sub-domain keyword (first match wins; always add explain/check).
def intents_for(stream, stage, sub_domain):
    sd = (sub_domain or "").lower()
    base = ["explain", "check"]
    if any(k in sd for k in ["pay", "leave", "super", "notice", "payroll"]):
        base += ["calc"]
    if stream == "People" and any(k in sd for k in
            ["termination", "discipline", "performance", "conduct", "onboarding", "policies"]):
        base += ["decision", "draft"]
    if stream == "Recruitment":
        base += ["decision", "draft"]
    if stream == "Cross-cutting":
        base = ["explain", "decision"]
    # de-dup, keep order
    seen, out = set(), []
    for i in base:
        if i not in seen:
            seen.add(i); out.append(i)
    return out

# Template banks keyed by intent. {topic} = short challenge topic in plain words.
TEMPLATES = {
    "explain": [
        "Can someone explain in plain English how {topic} works?",
        "What do I actually need to know about {topic}?",
    ],
    "check": [
        "Am I doing {topic} right, or am I about to get this wrong?",
        "Quick check - is what I'm doing for {topic} actually compliant?",
    ],
    "decision": [
        "I'm stuck on {topic} - which way should I go?",
        "How do I make the right call on {topic} without it backfiring?",
    ],
    "draft": [
        "Can you draft something for {topic} I can actually use?",
        "I need wording for {topic} - can you write it for me?",
    ],
    "calc": [
        "How do I work out the numbers for {topic}?",
        "What am I supposed to pay / accrue for {topic}?",
    ],
    "escalate": [
        "This {topic} situation feels risky - am I out of my depth here?",
    ],
}

def topic_from_title(title):
    t = re.sub(r"\(.*?\)", "", title)            # drop parentheticals
    t = re.sub(r"[?]", "", t).strip().rstrip(".")
    return t[0].lower() + t[1:] if t else title

def norm(s):
    return re.sub(r"\s+", " ", s.strip().lower())

def dedup_hash(challenge_code, jurisdiction, question):
    return hashlib.sha256(f"{challenge_code}|{jurisdiction}|{norm(question)}".encode()).hexdigest()

def compliance_sensitive(stream, stage, sub_domain):
    sd = (sub_domain or "").lower()
    if stream == "People":
        return True
    if stream == "Recruitment" and any(k in sd for k in ["pay", "checks", "offer", "ai-in-hiring", "job ads"]):
        return True
    return False

def expand_templates(row, cap):
    """Deterministic template expansion. Returns list of item dicts."""
    code, title, stream, stage, sub_domain, prevalence, prank, trending, sref = (
        row["code"], row["title"], row["stream"], row["stage"],
        row["sub_domain"], row["prevalence"], row["prevalence_rank"],
        row["trending"], row["section_ref"])
    topic = topic_from_title(title)
    jurs = JURISDICTIONS if code in JURISDICTION_SENSITIVE else ["federal"]
    intents = intents_for(stream, stage, sub_domain)
    cs = compliance_sensitive(stream, stage, sub_domain)
    tags = [t for t in [stream.lower(), stage.lower(), (trending if trending in ("new","trending_sharp") else None)] if t]
    if code in HIGH_RISK:
        tags = tags + ["review-escalation"]
    items = []
    for persona in PERSONAS:
        for intent in intents:
            tmpls = TEMPLATES.get(intent, [])[:cap]
            for ti, tmpl in enumerate(tmpls):
                q = tmpl.format(topic=topic)
                for jur in jurs:
                    # difficulty: scale with prevalence_rank + intent risk
                    diff = min(5, 1 + (5 - int(prank or 2)) + (1 if intent in ("decision","escalate") else 0))
                    items.append(dict(
                        challenge_code=code,
                        question_text=q,
                        intent=intent,
                        persona=persona,
                        difficulty=max(1, min(5, diff)),
                        jurisdiction=jur,
                        requires_escalation="false",
                        escalation_reason="",
                        compliance_sensitive="true" if cs else "false",
                        status="draft",
                        tags=tags,
                        dedup_hash=dedup_hash(code, jur, q),
                    ))
    return items

def expand_with_llm(row, cap):
    """PLUG POINT. Replace expand_templates with a call to your ONNX/LLM to get
    natural paraphrase variety per (challenge, persona, intent, jurisdiction).
    Contract: return the same list-of-dicts shape as expand_templates(). Keep
    dedup_hash(), compliance_sensitive(), and the HIGH_RISK tagging so safety and
    dedupe survive. Recommended prompt inputs: challenge title + description +
    practitioner-language exemplars from Appendix A, constrained to the intent."""
    raise NotImplementedError("Wire this to your embedding/LLM stack.")

def main():
    cap = 2
    emit_sql = "--sql" in sys.argv
    if "--cap" in sys.argv:
        cap = int(sys.argv[sys.argv.index("--cap") + 1])

    with open(REGISTER_CSV, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    all_items, seen = [], set()
    for row in rows:
        for it in expand_templates(row, cap):
            if it["dedup_hash"] in seen:
                continue
            seen.add(it["dedup_hash"])
            all_items.append(it)

    # CSV (Postgres array literal for tags)
    def pg_array(xs):
        return "{" + ",".join('"' + x.replace('"', '\\"') + '"' for x in xs) + "}"

    cols = ["challenge_code","question_text","intent","persona","difficulty",
            "jurisdiction","requires_escalation","escalation_reason",
            "compliance_sensitive","status","tags","dedup_hash"]
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for it in all_items:
            w.writerow([it["challenge_code"], it["question_text"], it["intent"],
                        it["persona"], it["difficulty"], it["jurisdiction"],
                        it["requires_escalation"], it["escalation_reason"],
                        it["compliance_sensitive"], it["status"],
                        pg_array(it["tags"]), it["dedup_hash"]])

    if emit_sql:
        def s(v):
            return "NULL" if v in (None, "") else "'" + str(v).replace("'", "''") + "'"
        def s_arr(xs):
            if not xs: return "'{}'"
            inner = ",".join('"' + x.replace('"','\\"') + '"' for x in xs)
            return "'{" + inner + "}'"
        with open(OUT_SQL, "w", encoding="utf-8") as f:
            f.write("-- Generated draft question items. Run AFTER 03_question_items.sql.\n")
            f.write("-- embedding left NULL for the ONNX job; status='draft' for QA.\n")
            B = 500
            for i in range(0, len(all_items), B):
                chunk = all_items[i:i+B]
                f.write("insert into public.hr_question_items "
                        "(challenge_code,question_text,intent,persona,difficulty,jurisdiction,"
                        "requires_escalation,compliance_sensitive,status,tags,dedup_hash) values\n")
                vals = []
                for it in chunk:
                    vals.append("  ({},{},{},{},{},{},{},{},{},{},{})".format(
                        s(it["challenge_code"]), s(it["question_text"]), s(it["intent"]),
                        s(it["persona"]), it["difficulty"], s(it["jurisdiction"]),
                        it["requires_escalation"], it["compliance_sensitive"],
                        s(it["status"]), s_arr(it["tags"]), s(it["dedup_hash"])))
                f.write(",\n".join(vals))
                f.write("\non conflict (dedup_hash) do nothing;\n\n")

    # report
    from collections import Counter
    by_stream = Counter(i["challenge_code"][:2] for i in all_items)
    by_intent = Counter(i["intent"] for i in all_items)
    print(f"generated draft items: {len(all_items)} (deduped)")
    print(f"unique dedup_hashes: {len(seen)}  (== rows: {len(seen)==len(all_items)})")
    print(f"by intent: {dict(by_intent)}")
    print(f"jurisdiction-expanded items: {sum(1 for i in all_items if i['jurisdiction']!='federal')}")
    print(f"compliance_sensitive: {sum(1 for i in all_items if i['compliance_sensitive']=='true')}")
    print(f"wrote {OUT_CSV}" + (f" and {OUT_SQL}" if emit_sql else ""))

if __name__ == "__main__":
    main()
