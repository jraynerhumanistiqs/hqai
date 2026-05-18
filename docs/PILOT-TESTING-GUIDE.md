# HQ.ai - Pilot Testing Guide

**For:** Humanistiqs internal directors
**Site:** https://hqai.vercel.app (or your custom domain once DNS lands)
**Owner:** Jimmy Rayner - jrayner@humanistiqs.com.au
**Build status:** Beta. Core flows work end-to-end. A handful of follow-up items called out below.

---

## How to use this guide

1. Sign in (or sign up) at the URL above. Use a real work email so the system can issue magic links + invites.
2. Walk each page in the order below. Each page has:
   - **What it is** - one line.
   - **Try this** - 2-3 specific actions.
   - **Status** - what's solid, what's known-rough.
   - **What feedback we want** - the kind of insight that's most useful here.
3. Capture feedback in the shared Notion / Loom however you prefer. Tag everything with the page name so we can route it back to the right surface.
4. If something breaks, screenshot the error AND the URL. Console logs (F12 -> Console tab) are gold.

**One golden rule:** test as if you're an Australian SME owner with 20 staff, not an HR consultant. The product needs to feel obvious to someone who isn't us.

---

## 0. Sign in / Sign up

**What it is.** Email + password sign-in. Magic-link option as a fallback.

**Try this.**
- Sign up with a fresh email. You should land on the onboarding wizard.
- Sign out and use "Send magic link instead" with the same email. Open the link in the same browser.

**Status.** Solid. Magic link redirect was broken last week; now uses a hard page reload after token exchange so the dashboard layout sees the cookies.

**Watch for.**
- Magic link only works in the same browser you requested it from. Don't request on laptop and click on phone.
- If the link expired or was used, the page shows "Sign-in link didn't work" with a fresh "Back to sign in" button.

---

## 1. Onboarding wizard

**What it is.** Three-step business profile capture (business name + industry + state + award + headcount + AI advisor name).

**Try this.**
- Fill it out as a normal SME. Pick a real Modern Award if you know one.
- Skip optional fields and confirm you can still finish.
- Watch the redirect at the end - should land on /dashboard with the sidebar populated.

**Status.** Solid. The award + state defaults flow into every AI prompt downstream.

**What feedback we want.** Is the language plain enough for a non-HR business owner? Are any fields confusing or feel intrusive?

---

## 2. Dashboard home

**What it is.** Greeting + module tiles + "Continue where you left off" rail.

**Try this.**
- Hover the sidebar items.
- Drag the right edge of the sidebar to resize it.
- Toggle the sidebar collapse button (top of the sidebar). Hover icons - tooltips should appear.

**Status.** Working. Light mode only (dark mode disabled until a full audit is done).

**Feedback we want.** Does the landing page tell you what to do next, or does it just sit there? Anything missing from the sidebar that a consultant would expect?

---

## 3. HQ People - AI Advisor (chat)

**What it is.** AI chat advisor grounded in the Fair Work Act, NES and Modern Awards. The empty state shows a Topic Picker with four AU-specific themes (Employment Law, Recruitment & Talent, Culture/Pay/Performance, Redundancy/Termination).

**Try this.**
- Pick a topic, pick a seed question, watch the response stream in.
- Send a free-text follow-up message after the AI replies (this used to break - now fixed).
- Ask something high-stakes ("an employee threatened self-harm") - you should get a triage hand-off card, not an AI guess.
- Click a citation chip if one appears.

**Status.**
- Solid: streaming, citations, follow-up turns, escalation hand-off, document detection (asking for a contract pops a form).
- In progress: Cohere rerank-3 + Voyage embeddings are env-gated and may not be live in pilot. Behaviour is correct without them; results are slightly less precise.

**Feedback we want.**
- Does the tone read like a calm, plain-English advisor or like a chatbot?
- Are the seed questions the right ones for your clients?
- Where does it hedge when it should be direct, or vice versa?
- Any answer that feels legally wrong - flag it with the conversation URL.

---

## 4. HQ People - AI Administrator (templates -> documents)

**What it is.** Template gallery (33 HR / recruitment templates), dynamic form per template, AI generates a structured document, you edit it inline in a Word-level editor, download as PDF.

**Try this.**
- Pick "Letter of Offer". Fill the form with a real-sounding hire.
- Click Generate Document - the live editor opens in an A4 modal.
- Edit any sentence. Try the toolbar: bold, bullet list, font size, insert table, page setup (margins, headers, footers).
- Click Download PDF. The PDF should match what you saw on screen, with your business logo in the footer if you've uploaded one.

