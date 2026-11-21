# Web Interface Guidelines audit - public marketing surface

Date: 2026-11-21
Method: static code review against the Web Interface Guidelines
(vercel-labs, snapshot pinned at commit `434b7f9`), applied via the
`web-design-guidelines` skill. No dev server - this worktree has no
`.env.local` by design. Verified with `npx tsc --noEmit` and `npm run lint`.

Scope: `app/page.tsx`, `app/about`, `app/ai-standard`, `app/compare`,
`app/outsourcing`, `app/product/people`, `app/product/recruit`,
`app/pricing`, `app/roadmap`, `app/changelog`, `app/contact`,
`app/marketplace`, `app/privacy` (+ `app/privacy/request`), `app/terms`,
`app/careers`, `components/landing/*`, `components/enterprise/*`.
Also `app/layout.tsx` and `app/globals.css`, since both decide behaviour
for every page above.

Excluded as dead code: `components/landing/ProductPillars.tsx`,
`components/landing/SocialProofRibbon.tsx`.

## Where the guidelines and CLAUDE.md disagree

The guidelines ask for typographic `…` and curly quotes `“ ”`. CLAUDE.md
mandates plain hyphens and ASCII apostrophes for this codebase. Project
rules win: nothing in this audit changes copy to satisfy the ellipsis or
quote rules, and the affected spots are listed as nits only.

---

## Critical

### 1. Reduced-motion users see a blank answer and empty score bars on the homepage centrepiece

`components/landing/ToolExplorer.tsx:236` and
`components/landing/ToolExplorer.tsx:295`

Rule: *Honor `prefers-reduced-motion` (provide reduced variant or disable)*
plus CLAUDE.md's "do not let animation own visibility".

`usePrefersReducedMotion()` starts at `false` and only learns the truth in
an effect. Both previews seed their state from that first-render value:

- `PeoplePreview`: `useState(reduced ? 2 : 0)` -> `phase = 0`.
- `RecruitPreview`: `useState(reduced)` -> `fill = false`.

The parent then re-renders with `reduced === true`. Neither preview is
re-keyed, so the initial state stands - and each component's effect now
returns early at `if (reduced) return`, so the timers that would advance
the state never run. Result for anyone with reduce-motion enabled:

- the HQ People answer bubble stays at `opacity-0` permanently (the
  question shows, the answer never does);
- the HQ Recruit score bars stay at `width: 0%` and the "Strong yes" badge
  stays at `opacity-0`.

The global `@media (prefers-reduced-motion: reduce)` block in
`app/globals.css:549` collapses the transition duration, but the
`opacity-0` / `0%` classes are still applied, so the content is genuinely
invisible rather than just un-animated. This is the fourth instance of the
failure mode CLAUDE.md already documents three times (HeroSection,
AdaptiveSlider, InlineAction).

**Fixed** - the resting state is now *derived* (`reduced ? 2 : phase`,
`reduced || animated`) rather than seeded into `useState` from a value
that is always `false` on the first render. Deriving it cannot go stale,
and it avoids the `react-hooks/set-state-in-effect` warning that
resyncing inside the effect would have added to the lint baseline.

---

## High

### 2. Pinch-zoom is disabled on every page

`app/layout.tsx:73` - `maximum-scale=1` in the viewport meta.

Rule: *flag `user-scalable=no` or `maximum-scale=1` disabling zoom*.
WCAG 1.4.4 (Resize Text, AA). Affects every page on the site and every
low-vision mobile user. `viewport-fit=cover` is correct and stays.

**Fixed** - `maximum-scale=1` removed.

### 3. Marketing has no surface-level keyboard focus indicator

`app/globals.css:444`

Rule: *Interactive elements need visible focus*. WCAG 2.4.7.

The only `:focus-visible` rule in the stylesheet is scoped
`html[data-app="product"]`. Marketing pages set `data-app="marketing"`,
so that rule never applies to them. What marketing actually relies on:

- Per-control Tailwind utilities (`focus-visible:outline-clay`,
  `focus-visible:outline-accent`) on most CTAs. These **do** emit CSS -
  they are `outline-*`, not the `ring-*/NN` family, and `--accent`
  resolves to near-white `#F5F5F4` under `[data-app="marketing"]`, so
  they are visible. `--ring` and `--focus-ring` are defined only inside
  the two `[data-app="product"]` blocks (`app/globals.css:250`, `:381`),
  so `outline-accent` falls back to `var(--accent)` here.
