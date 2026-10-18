#!/usr/bin/env python3
"""Emit 06_challenge_answers.sql (table + 7 hard-escalate worked-example rows) and
hr_challenge_answers.csv. Answers are canonical, keyed by challenge_code, plain-voice,
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

# challenge_code, jurisdiction, answer, source_refs[], escalation_guidance
ANSWERS = [
 ("PF26","federal",
  "Since 1 January 2025, intentionally underpaying wages or entitlements is a criminal offence under the Fair Work Act, on top of the existing civil penalties. Honest mistakes are not criminalised, but you still have to fix them. If you find a shortfall: work out exactly who was affected, for what, and how much; back-pay promptly; keep clear records of the correction; and look at the Fair Work Ombudsman's Voluntary Small Business Wage Compliance Code - following it can protect a small business from criminal referral for that conduct.",
  ["Fair Work Ombudsman - Paying wages / underpayments","FWO - Voluntary Small Business Wage Compliance Code","Fair Work Act 2009 (wage theft, from 1 Jan 2025)"],
  "Systemic, long-running, or large underpayments, anything that could look deliberate, or any uncertainty about the criminal threshold - get an employment lawyer or registered agent BEFORE self-reporting or negotiating repayment with staff."),
 ("PF27","federal",
  "Finding an underpayment is not the emergency; mishandling it is. Step through it: confirm the correct award, classification and rate for the period; calculate the gap per person including super and any penalties/overtime; back-pay it and pay the super shortfall; write to each affected employee explaining the correction; and keep the workings. Do not quietly adjust future pays to 'make it back' - that is not a lawful correction.",
  ["Fair Work Ombudsman - We've been underpaying our staff","ATO - Super guarantee charge / shortfalls"],
  "Large, multi-year, or multi-employee shortfalls, or anything that might be viewed as deliberate, cross into wage-theft territory - take advice before acting, and see PF26."),
 ("PM9","federal",
  "You cannot take 'adverse action' (dismiss, demote, cut hours, or refuse to hire) against someone because they have or exercised a workplace right - making a complaint or enquiry about their employment, taking leave, or union involvement - or because of a protected attribute. General protections have no minimum employment period and no small-business exemption, and if a claim is lodged the reverse onus applies: you must prove the action was not for a prohibited reason. Timing is the trap - acting soon after someone raised a concern or took leave invites a claim even when your reason was genuine.",
  ["Fair Work Ombudsman - Protection from discrimination at work / general protections","Fair Work Act 2009 ss340-361"],
  "Any dismissal or discipline close in time to a complaint, leave, illness, injury, or pregnancy - get legal advice before you act. This is the single highest reverse-onus risk in the People stream."),
 ("PM10","federal",
  "A redundancy is only 'genuine' if the job itself (not the person) is no longer needed because of operational change, you met any consultation obligation in the award or agreement, and it was not reasonable to redeploy the person elsewhere. Businesses with fewer than 15 employees are exempt from statutory redundancy PAY, but not from notice, and not from unfair-dismissal or general-protections exposure if the redundancy is not genuine. Replacing the person soon after, or using 'redundancy' to move on someone you simply do not rate, defeats the genuineness test.",
  ["Fair Work Ombudsman - Redundancy","Fair Work Act 2009 s119 (redundancy pay), s121 (small business exemption), s389 (genuine redundancy)"],
  "Selecting between people for one role, larger restructures, or any redundancy that could be read as a disguised dismissal - take advice before notifying anyone."),
 ("PM7","federal",
  "Summary (instant) dismissal is only lawful for genuine serious misconduct - such as theft, fraud, serious safety breaches, or violence - and even then you must run a fair process: put the specific allegations to the employee, give them a real chance to respond, and decide on the evidence rather than the heat of the moment. Getting the 'serious misconduct' call wrong, or skipping the process, is one of the most common ways a small business loses an unfair-dismissal claim.",
  ["Fair Work Ombudsman - Ending employment / serious misconduct","Fair Work Regulations 2009 reg 1.07 (meaning of serious misconduct)"],
  "Contested facts, a senior employee, or any case where you are not certain the conduct clears the serious-misconduct bar - get advice before you dismiss on the spot."),
 ("RA17","federal",
  "Sponsoring an overseas worker means becoming an approved business sponsor and meeting employer obligations under the migration system - nominating the role, paying at least the market salary rate, keeping records, and honouring ongoing sponsor obligations. This is a Department of Home Affairs process, separate from Fair Work. It can be worth it for genuinely hard-to-fill roles, but it carries real cost, lead time, and ongoing compliance load, so weigh it against redesigning or re-scoping the role.",
  ["Department of Home Affairs - Employing and sponsoring someone","Home Affairs - Skills in Demand / employer sponsorship obligations"],
  "Sponsorship is specialist - use a registered migration agent or immigration lawyer. Do not self-navigate nomination, salary-rate, or sponsor-obligation compliance."),
 ("RS22","federal",
  "If you use AI to screen, rank, or shortlist candidates, you remain legally responsible for the outcome - including bias you did not intend, and bias that originates in a vendor's algorithm through proxies like postcode, name, or gaps in work history. Australian anti-discrimination law and Fair Work general protections apply in full; there is no AI carve-out. From 10 December 2026, Privacy Act transparency rules require your privacy policy to disclose the personal information used in automated decisions such as automated screening or interview-invite calls.",
  ["Australian Human Rights Commission - guidance on AI and recruitment","OAIC - Privacy Act automated decision-making transparency (from 10 Dec 2026)"],
  "Before deploying any automated screening tool, and on any bias or privacy complaint - get legal/privacy advice and run vendor due diligence on how the tool was tested for bias."),
]

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

alter table public.hr_challenge_answers enable row level security;
drop policy if exists hr_ca_read on public.hr_challenge_answers;
create policy hr_ca_read on public.hr_challenge_answers
    for select to authenticated using (status = 'approved');

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
create or replace view public.hr_answer_coverage as
select c.code, c.title, c.stream, c.stage, c.prevalence, c.prevalence_rank, c.trending,
       count(a.id) filter (where a.status = 'approved') as approved_answers,
       count(a.id)                                      as total_answers
from public.hr_challenges c
left join public.hr_challenge_answers a on a.challenge_code = c.code
group by c.code, c.title, c.stream, c.stage, c.prevalence, c.prevalence_rank, c.trending
order by c.prevalence_rank desc, approved_answers asc;   -- high-value, unanswered first

-- Item + canonical answer, resolved by challenge_code and jurisdiction (federal fallback).
create or replace view public.hr_item_with_answer as
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

OUT = "."
with open(os.path.join(OUT, "06_challenge_answers.sql"), "w", encoding="utf-8") as f:
    f.write(DDL)
    f.write("\n-- Worked examples: the 7 hard-escalate challenges. status='review' (need human sign-off).\n")
    f.write("insert into public.hr_challenge_answers\n"
            "  (challenge_code,jurisdiction,answer_text,source_refs,escalation_guidance,"
            "is_escalate_default,status,reviewed_by) values\n")
    rows = []
    for code, jur, ans, refs, esc in ANSWERS:
        rows.append("  ({},{},{},{},{},true,'review','worked-example (needs human sign-off)')".format(
            s(code), s(jur), s(ans), arr(refs), s(esc)))
    f.write(",\n".join(rows))
    f.write("\non conflict (challenge_code,jurisdiction) do update set\n"
            "  answer_text=excluded.answer_text, source_refs=excluded.source_refs,\n"
            "  escalation_guidance=excluded.escalation_guidance,\n"
            "  is_escalate_default=excluded.is_escalate_default, updated_at=now();\n")

with open(os.path.join(OUT, "hr_challenge_answers.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["challenge_code","jurisdiction","answer_text","source_refs",
                "escalation_guidance","is_escalate_default","status"])
    for code, jur, ans, refs, esc in ANSWERS:
        w.writerow([code, jur, ans, "|".join(refs), esc, "true", "review"])

print(f"canonical answers written: {len(ANSWERS)} (all is_escalate_default=true, status=review)")
print("codes:", ", ".join(a[0] for a in ANSWERS))