**Status.**
- Solid: template gallery, form, generation, inline editor, PDF export, logo footer.
- Auto-retry: if the first AI pass produces a document with only headings (no body prose), the system retries automatically against the bigger model. You shouldn't see empty documents - if you do, flag the template ID and the inputs you used.
- Citations are deliberately not included in generated documents (founder call).
- DOCX / PPTX / shareable-link buttons have been removed - PDF only, so clients can't take a Word file offline and reuse it without coming back to the platform.

**Feedback we want.**
- Does the editor toolbar have everything a consultant needs to finish a document without leaving the page? Anything obviously missing?
- Is the AI-generated body prose usable as-is, or are you rewriting most of it?
- Are the form fields the right minimum for the document? Any missing field that forces the model to hallucinate?
- Try at least 5 different templates - which ones are the strongest? Which are the weakest?

---

## 5. HQ People - AI Administrator -> CV Formatter / Contract review (Ingest)

**What it is.** Drop a CV (PDF / DOCX / TXT) and get back a formatted Humanistiqs-branded CV. Drop a contract and get a plain-English review.

**Try this.**
- Run a real CV through CV Formatter. Download the resulting DOCX and PDF. Inspect.
- Try a PDF, a DOCX, and a TXT to confirm all three input formats work.
- Run a contract through Contract Review - paste in a real employment contract.

**Status.**
- Solid for DOCX + TXT in production. PDF extraction works locally but Vercel was unreliable - flag if you hit "Could not extract text" on a PDF.
- CV output uses the Humanistiqs schema (candidate details, professional summary, qualifications, memberships, certificates, systems, skills, experience).

**Feedback we want.**
- Is the formatted CV close enough to your existing Humanistiqs template that you'd send it to a client without further edits?
- Does the contract review flag things a consultant would care about (notice periods, restraint clauses, non-NES gaps)?
- What's missing from either output?

---

## 6. HQ Recruit - CV Scoring

**What it is.** Bulk-score a stack of CVs against a role's rubric. Filters, manual band overrides, side-by-side compare, downloadable scorecards.