- The browser default outline for everything else: header nav links, the
  mobile menu, the mobile and sticky CTAs, FAQ `<summary>` elements,
  PersonaBand arrows and dots, HeroChatPreview dots, ToolExplorer tabs,
  the pricing toggles and all footer links. None of these carry a focus
  utility.

So the site is not focus-indicator-free, but the indicator is
inconsistent and depends on per-control opt-in that most controls missed.

**Fixed** - added a `[data-app="marketing"] :focus-visible` rule that
mirrors the product one (including its documented text-entry exception),
at a specificity that lets the existing per-control gold outlines keep
winning. Pages that render no `MarketingHeader` (privacy, terms, careers)
still have no `data-app`, so they keep the browser default - see
"Not fixed" #4.

### 4. Form labels are not associated with their inputs

`app/privacy/request/page.tsx:98`, `:125`, `:135`, `:146`

Rule: *Form controls need `<label>` or `aria-label`* / *Labels clickable
(`htmlFor` or wrapping control)*. WCAG 1.3.1, 3.3.2, 4.1.2.

Four `<label>` elements with no `htmlFor` and no wrapped control. The
name, email and detail fields therefore have **no accessible name at
all**, and clicking a label does not focus its field. The line 98 label is
a group caption for the radio set, which is not a label role.

**Fixed** - `id`/`htmlFor` pairs added; the radio set is now a
`<fieldset>` with a `<legend>`.

### 5. The privacy request "form" is not a form

`app/privacy/request/page.tsx:96`, `:159`

Rule: *Use semantic HTML (`<button>`, `<a>`, `<label>`, `<table>`) before
ARIA* / *Submit button stays enabled until request starts*.

The fields sit in a `<div>` and submit via `onClick` on a button with no
`type`. Consequences: Enter does not submit, no native validation, no
implicit form semantics for assistive tech.

**Fixed** - wrapped in `<form onSubmit>`, button is `type="submit"`.

### 6. `noValidate` makes `required` decorative on the enterprise form

`components/enterprise/EnterpriseInquiryForm.tsx:98`

Rule: *Errors inline next to fields; focus first error on submit*.

The form sets `noValidate` while marking seven fields `required`, and
there is no client-side validation to replace what was switched off. An
empty submit posts to the server and comes back as one generic
form-level message; nothing points at the offending field and focus
never moves.

**Fixed** - `noValidate` removed, so the browser blocks the submit,
shows the message against the field and focuses the first invalid one.

### 7. Hit targets below 24x24 px

Rule: *Checkboxes/radios: label + control share single hit target* and the
24x24 minimum (WCAG 2.5.8 Target Size).

- `components/landing/HeroChatPreview.tsx:135` - carousel dots are
  `h-1.5 w-1.5` = **6x6 px** (24 px for the active one).
- `components/landing/PersonaBand.tsx:147` - same pattern, **6x6 px**.
- `components/landing/PricingSection.tsx:381` - the pricing info "i"
  button is `h-5 w-5` = **20x20 px**.

**Fixed** - all three keep their exact visual size; the hit area is
expanded to >=24 px via padding (dots) and an invisible pseudo-element
(info dot).

---

## Medium

### 8. Auto-advancing carousel with no pause control

`components/landing/ToolExplorer.tsx` (was a 6.5 s dwell, infinite loop)

Rule: *Autoplay motion >5 seconds alongside other content needs pause,
stop, or hide controls*. WCAG 2.2.2.

It paused on hover and focus and honoured reduced motion, which covered
pointer and keyboard users. Touch users got neither - the panel swapped
under them while they read, including the CTA they were reaching for.

**Fixed** - the auto-advance is gone entirely (founder call, Nov 2026).
With only two tabs, both visible and labelled, the rotation competed with
the reader rather than inviting exploration, so removing it was the
better answer than wrapping it in a pause control. The `paused`,
`userPicked`, `DWELL_MS` and interval machinery and the hover/focus pause
handlers all went with it; the tabs are visitor-driven only. The 420 ms
`.tool-fade` on tab switch stays - it answers a deliberate interaction
and is already reduced-motion guarded.

