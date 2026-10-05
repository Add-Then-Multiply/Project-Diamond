-- 008: UK master investor register (register = 'uk_master')
-- Describes the master investor universe (661 records, Jul 2026 verification),
-- excluding the 21 organisations already carried with richer detail in the
-- female_investors_uk register (one row per organisation across registers).
-- Generated from "Founders and Investors .xlsx"; advisor-only RLS applies unchanged.

alter table public.investor_mandates drop constraint if exists investor_mandates_investor_type_check;
alter table public.investor_mandates add constraint investor_mandates_investor_type_check
  check (investor_type in ('pe_buyout','growth_equity','family_office','strategic','angel','debt',
                           'vc','angel_syndicate','accelerator','corporate_venturing','government',
                           'crowdfunding','other'));

-- The register rows are confidential and are not kept in this public repository.
-- They live in the private repository Add-Then-Multiply/atm-internal
-- (investor-register/008_uk_master_register.sql), which is the copy to load from.
