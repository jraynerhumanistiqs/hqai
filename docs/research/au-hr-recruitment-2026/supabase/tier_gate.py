#!/usr/bin/env python3
"""3-tier escalation gate: Safe / Caution / Escalate.
Escalate = keyword OR score>=t_hi ; Caution = t_lo<=score<t_hi ; Safe = score<t_lo.
Safety metric: a true escalation in CAUTION still counts as caught (user is routed to
advice); the only catastrophic error is a true escalation in SAFE. Calibrate t_lo for
~zero Safe-misses, t_hi for a high-precision hard-stop tier. Emits 14_tier_gate.sql."""
import csv, os, re, math
from fastembed import TextEmbedding
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

# reuse the same anchors + keyword rule as escalation_classifier.py (kept in sync)
# Anchors, keyword rule and model now live in escalation_anchors.py so there is
# ONE copy. They used to be duplicated here and in the sibling script with a
# "kept in sync" comment, which is how a classifier quietly starts scoring
# something other than what it was calibrated on.
from escalation_anchors import ESCALATE, SAFE, KW, MODEL_NAME

gold = []
with open("hr_eval_gold.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        gold.append((r["question_text"], r["expected_escalation"].strip().lower() == "true"))

model = TextEmbedding(MODEL_NAME)
def emb(t):
    out=[]
    for v in model.embed(t):
        v=list(v); n=math.sqrt(sum(x*x for x in v)) or 1.0; out.append([x/n for x in v])
    return out
esc_e, safe_e = emb(ESCALATE), emb(SAFE)
q_e = emb([q for q,_ in gold])
cos=lambda a,b: sum(x*y for x,y in zip(a,b))
scores=[max(cos(qv,a) for a in esc_e)-max(cos(qv,a) for a in safe_e) for qv in q_e]
kw=[bool(KW.search(q)) for q,_ in gold]
y=[l for _,l in gold]; P=sum(y); N=len(y)-P

def tiers(t_lo,t_hi):
    out=[]
    for i in range(len(y)):
        if kw[i] or scores[i]>=t_hi: out.append("escalate")
        elif scores[i]>=t_lo: out.append("caution")
        else: out.append("safe")
    return out

def metrics(t_lo,t_hi):
    tt=tiers(t_lo,t_hi)
    safe_miss=sum(1 for i in range(len(y)) if y[i] and tt[i]=="safe")
    esc=[i for i in range(len(y)) if tt[i]=="escalate"]
    cau=[i for i in range(len(y)) if tt[i]=="caution"]
    esc_prec=(sum(1 for i in esc if y[i])/len(esc)) if esc else 0.0
    return dict(t_lo=t_lo,t_hi=t_hi,safe_miss=safe_miss,
                catch=round(1-safe_miss/P,3),
                esc_n=len(esc),esc_prec=round(esc_prec,3),
                cau_n=len(cau),cau_false=sum(1 for i in cau if not y[i]),
                false_hardstop=sum(1 for i in esc if not y[i]))

print(f"gold n={len(y)}  escalations={P}  non={N}\n")
# find highest t_lo giving 0 safe-miss, then best t_hi for escalate precision
lo_grid=[round(x/1000,3) for x in range(20,90,5)]
hi_grid=[round(x/1000,3) for x in range(90,260,10)]
best_lo=min(lo_grid)
for lo in sorted(lo_grid, reverse=True):
    if metrics(lo, 99)["safe_miss"]==0:   # t_hi huge -> only lo matters for safe-miss
        best_lo=lo; break
# pick t_hi: smallest hi with escalate precision >= 0.60 (confident hard-stop)
best_hi=hi_grid[-1]
for hi in hi_grid:
    m=metrics(best_lo,hi)
    if m["esc_prec"]>=0.60:
        best_hi=hi; break
print("candidate operating points (t_lo fixed for 0 safe-miss):")
print("  t_lo   t_hi | safe_miss catch | esc_n esc_prec false_stop | cau_n cau_false")
for hi in hi_grid:
    m=metrics(best_lo,hi)
    mark=" <== recommended" if hi==best_hi else ""
    print(f"  {best_lo:.3f} {hi:.3f} |    {m['safe_miss']}      {m['catch']} |  {m['esc_n']:>2}   {m['esc_prec']:.2f}     {m['false_hardstop']:>2}     |  {m['cau_n']:>2}    {m['cau_false']:>2}{mark}")
R=metrics(best_lo,best_hi)
print(f"\nRECOMMENDED  t_lo={best_lo:.3f}  t_hi={best_hi:.3f}")
print(f"  Safe-misses (true escalations wrongly marked Safe): {R['safe_miss']}  -> safety catch rate {R['catch']}")
print(f"  Escalate tier: {R['esc_n']} items, precision {R['esc_prec']} ({R['false_hardstop']} false hard-stops)")
print(f"  Caution tier: {R['cau_n']} items ({R['cau_false']} non-escalations = cheap buffer)")

def s(t): return "'"+t.replace("'","''")+"'"
with open("14_tier_gate.sql","w",encoding="utf-8") as f:
    f.write("-- HQ.ai | 3-tier escalation gate: Safe / Caution / Escalate.\n"
            "-- Escalate = keyword OR score>=t_hi ; Caution = t_lo<=score<t_hi ; Safe = score<t_lo.\n"
            "-- Reuses hr_escalation_anchor + escalation_semantic_score from 13. Run AFTER 13.\n\n")
    f.write("alter table public.hr_eval_results add column if not exists predicted_tier text;\n\n")
    f.write(f"create or replace function public.classify_escalation_tier(qtext text, qvec vector(384),\n"
            f"  t_lo numeric default {best_lo:.3f}, t_hi numeric default {best_hi:.3f})\n"
            "returns text language sql stable as $$\n"
            "  select case\n"
            "    when public.predict_escalation(qtext) then 'escalate'\n"
            "    when public.escalation_semantic_score(qvec) >= t_hi then 'escalate'\n"
            "    when public.escalation_semantic_score(qvec) >= t_lo then 'caution'\n"
            "    else 'safe' end;\n$$;\n\n")
    f.write("create or replace function public.run_tier_gate(p_label text, "
            f"p_lo numeric default {best_lo:.3f}, p_hi numeric default {best_hi:.3f})\n"
            "returns uuid language plpgsql as $$\n"
            "declare v uuid; begin\n"
            "  insert into public.hr_eval_runs(label,model_name,notes) values(p_label,'3-tier gate (keyword + semantic anchors)','Safe/Caution/Escalate; lo='||p_lo||' hi='||p_hi) returning id into v;\n"
            "  insert into public.hr_eval_results(run_id,gold_id,predicted_tier,predicted_escalation,answer_grounded,latency_ms)\n"
            "  select v,g.id, t.tier, (t.tier<>'safe'), true, 0\n"
            "  from public.hr_eval_gold g\n"
            "  join public.hr_gold_embedding ge on ge.ext_id=g.ext_id\n"
            "  cross join lateral (select public.classify_escalation_tier(g.question_text, ge.embedding, p_lo, p_hi) as tier) t;\n"
            "  return v; end; $$;\n\n")
    f.write("create or replace function public.tier_metrics(p_run uuid)\n"
            "returns table(metric text, value numeric, n integer) language sql stable as $$\n"
            "  with r as (select res.predicted_tier tier, g.expected_escalation esc\n"
            "             from public.hr_eval_results res join public.hr_eval_gold g on g.id=res.gold_id\n"
            "             where res.run_id=p_run)\n"
            "  select 'safe_miss (true-esc marked safe)', count(*) filter (where esc and tier='safe')::numeric, count(*) filter (where esc)::int from r\n"
            "  union all select 'safety_catch_rate', round(1 - (count(*) filter (where esc and tier='safe'))::numeric/nullif(count(*) filter (where esc),0),4), count(*) filter (where esc)::int from r\n"
            "  union all select 'escalate_tier_precision', round((count(*) filter (where esc and tier='escalate'))::numeric/nullif(count(*) filter (where tier='escalate'),0),4), count(*) filter (where tier='escalate')::int from r\n"
            "  union all select 'escalate_count', count(*) filter (where tier='escalate')::numeric, count(*)::int from r\n"
            "  union all select 'caution_count', count(*) filter (where tier='caution')::numeric, count(*)::int from r\n"
            "  union all select 'safe_count', count(*) filter (where tier='safe')::numeric, count(*)::int from r\n"
            "  union all select 'false_hard_stops', count(*) filter (where not esc and tier='escalate')::numeric, count(*)::int from r;\n$$;\n")
print("wrote 14_tier_gate.sql")
