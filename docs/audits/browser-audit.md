# HQ.ai marketing site - live browser audit

Date: 2026-11-21
Branch: `skill/playwright-cli`
Tool: `@playwright/cli` 0.1.25 (`playwright-cli`), real headed Chromium
Target: `next dev --webpack -p 3405` (see [Environment notes](#environment-notes))
Viewports: 1440x900, 768x1024, 390x844
Pages swept: `/`, `/about`, `/ai-standard`, `/compare`, `/outsourcing`,
`/product/people`, `/product/recruit`, `/pricing`, `/roadmap`, `/changelog`,
`/contact`, `/marketplace`, `/careers`, `/privacy`, `/terms`

Screenshots: `docs/audits/screenshots/` (65 files, `<page>-<viewport>.png` plus
named evidence shots).

**Findings 1 and 2 have since been fixed and re-verified in the browser** (see
the status note on each). Findings 3-7 were listed with a recommended fix
rather than applied - no other defect fell into the "missing `alt` / trivial
console error" class the audit itself authorised fixing.

> **Status update, 2026-11-21 (post-merge).** This audit was run against base
> `8917902`, which was ~52 commits behind `main`. `origin/main` was then merged
> into this branch (`096760c`), and **findings 4 and 6 had been fixed
> independently on `main`** - by the web-design-guidelines and taste-skill
> work, not by this audit. Findings 3 and 5 were partly fixed there.
>
> **Four are still open in some form: finding 3 strands keyboard focus,
> finding 5 leaves one control below the WCAG floor (now split out as finding
> 8), finding 7 is untouched, and finding 8 is the only outright WCAG
> conformance failure found.** Every status here is measured in a
> browser, not read from source - see the table below.
>
> **The live re-run has now been done** (2026-11-21, against production after
> PR #9 merged as `f095567` - production *is* the merged tree, so no dev server
> was needed). It changed two of the statuses above and turned up two things
> source reading had missed:
>
> | Finding | Source-read status | **Measured status** |
> |---|---|---|
> | 3 Dropdown Escape | fixed | **mostly** - Escape from inside the panel closes it but does NOT return focus to the trigger |
> | 4 ToolExplorer selection | fixed | **fixed** - selection held 10s with no pointer, auto-advance gone |
> | 5 Tap targets | partly | **partly** - and one control measures 20x20, below even WCAG 2.5.8's 24px |
> | 6 Arrow keys | fixed | **fixed** - roving tabindex confirmed, Arrow/Home/End all move focus AND selection |
> | 7 Mobile menu | open | **open** - measured 40x40 |
>
> Plus the `HeroChatPreview` question below, now **closed**: the hero has zero
> example-dot buttons on the live site, and the removal was deliberate - the
> component was rebuilt as a static transcript, and its header on `main`
> documents the decision and argues against reverting it. Not a regression.
>
> The original wording of this note is kept below because its reasoning still
> stands, and it is the reason the re-run happened.
>
> Those four statuses were *initially* confirmed by **reading the component
> source on `origin/main`, not by re-running the browser.** That distinction
> matters in
> this document more than most: the whole point of the audit was that source
> reading missed all seven of these. Source proves the handler exists; it does
> not prove focus actually moves or the menu actually closes. **A live re-run
> against the merged tree is still worth doing** - and it was duly done; see
> the measured table at the top of this note, which corrected two of the five
> statuses that source reading had produced.

---

## Summary

The static sweep came back almost perfectly clean: **zero console errors, zero
page errors, zero failed network requests, zero horizontal overflow at 390px,
zero images missing `alt`, zero broken images, zero em/en dashes or curly
apostrophes**, and a visible keyboard focus indicator at every one of 70 tab
stops on the home page.

The bugs are all in behaviour, and all of them were invisible to static review:

| # | Severity | Finding | Page |
|---|----------|---------|------|
| 1 | High - **FIXED** | `/privacy`, `/terms`, `/careers` render on the wrong palette - white, not the marketing dark slab - because nothing sets `data-app` | 3 pages |
| 2 | High - **FIXED** | Enterprise inquiry form POSTs a completely empty payload to the live endpoint; `required` is decorative | `/outsourcing` |
| 3 | Medium-high - **MOSTLY FIXED ON MAIN** (measured) | Products dropdown cannot be closed by keyboard - Escape does nothing, and it stays open when focus leaves | all |
| 4 | Medium-high - **FIXED ON MAIN** (measured) | ToolExplorer discards the tab the user picked after 6.5s | `/` |
| 5 | Medium - **PARTLY FIXED ON MAIN** (measured) | Carousel/pagination dots are 6x6 px tap targets, 12px apart | `/` |
| 8 | Medium - **STILL OPEN** (measured 20x20) | "HQ People subscriber add-on" info button is 20x20 px - below WCAG 2.5.8's 24px floor, and the only outright conformance failure on either page | `/`, `/pricing` |
| 6 | Low-medium - **FIXED ON MAIN** (measured) | ToolExplorer is `role="tablist"` but has no arrow-key support | `/` |
| 7 | Low - **STILL OPEN** (measured 40x40) | Mobile menu button is 40x40 px, under the project's own documented 44px rule | all |

Rows are ordered by severity; the NUMBERS are the order findings were
discovered, so finding 8 appears above 6 and 7. It was split out of finding 5
during the post-merge browser re-run and kept at the end of the document so the
original 1-7 references in commits and sibling notes stay valid.

Two things the brief expected to be broken are **not** broken - see
[Expected findings that did not reproduce](#expected-findings-that-did-not-reproduce).
The headline hypothesis about focus indicators is disproved.

---

## 1. `/privacy`, `/terms` and `/careers` render on the wrong palette (High - FIXED)

> **Status: fixed** in `app/privacy/page.tsx`, `app/terms/page.tsx`,
> `app/careers/page.tsx` and
> `app/careers/[business_slug]/[campaign_slug]/page.tsx`. The design call the
> original write-up deferred was made both ways: `/privacy` and `/terms` join
> the marketing surface, `/careers` stays light on purpose. See
> [Fix and verification](#fix-and-verification) at the end of this finding.

**Pages:** `/privacy`, `/terms`, `/careers`
**Viewports:** all three
**Screenshots:** `privacy-1440.png`, `terms-1440.png`, `careers-1440.png`
(compare against `home-1440.png`, `about-1440.png`)

`components/landing/MarketingHeader` is what sets `data-app="marketing"` on
`<html>`, in a `useEffect`. These three pages never mount it, so the attribute
is never set and the pages fall through to the bare `:root` token block.

Measured in the browser:

| Route | `data-app` | `body` background | `--accent` | header | footer |
|-------|-----------|-------------------|-----------|--------|--------|
| `/` … `/marketplace` (12 pages) | `marketing` | `rgb(10, 10, 11)` | `245 245 244` | yes | yes |
| `/careers` | *(absent)* | `rgb(255, 255, 255)` | `17 17 17` | own, hand-rolled | own |
| `/privacy` | *(absent)* | `rgb(255, 255, 255)` | `17 17 17` | **none** | **none** |
| `/terms` | *(absent)* | `rgb(255, 255, 255)` | `17 17 17` | **none** | **none** |

So the site turns from a near-black warm slab into a white page the moment a
visitor clicks "Privacy" in the footer - which is exactly the
"brand changes colour the moment a customer signs in" failure `CLAUDE.md`
records for the product surface, reproduced here on the public site.

`/privacy` and `/terms` also have **no marketing header and no footer at all**.
They each keep a single "← Back to HQ.ai" link (verified present, and the arrow
is a correct U+2190 - not mojibake), so a visitor is not stranded, but there is
no nav, no product links and no footer.

`/careers` additionally hardcodes its colours, against the documented ban on
literal `bg-white`:

```
app/careers/page.tsx:71
  <header className="sticky top-0 z-10 w-full bg-white border-b border-border">
```

Three elements on `/careers` and one each on `/privacy` and `/terms` carry
`bg-white` / `bg-black` / `text-gray-*`.

**Reproduce:** open `/`, note the dark page; click "Privacy" in the footer.

**Why static review misses it:** the missing `data-app` is a runtime
consequence of an absent component. Reading `app/privacy/page.tsx` shows a
tidy page using `text-ink` and `bg-bg` tokens - it looks correct. Only the
rendered page shows those tokens resolving against the wrong root.

### Fix and verification

The three pages turned out not to be one group, so the call went both ways.

**`/privacy` and `/terms` join the marketing surface.** Both are linked from
`MarketingFooter`, so a visitor reaches them from the dark slab and should not
be thrown onto a white page. Both now mount `MarketingHeader` +
`MarketingFooter`, which sets `data-app="marketing"` and closes the nav gap at
the same time. `bg-white` became `bg-bg`, and the root wrapper became `<main>`
so each page has one `header` / `main` / `footer` landmark.

**`/careers` deliberately stays light.** It is not part of the marketing site:
**nothing on the site links to it** (verified by grep - it is absent from both
`MarketingHeader` and `MarketingFooter`). It is an SEO entry point reached from
Google for Jobs and Jora, sitting in the job sitemap above the client job ads
at `/careers/<business>/<role>`, and it shares their whitelabel "Powered by
HQ.ai" chrome. Bolting the HQ.ai marketing nav (Products, Pricing, Get started)
onto that surface would advertise our product to a client's candidates, and
would split the index from the ads it links to.

So the accident was fixed without changing the decision: every `bg-white` /
`bg-black` literal in the careers tree is now a token that resolves to the same
paint, and both files carry a comment recording why the surface stays on the
bare `:root` scope. That scope is safe to depend on - `.dark` is only ever
matched under `[data-app="product"]`, which nothing in the tree sets.

| File | Was | Now |
|------|-----|-----|
| `app/careers/page.tsx` (page, header) | `bg-white` | `bg-bg` |
| `app/careers/page.tsx` (2 cards) | `bg-white` | `bg-bg-elevated` |
| `…/[campaign_slug]/page.tsx` (page, header) | `bg-white` | `bg-bg` |
| `…/[campaign_slug]/page.tsx` (2 Apply CTAs) | `bg-black text-white` | `bg-accent text-ink-on-accent` |

Re-measured in the browser:

| Route | `data-app` | `body` background | Matches `/changelog`? | Contrast failures | Overflow @390 |
|-------|-----------|-------------------|----------------------|-------------------|---------------|
| `/privacy` | `marketing` | `rgb(10, 10, 11)` | yes | **0** | none (390 == 390) |
| `/terms` | `marketing` | `rgb(10, 10, 11)` | yes | **0** | none (390 == 390) |
| `/careers` | *(absent, by design)* | `rgb(255, 255, 255)` | n/a - deliberate | **0** | none (390 == 390) |
| `/changelog` (reference) | `marketing` | `rgb(10, 10, 11)` | - | - | - |

Zero white-painting nodes remain on `/privacy` and `/terms`. Every text/background
pair on both pages passes WCAG AA; the tightest is the version line at **4.72:1**
(`text-muted` -> `--ink-muted` on the slab), against a 4.5 requirement.

The header is not just chrome here - it is the palette switch - so it was
exercised on the fixed pages: the Products dropdown opens with all 4 items on
`/privacy`, and the first six tab stops on `/terms` are the real nav
(HQ.ai home, Products, Pricing, About, Contact, Sign in), each with a visible
focus outline.

**Client-side navigation**, which is where a palette leak would actually show,
since `MarketingHeader` clears `data-app` on unmount:

| Soft navigation | `data-app` after | `body` background |
|-----------------|------------------|-------------------|
| `/privacy` -> `/terms` | `marketing` | `rgb(10, 10, 11)` |
| `/terms` -> `/pricing` | `marketing` | `rgb(10, 10, 11)` |
| `/pricing` -> `/privacy` | `marketing` | `rgb(10, 10, 11)` |
| `/privacy` -> `/careers` | **cleared to absent** | `rgb(255, 255, 255)` |

That last row is the one that matters: the marketing scope does **not** leak
onto the whitelabel careers surface, which is the same failure mode
`ThemeBoundary`'s own comment records for the `/login` dark-leak bug.

0 console errors, 0 page errors across all four routes.

**Not verified in the browser:** the two Apply-CTA swaps on
`/careers/<business>/<role>`. That page needs a launched campaign and the dev
database has none, so the index renders its empty state and no ad URL exists to
visit. The swap was instead confirmed at the token level on the same `:root`
scope that page runs on: `bg-bg` and `bg-bg-elevated` both resolve to
`rgb(255, 255, 255)` - identical to the `bg-white` they replace - and
`bg-accent text-ink-on-accent` resolves to `rgb(17, 17, 17)` on white, against
`rgb(0, 0, 0)` on white before. The CTA therefore shifts from `#000000` to the
design system's ink `#111111`; nothing else changes.

**Screenshots:** `palette-fixed-privacy-1440.png`, `palette-fixed-terms-1440.png`,
`palette-fixed-careers-1440.png` and the matching `-390.png` set.

---

## 2. Enterprise inquiry form POSTs an empty payload to the live endpoint (High - FIXED)

> **Status: fixed and re-verified in the browser.** See
> [Fix and verification](#fix-and-verification) at the end of this section.
> The description below is the defect as found.

**Page:** `/outsourcing`
**Viewport:** 1440x900 (not viewport-dependent)
**Screenshot:** `enterprise-validation-1440.png`
**Component:** `components/enterprise/EnterpriseInquiryForm.tsx`

The form sets `noValidate` on `<form>`, which switches off the browser's
enforcement of the `required` attribute - and `handleSubmit` does no validation
of its own. It `preventDefault()`s and goes straight to `fetch`.

Clicking "Send to our team →" on a completely untouched form fired a real
POST. Captured body (the request was intercepted and aborted, so it never left
the machine):

```json
{"full_name":"","work_email":"","business_name":"","staff_headcount":"",
 "variant_interest":"","current_spend":"","urgency":"","notes":"",
 "consent":false,"entity_count":"","annual_hiring_volume":""}
```

Seven fields carry `required`; all seven are decorative.

**Mitigating factor:** `app/api/enterprise-inquiry/route.ts` does validate
server-side (lines 94-113) and returns 400 `"Your name is required."` before
any Resend call or DB write. So no junk lead is stored and no email is sent.
This is a UX and accessibility defect, not a data-integrity one. *I did not
let a submission through to the real endpoint; the server behaviour above is
read from the route, and the client behaviour is measured.*

What the user actually gets, measured after an empty submit:

- `aria-invalid` set on **0** of 10 fields
- `aria-describedby` set on **0** of 10 fields
- no per-field error text anywhere
- focus stays on `BODY` - it does not move to the offending field
- one `role="alert"` banner carrying the server's single message

Because the server returns only the *first* failure, a visitor who leaves three
fields blank must submit, read, fix, and submit again - once per field, each a
network round trip. For a screen reader user nothing identifies *which* control
is in error (WCAG 3.3.1).

By contrast `ContactForm` on `/contact` has no `noValidate`, so the browser
blocks an empty submit, reports `"Please fill in this field."` on each of the
three required fields, and moves focus to `#c-name`. That one is correct.

**Reproduce:** open `/outsourcing`, scroll to the form, click
"Send to our team →" without typing anything. Watch the Network panel.

**Why static review misses it:** the JSX shows `required` on every field. The
`noValidate` that cancels all of them is one token on the `<form>` 160 lines
away, and the absence of validation in `handleSubmit` reads as unremarkable.

### Fix and verification

`components/enterprise/EnterpriseInquiryForm.tsx` now validates in
`handleSubmit` before the `fetch`. `noValidate` is kept deliberately, so the
messages are ours and carry the site's styling rather than browser bubbles -
with a comment on it saying so, since that attribute is what disarms the
`required` attributes.

The rules are a direct mirror of `app/api/enterprise-inquiry/route.ts` - the
same `EMAIL_RE`, the same `STAFF_BUCKETS` / `VARIANT_VALUES` /
`URGENCY_VALUES`, checked in the same order - so the client cannot accept
something the server will reject, and the first error the user is sent to is
the same one the server would have complained about. A comment on each
constant says to change them together.

On a failed submit the form now: blocks the `fetch` entirely, sets
`aria-invalid` and `aria-describedby` on every failing control, renders a
per-field message in the `danger` token, swaps that field's border to
`border-danger`, shows a `role="alert"` count, and moves focus to the first
field that needs work. Editing a field clears that field's error immediately.

Re-driven in Chromium, with `/api/enterprise-inquiry` intercepted throughout
so nothing could reach the endpoint:

| Step | POSTs fired | Result |
|------|-------------|--------|
| Submit a blank form | **0** | 7 `aria-invalid`, 7 `aria-describedby` (all resolving to real text), 7 danger borders, 7 messages, `role="alert"` reads "7 fields need your attention", focus lands on "Your name" |
| Type a name | 0 | drops to 6 errors - only that field clears |
| Submit with `not-an-email` | **0** | "Enter a valid work email, like you@yourbusiness.com.au.", focus moves to the email field |
| Fill everything but consent | **0** | 1 error, focus on the checkbox |
| Tick consent and submit | 1 | full payload, correctly populated |

Also checked: tab order unchanged across all 11 controls (the consent row was
rewrapped in a `div` so its message could sit below the flex row, which could
have disturbed it); no horizontal overflow at 390px (`scrollWidth` 390 ==
`clientWidth` 390); exactly 7 error nodes with 7 unique ids and no duplicated
text; error colour resolves to `rgb(197, 72, 58)`, the `danger` token on the
marketing surface, not a hardcoded hex. `tsc --noEmit` and `eslint` on the
file both pass clean.

Screenshots: `enterprise-validation-fixed-1440.png`,
`enterprise-validation-consent-1440.png`,
`enterprise-validation-fixed-390.png`.

The server-side validation is untouched and still the real gate.

---

## 3. Products dropdown cannot be dismissed by keyboard (Medium-high - MOSTLY FIXED ON MAIN, one gap)

> **Mostly fixed on `origin/main`, not by this audit - but re-measured live
> against the merged tree (production, post-`f095567`) and one gap remains.**
> `MarketingHeader` now has an Escape keydown handler that closes both menus,
> plus `aria-haspopup="true"` and `aria-controls="marketing-products-menu"`.
> The earlier source-read note here said this was fully fixed and suggested
> "a live check that Escape also returns focus to the trigger". That check was
> run. It does not:
>
> | Measured live | Closes? | Focus returns to trigger? |
> |---|---|---|
> | Escape, focus on the trigger | yes | **yes** |
> | Escape, focus on a link inside the panel | yes | **no** |
>
> Closing the menu while focus sits on a link inside it leaves focus on an
> element that is no longer rendered, so the next Tab restarts from the top of
> the document. The remaining fix is one line in the Escape handler: return
> focus to the trigger before closing, in both paths, not just the first.
>
> This is the clearest vindication of the audit's own thesis in the document.
> Reading the source proves an Escape handler exists; only running it shows
> that half of it strands the keyboard user.

**Pages:** every marketing page (shared `MarketingHeader`)
**Viewport:** 1440x900
**Screenshot:** `header-dropdown-open-1440.png`
**Component:** `components/landing/MarketingHeader.tsx` (`productOpen` state)

Measured on the open dropdown:

| Action | `aria-expanded` after | Closes? |
|--------|----------------------|---------|
| Click the trigger | `true` | opens correctly |
| **Escape, focus on trigger** | `true` | **no** |
| **Escape, focus on a panel link** | `true` | **no** |
| **Focus moves out of the header entirely** | `true` | **no** |
| Click anywhere outside | `false` | yes |

So the only way to close the Products menu is a mouse click on the page. A
keyboard-only visitor who opens it has no dismissal route at all, and the panel
stays open over the page content while they tab on through the rest of the
site. Escape-to-dismiss is the expected behaviour for a disclosure and is what
WCAG 1.4.13 asks for where content is shown on focus.

The panel is otherwise wired well: `aria-expanded` is present and accurate,
and the first Tab after opening lands on `/product/people` inside the panel.
Focus is not returned to the trigger on dismissal (it cannot be, as there is
no keyboard dismissal).

**Reproduce:** load any marketing page, Tab to "Products", press Enter, press
Escape. The panel stays open. Tab onwards - it is still open.

**Why static review misses it:** `onKeyDown` handlers scattered across the
file make it look handled. `PricingSection`'s own info popover (line 380) *does*
have `if (e.key === 'Escape') setOpen(false)`, and `Cited` handles Escape too,
so the pattern is present in the codebase - just not on this dropdown. Only
pressing the key shows which one was missed.

**Recommended fix:** add an Escape handler to the disclosure that clears
`productOpen` and returns focus to the trigger, plus a `focusout` that closes
when focus leaves the header - matching what `Cited` and `PricingSection`
already do.

---

## 4. ToolExplorer throws away the tab the user chose (Medium-high - FIXED ON MAIN, measured)

> **Fixed on `origin/main`, more thoroughly than recommended here.** Rather
> than pausing the rotation on interaction, the auto-advance was removed
> outright - `DWELL_MS` no longer appears in the component. That resolves the
> WCAG 2.2.2 concern below completely. Source-verified on `origin/main`, then
> **confirmed live on the merged tree**: with the pointer parked away from the
> component, a clicked tab stayed selected for the full 10s sample
> (`[0,0,0,0,0,0,0,0,0,0]`), where the original defect lost it after ~2s.

**Page:** `/` ("One login. Everything people and hiring.")
**Viewport:** all
**Screenshot:** `toolexplorer-1440.png`
**Component:** `components/landing/ToolExplorer.tsx`

The section auto-rotates its two tabs every `DWELL_MS = 6500`. The pause
handlers are on the **tab panel** only:

```
ToolExplorer.tsx:150-155
  role="tabpanel"
  onMouseEnter={() => setPaused(true)}
  onFocusCapture={() => setPaused(true)}
```

The `role="tablist"` and its buttons sit *outside* that element, so interacting
with a tab never sets `paused`. Measured, sampling the selected tab once a
second:

| Scenario | Selected-tab sequence | Held? |
|----------|----------------------|-------|
| Untouched | `0,0,0,0,0,0,1,1,1,1` | n/a - rotates as designed |
| **Click a tab, move pointer away** | `0,0,1,1,1,1,1,1,1,0` | **no - lost after ~2s** |
| **Keyboard-focus a tab** | `0,0,0,0,0,1,1,1,1` | **no - lost after ~6s** |
| **Tap a tab (no hover at all)** | `0,0,0,0,0,1,1,1,1` | **no - lost after 6s** |
| Hover the panel | `1,1,1,1,1,1,1,1` | yes - hover pause works |

So a visitor who clicks "HQ People" and moves the mouse off, taps it on a
phone, or reaches it with the keyboard, gets their choice overwritten within
6.5 seconds. The section's own copy - *"Two tools, one location. Tap through to
see each one in action."* - invites precisely the interaction that does not
stick.

This is an oversight rather than a design choice, because the sibling
component implementing the same pattern gets it right:
`HeroChatPreview.tsx:80-83` puts `onMouseEnter` / `onFocusCapture` on the
**whole `role="group"`**, dots included - so selecting an example there does
hold. Verified: with rotation paused, clicking Examples 1-4 selects indices
0,1,2,3 and shows the matching answer every time.

**Reproduce:** open `/` at 1440, scroll to "Explore the tools", click the
"HQ People" tab, move the pointer off the section, and wait 7 seconds.

**Why static review misses it:** the component has a `paused` state, a
`setPaused` call and the state in the effect's dependency array. It reads as
fully handled. Only driving it reveals that the handlers are attached to a
sibling of the control they are meant to protect.

**Recommended fix:** move the pause handlers up to the element that wraps both
the tablist and the panel (what `HeroChatPreview` does), or call
`setPaused(true)` from the tab's `onClick` / `onFocus`. Consider latching the
pause permanently once the user has expressed a choice.

---

## 5. Carousel dots are 6x6 px tap targets (Medium - PARTLY FIXED ON MAIN, measured)

> **Both halves of this finding changed on `origin/main`, in different ways.**
> This finding covered two components; check them separately.
>
> - **`PersonaBand` dots: raised to the WCAG floor, still under the house
>   rule.** They now carry a 24x24 hit area (`px-[9px] py-[9px]` around the 6px
>   visual dot), clearing WCAG 2.5.8's 24px minimum. But the project's own
>   `tailwind.config.ts` documents **44px** (`min-h-touch`, "A0.7 ... Use
>   `min-h-touch` on icon-only buttons"), so by house rule they are still
>   under-size - as are the `PersonaBand` paging arrows at `h-9 w-9` (36px).
>   The `skill/taste-skill` branch reportedly carries a 44px version; that is
>   the one that satisfies the documented rule.
>
> **Measured live at 390px on the merged tree**, which confirms the above and
> adds one thing source reading could not see:
>
> | Control | Size | WCAG 2.5.8 (24px) | House rule (44px) |
> |---|---|---|---|
> | Industries dots 2-5 | 24x24 | pass | **fail** |
> | Industries dot 1 (active pill) | 42x24 | pass | **fail** |
> | Previous / Next industries | 36x36 | pass | **fail** |
> | Mobile menu button | 40x40 | pass | **fail** |
> | **"HQ People subscriber add-on" info button** | **20x20** | **FAIL** | **fail** |
>
> **That last row became its own finding - see
> [finding 8](#8-hq-people-subscriber-add-on-info-button-is-20x20-px-medium---still-open).**
> Every other non-exempt control clears 24px; this one does not, so it is the
> one with an actual conformance problem rather than a house-style problem. It
> was split out because grouping it here hid the only real WCAG failure among
> a set of house-rule gaps. Across the home page at 390px: 1 control under the
> WCAG floor, 19 under the documented 44px.
> - **`HeroChatPreview` dots: resolved by removal, not resizing.** On
>   `origin/main` that component has no `<button>` and no `onClick` at all -
>   the clickable example dots were taken out. At this audit's base they were
>   `<button onClick={() => setActive(i)}>` (`HeroChatPreview.tsx:128-134`).
>   So the 6x6px target is gone, but so is the ability to pick an example.
>   **Confirmed deliberate - not a regression.** The dots went because the
>   content they revealed is now all on screen at once: the hero was rebuilt
>   as a static transcript, after removing the 4.8s auto-advance left three of
>   four answers unreachable behind a 6px control. Verified directly in
>   `components/landing/HeroChatPreview.tsx` on `origin/main`, which documents
>   the decision in its own header - "STATIC, AND SHOWS EVERYTHING AT ONCE -
>   do not turn this back into a carousel" - and sets out both the WCAG 2.2.2
>   reasoning and the hidden-evidence problem. The component now has zero
>   `useState`, zero `useEffect`, no `'use client'` directive and no
>   `<button>`, so it server-renders complete.
>
> **Confirmed live on the merged tree.** This was raised from source as an open
> question; the browser settles the factual half of it. On the production home
> page the group is still present and still labelled
> `role="group"` / `aria-label="HQ People - example HR answers"`, but it
> contains **zero buttons**, and a query for `button[aria-label^="Example"]`
> returns **0 nodes** (it returned 4 at the audit base).
>
> So the dots are not merely smaller or restyled - the control is gone, and a
> visitor can no longer choose which example to read. The tap-target half of
> finding 5 is therefore "fixed" only in the sense that the target no longer
> exists.
>
> The browser proved the control is absent; it could not prove whether that was
> intended, and that question has since been answered. **This half of finding 5
> is closed - deliberate, not a regression.**
>
> Worth separating the two kinds of evidence, since this document's whole
> argument is about what each kind can and cannot show:
>
> - **Verified here.** The component's header on `origin/main` documents the
>   removal and argues against reverting it, and the file is genuinely static
>   (no state, no effects, no client directive, no buttons). That is a fact
>   about the code, checked directly.
> - **Reported, not verified here.** That the change came from a sequence of
>   explicit user instructions during the Web Interface Guidelines work was
>   relayed by the sessions that made it. Nothing in this audit independently
>   establishes the provenance - but the code comment is contemporaneous with
>   the change and says the same thing, which is as close to corroboration as
>   this document can get on its own.
>
> The 6x6 finding can only come back if someone reintroduces a carousel there,
> which the component's own header now argues against - and that header, rather
> than this audit, is what will be read by whoever is tempted.

**Page:** `/`
**Viewport:** 390x844
**Screenshot:** `hero-chat-dots-390.png`
**Components:** `HeroChatPreview.tsx` (Example 1-4), `PersonaBand.tsx`
(Industries page 1-5)

Measured geometry at 390px:

| Control | Size | Centre-to-centre spacing |
|---------|------|-------------------------|
| Hero chat dots, inactive | **6 x 6 px** | 12 px |
| Hero chat dot, active | 24 x 6 px | - |
| Industries dots, inactive | **6 x 6 px** | 12 px |
| Industries dot, active | 24 x 6 px | - |

`padding: 0px`, `min-height: auto` - the button *is* the dot, with no larger
hit area behind it.

6x6 px fails WCAG 2.5.8 Target Size (Minimum, AA), which wants 24x24 px. The
spacing exception does not rescue it: a 24px circle centred on one dot
overlaps its neighbours at 12px centres. It is also far below the 44px minimum
the project sets for itself in `tailwind.config.ts`:

```
tailwind.config.ts:270-275
  // A0.7 - 44px is the WCAG 2.1 AA touch target minimum.
  // Use `min-h-touch` on icon-only buttons and modal close.
  'touch': '44px',
```

Full count of sub-44px interactive controls at 390px (inline text links inside
paragraphs excluded, as WCAG exempts them): `/` 23, `/outsourcing` 14,
`/pricing` 12, `/contact` 10.

**Reproduce:** open `/` at 390px, scroll to the hero chat preview, try to tap
the second dot with a thumb.

**Why static review misses it:** the classes read as a normal dot indicator.
Only measuring the rendered box shows there is no padding expanding the target.

**Recommended fix:** keep the 6px dot visual and expand the hit area around it
(padding plus a negative margin, or a `::before` overlay sized to `min-h-touch`
/ at least 24px). This changes layout spacing, so it is listed, not fixed.

---

## 6. ToolExplorer tablist has no arrow-key support (Low-medium - FIXED ON MAIN, measured)

> **Fixed on `origin/main`, not by this audit.** Arrow Left/Right, Home and End
> are handled, with a roving `tabIndex`. Source-verified on `origin/main`, and
> the live run that note asked for has been done - focus genuinely follows
> selection, which source could not show:
>
> | Key | `tabindex` before | focused -> | selected -> |
> |---|---|---|---|
> | (start) | `["0","-1"]` | 0 | 0 |
> | ArrowRight | `["-1","0"]` | 1 | 1 |
> | End | `["-1","0"]` | 1 (last) | 1 |
> | Home | `["0","-1"]` | 0 (first) | 0 |
>
> Exactly one tab carries `tabindex="0"` at any time, and focus and selection
> move together. This one is fully closed.

**Page:** `/`
**Viewport:** 1440x900
**Component:** `ToolExplorer.tsx:119-130`

The container is `role="tablist"` and the children are `role="tab"` with
`aria-selected`, which tells assistive technology to expect the ARIA tabs
keyboard pattern: arrow keys move between tabs, and only the selected tab is
in the tab order.

Measured: focus the first tab, press ArrowRight - focus and selection both stay
on "HQ People" (`moved: false`). Every tab is also individually in the tab
order rather than the single-stop-plus-arrows the role implies.

`PersonaBand` gets this right - its `role="group"` is `tabindex="0"` and
ArrowRight / ArrowLeft page the carousel correctly (verified below).

**Recommended fix:** either implement the tabs pattern (arrow keys +
`tabindex="-1"` on unselected tabs) or drop to plain buttons, which promise no
particular key handling.

---

## 7. Mobile menu button is 40x40 px (Low - STILL OPEN)

> **Still open on `origin/main`** - the button is `h-10 w-10` (40px) against the
> 44px the project documents. This is the one finding of 3-7 that nobody has
> picked up. **Re-measured live on the merged tree: 40x40.** It clears WCAG
> 2.5.8's 24px floor, so this remains a house-rule gap rather than a
> conformance failure - unlike the 20x20 info button in
> [finding 8](#8-hq-people-subscriber-add-on-info-button-is-20x20-px-medium---still-open),
> which fails both. If only one of the two gets fixed, fix that one first.

**Pages:** every marketing page
**Viewport:** 390x844
**Screenshot:** `mobile-menu-open-390.png`
**Component:** `MarketingHeader.tsx:115-116`

The icon-only hamburger measures **40 x 40 px**, under the 44px the project's
own Tailwind config documents for exactly this case ("Use `min-h-touch` on
icon-only buttons"). It clears WCAG 2.5.8's 24px floor, so this is a
house-rule violation rather than an AA failure.

The menu itself works correctly: `aria-expanded` flips `false`/`true`, the
`aria-label` swaps between "Open menu" and "Close menu", 10 nav links become
visible, the toggle closes it again, and there is no horizontal overflow while
open (scrollWidth 390 = clientWidth 390).

One related observation: the page behind the open menu still scrolls
(`body` `overflow: visible`, programmatic scroll succeeds). Whether that
matters depends on whether the panel is meant to be a modal overlay or an
inline dropdown - not filed as a defect.

Also under 44px in the header/footer: the LinkedIn link (36x36). The
"HQ People subscriber add-on" info button (20x20) was recorded here as a
`/pricing` aside; the post-merge re-run found it on `/` as well, and it is now
[finding 8](#8-hq-people-subscriber-add-on-info-button-is-20x20-px-medium---still-open).

---

## 8. "HQ People subscriber add-on" info button is 20x20 px (Medium - STILL OPEN)

> **Found in the post-merge browser re-run, not in the original sweep**, and
> split out of finding 5 because it is a different kind of problem. Numbered 8
> to keep the original 1-7 references valid; by severity it belongs beside
> finding 5, which is where the summary table puts it.

**Pages:** `/` and `/pricing` - the same control, measured 20x20 on both
**Viewport:** 390x844
**Measured:** against production after PR #9 merged (`f095567`)

Every other non-exempt interactive control on either page clears WCAG 2.5.8's
24x24 minimum. This one does not:

| Control | Size | WCAG 2.5.8 (24px) | House rule (44px) |
|---------|------|-------------------|-------------------|
| **"HQ People subscriber add-on" info button** | **20 x 20** | **FAIL** | fail |
| Industries dots 2-5 | 24 x 24 | pass | fail |
| Industries dot 1 (active pill) | 42 x 24 | pass | fail |
| Previous / Next industries | 36 x 36 | pass | fail |
| Mobile menu button (finding 7) | 40 x 40 | pass | fail |

Across the home page at 390px: **1 control below the WCAG floor, 19 below the
documented 44px.** The footer and nav text links measure 18px tall, but those
are inline links inside list items and are exempt under WCAG 2.5.8's inline
exception, so they are not counted here.

**Why this is separated from finding 7.** The two look like the same complaint
and are not. Finding 7's 40x40 button clears the accessibility floor and misses
only the project's own stricter 44px rule - a house-style gap, fixable at
leisure. This one fails WCAG 2.5.8 outright, which is a Level AA success
criterion in WCAG 2.2. It is the only such failure left on the home page, and
grouping it with the house-rule items hides that.

**Recommended fix:** the visual glyph can stay 20px; the hit area is what has
to grow. Pad the button to at least 24x24, and preferably to the documented
`min-h-touch` 44px, in the same way `PersonaBand`'s dots were fixed on `main`
(`px-[9px] py-[9px]` around a 6px dot). Nothing visual needs to change.

**Why static review misses it.** The class list on this button looks
unremarkable - the failure only exists as a computed box at a particular
viewport, and only matters below the breakpoint where the icon shrinks.

---

## Expected findings that did not reproduce

Recording these explicitly, because three were specifically predicted and the
browser contradicts all three.

### The marketing surface DOES have a keyboard focus indicator (hypothesis disproved)

The prediction was that because the ~120 `focus-visible:ring-*` utilities emit
no CSS and the only real focus rule is scoped to `html[data-app="product"]`,
the marketing surface would have no focus indicator at all.

**It has one at every stop.** I tabbed through all 70 focusable stops on `/`,
captured each focused element's computed style, reloaded and captured the same
elements unfocused, and diffed:

- **70 of 70 stops change appearance on focus. Zero stops show no visual change.**
- 60 of 70 are carried by the **browser's own default ring**
  (`outline: auto 1px rgb(238,238,238)`), which is clearly visible against the
  marketing dark slab.
- 10 of 70 set an explicit outline - `solid 2px rgb(232,178,58)` (Wattle Gold)
  on the primary CTAs, `solid 2px rgb(245,245,244)` on secondary ones.

Two things explain the mismatch with the prediction:

1. **Not one marketing tab stop carries a `focus-visible:ring-*` class.** Those
   ~120 utilities are on product components. Their emitting-no-CSS status is
   irrelevant here.
2. Only **one** marketing tab stop sets `outline-none` (the PersonaBand group),
   and it sets its own `solid 2px` outline, so nothing swallows the default
   ring.

Ring contrast was measured against the real background behind each control
across `/`, `/pricing`, `/contact`, `/about`, `/compare`, `/marketplace` and
`/careers`: **no control has a focus ring below 3:1.**

The caveat worth recording: the marketing surface is relying on the UA default
ring, not on anything the design system specifies. It works today because the
surface is dark and Chrome's default ring is light. It is one `outline-none`
away from vanishing, and it is not guaranteed to look the same across browsers.

A sub-finding from this pass: `/contact`'s four form fields *do* set a
transparent `outline: solid 2px rgba(0,0,0,0)` via `outline-none`, but they
pair it with `focus:border-ink`, so focus is shown by a border-colour change
plus the caret. Visible, though a 1px border change is the weakest indicator
on the site.

### The hero does NOT regress to a blank paint

`CLAUDE.md` records the hero painting blank three times from an
`opacity: 0` entrance that never ran. Tested four ways; the `<h1>` has an
effective opacity (the product of every ancestor's opacity) of **1.0** in all
of them:

| Condition | `<h1>` effective opacity | Screenshot |
|-----------|-------------------------|------------|
| Normal foreground load | 1.0 | `hero-foreground-1440.png` |
| **All CSS animations forced off** | 1.0 | `hero-animations-disabled-1440.png` |
| `prefers-reduced-motion: reduce` | 1.0 | `hero-reduced-motion-1440.png` |
| Page frozen via CDP `Page.setWebLifecycleState`, then reactivated | 1.0 | `hero-after-freeze-1440.png` |

The reveal is a CSS keyframe animation (`animation-name: hq-hero-rise` /
`hq-hero-lead`, `animation-fill-mode: both`), which advances on the document
timeline rather than `requestAnimationFrame` and resolves to its end state
regardless. The animations-disabled result is the decisive one: with
`animation: none !important` the hero is still fully visible, which proves
nothing depends on an animation completing.

The same animations-off and reduced-motion checks across 12 pages found **no
page with invisible text content**. The only zero-opacity text anywhere is the
hero chat preview's three inactive stacked answers, which are correct - exactly
one answer is visible at a time, and clicking an example swaps it.

**Honest limitation:** I could not reproduce a genuinely backgrounded tab.
Playwright launches Chromium with `--disable-renderer-backgrounding` and
friends, so a non-fronted page keeps `document.visibilityState === "visible"`
(measured: `"visible"` even after `bringToFront()` on another page). The CDP
freeze and the animations-off test are stand-ins for that condition, not the
condition itself.

### StickyMobileCta works correctly

My first pass reported this as never appearing. **That was a bug in my test,
not the site** - I scrolled to `document.body.scrollHeight`, which is 844 here
because the content lives in an overflowing `<main>`, so I never scrolled far
enough. Re-measured properly at 390px:

| scrollY | opacity | pointer-events |
|---------|---------|----------------|
| 0 | 0 | none |
| 2000 | 0 | none |
| 5000 | 0 | none |
| **8000** | **1** | **auto** |
| 12000 | 1 | auto |
| bottom (13131) | 1 | auto |

The sentinel is placed at 60% of document height (8367px of 13946px) and the
IntersectionObserver fires correctly. The bar covers no interactive element at
the page bottom (checked by rectangle intersection: 0 hits), and causes no
overflow.

Observation, not a defect: on a 13,946px-tall home page, 60% means the mobile
CTA appears only after roughly nine screens of scrolling. That is the
documented intent, but it may be later than desired.

---

## Everything else that passed

**Static sweep, all 15 pages x 3 viewports:**

- Console: **0 errors**, 0 page errors. The single warning is Next's dev-only
  `metadataBase` notice on `/`.
- Network: **0 failed requests.** Three `ERR_ABORTED` entries during the sweep
  were navigation-cancelled dev artifacts (a font preload, a webpack
  hot-update, and a telemetry beacon); `/api/telemetry/funnel` returns **200**
  when allowed to complete.
- All 15 routes return HTTP 200 and have a unique, descriptive `<title>`.
- **Horizontal overflow at 390px: none.** `scrollWidth == clientWidth == 390`
  on every page, with zero unclipped elements extending past the viewport.
- **Images: 0 missing `alt`, 0 broken** (`naturalWidth === 0`) across all pages.
- Copy rules: **0 em dashes, 0 en dashes, 0 curly apostrophes** in rendered
  text across all 15 pages.

**Interactive components verified working:**

- **PersonaBand** - Next and Previous arrows page correctly and round-trip;
  the `role="group"` is `tabindex="0"` and ArrowRight / ArrowLeft page it
  correctly; all 5 dots select their own page.
- **PricingSection** - both toggles carry correct `aria-pressed`. Team size
  25 <-> 150 changes the bundle price (`$89` <-> `$269`); Monthly <-> Annual
  changes the annual figures (`$59/$179/$269` -> `$590/$1,790/$2,690`, with
  `$74`/`$224` monthly equivalents shown); switching back to Monthly restores
  the original figures exactly. Prices match `lib/pricing-config.ts` as
  documented in `CLAUDE.md`.
  - *Minor note:* the HQ Recruit figures (`$65`, `$120`) are unchanged by the
    Annual toggle, unlike every other plan. Possibly correct if Recruit is
    monthly-only - flagged as a question, not a defect.
- **FaqSection** - 8 `<details>`, all closed initially, expand and collapse by
  click and by Enter; multiple panels may be open at once.
- **Cited** - popovers open on both hover and focus, set `aria-expanded`
  correctly, expose `role="tooltip"`, close on unhover **and on Escape**, and
  are not clipped at the viewport edge.
- **HeroChatPreview** - correctly pairs each example with its answer, and
  correctly pauses rotation on hover and on focus (the handlers wrap the whole
  group, dots included).
- **ContactForm** - correct tab order (name, email, company, message, submit,
  then out of the form), every field has a proper `<label for>`, native
  validation blocks an empty submit with per-field messages, focus moves to the
  first invalid field, and an invalid email is caught. *Minor:* no
  `autocomplete` attributes (the enterprise form has them).
- **EnterpriseInquiryForm** - tab order is correct and matches DOM order across
  all 11 controls, no `tabindex` hacks, every field has a wrapping `<label>`,
  `autocomplete` present on name/email/organization. Its validation is
  finding 2.
- **Mobile menu** - toggles correctly with accurate `aria-expanded` and a
  swapping `aria-label`.

Neither form was submitted to a real endpoint. Both `/api/contact` and
`/api/enterprise-inquiry` were intercepted and aborted for the duration of the
form tests; the only request either form attempted is the empty POST in
finding 2, which was blocked.

---

## Environment notes

Not site defects - worktree/tooling friction, recorded so the next run does not
re-hit them.

1. **Turbopack cannot start in this worktree.** `node_modules` here is a
   junction to the main checkout, and Turbopack refuses it:
   `Symlink [project]/node_modules is invalid, it points out of the filesystem
   root` (a hard `FATAL` panic). `next.config.js` pins `turbopack.root` to
   `__dirname`, so the junction target is outside the filesystem root.

2. **The webpack fallback needed a temporary edit.** `next dev --webpack`
   loads `tailwind.config.ts` through a CJS path, where
   `plugins: [require('tailwindcss-animate')]` (`tailwind.config.ts:277`)
   throws `ReferenceError: require is not defined` - Node treats the file as
   ESM because of its `import`/`export` syntax. I converted that one line to a
   top-level import to get the server up, and **reverted it before committing**
   (`git diff tailwind.config.ts` is empty). Turbopack does not hit this path,
   so the main checkout is unaffected; it is latent, not a live bug.

The audit itself ran against `next dev --webpack -p 3405`. CSS is produced by
the same Tailwind v3 + PostCSS pipeline either way, so token and layout results
carry over; if anything here looks surprising, re-confirm under Turbopack in
the main checkout.
