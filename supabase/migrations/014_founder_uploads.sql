-- 014: founders can attach documents when they press "Send me my report"
-- (Female Founders Day feedback, 30 October 2026; Madeleine's decision).
--
-- A private bucket, founder-uploads. Files live at <lead_id>/<file name>.
-- Anyone may ADD a file, but only to a lead that was created in the last
-- 30 minutes with consent and a report request, and only up to five files
-- per lead. Nobody outside the team can list, read, replace or delete them:
-- reading is for advisors and admins only. 20MB per file; documents only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('founder-uploads', 'founder-uploads', false, 20971520, array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv'
])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- May this lead still receive documents? Runs as the owner so the check can
-- see the lead row, which the public role cannot read.
create or replace function public.lead_accepts_upload(folder text)
returns boolean
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  lid uuid;
begin
  begin
    lid := folder::uuid;
  exception when others then
    return false;
  end;
  return exists (
      select 1 from public.leads l
      where l.id = lid and l.consent and l.report_requested
        and l.created_at > now() - interval '30 minutes')
    and (select count(*) from storage.objects o
         where o.bucket_id = 'founder-uploads' and o.name like folder || '/%') < 5;
end;
$$;
revoke all on function public.lead_accepts_upload(text) from public;
grant execute on function public.lead_accepts_upload(text) to anon, authenticated;

drop policy if exists founder_uploads_insert on storage.objects;
create policy founder_uploads_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'founder-uploads'
              and public.lead_accepts_upload((storage.foldername(name))[1]));

drop policy if exists founder_uploads_staff_read on storage.objects;
create policy founder_uploads_staff_read on storage.objects
  for select to authenticated
  using (bucket_id = 'founder-uploads'
         and public.current_role_atm() = any (array['advisor', 'admin']));

-- What the founder sent, recorded by send-report for the team.
alter table public.leads add column if not exists documents jsonb;
