-- Evidence trail corrections + private employee-documents bucket.
--
-- Additive and idempotent. Safe to run more than once.
--
-- 1. compliance_events.supersedes
--    The trail stays APPEND-ONLY: there is still no UPDATE policy, and this
--    migration does not add one. A mistake in an entry (for example a file
--    note dated 12 days ago that should have been 45) is fixed by inserting a
--    NEW event whose `supersedes` names the original. Both rows stay on file.
--    Derived reads (timing gate, "What is on file", AI Assistant worklist,
--    chat hint) ignore any event another event supersedes; the record export
--    still prints the original, marked as superseded. See lib/trail.ts.
--
-- 2. storage bucket 'employee-documents' (private)
--    Files uploaded against a person's record. The app creates the bucket
--    lazily from the server if it is missing, and every read and write goes
--    through server routes using the service role after the route has
--    authorised the caller against the employee. The policies below exist
--    for completeness: no anon access, and an authenticated user can only
--    touch objects under their own business_id prefix.

-- ---------------------------------------------------------------------------
-- 1. supersedes
-- ---------------------------------------------------------------------------
alter table public.compliance_events
  add column if not exists supersedes uuid null
    references public.compliance_events(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'compliance_events_supersedes_not_self'
      and conrelid = 'public.compliance_events'::regclass
  ) then
    alter table public.compliance_events
      add constraint compliance_events_supersedes_not_self
      check (supersedes is null or supersedes <> id);
  end if;
end $$;

create index if not exists compliance_events_supersedes_idx
  on public.compliance_events (supersedes)
  where supersedes is not null;

comment on column public.compliance_events.supersedes is
  'Correction pattern: this event supersedes the referenced event. The original is never updated or deleted; derived reads use only events no other event supersedes. Chains allowed.';

-- Deliberately NO update policy on public.compliance_events.

-- ---------------------------------------------------------------------------
-- 2. employee-documents bucket (private) + storage policies
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('employee-documents', 'employee-documents', false, 10485760)
    on conflict (id) do update set public = false;

    -- Paths are `${business_id}/${employee_id}/${uuid}-${name}`, so the first
    -- folder segment is the business.
    execute 'drop policy if exists "employee_documents_select" on storage.objects';
    execute $p$
      create policy "employee_documents_select" on storage.objects
        for select to authenticated
        using (
          bucket_id = 'employee-documents'
          and (storage.foldername(name))[1] = public.current_business_id()::text
          and public.can_access_employee(((storage.foldername(name))[2])::uuid)
        )
    $p$;

    execute 'drop policy if exists "employee_documents_insert" on storage.objects';
    execute $p$
      create policy "employee_documents_insert" on storage.objects
        for insert to authenticated
        with check (
          bucket_id = 'employee-documents'
          and (storage.foldername(name))[1] = public.current_business_id()::text
          and public.can_access_employee(((storage.foldername(name))[2])::uuid)
        )
    $p$;
    -- No update or delete policy: an uploaded file is part of the trail.
  end if;
end $$;