`components/landing/HeroChatPreview.tsx:65` has the same auto-advance at
4.8 s but does expose manual dot controls, so it is acceptable.

### 9. Fake buttons in the tab order

`components/landing/PeopleDeepDive.tsx:19` and `:25`

Rule: *`<button>` for actions, `<a>`/`<Link>` for navigation* / *Use
semantic HTML before ARIA*.

Two decorative mock chat bubbles are real `<button type="button">`
elements with `cursor-default` and no handler. They are keyboard
focusable and announced as buttons that do nothing.

**Fixed** - changed to non-interactive elements.

### 10. `role="tablist"` without the tab keyboard pattern or panels

Rule: *Interactive elements need keyboard handlers*.

- `components/landing/ToolExplorer.tsx:118` - a proper tablist with
  `aria-controls` and a `tabpanel`, but no Arrow/Home/End handling and no
  roving tabindex. **Fixed.**
- `components/landing/PersonaBand.tsx:138` - `role="tab"` buttons with no
  `aria-controls` and no `role="tabpanel"` anywhere; the content region is
  a `role="group"`. Broken ARIA that promises a pattern it does not
  implement. **Fixed** by dropping the tab roles for plain buttons with
  `aria-current`.
- `components/landing/HeroChatPreview.tsx:126` - same mismatch.
  **Fixed** the same way.

### 11. The comparison table is clipped on mobile, with no way to scroll

`components/landing/ComparisonSection.tsx:29`

Rule: *Avoid unwanted scrollbars: fix content overflow* / *Text
containers handle long content*.

A four-column table sits directly inside `overflow-hidden rounded-3xl`.
At phone widths the fourth column ("DIY") is cut off and there is no
scroll affordance, so the content is unreachable rather than merely
cramped. `app/compare/page.tsx:89` solves the same problem correctly by
collapsing to one column per row - worth copying eventually.

**Fixed** - added an inner `overflow-x-auto` scroll region, keyboard
focusable and labelled. The rounded corners are unaffected.

### 12. In-page anchors land under the sticky header

`app/globals.css` (no `scroll-margin-top` / `scroll-padding-top` anywhere
on marketing), targets at `components/landing/LandingPage.tsx:48` (`#product`),
`components/landing/ToolExplorer.tsx:101` (`#tools`),
`components/landing/PricingSection.tsx:98` (`#pricing`),
`app/outsourcing/page.tsx:160` (`#variants`), `:300` (`#inquiry`).

Rule: *`scroll-margin-top` on heading anchors* / *Sticky headers must not
cover the focused element*.

`MarketingHeader` is `sticky top-0` and roughly 68 px tall. Every link to
`#inquiry`, `#variants`, `#tools` or `#pricing` scrolls the target's
heading behind it.

**Fixed** - one `scroll-padding-top` rule on the marketing surface.

### 13. Missing `autocomplete` and `name` on form controls

Rule: *Inputs need `autocomplete` and meaningful `name`* / *Disable
spellcheck on emails, codes, usernames* / *Use correct `type` and
`inputmode`*.

- `components/landing/ContactForm.tsx:62`, `:66`, `:71`, `:75` - no
  `name` and no `autocomplete` on any of the four controls; the email
  field has no `inputmode` and no `spellCheck={false}`.
- `components/enterprise/EnterpriseInquiryForm.tsx:102` onward - three
  fields have `autoComplete`, none has a `name`; the email field has no
  `inputmode` or `spellCheck={false}`.
- `app/privacy/request/page.tsx:126`, `:136` - neither.

**Fixed** in all three.

### 14. Async state changes are not announced

Rule: *Async updates (toasts, validation) need `aria-live="polite"`*.

- `components/landing/ContactForm.tsx:79` - the submit error renders as a
  plain `<p>`. **Fixed** (`role="alert"`).
- `components/landing/ContactForm.tsx:44` - the success panel replaces the
  whole form, so focus is dropped to `<body>` and nothing is announced.
  **Fixed** (`role="status"`).
- `app/privacy/request/page.tsx:157` and `:56` - same two problems.
  **Fixed** the same way.

`EnterpriseInquiryForm` already gets this right (`role="alert"` at `:271`,
`role="status"` at `:77`).

### 15. Native `<select>` with the arrow removed and nothing in its place

