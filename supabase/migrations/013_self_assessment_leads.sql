-- 013: the three eight-statement self-assessments (Pitching, Commercial
-- Acceleration, Finance Advisory) now carry the same "Send me my report" opt-in
-- as the scored instruments (Female Founders Day feedback, 30 October 2026).
-- Nothing is written until the founder presses the button.
alter table public.leads drop constraint if exists leads_instrument_check;
alter table public.leads add constraint leads_instrument_check check (instrument = any (array[
  'multiplier_diagnostic', 'ethical_acquisitions', 'investor_ready', 'transaction_readiness',
  'pitch', 'commercial_acceleration', 'finance_advisory'
]::text[]));
