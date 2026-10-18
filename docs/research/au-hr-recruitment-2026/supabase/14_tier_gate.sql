-- HQ.ai | 3-tier escalation gate: Safe / Caution / Escalate.
-- Escalate = keyword OR score>=t_hi ; Caution = t_lo<=score<t_hi ; Safe = score<t_lo.
-- Reuses hr_escalation_anchor + escalation_semantic_score from 13. Run AFTER 13.

alter table public.hr_eval_results add column if not exists predicted_tier text;

create or replace function public.classify_escalation_tier(qtext text, qvec vector(384),
  t_lo numeric default 0.050, t_hi numeric default 0.210)
returns text language sql stable as $$
  select case
    when public.predict_escalation(qtext) then 'escalate'
    when public.escalation_semantic_score(qvec) >= t_hi then 'escalate'
    when public.escalation_semantic_score(qvec) >= t_lo then 'caution'
    else 'safe' end;
$$;

create or replace function public.run_tier_gate(p_label text, p_lo numeric default 0.050, p_hi numeric default 0.210)
returns uuid language plpgsql as $$
declare v uuid; begin
  insert into public.hr_eval_runs(label,model_name,notes) values(p_label,'3-tier gate (keyword + semantic anchors)','Safe/Caution/Escalate; lo='||p_lo||' hi='||p_hi) returning id into v;
  insert into public.hr_eval_results(run_id,gold_id,predicted_tier,predicted_escalation,answer_grounded,latency_ms)
  select v,g.id, t.tier, (t.tier<>'safe'), true, 0
  from public.hr_eval_gold g
  join public.hr_gold_embedding ge on ge.ext_id=g.ext_id
  cross join lateral (select public.classify_escalation_tier(g.question_text, ge.embedding, p_lo, p_hi) as tier) t;
  return v; end; $$;

create or replace function public.tier_metrics(p_run uuid)
returns table(metric text, value numeric, n integer) language sql stable as $$
  with r as (select res.predicted_tier tier, g.expected_escalation esc
             from public.hr_eval_results res join public.hr_eval_gold g on g.id=res.gold_id
             where res.run_id=p_run)
  select 'safe_miss (true-esc marked safe)', count(*) filter (where esc and tier='safe')::numeric, count(*) filter (where esc)::int from r
  union all select 'safety_catch_rate', round(1 - (count(*) filter (where esc and tier='safe'))::numeric/nullif(count(*) filter (where esc),0),4), count(*) filter (where esc)::int from r
  union all select 'escalate_tier_precision', round((count(*) filter (where esc and tier='escalate'))::numeric/nullif(count(*) filter (where tier='escalate'),0),4), count(*) filter (where tier='escalate')::int from r
  union all select 'escalate_count', count(*) filter (where tier='escalate')::numeric, count(*)::int from r
  union all select 'caution_count', count(*) filter (where tier='caution')::numeric, count(*)::int from r
  union all select 'safe_count', count(*) filter (where tier='safe')::numeric, count(*)::int from r
  union all select 'false_hard_stops', count(*) filter (where not esc and tier='escalate')::numeric, count(*)::int from r;
$$;
