-- HQ.ai | Retrieval + escalation BASELINE (lexical, no embeddings required).
-- This is the reference implementation for producing a REAL hr_eval_metrics run today,
-- before the ONNX embeddings land. When embeddings are populated, swap
-- match_challenges_lexical() for a vector search (match_hr_questions) and re-run to compare.
-- Run AFTER 06_challenge_answers.sql.

-- ------------------------------------------------------------
-- Lexical challenge retrieval: rank challenges by OR-overlap of query lexemes
-- against the challenge's search document (title + sub_domain + stage + stream).
-- ------------------------------------------------------------
create or replace function public.match_challenges_lexical(q text, k int default 5)
returns table(code text, rank real)
language sql stable as $$
    with ql as (
        select nullif(array_to_string(tsvector_to_array(to_tsvector('english', q)), ' | '), '') as orq
    )
    select c.code,
           ts_rank(
             to_tsvector('english',
               c.title || ' ' || coalesce(c.sub_domain,'') || ' ' || c.stage || ' ' || c.stream),
             to_tsquery('english', ql.orq)) as rank
    from public.hr_challenges c, ql
    where ql.orq is not null
    order by rank desc, c.code
    limit k;
$$;

-- ------------------------------------------------------------
-- Escalation gate: principled high-risk triggers from the Section 6 boundary map.
-- Topic-independent (timing/severity), which is the correct design principle -
-- routing on challenge alone over-triggers (e.g. routine redundancy questions).
-- ------------------------------------------------------------
create or replace function public.predict_escalation(q text)
returns boolean
language sql immutable as $$
    select q ~* '(underpay|wrong (award|classification|rate)|doing (this|it) wrong'
             '|wage theft|visa|sponsor|no witness'
             '|genuine redundancy if|don''t like the person|same job.*(month|later)'
             '|(stress|sick|carer).{0,25}leave.*(perform|disciplin|sack|dismiss|manage)'
             '|(perform|disciplin|sack|dismiss|manage).{0,25}(stress|sick).{0,10}leave'
             '|serious misconduct|on the spot|instant dismissal|pregnan)';
$$;

-- ------------------------------------------------------------
-- Run the baseline over the whole gold set into a fresh eval run. Returns run id.
--   select public.run_lexical_baseline('lexical-baseline-v1');
--   select * from public.hr_eval_metrics( <that id> );
-- ------------------------------------------------------------
create or replace function public.run_lexical_baseline(p_label text)
returns uuid
language plpgsql as $$
declare
    v_run uuid;
begin
    insert into public.hr_eval_runs(label, model_name, notes)
    values (p_label, 'lexical-ts_rank + rule-escalation',
            'Baseline: FTS challenge retrieval, no embeddings; rule-based escalation gate; grounded = a canonical answer with sources exists for the predicted challenge.')
    returning id into v_run;

    insert into public.hr_eval_results
        (run_id, gold_id, predicted_challenge_code, retrieved_codes,
         predicted_intent, predicted_escalation, answer_grounded, latency_ms)
    select
        v_run, g.id,
        (select code from public.match_challenges_lexical(g.question_text, 5) limit 1),
        array(select code from public.match_challenges_lexical(g.question_text, 5)),
        null,                                   -- baseline has no intent classifier
        public.predict_escalation(g.question_text),
        case when g.requires_source then exists (
              select 1 from public.hr_challenge_answers a
              where a.challenge_code =
                    (select code from public.match_challenges_lexical(g.question_text,5) limit 1)
                and coalesce(array_length(a.source_refs,1),0) > 0)
             else true end,
        0
    from public.hr_eval_gold g;

    return v_run;
end;
$$;