`components/enterprise/EnterpriseInquiryForm.tsx:94` - `selectCls` is
`appearance-none pr-10` with no chevron drawn in the reserved space.

Rule: *Native `<select>`: explicit `background-color` and `color`*. The
colours are set correctly; the problem is that five selects now look
exactly like text inputs. Reported, not fixed - see "Not fixed" #2.

### 16. Product dropdown misses its disclosure semantics and Escape

`components/landing/MarketingHeader.tsx:68`

Rule: *Use semantic HTML before ARIA* / *Interactive elements need
keyboard handlers*.

`aria-expanded` is present, but there is no `aria-haspopup`, no
`aria-controls`, and the only dismissal is an outside `mousedown`. A
keyboard user cannot close the menu with Escape, and tabbing past it
leaves it open behind the rest of the page.

**Fixed** - added `aria-haspopup`, `aria-controls` with a matching `id`,
and Escape handling for both the dropdown and the mobile menu.

### 17. Pricing toggles are not in the URL

`components/landing/PricingSection.tsx:27` and `:28`

Rule: *URL reflects state* / *Deep-link all stateful UI*.

Team size and billing cycle live in `useState`, so an annual-pricing view
cannot be linked, shared or restored. Same for the PersonaBand page index
(`components/landing/PersonaBand.tsx:58`) and the ToolExplorer tab.

Reported, not fixed - see "Not fixed" #3.

---

## Low

### 18. `transition: all`

Rule: *Never `transition: all` - list properties explicitly*.

- `components/landing/ToolExplorer.tsx:263` - **fixed**.
- `components/landing/HeroChatPreview.tsx:135` - **fixed**.
- `components/landing/PersonaBand.tsx:147` - **fixed**.

### 19. Invisible but focusable sticky CTA

`components/landing/StickyMobileCta.tsx:48`

Rule: *Interactive elements need visible focus* (an invisible focus stop
is the inverse failure).

Before the 60 % scroll mark the bar is `pointer-events-none opacity-0`,
which hides it visually but leaves the "Get started" link in the tab
order. A keyboard user tabbing from the top of the page hits an invisible
link.

**Fixed** - the bar is now `invisible` until revealed, which removes it
from the tab order.

### 20. Decorative SVGs missing `aria-hidden`

`components/landing/MarketingHeader.tsx:75` (dropdown chevron), `:119`
(hamburger / close icon). Rule: *Decorative icons need
`aria-hidden="true"`*. Every other icon in the marketing tree already has
it. **Fixed.**

### 21. Conflicting ARIA on one SVG

`components/landing/PricingSection.tsx:215` - `aria-hidden` and
`role="img"` on the same element. `aria-hidden` wins, so `role="img"` is
dead weight. **Fixed** (role removed).

### 22. Hardcoded copyright year

`components/landing/MarketingFooter.tsx:170` - `&copy; {2026}`.

Rule: *Hardcoded date/number formats (use `Intl.*`)*. This is a server
component, so `new Date().getFullYear()` carries no hydration risk.
**Fixed.**

### 23. Table headers without `scope`

- `app/outsourcing/page.tsx:243`, `:244` - `<th>` with no `scope="col"`,
  and the plan-name column is `<td>` where it is functionally a row
  header. **Fixed.**
- `app/privacy/page.tsx:112`-`:114` - three `<th>` with no `scope="col"`.
  **Fixed.**

### 24. Mobile CTAs missing the focus utility their desktop twins have

`components/landing/MarketingHeader.tsx:161`,
`components/landing/StickyMobileCta.tsx:55`,
`components/landing/MarketingHeader.tsx:105` has the outline utilities;
its mobile equivalents do not. **Fixed** for consistency with the rest of
the gold CTAs.

### 25. Decorative score bars convey values only visually

`components/landing/HeroSection.tsx:168`,
`components/landing/RecruitDeepDive.tsx:78`,
`components/landing/ToolExplorer.tsx:330`

Rule: *Meaningful media needs captions, transcripts, or descriptions*.
These are product mock-ups inside labelled `role="group"` regions, and
ToolExplorer/RecruitDeepDive print the numeral beside each bar anyway.
`HeroSection.tsx:168` does not. Illustrative content, no real information
loss. Not fixed.

