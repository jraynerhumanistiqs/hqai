#!/usr/bin/env python3
"""Check an answer batch's citations against the live knowledge_chunks corpus.

  python verify_citations.py batches/batch-01/ANSWERS.md

A fabricated citation is the dangerous failure: it survives human review by
looking right. This resolves each cited source against the corpus the chatbot
actually retrieves from, and separately checks the answer's own content
surfaces the sources it claims.

HOW MUCH EACH CHECK CAN CLAIM - the corpus is not uniform:

  fair-work-act   1,471 chunks across 959 distinct sections. That is
                  effectively the whole Act, so a cited section that is NOT
                  there is strong evidence it does not exist -> ERROR.
  fwo               173 chunks across only 29 ingested topics. A cited FWO
                  page may be real and simply not ingested -> WARN, never
                  an error.
  modern-award    2,618 chunks across 41 of roughly 121 modern awards. Same
                  reasoning -> WARN.
  anything else   ATO, state legislation, Safe Work, Respect@Work. Out of
                  corpus by design -> INFO, cannot be checked here.

So ERRORs here are trustworthy and WARNs need a human glance. That asymmetry
is deliberate: a checker that cries wolf gets ignored.

Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
"""
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from difflib import SequenceMatcher

HERE = os.path.dirname(os.path.abspath(__file__))

SUPPORT_TOP_K = 8
SUPPORT_MIN_SIM = 0.35


def _find_env():
    """Walk up from this file and from cwd looking for hqai/.env.local.

    Resolved by search rather than a fixed ../../../.. hop so this keeps
    working whether the research folder sits beside the hqai repo or inside
    it. A hard-coded depth silently broke when the folder moved.
    """
    seen = []
    for start in (HERE, os.getcwd()):
        d = start
        for _ in range(8):
            for cand in (os.path.join(d, ".env.local"),
                         os.path.join(d, "hqai", ".env.local")):
                seen.append(cand)
                if os.path.exists(cand):
                    return cand
            parent = os.path.dirname(d)
            if parent == d:
                break
            d = parent
    raise SystemExit("Could not find .env.local. Looked upward from "
                     f"{HERE} and {os.getcwd()}.")


def _load_env():
    p = _find_env()
    for line in io.open(p, encoding="utf-8"):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line)
        if m and not os.environ.get(m.group(1)):
            os.environ[m.group(1)] = m.group(2).strip().strip("\"'")


def _rest(path, prefer=None):
    url = f"{os.environ['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/{path}"
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    h = {"apikey": key, "Authorization": f"Bearer {key}"}
    if prefer:
        h["Prefer"] = prefer
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=h)))


def _rpc(fn, payload):
    url = f"{os.environ['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/rpc/{fn}"
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))


def _embed(text):
    req = urllib.request.Request(
        "https://api.openai.com/v1/embeddings",
        data=json.dumps({"model": "text-embedding-3-small", "input": text[:28000]}).encode(),
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"})
    return json.load(urllib.request.urlopen(req))["data"][0]["embedding"]


_CACHE = {}


def corpus_index():
    """Pull the corpus's section titles and source titles once."""
    if _CACHE:
        return _CACHE
    acts, fwo, awards = set(), set(), set()
    for off in range(0, 4000, 1000):
        rows = _rest(f"knowledge_chunks?select=source,source_title,section"
                     f"&limit=1000&offset={off}")
        if not rows:
            break
        for r in rows:
            src = r.get("source") or ""
            if src == "fair-work-act" and r.get("section"):
                acts.add(r["section"])
            elif src == "fwo" and r.get("source_title"):
                fwo.add(r["source_title"])
            elif src.startswith("modern-award") and r.get("source_title"):
                awards.add(r["source_title"])
    _CACHE.update(act_sections=acts, fwo_titles=fwo, award_titles=awards)
    # "s 117 - Requirement for notice" -> {"117"}
    nums = set()
    for s in acts:
        m = re.match(r"\s*s\s*(\d+[A-Z]*)", s, re.I)
        if m:
            nums.add(m.group(1).upper())
    _CACHE["act_numbers"] = nums
    return _CACHE


def _norm(s):
    s = re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower())
    return re.sub(r"\s+", " ", s).strip()


def _best(needle, haystack):
    nn, best, bs = _norm(needle), None, 0.0
    for h in haystack:
        sc = SequenceMatcher(None, nn, _norm(h)).ratio()
        if sc > bs:
            best, bs = h, sc
    return best, bs


def classify_ref(ref):
    r = ref.strip()
    if re.search(r"fair\s*work\s*act|\bFWA\b", r, re.I):
        return "act"
    if re.search(r"fair\s*work\s*ombudsman|^fwo\b|\bFWO\s*[-–]", r, re.I):
        return "fwo"
    if re.search(r"\bMA\d{6}\b|\baward\b", r, re.I):
        return "award"
    if re.search(r"fair\s*work\s*commission|\bFWC\b", r, re.I):
        return "fwc"
    return "external"


