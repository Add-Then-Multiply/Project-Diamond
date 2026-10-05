-- 012: record the hand-off of a report opt-in to GoHighLevel.
-- When a founder presses "Send me my report", the send-report function also
-- creates or updates their GoHighLevel contact (first name, email, assessment
-- code, score and band), so the team preparing the Readiness Call knows who
-- they are. These columns record whether that happened. Nothing else changes.

alter table public.leads
  add column if not exists ghl_contact_id text,
  add column if not exists ghl_synced_at  timestamptz,
  add column if not exists ghl_error      text;

comment on column public.leads.ghl_contact_id is
  'The GoHighLevel contact this lead was written to, set by the send-report function.';