### 26. `transition-[width]` animates a layout property

`components/landing/ToolExplorer.tsx:332`

Rule: *Animate `transform`/`opacity` only*. Three 1.5 px-tall bars;
reduced motion already neutralises it. Rewriting to `scaleX` would change
how the fill renders for no measurable gain. Not fixed.

### 27. Raw `<img>` without dimensions

`components/landing/HeroSection.tsx:74`

Rule: *`<img>` needs explicit `width` and `height`*. The element is
`absolute inset-0 h-full w-full -z-10` and so out of flow - it cannot
shift layout - and the `backgroundImage` prop is never passed by any
caller today. Not fixed.

### 28. No `tabular-nums` on compared figures

`components/landing/MetricsStrip.tsx:36`,
`components/landing/PricingSection.tsx:323`,
`components/enterprise/EnterpriseVariantCard.tsx:48`

Rule: *`font-variant-numeric: tabular-nums` for number columns/comparisons*.
Correct by the letter of the guideline, but it changes glyph widths on
display-size headline numbers. Visual call. Not fixed.
`ToolExplorer.tsx:328` and `RecruitDeepDive.tsx:76` already use it.

### 29. No `text-wrap: balance` / `text-pretty` on headings

Site-wide; e.g. `components/landing/HeroSection.tsx:105`,
`components/landing/FooterCta.tsx:9`.

Rule: *Use `text-wrap: balance` or `text-pretty` on headings*. Changes
line breaking on every headline. Visual call. Not fixed.

### 30. No skip link

No `app/layout.tsx` or `MarketingHeader` skip link exists anywhere.

Rule: *Headings hierarchical; include skip link for main content*. Every
page does provide a `<main>` landmark, so landmark navigation works; the
gap is the visible keyboard shortcut past the header. Adding one means
new visible chrome on focus. See "Not fixed" #5.

### 31. No `<meta name="theme-color">`

`app/layout.tsx`. Rule: *`<meta name="theme-color">` matches page
background*. Marketing is a fixed dark slab (`#0A0A0B`), product toggles
light/dark, and the legal pages are light - one static value would be
wrong on two of the three. See "Not fixed" #6.

### 32. Five differently-named links to one destination

`components/landing/MarketingFooter.tsx:21`-`:25` - the whole "Use cases"
column points at `/#tools`. WCAG 2.4.4-adjacent: the names promise
industry-specific pages that do not exist. Content decision. Not fixed.

The footer also lists Roadmap, Changelog, "Our AI Accuracy Standard",
Outsourcing and Contact twice (Resources and Company columns).

### 33. External links do not announce the new tab

`components/landing/MarketingFooter.tsx:118`, `:158`,
`components/landing/FounderNote.tsx:100` - `target="_blank"` with no
"opens in a new tab" in the accessible name. Not one of the skill's
rules; WCAG 3.2.5 advisory. Not fixed.

### 34. Hit targets between 24 px and 44 px

`components/landing/MarketingHeader.tsx:117` (40x40 mobile menu toggle),
`components/landing/MarketingFooter.tsx:121` (36x36 social link),
`components/landing/PersonaBand.tsx:168` (36x36 carousel arrows).

Above the WCAG 2.5.8 minimum of 24 px, below the 44 px both Apple and
Google recommend. Not fixed - all three are comfortably tappable and
resizing them is a visual change.

### 35. Nits

- `components/landing/ContactForm.tsx:87`,
  `components/enterprise/EnterpriseInquiryForm.tsx:282` - `'Sending...'`
  should be `'Sending…'` per the guidelines. Left as ASCII per CLAUDE.md.
- `components/landing/ToolExplorer.tsx:196`,
  `components/landing/PricingSection.tsx:209`, `:352`,
  `components/enterprise/EnterpriseVariantCard.tsx:123`,
  `app/marketplace/page.tsx:61`, `app/outsourcing/page.tsx:148` -
  `-&gt;` inside link and button text. Some screen readers announce it as
  "greater than". Cosmetic; a glyph swap would break the ASCII rule.
- `components/landing/RecruitDeepDive.tsx:60` - straight quotes inside the
  evidence string.
- `components/landing/MarketingHeader.tsx:62` - `alt="HQ.ai"` on an image
  inside a link that already has `aria-label="HQ.ai home"`. The label
  wins, so the alt is unreachable; `alt=""` would be tidier.