def act_sections_in(ref):
    """Pull section numbers out of 'ss340-361', 's 117', 's 15A'."""
    out = set()
    for m in re.finditer(r"\bss?\s*(\d+[A-Z]*)\s*(?:[-–]\s*(\d+[A-Z]*))?", ref, re.I):
        a, b = m.group(1).upper(), m.group(2)
        out.add(a)
        if b:  # a range: include the endpoints, they are the checkable part
            out.add(b.upper())
    return out


def verify_row(row, idx):
    """Return [(level, message)] for one answer row."""
    code = row.get("challenge_code", "?")
    answer = (row.get("answer_text") or "").strip()
    refs = [r.strip() for r in (row.get("source_refs") or "").split("|") if r.strip()]
    out = []

    if answer.startswith("NEEDS_RESEARCH"):
        return [("info", f"{code}: NEEDS_RESEARCH, citations not checked")]
    if not refs:
        return [("error", f"{code}: no source_refs to verify")]

    cited_in_corpus = []
    for ref in refs:
        kind = classify_ref(ref)
        if kind == "act":
            secs = act_sections_in(ref)
            if not secs:
                out.append(("info", f"{code}: '{ref}' cites the Act with no section, "
                                    f"cannot pin down"))
                cited_in_corpus.append(("act", None))
                continue
            missing = [s for s in secs if s not in idx["act_numbers"]]
            if missing:
                out.append(("error", f"{code}: Fair Work Act s{'/s'.join(sorted(missing))} "
                                     f"is not in the corpus. 959 sections are indexed, so "
                                     f"this section very likely does not exist. Check '{ref}'."))
            else:
                cited_in_corpus.append(("act", sorted(secs)))
        elif kind == "fwo":
            topic = re.split(r"\s[-–]\s", ref, maxsplit=1)
            topic = topic[1] if len(topic) > 1 else ref
            best, sc = _best(topic, idx["fwo_titles"])
            if sc < 0.55:
                out.append(("warn", f"{code}: FWO page '{topic}' is not among the 29 "
                                    f"ingested topics (closest '{best}', {sc:.2f}). Real "
                                    f"page or invented? Confirm it resolves."))
            else:
                cited_in_corpus.append(("fwo", best))
        elif kind == "award":
            best, sc = _best(ref, idx["award_titles"])
            if sc < 0.5:
                out.append(("warn", f"{code}: award '{ref}' is not among the 41 ingested "
                                    f"awards (closest '{best}'). Cannot verify here."))
            else:
                cited_in_corpus.append(("award", best))
        else:
            out.append(("info", f"{code}: '{ref}' is outside the ingested corpus "
                                f"(state law, ATO, regulator). Not checkable here."))

    # Support check: does the answer's own content retrieve what it cites?
    if cited_in_corpus:
        try:
            hits = _rpc("match_knowledge", {
                "query_embedding": _embed(answer),
                "query_text": answer,
                "match_count": SUPPORT_TOP_K,
                "min_similarity": SUPPORT_MIN_SIM,
                "source_filter": None,
                "jurisdiction_filter": None,
            }) or []
        except Exception as e:  # noqa: BLE001
            out.append(("info", f"{code}: support check skipped ({e})"))
            return out

        got_titles = {(h.get("source_title") or "") for h in hits}
        got_secs = set()
        for h in hits:
            m = re.match(r"\s*s\s*(\d+[A-Z]*)", h.get("section") or "", re.I)
            if m:
                got_secs.add(m.group(1).upper())

        overlap = False
        for kind, val in cited_in_corpus:
            if kind == "act" and (val is None or (set(val) & got_secs)):
                overlap = True
            elif kind in ("fwo", "award") and val in got_titles:
                overlap = True
        if not overlap:
            top = sorted(got_titles)[:2]
            out.append(("warn", f"{code}: retrieving on this answer's own text surfaces "
                                f"{top} - none of its cited sources. Either the citation "
                                f"is wrong or the answer drifts from it."))
    return out


def verify_rows(rows):
    _load_env()
    idx = corpus_index()
    findings = []
    for r in rows:
        findings.extend(verify_row(r, idx))
    return findings


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    sys.path.insert(0, HERE)
    import answers_tool as at
    rows = at.read_answer_file(sys.argv[1])
    findings = verify_rows(rows)

    errs = [m for lv, m in findings if lv == "error"]
    warns = [m for lv, m in findings if lv == "warn"]
    infos = [m for lv, m in findings if lv == "info"]

    print(f"\n  {len(rows)} rows, citations checked against the live corpus\n")
    for m in infos:
        print(f"  INFO  {m}")
    for m in warns:
        print(f"  WARN  {m}")
    for m in errs:
        print(f"  ERROR {m}")
    print(f"\n  {len(errs)} errors, {len(warns)} warnings\n")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
