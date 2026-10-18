-- HQ.ai | Hybrid baseline = Reciprocal Rank Fusion (RRF) of lexical + vector.
-- No leakage, no new data: fuses the two retrievers already built (07 + 08).
-- Run AFTER 08_vector_baseline.sql.

-- Fuse lexical (match_challenges_lexical) and vector (challenge embeddings) top-10
-- for a given gold question, RRF with k0=60, return top-k challenge codes.
create or replace function public.match_hybrid(p_ext text, k int default 5)
returns table(code text, score numeric)
language sql stable as $$
    with lex as (
        select m.code, row_number() over (order by m.rank desc) as rn
        from public.match_challenges_lexical((select question_text from public.hr_eval_gold where ext_id = p_ext), 10) m
    ),
    vec as (
        select ce.code, row_number() over (order by ce.embedding <=> ge.embedding) as rn
        from public.hr_challenge_embedding ce
        cross join (select embedding from public.hr_gold_embedding where ext_id = p_ext) ge
        order by ce.embedding <=> ge.embedding
        limit 10
    )
    select u.code, sum(1.0/(60 + u.rn)) as score
    from (select code, rn from lex union all select code, rn from vec) u
    group by u.code
    order by score desc, u.code
    limit k;
$$;

create or replace function public.run_hybrid_baseline(p_label text)
returns uuid language plpgsql as $$
declare v_run uuid;
begin
    insert into public.hr_eval_runs(label, model_name, notes)
    values (p_label, 'lexical + all-MiniLM-L6-v2 (RRF k0=60)',
            'Hybrid baseline: reciprocal rank fusion of lexical and vector retrieval; same gold + metrics + escalation gate.')
    returning id into v_run;

    insert into public.hr_eval_results
        (run_id, gold_id, predicted_challenge_code, retrieved_codes,
         predicted_intent, predicted_escalation, answer_grounded, latency_ms)
    select v_run, g.id,
        (select code from public.match_hybrid(g.ext_id, 5) limit 1),
        array(select code from public.match_hybrid(g.ext_id, 5)),
        null,
        public.predict_escalation(g.question_text),
        case when g.requires_source then exists (
            select 1 from public.hr_challenge_answers a
            where a.challenge_code = (select code from public.match_hybrid(g.ext_id,5) limit 1)
              and coalesce(array_length(a.source_refs,1),0) > 0)
          else true end,
        0
    from public.hr_eval_gold g;
    return v_run;
end; $$;