- `components/landing/Cited.tsx:70` - `aria-expanded` on a control whose
  popover is a `role="tooltip"`. Tooltips are not disclosures;
  `aria-describedby` alone (already present) is the right wiring.
- `components/landing/MetricsStrip.tsx:18` - the section's accessible name
  comes from a `<p>`, so the band has no heading in the document outline.
- `components/landing/CustomerStory.tsx:40` - a `<blockquote>` whose
  attribution is a sibling `<p>`; `<figure>` + `<figcaption>` is the
  canonical pairing.
- `components/enterprise/EnterpriseVariantCard.tsx:86` - disclosure button
  has `aria-expanded` but no `aria-controls`.
- `app/careers/page.tsx:73` and `:74` - two adjacent links to `/` with
  different accessible names.

### 36. Invalid `<dl>` structure - FIXED

`components/landing/MetricsStrip.tsx:26`-`:43`

Rule: *Use semantic HTML*. The list emitted two `<dd>` elements **before**
their `<dt>` in every group. `<dd>` must follow its `<dt>`, so assistive
tech pairs terms and definitions wrongly. The numbers are not really
term/definition pairs, so this is now a plain `<ul>`. No visual change -
Tailwind preflight already stripped the default `dl` margins.

---

## Not fixed - needs a decision

1. **The HeroChatPreview still auto-advances** (`components/landing/HeroChatPreview.tsx:65`,
   4.8 s dwell, infinite loop). Left alone deliberately: unlike
   ToolExplorer it exposes manual dot controls, pauses on hover and focus,
   and honours reduced motion, so there is a mechanism to stop it. It also
   *is* the hero's "live product" moment rather than a container for copy
   the visitor is trying to read. Worth revisiting only if the same
   objection that retired ToolExplorer's rotation applies here too - the
   dots are the pause affordance, which is subtle.

2. **A chevron on the enterprise selects** (finding 15). `appearance-none`
   removed the native arrow and `pr-10` reserves space for a replacement
   that was never drawn, so five required dropdowns read as text inputs.
   The fix is adding a glyph - new visual chrome on a form I was asked
   not to redesign. Either draw the chevron or drop `appearance-none` and
   accept the native control.

3. **Putting pricing state in the URL** (finding 17). The right fix is
   `nuqs` or `useSearchParams` on `PricingSection`, which mounts on both
   `/` and `/pricing`. That means deciding whether `/?cycle=annual` is a
   URL you want crawled and canonicalised alongside `/pricing`, plus
   whether the home page's `force-dynamic` render should vary on it.
   Worth doing - sales links to annual pricing are a real use case - but
   it is a routing decision, not a cleanup.

4. **The legal and careers pages are a different website.** `app/privacy`,
   `app/privacy/request`, `app/terms` and `app/careers` never mount
   `MarketingHeader`, so they get no `data-app` attribute, fall through to
   the light `:root` palette, and use literal `bg-white` / `bg-black` /
   `text-white` / `border-black` / `accent-black`
   (`app/privacy/page.tsx:25`, `app/terms/page.tsx:21`,
   `app/careers/page.tsx:66`, `:71`, `:99`, `:117`,
   `app/privacy/request/page.tsx:57`, `:82`, `:103`, `:112`, `:131`,
   `:141`, `:152`, `:162`). Two consequences: the tokens are the ones
   CLAUDE.md forbids, and a visitor clicking "Privacy" in the dark footer
   lands on a white page with no site navigation. They also inherit no
   focus rule (finding 3). Re-skinning four pages onto tokens is a visual
   change well beyond an audit, and it needs a decision about whether the
   legal pages join the dark marketing surface or stay deliberately plain.
   This is the largest single piece of remaining work.

5. **A skip link** (finding 30). Standard pattern is a visually hidden
   anchor that appears on focus. It needs an `id` on each page's `<main>`,
   a focus style, and agreement on where it sits in the header. Low risk,
   but it adds visible chrome and touches 15 files.

6. **`theme-color`** (finding 31). Needs per-surface values -
   `#0A0A0B` for marketing, the product ramp for the dashboard, white for
   the legal pages - which means per-route `metadata` exports rather than
   one tag in the root layout.

