#!/usr/bin/env python3
"""Emit 06_challenge_answers.sql (table + every row of hr_challenge_answers.csv).
Reads the CSV; never writes it. Answers are canonical, keyed by challenge_code, plain-voice,
sourced, and marked status='review' (worked examples - need human sign-off, not legal advice)."""
import csv, os

def s(v):
    if v is None or v == "":
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    return "'" + str(v).replace("'", "''") + "'"

def arr(xs):
    if not xs:
        return "'{}'"
    inner = ",".join('"' + x.replace('"', '\\"') + '"' for x in xs)
    # whole array is a single-quoted SQL literal -> double any single quotes inside
    return "'{" + inner.replace("'", "''") + "}'"

# The 7 hand-written worked examples that seeded the table. Every other row
# came through answers_tool.py merge. They keep their reviewed_by label so the
# provenance stays visible in the database.
WORKED_EXAMPLES = {"PF26", "PF27", "PM9", "PM10", "PM7", "RA17", "RS22"}

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hr_challenge_answers.csv")


def load_answers(path=CSV_PATH):
    """Read hr_challenge_answers.csv - the single source of truth for answers.

    This script used to hold the 7 worked examples inline and WRITE the CSV,
    which meant running it after any merge silently threw away every merged
    answer. It now only READS the CSV and emits SQL.
    """
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    out = []
    for r in rows:
        status = (r.get("status") or "").strip()
        if status not in ("draft", "review", "approved", "rejected"):
            raise SystemExit(f"{r.get('challenge_code')}: bad status '{status}'")
        refs = [x.strip() for x in (r.get("source_refs") or "").split("|") if x.strip()]
        out.append({
            "code": r["challenge_code"].strip(),
            "jur": (r.get("jurisdiction") or "federal").strip(),
            "ans": r["answer_text"].strip(),
            "refs": refs,
            "esc": (r.get("escalation_guidance") or "").strip(),
            "esc_default": (r.get("is_escalate_default") or "").strip().upper() == "TRUE",
            "status": status,
        })
    return out


DDL = r"""-- HQ.ai | Canonical answers keyed by challenge (the ~150-answer knowledge layer).
-- One approved answer per challenge per jurisdiction. Question items point here via
-- challenge_code; this is what retrieval grounds on. Run AFTER 03_question_items.sql.

create table if not exists public.hr_challenge_answers (
    id                  uuid primary key default gen_random_uuid(),
    challenge_code      text not null references public.hr_challenges(code) on update cascade,
    jurisdiction        text not null default 'federal',
    answer_text         text not null,
    answer_format       text not null default 'plain',     -- tone marker (plain, non-legal-advice)
    source_refs         text[] not null default '{}',      -- T1 citations backing the answer
    escalation_guidance text,                               -- when to route to a professional
    is_escalate_default boolean not null default false,     -- challenge should generally escalate
    status              text not null default 'draft'
                          check (status in ('draft','review','approved','rejected')),
    version             integer not null default 1,
    reviewed_by         text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    unique (challenge_code, jurisdiction)                   -- one canonical answer per challenge/jurisdiction
);
comment on table public.hr_challenge_answers is
    'Canonical, sourced answers keyed by challenge_code (+ jurisdiction). The knowledge the bot grounds on. compliance_sensitive answers must have source_refs before status=approved.';

create index if not exists hr_ca_challenge_idx on public.hr_challenge_answers (challenge_code);
create index if not exists hr_ca_status_idx    on public.hr_challenge_answers (status);

drop trigger if exists trg_hr_ca_updated on public.hr_challenge_answers;
create trigger trg_hr_ca_updated before update on public.hr_challenge_answers
    for each row execute function public.set_updated_at();

-- RLS: SERVICE ROLE ONLY. RLS is on and there is deliberately NO policy, so
-- neither the anon nor the authenticated API key can read or write this table.
-- The product reads it server-side with the service-role client; no browser
-- session needs it. Do not add a read policy without a decision.
alter table public.hr_challenge_answers enable row level security;
-- Earlier versions of this file let `authenticated` read approved rows. The
-- drop stays so re-running this file on such a database removes that policy.
drop policy if exists hr_ca_read on public.hr_challenge_answers;

-- Guard: an approved answer on a compliance-sensitive challenge must cite a source.
-- (Advisory trigger - blocks approve without source_refs.)
create or replace function public.hr_ca_require_source()
returns trigger language plpgsql as $$
begin
    if new.status = 'approved' and coalesce(array_length(new.source_refs,1),0) = 0 then
        raise exception 'Cannot approve answer for % with no source_refs', new.challenge_code;
    end if;
    return new;
end;
$$;
drop trigger if exists trg_hr_ca_source on public.hr_challenge_answers;
create trigger trg_hr_ca_source before insert or update on public.hr_challenge_answers
    for each row execute function public.hr_ca_require_source();

-- Answer-coverage view: which challenges still need a canonical answer (write these first).
-- NOTE on the views in this file: they are created `with (security_invoker = true)`.
-- Without it a view runs with its owner's rights and bypasses RLS on the tables
-- underneath, which on Supabase exposes every row to the anon API key.
create or replace view public.hr_answer_coverage with (security_invoker = true) as
select c.code, c.title, c.stream, c.stage, c.prevalence, c.prevalence_rank, c.trending,
       count(a.id) filter (where a.status = 'approved') as approved_answers,
       count(a.id)                                      as total_answers
from public.hr_challenges c
left join public.hr_challenge_answers a on a.challenge_code = c.code
group by c.code, c.title, c.stream, c.stage, c.prevalence, c.prevalence_rank, c.trending
order by c.prevalence_rank desc, approved_answers asc;   -- high-value, unanswered first

-- Item + canonical answer, resolved by challenge_code and jurisdiction (federal fallback).
create or replace view public.hr_item_with_answer with (security_invoker = true) as
select q.id as item_id, q.challenge_code, q.question_text, q.jurisdiction,
       coalesce(a_j.answer_text, a_fed.answer_text)         as answer_text,
       coalesce(a_j.source_refs, a_fed.source_refs)         as source_refs,
       coalesce(a_j.escalation_guidance, a_fed.escalation_guidance) as escalation_guidance
from public.hr_question_items q
left join public.hr_challenge_answers a_j
       on a_j.challenge_code = q.challenge_code and a_j.jurisdiction = q.jurisdiction
left join public.hr_challenge_answers a_fed
       on a_fed.challenge_code = q.challenge_code and a_fed.jurisdiction = 'federal';
"""

