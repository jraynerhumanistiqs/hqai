#!/usr/bin/env python3
"""The answering agent for hr_challenge_answers.

Implements the design argued for earlier in this project: generation and
verification are separate roles with separate context, and the checks that can
be mechanical are mechanical.

Per challenge:

  1. WRITER x3   Three independent drafts at temperature 1.0, each seeing only
                 the governing report subsection. Independent samples are the
                 cheapest hallucination detector there is: where three passes
                 over the same source disagree on a fact, one of them invented
                 it. A single draft gives you no signal at all.

  2. CONSISTENCY Compare the drafts on the things that matter - the escalation
                 call, the cited sources, and every numeral. A number that
                 appears in one draft and not the others is the classic
                 confabulation and is flagged by name.

  3. VERIFIER    A separate call that sees ONLY the chosen answer and the
                 source passage - never the writer's reasoning. Self-critique
                 inside the writer's own context is close to worthless; the
                 model defends what it just wrote. Returns a list of claims
                 the source does not support.

  4. GATE        Hands off to answers_tool.full_check: mechanical rules, the
                 calibrated escalation gate (one-way ratchet) and citation
                 verification against the live knowledge_chunks corpus.

  5. PROVENANCE  Model, prompt hash, source subsection, sample agreement,
                 verifier verdict and a risk score per row, so the human
                 reviewer reads the risky ones closely instead of reading 95
                 rows flat.

Nothing here approves anything. Every row lands at status=review for an
Australian employment-law practitioner to sign off.

  python answer_agent.py --batch 1 --dry     estimate cost, call nothing
  python answer_agent.py --batch 1           run one batch
  python answer_agent.py --all               run every remaining batch
"""
import argparse
import concurrent.futures
import hashlib
import io
import json
import os
import re
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import answers_tool as at  # noqa: E402

MODEL = "claude-opus-5-5"
SAMPLES = 3
MAX_TOKENS = 4000
WRITER_TEMP = 1.0
CONCURRENCY = 3

# claude-opus-5-5, $ per million tokens
PRICE_IN, PRICE_OUT, PRICE_CACHE_READ, PRICE_CACHE_WRITE = 4.00, 20.00, 0.20, 5.00

OUTPUT_CONTRACT = """

## OUTPUT FOR THIS RUN - this overrides the output-format section above

Return a SINGLE JSON object and nothing else. No markdown fence, no commentary.

{
  "challenge_code": "<the code you were given>",
  "answer_text": "<80-150 words of plain prose, no markdown>",
  "source_refs": ["<one real, checkable source per entry>"],
  "escalation_guidance": "<1-2 sentences naming the trigger and the risk>",
  "is_escalate_default": true | false,
  "confidence": "high" | "medium" | "low",
  "uncertain_about": "<empty string, or what you are not sure the source supports>"
}

If the GROUNDING SOURCE does not let you answer safely, set answer_text to
"NEEDS_RESEARCH: <what is missing>", leave source_refs empty, set
is_escalate_default true and confidence low.

Be honest in `confidence` and `uncertain_about`. They route a human reviewer's
attention. Marking a shaky answer "high" wastes the one scarce resource here.

## is_escalate_default - set it TRUE whenever the challenge OR your own answer
## touches any of these

dismissal, termination, redundancy, restructure, serious misconduct, general
protections, adverse action, discrimination, harassment, bullying,
underpayment or wage theft, workplace investigations, psychosocial hazards,
contractor-versus-employee classification, sham contracting, pregnancy,
parental leave, illness or injury, an employee who has engaged a lawyer or
union, abandonment of employment, performance improvement plans, disciplinary
process, procedural fairness.

This is a floor, not a judgement call, and a downstream gate enforces it. If
your answer says that getting something wrong creates underpayment exposure,
that counts - the topic is now an underpayment topic. Err towards TRUE: being
more cautious than necessary costs a conversation, being less costs a claim.
"""