7. **Marketing text inputs rely on a 1 px border colour change for focus.**
   `components/landing/ContactForm.tsx:40` (`outline-none focus:border-ink`),
   `components/enterprise/EnterpriseInquiryForm.tsx:93` and `:251`
   (`focus:outline-none focus:ring-2 focus:ring-accent/20`),
   `app/privacy/request/page.tsx:131`, `:141`, `:152`
   (`outline-none focus:border-black`). The new marketing focus rule
   deliberately mirrors the product one, which exempts text entry on an
   explicit founder call recorded at `app/globals.css:449`. I have kept
   marketing consistent with that decision rather than overriding it, but
   a 1 px border shift is weak under WCAG 2.4.11 (Focus Appearance), and
   on the privacy page the replacement is a hardcoded `border-black`.
   Reversing the founder call is not mine to make.

8. **`components/landing/ComparisonSection.tsx:80`** - the buyer-beware
   callout uses `border-warning/30 bg-warning/5`, but `--warning` is not
   redefined under `[data-app="marketing"]`, so the dark slab inherits the
   light-surface value `#A84600` from `:root` (`app/globals.css:402` sets
   the dark value under the product block only). At 30 % and 5 % alpha on
   `#0A0A0B` the border and tint are all but invisible. The body text is
   `text-ink-soft`, so nothing fails contrast - the callout just does not
   read as a callout. Fixing it means adding a marketing `--warning`,
   which is a token decision, and CLAUDE.md warns that every foreground on
   a changed surface has to be re-checked.

9. **`app/compare/page.tsx:87`** renders a comparison grid out of `<div>`s
   with `md:hidden` row labels. On desktop those labels are
   `display: none`, so a screen reader gets three unlabelled paragraphs
   per row with the column headings announced only once at the top. It is
   prose rather than data, and the responsive behaviour is better than
   `ComparisonSection`'s real table, so this is a trade-off to weigh, not
   a clear bug. A real `<table>` with `scope` plus the same
   one-column-per-row collapse would serve both.

---

## Clean

- `components/landing/FaqSection.tsx` - native `<details name="faq">`,
  marker hidden properly, works without JS, generous hit targets.
- `components/landing/Cited.tsx` - real `<button>`, `aria-describedby`,
  Escape and blur dismissal, reduced-motion aware.
- `components/landing/ProblemSection.tsx`,
  `components/landing/CustomerStory.tsx`,
  `components/landing/FounderNote.tsx` (`next/image` with explicit
  dimensions and real `alt`), `components/landing/FooterCta.tsx`,
  `components/landing/RecruitDeepDive.tsx`,
  `components/landing/PricingPageClient.tsx`.
- `app/marketplace/page.tsx`, `app/pricing/page.tsx`,
  `app/contact/page.tsx`, `app/roadmap/page.tsx`,
  `app/changelog/page.tsx`, `app/about/page.tsx`,
  `app/ai-standard/page.tsx`, `app/product/recruit/page.tsx` - correct
  heading order, `<main>` landmark, labelled sections, tokens throughout.
- `app/globals.css:549` - the global `prefers-reduced-motion` block is
  thorough (animations, transitions, scroll behaviour and the GSAP
  duration vars).
- `app/globals.css:580` - the hero entrance is CSS keyframes with `both`
  fill, exactly as CLAUDE.md requires.
- `app/layout.tsx:71` - `lang="en-AU"`; fonts self-hosted via
  `next/font` with `display: swap`.
- `components/enterprise/EnterpriseVariantCard.tsx` - `toLocaleString('en-AU')`
  everywhere a number is printed; native `<details>` for overage rates.
- `app/careers/page.tsx:98` - empty state handled;
  `app/careers/page.tsx:136` - computes the year rather than hardcoding it.
- No `onPaste` blocking, no `user-scalable=no`, no `<div onClick>`, no
  unvirtualised long lists, no layout reads in render anywhere in scope.

---

## Totals

| Severity | Found | Fixed |
| --- | --- | --- |
| Critical | 1 | 1 |
| High | 6 | 6 |
| Medium | 10 | 8 |
| Low | 19 | 9 |
| **Total** | **36** | **24** |

All eight fixed Medium findings are now fully fixed - finding 8 was
closed by dropping ToolExplorer's auto-advance outright rather than
adding a pause control.
