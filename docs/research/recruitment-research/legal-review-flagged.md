# Legal-Review-Flagged Items (excluded from recruitment-tips.json)

These practices are real, evidence-backed recruitment trends, but each is jurisdiction-dependent or regulated in some markets. They were excluded from the tip dataset because the HQ.ai Campaign Coach must not give jurisdiction-specific legal advice. Where the underlying principle is portable, it appears in the dataset reframed as a practice, not a requirement.

## Pay-range disclosure as a legal mandate

- Disclosure of salary ranges in job postings is law in California (since 2018), Colorado, Connecticut, DC, Hawaii, Maryland, New York, Nevada, Rhode Island, Washington (as of 2024), and several EU member states under the EU Pay Transparency Directive. (Federal Reserve Bank of Minneapolis, 2024-09).
- Reframed in the dataset (rc-025) as a campaign practice: "Show the salary band in the ad" because candidates self-select faster and trust more. Tip avoids the legal compulsion framing.

## Pay equity audits and reporting

- Several jurisdictions now require pay equity reports (UK gender pay gap reporting, EU directive, AU Workplace Gender Equality Agency reporting for employers of 100+). Audit obligations are not in scope for a tip bot serving SMEs of 15 to 250 staff and vary by employer size.

## AI hiring tool bias audit obligations

- NYC Local Law 144 (2023) requires annual bias audits for automated employment decision tools and applicant notification; EU AI Act classifies recruiting algorithms as high-risk; Illinois AI Video Interview Act and Maryland HB 1202 set notification rules. (Sanford Heisler Sharp, Brookings 2024-10).
- Reframed in the dataset (rc-077, rc-078) as practices: disclose AI use; give candidates an opt-out; audit demographic skew quarterly. The audit cadence is a practice, not a legal claim.

## Ban-the-box and criminal-history questions

- Numerous US states and cities restrict when criminal history can be asked; UK has Rehabilitation of Offenders limits; AU varies by state. Not portable as a tip; would need region-specific language.

## Adverse action notices

- Fair Credit Reporting Act (US) and equivalents require specific notice if a background-check result drives rejection. Out of scope for a campaign-stage tip bot.

## Anti-discrimination protected attributes

- Each jurisdiction defines protected attributes differently (US EEOC categories, UK Equality Act 2010 nine characteristics, AU Fair Work Act adverse action grounds, NZ Human Rights Act). Tips that name protected categories were avoided. Inclusive-language tips (rc-026, rc-037) are framed around outcome (apply rate, pool size), not legal compliance.

## Right-to-work and visa sponsorship

- Right-to-work checks and visa sponsorship rules vary by country. The dataset references overseas talent only in the AU-specific context (rc-133) as a market reality, with no procedural claim.

## Reference checking consent

- Privacy and consent rules around references differ (GDPR, AU Privacy Act, US state laws). Not included as a tip.

## Data retention for unsuccessful candidates

- GDPR, AU Privacy Act and US state laws set retention rules. The "tag silver-medalists" tip (rc-101) is framed as an opt-in via rc-103.

## Auto-screening fairness obligations

- EEOC AI guidance, EU AI Act and state laws set differing obligations. Tips are framed as practices, not compliance.

## Age, marital and pregnancy questions in interviews

- Almost universally restricted but rules differ. Greenhouse 2024 found 64% of US candidates report discriminatory or biased interview questions, most often about age, race and gender. Tip dataset addresses this only via structured-interview practices (rc-067, rc-071), not by listing protected attributes.

## Modern slavery and supply-chain reporting

- AU Modern Slavery Act, UK Modern Slavery Act, EU CSDDD. Not in scope for SME recruitment campaigns at this size.

## Workplace surveillance during recruitment

- AU has state-by-state surveillance laws; EU GDPR; varied US state laws. AI video interview recording obligations vary. The async-video tips (rc-080, rc-081) are framed around candidate experience, not consent procedure.

## Use of personality and psychometric assessments

- Some jurisdictions require validation evidence and candidate disclosure. The dataset references skills tests (rc-069) but avoids personality assessment as a tip due to jurisdictional variation.

## Reasonable adjustments and accessibility

- Disability accommodation in interviews is a legal obligation in most markets but the exact rules differ. The dataset avoids procedural tips here; would need legal review before adding.

## Note for product

The Campaign Coach can safely surface any tip in recruitment-tips.json without jurisdictional framing. If HQ.ai later wants to add Fair Work Act, NES, Modern Award or AU Privacy Act content to the bot, that should sit in a separate "compliance prompts" layer alongside the existing HQ People escalation/citation pattern, not in the campaign tip stream.
