-- 006: Female-founder investor register (venture side of investor_mandates)
-- Extends the mandate register beyond the M&A asset classes to venture investors,
-- and holds the Female Investors UK register (39 records, verified Jul 2026; rows kept privately, see the end of this file).
-- Advisor-only RLS from migration 003 applies unchanged: founders never read this table.

-- Widen the type constraint to cover venture-side investors.
alter table public.investor_mandates drop constraint if exists investor_mandates_investor_type_check;
alter table public.investor_mandates add constraint investor_mandates_investor_type_check
  check (investor_type in ('pe_buyout','growth_equity','family_office','strategic','angel','debt',
                           'vc','angel_syndicate','accelerator','corporate_venturing','government','other'));

-- Venture-side fields.
alter table public.investor_mandates
  add column if not exists register            text,
  add column if not exists stage_preseed_seed  boolean not null default false,
  add column if not exists stage_series_a      boolean not null default false,
  add column if not exists stage_series_b      boolean not null default false,
  add column if not exists target_cheque       text,
  add column if not exists female_founder_focus text,
  add column if not exists female_founder_mandate text,
  add column if not exists pitch_route         text,
  add column if not exists apply_url           text,
  add column if not exists website             text,
  add column if not exists contact_email       text,
  add column if not exists linkedin_url        text,
  add column if not exists portfolio_notable   text,
  add column if not exists fund_size           text,
  add column if not exists year_founded        text,
  add column if not exists office_address      text,
  add column if not exists phone               text,
  add column if not exists key_people          text,
  add column if not exists verification_status text not null default 'active'
    check (verification_status in ('active','verify_before_approach')),
  add column if not exists last_verified       text;

-- Re-runs must not duplicate the register.
create unique index if not exists investor_mandates_org_register_idx
  on public.investor_mandates (org_name, register);

-- The register rows are confidential and are not kept in this public repository.
-- They live in the private repository Add-Then-Multiply/atm-internal
-- (investor-register/006_female_investor_register.sql), which is the copy to load from.