VERIFIER_SYSTEM = """You verify Australian HR knowledge-base answers against \
their source passage. You did not write the answer and you have no stake in it.

You are given a SOURCE passage and an ANSWER. Judge ONLY the prose of the \
ANSWER, claim by claim: does the SOURCE support it?

What counts as unsupported:
- A factual claim about what the law, an award or an instrument requires that \
the source does not state. Your own knowledge of Australian employment law is \
not evidence here - the only question is what this passage supports.
- An OPERATIVE number the source does not contain: a qualifying period, a \
threshold, a week or year count, a headcount cut-off, a pay rate, a dollar \
figure, a clause number, a time limit. These are the dangerous ones.

What does NOT count, and must NOT be reported:
- The year inside the name of an instrument. "Fair Work Act 2009", "Industrial \
Relations Act 2016", "Sex Discrimination Act 1984" are NAMES. The year is part \
of the name, not an operative figure. Never list these as unsupported numbers.
- The citation list. You are not shown it to audit, and a separate tool checks \
citations against the live corpus. Judge the prose only.
- Standing product instructions: telling the reader to check the award, use the \
Fair Work Pay Calculator rather than quoting a rate, keep records, put it in \
writing, or speak to their adviser. These are policy, not claims about the \
source, and the product requires them.
- General prudential advice with no specific legal content ("get advice before \
you act", "re-check when the business changes").

Return a SINGLE JSON object, nothing else:

{
  "unsupported_claims": ["<exact phrase from the answer>", ...],
  "unsupported_numbers": ["<each operative figure not in the source>", ...],
  "verdict": "supported" | "partly_supported" | "unsupported"
}

Empty lists and "supported" is the expected result for a well-grounded answer. \
Do not invent problems to look diligent - a verifier that flags everything gets \
ignored, which is worse than no verifier. Report only what a reviewer would \
genuinely need to check."""


def load_env():
    d = HERE
    for _ in range(8):
        p = os.path.join(d, ".env.local")
        if os.path.exists(p):
            for line in io.open(p, encoding="utf-8"):
                m = re.match(r"^([A-Z0-9_]+)=(.*)$", line)
                if m and not os.environ.get(m.group(1)):
                    os.environ[m.group(1)] = m.group(2).strip().strip("\"'")
            return
        parent = os.path.dirname(d)
        if parent == d:
            break
        d = parent
    raise SystemExit("Could not find .env.local above " + HERE)


def system_prompt():
    return at.system_prompt_text() + OUTPUT_CONTRACT


def grounding_for(row):
    """The governing report subsection, verbatim."""
    m, score = at.best_match(row)
    if not m or score < 0.45:
        return None, 0.0
    return m["body"], score


def user_message(row, body):
    return (
        f"# {row['challenge_code']} - {row['title']}\n\n"
        f"- stream: {row['stream']}  |  stage: {row['stage']}  |  "
        f"sub_domain: {row['sub_domain']}\n"
        f"- prevalence: {row['prevalence']}  |  jurisdiction: "
        f"{row['jurisdiction'] or 'federal'}\n\n"
        f"## GROUNDING SOURCE - answer from this text only\n\n{body}\n\n"
        f"Now return the JSON object for {row['challenge_code']}."
    )


def parse_json(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.M)
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                return None
    return None


class Meter:
    def __init__(self):
        self.i = self.o = self.cr = self.cw = 0
        self.calls = 0

    def add(self, u):
        self.calls += 1
        self.i += getattr(u, "input_tokens", 0) or 0
        self.o += getattr(u, "output_tokens", 0) or 0
        self.cr += getattr(u, "cache_read_input_tokens", 0) or 0
        self.cw += getattr(u, "cache_creation_input_tokens", 0) or 0

    def usd(self):
        return (self.i * PRICE_IN + self.o * PRICE_OUT
                + self.cr * PRICE_CACHE_READ + self.cw * PRICE_CACHE_WRITE) / 1e6

    def line(self):
        return (f"{self.calls} calls | in {self.i:,} (cache read {self.cr:,}, "
                f"write {self.cw:,}) | out {self.o:,} | ${self.usd():.2f}")


