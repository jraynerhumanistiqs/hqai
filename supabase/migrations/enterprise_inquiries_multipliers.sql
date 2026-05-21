-- Enterprise inquiries: capture multiplier-relevant fields.
--
-- Backs the multiplier pricing model introduced May 2026. Source:
-- docs/research/enterprise-sliding-scale-analysis.md §6 (sales-funnel
-- impact). The inquiry form gets two new optional fields so the founder
-- can calculate the effective price before the discovery call - the
-- discovery call is then about value and fit, not about price discovery.
--
-- Both columns are nullable. Legacy submissions stay valid. The columns
-- are free-text bands (single-select on the form) rather than enums so
-- the schedule can flex without a migration.
--
-- Additive only. Safe to re-run. No RLS changes - enterprise_inquiries
-- remains founder-only intel, service-role bypass for writes.

alter table public.enterprise_inquiries
  add column if not exists entity_count text,           -- '1' | '2-3' | '4-5' | '6+'
  add column if not exists annual_hiring_volume text;   -- 'under-30' | '30-60' | '60-100' | '100-plus'
