#!/usr/bin/env python3
"""Single source of truth for the 3-tier escalation gate.

The anchors, keyword rule, embedding model and calibrated thresholds used to
live inline in BOTH escalation_classifier.py and tier_gate.py, with a comment
saying "kept in sync". They are here now so there is one copy. A second copy
that drifts is worse than no classifier, because the gate keeps reporting the
catch rate it was calibrated at while scoring something else.

Anchors come from the Section 6 Escalation Boundary Map, NOT the gold set, so
there is no leakage into the eval.

Calibration (tier_gate.py over the 200-row gold set):
  t_lo=0.050  t_hi=0.210
  safe-misses 0 of 17 true escalations -> safety catch rate 1.00
  escalate-tier precision 0.62

Revision 2026-10-18 - two changes, both measured before adopting:

  1. Added the performance/capacity dismissal anchor (last in ESCALATE).
     The original set had anchors for dismissal at 15+ employees and for
     contested summary misconduct, but nothing for the ordinary
     performance-based dismissal - so "Dismissing an employee for poor
     performance" scored -0.036, i.e. SAFE. Grounded in 06-crosscutting.md
     6.3, which says a "performance conversation" and "a disciplinary
     process that could end in dismissal" look alike but carry very
     different weight. Gold set held (0 safe-misses, precision 0.61 ->
     0.62, escalate n 23 -> 21 so fewer false hard stops); routing on 20
     real challenge titles went 12/20 -> 14/20.

  2. Fixed the keyword rule: bare `visa` matched "ad-visa-ble", so any
     question asking whether something is advisable was force-escalated.
     Now \bvisa\b. It fired on 0 of the 200 gold questions, which is
     exactly why the original calibration never surfaced it.

  Lowering t_lo below 0.050 was tested and rejected: it gained one probe
  and pushed gold caution volume from 55 to 79.

  Known residual misses on terse titles, covered by the ALWAYS_ESCALATE
  keyword floor in answers_tool.py rather than by the gate:
    "Designing & running a defensible PIP"            +0.019
    "Probation / minimum-employment-period confusion" -0.042

Scoring: contrastive margin
  score(q) = max cos(q, ESCALATE) - max cos(q, SAFE)
  escalate if keyword_rule(q) or score >= t_hi
  caution  if score >= t_lo
  safe     otherwise

A true escalation landing in CAUTION still counts as caught - the user is
routed to advice either way. The only catastrophic error is a true escalation
landing in SAFE.
"""
import math
import re

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBED_DIMS = 384
T_LO = 0.050
T_HI = 0.210

ESCALATE = [
 "Terminating or dismissing an employee at a business with 15 or more employees; full unfair dismissal applies, no small business code exemption.",
 "Redundancy or restructure affecting one or more roles; genuine redundancy test, consultation obligations, redundancy pay, redeployment. We're restructuring, the role isn't needed anymore.",
 "Taking adverse action, discipline or dismissal near in time to a complaint, leave request, pregnancy, illness, or family or carer disclosure. This happened right after they told us about it.",
 "Bullying or harassment complaint about a manager, the business owner, or with serious or contested facts. The complaint is about a manager or about me.",
 "Discrimination complaint on a protected attribute, or a pattern across multiple employees. They've said this is discrimination.",
 "Underpayment that is systemic, long-running, or where intent could be questioned; criminal wage theft exposure since 1 January 2025. This has been going on for a while across multiple staff.",
 "Enterprise agreement or enterprise bargaining; specialist industrial instrument, BOOT test, Fair Work Commission approval. Should we do an EBA.",
 "Visa sponsorship or hiring a visa holder; migration law regime layered on employment law. This candidate needs sponsorship.",
 "A workplace health and safety incident involving serious injury, illness, or a notifiable event requiring regulator notification. Someone was seriously hurt at work.",
 "Summary or instant dismissal for serious misconduct where the facts are contested or the employee is senior.",
 "Signing a deed of release or settlement, or an exit settlement with a departing employee.",
 "Dismissing or terminating an employee for poor performance, capacity or conduct; performance improvement plans, progressive discipline, warnings and the decision to end employment. Unfair dismissal turns on whether the process was fair. We want to dismiss someone for poor performance.",
]

SAFE = [
 "Standard leave request or entitlement calculation governed by award or NES rules. How much annual leave has this employee accrued.",
 "Drafting a standard employment contract from a template for a new casual, part-time or full-time hire.",
 "A routine performance conversation or informal feedback; coaching, not a dismissal process. How do I raise a performance issue informally.",
 "Standard job ad, interview questions and hiring process for a non-visa candidate. What can or can't I ask in an interview.",
 "A minor workplace health and safety incident with no injury and nothing notifiable. Someone had a minor slip, no injury.",
 "A general plain-English question about an HR obligation, policy, or entitlement.",
 "Writing a first written warning for a single employee, standard performance issue, no protected attribute in play.",
]

KW = re.compile(
    # \bvisa\b, not bare visa: the original matched "ad-visa-ble".
    r"(underpay|wrong (award|classification|rate)|doing (this|it) wrong|wage theft|\bvisa\b|sponsor"
    r"|no witness|genuine redundancy if|don't like the person|same job.*(month|later)"
    r"|(stress|sick|carer).{0,25}leave.*(perform|disciplin|sack|dismiss|manage)"
    r"|(perform|disciplin|sack|dismiss|manage).{0,25}(stress|sick).{0,10}leave"
    r"|serious misconduct|on the spot|instant dismissal|pregnan)", re.IGNORECASE)

_model = None
_esc_e = None
_safe_e = None


def _load():
    global _model, _esc_e, _safe_e
    if _model is not None:
        return
    from fastembed import TextEmbedding  # imported lazily: heavy, and optional
    _model = TextEmbedding(MODEL_NAME)
    _esc_e = _embed(ESCALATE)
    _safe_e = _embed(SAFE)


def _embed(texts):
    out = []
    for v in _model.embed(texts):
        v = list(v)
        n = math.sqrt(sum(x * x for x in v)) or 1.0
        out.append([x / n for x in v])
    return out


def _cos(a, b):
    return sum(x * y for x, y in zip(a, b))


def semantic_score(text):
    """Contrastive margin. Positive means it looks more like an escalation."""
    _load()
    qv = _embed([text])[0]
    return max(_cos(qv, a) for a in _esc_e) - max(_cos(qv, a) for a in _safe_e)


def classify(text, t_lo=T_LO, t_hi=T_HI):
    """Return 'escalate' | 'caution' | 'safe' for a question or challenge."""
    if KW.search(text):
        return "escalate"
    s = semantic_score(text)
    if s >= t_hi:
        return "escalate"
    if s >= t_lo:
        return "caution"
    return "safe"


def should_escalate_default(text, t_lo=T_LO, t_hi=T_HI):
    """Anything not SAFE routes the user to a human, so TRUE for caution too."""
    return classify(text, t_lo, t_hi) != "safe"


if __name__ == "__main__":
    import sys
    for arg in sys.argv[1:]:
        print(f"{classify(arg):<9} score={semantic_score(arg):+.3f}  {arg[:60]}")