OUT = os.path.dirname(os.path.abspath(__file__))
ANSWERS = load_answers()
with open(os.path.join(OUT, "06_challenge_answers.sql"), "w", encoding="utf-8", newline="\n") as f:
    f.write(DDL)
    n_nr = sum(1 for a in ANSWERS if a["ans"].startswith("NEEDS_RESEARCH"))
    f.write(f"\n-- Canonical answers generated from hr_challenge_answers.csv by build_answers.py.\n"
            f"-- {len(ANSWERS)} rows; none approved - an employment-law reviewer moves rows to approved.\n"
            f"-- {n_nr} row(s) are NEEDS_RESEARCH placeholders with empty source_refs, so they never\n"
            f"-- count as grounded and the approve guard blocks approving them.\n")
    f.write("insert into public.hr_challenge_answers\n"
            "  (challenge_code,jurisdiction,answer_text,source_refs,escalation_guidance,"
            "is_escalate_default,status,reviewed_by) values\n")
    rows = []
    for a in ANSWERS:
        reviewed = "worked-example (needs human sign-off)" if a["code"] in WORKED_EXAMPLES else None
        rows.append("  ({},{},{},{},{},{},{},{})".format(
            s(a["code"]), s(a["jur"]), s(a["ans"]), arr(a["refs"]), s(a["esc"]),
            s(a["esc_default"]), s(a["status"]), s(reviewed)))
    f.write(",\n".join(rows))
    # Re-run safety. Approvals happen in the database, not in the CSV, so a
    # re-run keeps the stored status - EXCEPT when the content changed. An
    # approved (or rejected) answer whose text, sources or escalation fields
    # change goes back to review with the reviewer cleared: sign-off covered
    # the old wording, not the new one. Unchanged rows are not touched at all.
    f.write("\non conflict (challenge_code,jurisdiction) do update set\n"
            "  answer_text=excluded.answer_text, source_refs=excluded.source_refs,\n"
            "  escalation_guidance=excluded.escalation_guidance,\n"
            "  is_escalate_default=excluded.is_escalate_default,\n"
            "  status = case when hr_challenge_answers.status in ('approved','rejected')\n"
            "                then 'review' else hr_challenge_answers.status end,\n"
            "  reviewed_by = case when hr_challenge_answers.status in ('approved','rejected')\n"
            "                then null else hr_challenge_answers.reviewed_by end,\n"
            "  version = hr_challenge_answers.version + 1,\n"
            "  updated_at=now()\n"
            "where (hr_challenge_answers.answer_text, hr_challenge_answers.source_refs,\n"
            "       hr_challenge_answers.escalation_guidance, hr_challenge_answers.is_escalate_default)\n"
            "  is distinct from\n"
            "      (excluded.answer_text, excluded.source_refs,\n"
            "       excluded.escalation_guidance, excluded.is_escalate_default);\n")

by_status = {}
for a in ANSWERS:
    by_status[a["status"]] = by_status.get(a["status"], 0) + 1
print(f"06_challenge_answers.sql written from hr_challenge_answers.csv: {len(ANSWERS)} rows {by_status}")
print(f"is_escalate_default TRUE: {sum(a['esc_default'] for a in ANSWERS)}, "
      f"NEEDS_RESEARCH: {sum(a['ans'].startswith('NEEDS_RESEARCH') for a in ANSWERS)}")