METER = Meter()


def call(client, system, user, temperature=None, retries=4):
    """One message, with retry on rate limit and transient failures."""
    import anthropic
    kwargs = dict(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=[{"type": "text", "text": system,
                 "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user}],
    )
    if temperature is not None:
        kwargs["temperature"] = temperature
    for attempt in range(retries):
        try:
            r = client.messages.create(**kwargs)
            METER.add(r.usage)
            return "".join(b.text for b in r.content if b.type == "text")
        except anthropic.RateLimitError:
            time.sleep(min(60, 5 * (attempt + 1) ** 2))
        except anthropic.APIStatusError as e:
            if e.status_code >= 500:
                time.sleep(3 * (attempt + 1))
            else:
                raise
        except anthropic.APIConnectionError:
            time.sleep(3 * (attempt + 1))
    raise RuntimeError("exhausted retries")


NUM = re.compile(r"\b\d+(?:[.,]\d+)?\s*(?:weeks?|years?|months?|days?|hours?|"
                 r"employees?|%|per cent)?\b", re.I)
# "Fair Work Act 2009", "Industrial Relations Act 2016" - the year belongs to
# the instrument's NAME. Counting it as a statutory figure made every single
# answer in the first run look divergent and unsupported.
ACT_YEAR = re.compile(r"\bAct\s+(\d{4})\b|\b(?:19|20)\d{2}\b(?=\s*\()", re.I)


def numerals(text):
    text = text or ""
    years_in_names = {m.group(1) for m in ACT_YEAR.finditer(text) if m.group(1)}
    out = set()
    for m in NUM.finditer(text):
        tok = m.group(0).strip().lower()
        bare = tok.rstrip("s").strip()
        if bare in years_in_names or (bare.isdigit() and bare in years_in_names):
            continue
        out.add(tok)
    return out


def consistency(drafts):
    """Agreement across independent samples. Divergence is the signal."""
    ok = [d for d in drafts if d]
    if len(ok) < 2:
        return {"agreement": "insufficient", "escalate_agree": False,
                "divergent_numbers": [], "shared_refs": []}
    esc = [bool(d.get("is_escalate_default")) for d in ok]
    escalate_agree = len(set(esc)) == 1

    numsets = [numerals(d.get("answer_text", "")) for d in ok]
    everywhere = set.intersection(*numsets) if numsets else set()
    anywhere = set.union(*numsets) if numsets else set()
    divergent = sorted(anywhere - everywhere)

    refsets = [set(r.strip().lower() for r in (d.get("source_refs") or [])) for d in ok]
    shared = sorted(set.intersection(*refsets)) if refsets else []

    if escalate_agree and not divergent:
        level = "high"
    elif escalate_agree:
        level = "medium"
    else:
        level = "low"
    return {"agreement": level, "escalate_agree": escalate_agree,
            "divergent_numbers": divergent, "shared_refs": shared}


def choose(drafts, cons):
    """Pick the draft that best represents the majority."""
    ok = [d for d in drafts if d]
    if not ok:
        return None
    esc = [bool(d.get("is_escalate_default")) for d in ok]
    majority = max(set(esc), key=esc.count)
    pool = [d for d in ok if bool(d.get("is_escalate_default")) == majority] or ok

    def score(d):
        refs = set(r.strip().lower() for r in (d.get("source_refs") or []))
        # Prefer drafts that cite what the others cite, and that do not carry
        # numerals the other samples failed to reproduce.
        overlap = len(refs & set(cons["shared_refs"]))
        lone = len(numerals(d.get("answer_text", "")) & set(cons["divergent_numbers"]))
        conf = {"high": 2, "medium": 1, "low": 0}.get(d.get("confidence"), 1)
        return (overlap - lone * 2 + conf, -len(d.get("answer_text", "")))

    return max(pool, key=score)


def risk_score(chosen, cons, verdict):
    """Higher means read this one closely."""
    s = 0
    if cons["agreement"] == "low":
        s += 3
    elif cons["agreement"] == "medium":
        s += 1
    s += min(3, len(cons["divergent_numbers"]))
    if verdict:
        s += {"unsupported": 4, "partly_supported": 2}.get(verdict.get("verdict"), 0)
        s += min(3, len(verdict.get("unsupported_numbers") or []))
    if (chosen or {}).get("confidence") == "low":
        s += 2
    elif (chosen or {}).get("confidence") == "medium":
        s += 1
    if chosen and chosen.get("uncertain_about"):
        s += 1
    return s


def run_challenge(client, row, sys_prompt, samples):
    code = row["challenge_code"]
    body, match_score = grounding_for(row)
    if not body:
        return {
            "challenge_code": code,
            "answer": {"challenge_code": code,
                       "answer_text": "NEEDS_RESEARCH: no confident match to a "
                                      "report subsection for this challenge.",
                       "source_refs": [], "escalation_guidance": "Escalate until researched.",
                       "is_escalate_default": True, "confidence": "low"},
            "provenance": {"match_score": 0.0, "agreement": "n/a",
                           "verifier": None, "risk": 9, "samples": 0},
        }

    user = user_message(row, body)
    drafts = []
    for _ in range(samples):
        txt = call(client, sys_prompt, user, temperature=WRITER_TEMP)
        drafts.append(parse_json(txt))

    cons = consistency(drafts)
    chosen = choose(drafts, cons)
    if not chosen:
        raise RuntimeError(f"{code}: no parseable draft")

    verdict = None
    ans = chosen.get("answer_text", "")
    if not ans.startswith("NEEDS_RESEARCH"):
        vtxt = call(
            client, VERIFIER_SYSTEM,
            f"SOURCE:\n\n{body}\n\n---\n\nANSWER:\n\n{ans}\n\n"
            f"CITED SOURCES: {'; '.join(chosen.get('source_refs') or []) or '(none)'}\n\n"
            f"Return the JSON object.",
        )
        verdict = parse_json(vtxt)

    return {
        "challenge_code": code,
        "answer": chosen,
        "provenance": {
            "model": MODEL, "samples": samples,
            "match_score": round(match_score, 3),
            "agreement": cons["agreement"],
            "escalate_agree": cons["escalate_agree"],
            "divergent_numbers": cons["divergent_numbers"],
            "verifier": verdict,
            "risk": risk_score(chosen, cons, verdict),
            "generated_at": time.strftime("%Y-%m-%d"),
            "source_subsection_sha": hashlib.sha256(body.encode()).hexdigest()[:12],
        },
    }


def write_answers_md(path, rows, results):
    by = {r["challenge_code"]: r for r in results}
    out = [at.ANSWER_TEMPLATE_HEAD.format(batch=os.path.basename(os.path.dirname(path)))]
    for row in rows:
        r = by.get(row["challenge_code"])
        a = (r or {}).get("answer") or {}
        refs = a.get("source_refs") or []
        out.append(
            f"\n## {row['challenge_code']}\n"
            f"<!-- {row['title']} -->\n\n"
            f"- jurisdiction: {row['jurisdiction'] or 'federal'}\n"
            f"- is_escalate_default: {'TRUE' if a.get('is_escalate_default') else 'FALSE'}\n"
            f"- status: review\n\n"
            f"### answer_text\n{a.get('answer_text','')}\n\n"
            f"### source_refs\n" + ("\n".join(refs) if refs else "") + "\n\n"
            f"### escalation_guidance\n{a.get('escalation_guidance','')}\n"
        )
    io.open(path, "w", encoding="utf-8").write("".join(out))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", type=int, default=None)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--samples", type=int, default=SAMPLES)
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()

    load_env()
    ch, ws, existing = at.load_state()
    todo = at.pending(ch, ws, existing)
    if not todo:
        print("Nothing pending.")
        return

    batches = [todo[i:i + 5] for i in range(0, len(todo), 5)]
    if a.batch:
        picked = [(a.batch, batches[a.batch - 1])]
    elif a.all:
        picked = list(enumerate(batches, 1))
    else:
        raise SystemExit("Pass --batch N or --all")

    n = sum(len(rows) for _, rows in picked)
    calls = n * (a.samples + 1)
    print(f"\n  model      {MODEL}")
    print(f"  challenges {n}  |  samples {a.samples}  |  ~{calls} API calls")
    if a.dry:
        print(f"  rough estimate: ${calls * 0.045:.2f} "
              f"(writer ~8K in / ~500 out each, verifier smaller)\n")
        return

    import anthropic
    client = anthropic.Anthropic()
    sys_prompt = system_prompt()
    t0 = time.time()
    failed_batches = []

    for bno, rows in picked:
        d = os.path.join(at.BATCH_DIR, f"batch-{bno:02d}")
        os.makedirs(d, exist_ok=True)
        print(f"\n  batch {bno:02d}: {' '.join(r['challenge_code'] for r in rows)}")

        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
            futs = {ex.submit(run_challenge, client, r, sys_prompt, a.samples): r
                    for r in rows}
            for f in concurrent.futures.as_completed(futs):
                row = futs[f]
                try:
                    res = f.result()
                except Exception as e:  # noqa: BLE001
                    print(f"    {row['challenge_code']}: FAILED {e}")
                    continue
                results.append(res)
                p = res["provenance"]
                v = (p.get("verifier") or {}).get("verdict", "-")
                flag = "  <-- review closely" if p["risk"] >= 5 else ""
                print(f"    {res['challenge_code']:<5} agree={p['agreement']:<6} "
                      f"verifier={v:<16} risk={p['risk']}{flag}")

        # Refuse to write a partial file. Writing one anyway replaces the
        # TODO template with blocks that are empty but no longer say TODO -
        # a file that LOOKS filled. That is how a failed run gets mistaken
        # for a finished one. (This is exactly what happened when the API
        # credit balance ran out mid-run: thirteen batches wrote
        # empty-but-plausible files in one second each.)
        done = {r["challenge_code"] for r in results}
        missing = [r["challenge_code"] for r in rows if r["challenge_code"] not in done]
        if missing:
            print(f"    REFUSING TO WRITE batch {bno:02d}: {len(missing)} of "
                  f"{len(rows)} challenges failed ({', '.join(missing)}).")
            print(f"    {os.path.join(d, 'ANSWERS.md')} left untouched.")
            failed_batches.append(bno)
            continue

        results.sort(key=lambda r: [x["challenge_code"] for x in rows].index(r["challenge_code"])
                     if r["challenge_code"] in [x["challenge_code"] for x in rows] else 99)
        write_answers_md(os.path.join(d, "ANSWERS.md"), rows, results)
        io.open(os.path.join(d, "_provenance.json"), "w", encoding="utf-8").write(
            json.dumps({r["challenge_code"]: r["provenance"] for r in results},
                       indent=2))
        print(f"    wrote {d}/ANSWERS.md and _provenance.json")

    print(f"\n  {METER.line()}  |  {time.time()-t0:.0f}s")
    if failed_batches:
        print(f"\n  {len(failed_batches)} batch(es) NOT written: "
              f"{', '.join(f'{b:02d}' for b in failed_batches)}")
        print(f"  Fix the cause and re-run those batches.\n")
        sys.exit(1)
    print(f"\n  Next: python answers_tool.py check "
          f"batches/batch-{picked[0][0]:02d}/ANSWERS.md\n")


if __name__ == "__main__":
    main()
