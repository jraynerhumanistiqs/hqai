-- Rubric versioning: when a custom rubric's criteria change, we create a
-- NEW row pointing at the same parent so existing screenings (which carry
-- the old rubric_id) stay bucketed under the version they were scored
-- against. parent_rubric_id is the family id; version_number increments
-- per family. label_family is the user-facing label without the version
-- suffix.

alter table public.cv_custom_rubrics
  add column if not exists parent_rubric_id uuid
    references public.cv_custom_rubrics(id) on delete cascade;

alter table public.cv_custom_rubrics
  add column if not exists version_number int default 1;

alter table public.cv_custom_rubrics
  add column if not exists label_family text;

-- Backfill: existing rows are version 1 with parent_rubric_id = self, and
-- label_family = label.
update public.cv_custom_rubrics
set
  version_number = coalesce(version_number, 1),
  parent_rubric_id = coalesce(parent_rubric_id, id),
  label_family = coalesce(label_family, label)
where version_number is null or parent_rubric_id is null or label_family is null;

create index if not exists cv_custom_rubrics_family_idx
  on public.cv_custom_rubrics(parent_rubric_id, version_number desc);