**Try this.**
- Create or pick a role rubric.
- Upload 3-5 CVs.
- Watch the band column. Click a band pill to override.
- Click a candidate row to open the scorecard panel. Read the rationale + the per-criterion evidence.
- Hover any candidate name - a pencil icon appears. Rename a candidate.
- Tick 2-4 candidates and use the "Compare" view at the top.
- Try to spot when "anonymise mode" kicks in (if a candidate has bias signals like a non-Latin name or a CV that disclosed DOB / gender, the system auto-flips on anonymise-all-candidates and you'll see masked names + a banner).

**Status.**
- Solid: scoring, overrides, scorecard panel, compare, candidate rename.
- The Voyage law embeddings + Cohere rerank are env-gated. Scoring still works without them; relevance ranking is slightly less precise.
- "Anonymise" mode is a recent addition - the bias-trigger ratchet engages automatically on first bias signal. We want to know if it triggers when you wouldn't expect, or fails to trigger when you would.

**Feedback we want.**
- Are the rubric defaults (the 7-9 criteria per role family) the right ones?
- Does the AI rationale actually justify its score, or is it generic?
- Does the override flow feel obvious - i.e. would a consultant know to click the band to change it?
- Anonymise-mode: do you feel it's working as a safety net or getting in the way?
- Critically: does the bias auto-anonymise rule feel like the right ethical baseline for your clients, or do you want a stricter / looser default?

---

## 7. HQ Recruit - Shortlist (video + phone screen)

**What it is.** Create a role, send candidates a unique link, they record short video answers, you review + score. Phone screens are recorded inline on your laptop (mic only).

**Try this.**
- Create a role with 3-5 questions.
- Use "Copy invite link" and open it in an incognito window. Record a real test answer.
- Back in the recruiter view, the response should appear with a star rating + status pill.
- Hover a candidate row - the pencil icon lets you rename them.
- Click "+ Record phone screen" on the right panel. Tick consent, type the candidate name, click Start microphone. The Phone Screen Questions form should appear - edit / add / reorder. Click Start recording. Speak for a few seconds. Click Stop. You should land on a preview with a Submit button. Submit it.
- Open the candidate detail - the AI-scored evaluation appears once transcription finishes (~1-2 min).

**Status.**
- Solid: invite link flow, video recording, transcription, scoring, evaluation, kanban stages, notes, share/export per response.
- Phone screen: the "Stop recording fails to submit" bug was fixed - confirm it works for you.
- The Phone Screen Questions pre-record form is new - tell us if the default seed questions are the right ones for a screening call vs an interview.

**Feedback we want.**
- Does the invite link land cleanly for the candidate? Try on mobile + desktop.
- Is the scoring evaluation useful, or generic?
- Phone screen: when you re-record, does the question list survive?
- Anything you'd expect to be one click that's currently two or three?

---

## 8. HQ Recruit - Campaign Coach (job-ad writer)

**What it is.** Wizard that turns a role brief into a SEEK-style job ad in three steps.

**Try this.**
- Walk all three steps. Don't over-fill - this is meant to feel light.
- Generate the ad. Copy + paste it into SEEK / Workable to see how it reads.

**Status.** Functional but the header + page structure refactor is still pending (a TODO from a prior session). Treat the visual polish on this one as not-final.

**Feedback we want.**
- Does the resulting ad sound like an SME you'd advise, or like a generic AI ad?
- What field's missing that would make the difference between a generic ad and a winning ad?

---

## 9. Documents library

**What it is.** All generated documents (Administrator, Advisor, CV Formatter, Contract review) collected in one place.

**Try this.**
- After generating 2-3 documents from other surfaces, check they all show up here.
- Open one. Confirm you can re-download.

**Status.** Functional but the top-level page header hasn't been refactored to the new pattern yet (deferred). Visual polish is not final. Functionality is.

**Feedback we want.**
- Does the listing tell you enough about each document to find what you want quickly? Or do you wish there was filtering / search / by-client grouping?

---

## 10. Settings

**What it is.** Business profile, your name, advisor handoff details (Humanistiqs advisor + AI advisor name), Calendly link, company logo, billing.

**Try this.**
- Upload a real client logo. Confirm it shows in the preview AND on the next Administrator-generated PDF (in the footer).
- View the billing card. Try "Upgrade plan" - it will redirect to Stripe checkout. Test mode is live; you can complete a checkout with the Stripe test card 4242 4242 4242 4242 (any future date, any CVC, any postcode).
- Try opening the billing portal once you've subscribed.

**Status.**
- Solid: profile save, logo upload, advisor block, Stripe checkout + portal.
- The advisor block is gated behind a paid plan (you'll see a "Upgrade to unlock" overlay on Free Trial accounts).

**Feedback we want.**
- Does the price ladder ($99 / $199 / $379) feel correct for the value the product is delivering as you've experienced it?
- Is there a setting you'd expect to find here that isn't?

---

## 11. /offer - public landing page (don't sign in)

**What it is.** Public $25 one-off Letter of Offer experiment. Anonymous-purchase funnel meant to capture leads who aren't ready for a subscription.

**Try this.**
- Open /offer in incognito (no login).
- Walk it as a cold prospect.
- Don't actually complete the Stripe checkout in production - test mode only.

**Status.** Solid front-end. The post-purchase fulfilment route still has a known TODO (anonymous-user document creation needs a system user provisioned - it's noted in the handoff).

**Feedback we want.**
- Is the value prop clear in the first 6 seconds?
- Would you click "Get my letter for $25" if you saw this ad?
- Does $25 feel like the right price for what you're being shown?

---

## Known limitations (so you don't flag them as bugs)

- **Dark mode** is forced to light across the app. A handful of legacy panels still have hardcoded white backgrounds, so dark mode is off until that audit finishes.
- **Documents library** + **Shortlist top header** are still on the old page header pattern. Function works; visual polish is queued.
- **DOCX / PPTX / shareable-link** export from the Administrator was removed on purpose - PDF only. Tell us if you actually need DOCX back as a download for a specific workflow.
- **Voyage law embeddings + Cohere rerank** may not be enabled in pilot env. Affects relevance precision on AI Advisor + CV Scoring - not correctness.
- **One-off Letter of Offer ($25 anonymous path)** fulfilment route is incomplete - completing a checkout on /offer in production won't issue the document yet.
- **Email** uses Resend; check the From address and reply-to are what you'd want a client to see.
- **B5 PDF / B6 PPTX visual QA** on Vercel serverless still needs founder-side verification - report any layout oddities in exported PDFs.

---

## What feedback we most want from this group

You're not testing for bugs - you're testing for **product instinct**. Five lenses that matter most:

1. **Would a real SME owner click this?** Where does the language get too HR-jargon? Where does it talk down?
2. **Where does it save you 80% of the work** vs your current consulting workflow? Where does it not save you anything? Be ruthless on the second one.
3. **What's the one feature missing** that would make you confident handing this to a client tomorrow?
4. **Where do you mistrust the AI's output?** Specific examples - "this clause read wrong because X" beats "AI feels off".
5. **What would your clients break** that we haven't anticipated? Walk a couple of pages as your worst-case-scenario client and tell us where they'd get stuck.

---

## How to flag issues

- **Tag** by page name (eg "AI Administrator", "Shortlist / phone screen", "CV Scoring").
- **Severity** in plain language: "blocker" / "annoying" / "polish".
- **Repro** - one-line steps + screenshot or Loom.
- **Suggestion** if you have one, but not required - we don't expect you to design fixes.

Send a daily summary to Jimmy by end-of-day each pilot day. One Loom is worth a hundred screenshots.

Thank you for the time. Honest feedback now is worth ten polite reviews after launch.
