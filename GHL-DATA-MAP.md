# Founder Readiness → GoHighLevel data map

**For:** Marcus Jones, wiring the GoHighLevel side
**From:** the ATM Founder Platform build
**Status:** live on the site. All ten assessment codes were agreed by David on 20 September (IR, RD, FFF, MD, EA, PI, CA, FA, FD, PX); the parameter names still await your confirmation

When a founder finishes an assessment and clicks through to book, the booking
link now carries their result with them, so GHL can record where they came
from, which assessment they took and which band they landed in. This note sets
out exactly what arrives.

---

## 1. Band names

### Readiness Diagnostic (RD): your action 3

Confirmed and wired. The four `RD` band values are exactly as you specified:

| Score | Band name |
|---|---|
| 85+ | Transaction-Ready |
| 70–84 | Readiness Project Candidate |
| 50–69 | Roadmap Tier |
| below 50 | Foundation Tier |

**One correction to the filename, so your notes match the repo.** You wrote
that RD is `diagnostic.html`. It is not, it is **`transaction-readiness.html`**.
Everything else in your description was right, and identified that file
precisely: it is the 24-metric instrument (`t("24 metrics defined",
METRICS.length === 24)`), titled "Transaction Readiness Assessment", and it
already carried those four band names at exactly those four thresholds. We
have tagged that page `RD`.

`diagnostic.html` is a genuinely separate, live assessment, the
**Multiplier Diagnostic**: 20 questions, six themes, instrument id
`multiplier_diagnostic`, with its own four bands at its own thresholds:

| Score | Band name |
|---|---|
| 91+ | Highly Ready |
| 71–90 | Strong Potential |
| 41–70 | Emerging |
| below 41 | At Risk |

The two pages cross-link each other: the Multiplier Diagnostic offers "go a
level deeper with the Transaction Readiness Assessment", and the Transaction
Readiness Assessment calls itself "the deal-grade instrument behind our
Multiplier Diagnostic".

We renamed nothing. Because its band vocabulary is not RD's, `diagnostic.html`
needed a code of its own so it could not contaminate your RD band picklist.
**David agreed `MD` on 20 September** and the page now sends `fr_assessment=MD`
with its score and one of the four band values above. Please add `MD` and those
four bands to the picklists; until then the values arrive on the link but
GHL has nowhere to put them.

### Funding Scorecard: now implemented

Three bands, on `investor-ready.html`. Thresholds are unchanged from the
existing scoring; only the names are new:

| Score | Band name |
|---|---|
| 80+ | Raise Ready |
| 60–79 | Almost Ready |
| below 60 | Getting Ready |

Per your instruction, the Funded Female Founders module has **no** band model
and creates no band tags.

### The five stream self-assessments (codes agreed by David, 20 September)

The six-door front door adds a free, ungated eight-statement self-assessment
to each of the three stream pages that do not already carry a diagnostic, plus
two standalone instruments (Founder Dependence and Personal Exit Readiness). Each
scores 1–5 per statement, reports a percentage of the maximum, and shares one
band model. David agreed these codes on 20 September; the four band names
below are what the pages send.

| Page | `fr_assessment` | Stream |
|---|---|---|
| `pitch.html` | `PI` | Pitching |
| `commercial-acceleration.html` | `CA` | Commercial Acceleration |
| `finance-advisory.html` | `FA` | Insourcing: Finance Advisory |
| `founder-dependence.html` | `FD` | Founder Dependence (Consolidate), added 6 September |
| `personal-exit-readiness.html` | `PX` | Personal Exit Readiness (Exit, Founder Clarity), added 6 September |

Shared bands (identical on all four):

| Score | Band name |
|---|---|
| 80+ | Strong |
| 60–79 | Building |
| 40–59 | Emerging |
| below 40 | At risk |

Each page's eight statements are six that measure the stream itself plus two
that are the same on every page: the business case ("We have a clear, written
business case that a stranger could follow") and revenue predictability
("Our revenue is predictable enough to forecast the next twelve months with
confidence"). Those two drive the routing shown on the result; the routing
itself is **not** sent in the link, you can derive it from the assessment,
score and band, or tell us to add an `fr_route` parameter.

**Routing rules, as set by Madeleine**, and the internal owner of each
outcome. Owners are named here only; the public page names the service,
never the person.

| Outcome | Rule (as coded) | Service shown on the page | Internal owner |
|---|---|---|---|
| Founder needs an M&A deal or a raise | Funding Scorecard (`IR`) | Funding Scorecard | David |
| Founder is ready to sell | Exit Ready, Multiplier Diagnostic, then `RD` | Exit Ready | David |
| Clear business case and revenue, weak stream | business case ≥ 3 **and** revenue ≥ 3, stream score below 80 | the Pitching programme (on `pitch`); Commercial Acceleration (on `commercial-acceleration`); Finance Advisory (on `sourcing`) | Jacob (Pitching; the meeting notes also name "T", which is unverified transcription and needs Madeleine's confirmation); Marcus (Commercial Acceleration); Marcus and the insourced finance function (`sourcing`) |
| No accounting function, no sales pipeline | business case ≤ 2 **or** revenue ≤ 2, whatever the page and whatever the stream score | Finance Advisory and sales pipeline support (`finance-advisory.html`) | Marcus and the insourced finance function |
| Strong on everything | business case ≥ 3 **and** revenue ≥ 3, stream score 80+ | Readiness Call, with the Funding Scorecard or Exit Ready as the likely next step | David |

The four pages remain free and ungated: no name, no email, no consent box,
nothing written to Supabase or to browser storage. The only thing that leaves
the page is the booking link below, and only if the founder clicks it.

---

## 2. What the booking link carries

Base URL is unchanged:

```
https://api.leadconnectorhq.com/widget/booking/Av6i7gL0YzbszYFfnKqQ
```

Parameters are appended to it, all values URL-encoded:

| Parameter | Value | Sent from |
|---|---|---|
| `fr_assessment` | `RD`, `IR`, `FFF`, `MD`, `EA`, `PI`, `CA`, `FA`, `FD` or `PX` (all agreed by David, 20 September) | the assessment pages |
| `fr_score` | integer percentage, `0`–`100` | scored assessments only |
| `fr_band` | the exact band name string | scored assessments only |
| `fr_source` | one controlled source value (below) | every booking link |

Which page sends what:

| Page | `fr_assessment` | Score | Band |
|---|---|---|---|
| `transaction-readiness.html` | `RD` | yes | the four RD bands |
| `investor-ready.html` | `IR` | yes | the three IR bands |
| `funding.html` | `FFF` | no | no |
| `diagnostic.html` | `MD` | yes | Highly Ready / Strong Potential / Emerging / At Risk |
| `ethical-acquisitions.html` | `EA` | yes | Highly Ready / Strong Potential / Emerging / At Risk |
| `pitch.html` | `PI` | yes, once scored | Strong / Building / Emerging / At risk |
| `commercial-acceleration.html` | `CA` | yes, once scored | Strong / Building / Emerging / At risk |
| `finance-advisory.html` | `FA` | yes, once scored | Strong / Building / Emerging / At risk |
| `founder-dependence.html` | `FD` | yes, once scored | Strong / Building / Emerging / At risk |
| `personal-exit-readiness.html` | `PX` | yes, once scored | Strong / Building / Emerging / At risk |
| all other pages with a booking CTA | *(none)* | no | no |

`fr_source` is always present. `fr_assessment` appears only on the assessment
modules. `fr_score` and `fr_band` are **omitted entirely** where there is no
score, they are never sent empty. On the four stream pages the booking link
sends `fr_source` only until the founder scores the self-assessment; after
that the assessment, score and band are added.

Worked examples:

```
…/Av6i7gL0YzbszYFfnKqQ?fr_assessment=RD&fr_score=76&fr_band=Readiness%20Project%20Candidate&fr_source=Investor%20Network
…/Av6i7gL0YzbszYFfnKqQ?fr_assessment=IR&fr_score=72&fr_band=Almost%20Ready&fr_source=LinkedIn%20Paid
…/Av6i7gL0YzbszYFfnKqQ?fr_assessment=PI&fr_score=65&fr_band=Building&fr_source=Website%20Organic
…/Av6i7gL0YzbszYFfnKqQ?fr_assessment=FA&fr_score=35&fr_band=At%20risk&fr_source=Referral
…/Av6i7gL0YzbszYFfnKqQ?fr_assessment=FFF&fr_source=Referral
…/Av6i7gL0YzbszYFfnKqQ?fr_source=Founder%20Readiness%20Direct
```

### Controlled `fr_source` values

Investor Network · LinkedIn Organic · LinkedIn Paid · Website Organic ·
Referral · Partner · Event · Outbound · Existing Client ·
Founder Readiness Direct · Direct · Other

We read `utm_source`, `src` or `source` from the URL the founder arrived on,
in that order, and match it to the list above. Matching ignores case,
punctuation and separators, so `linkedin_paid`, `LinkedIn-Paid` and
`linkedin paid` all resolve to `LinkedIn Paid`. Anything we do not recognise
becomes `Other`. Nothing in the URL at all becomes `Founder Readiness Direct`.

---

## 3. Two things to confirm, and one limitation

**The parameter names are our proposal, not a decision.** `fr_assessment`,
`fr_score`, `fr_band` and `fr_source` are placeholders we chose so the work
could ship. Tell us the field names GHL actually expects for your custom
fields and we will change them, it is a small edit and we will turn it round
on request. The same goes for the controlled values if your picklists differ.

**The booking link still carries no identity.** No name, email, company or
phone number, and no identifier that could be joined back to a person. The
founder's identity and their marketing consent *for the booking* are collected
by the GHL booking form, at the point of booking, never in the link. That has
not changed.

**The platform collects identity only when the founder asks to keep the
report (decision of 6 September, replacing the gate).** On the four scored
instruments the full report renders free. Under it sits one opt-in, "Send me my
report": first name, work email, company, role and turnover band, plus an
explicit consent tick. On submit the answers, score, band, those details and
the rendered report are written to ATM's own Supabase `leads` table
(`report_requested`, `report_html`), and the `send-report` Edge Function emails
the copy through Resend and stamps `report_sent_at`. Nothing is written until
that button is pressed. This answers your question of 4 September: the
assessment is anonymous; identification happens at the opt-in, before booking.

Two consequences worth planning for on your side:

- **You will have the same person in two places.** A founder who completes an
  assessment and then books appears once in `leads` (with their answers) and
  once in GHL (from the booking form). The join key is the email address they
  typed in each, which may differ. **Built, waiting for your key (October
  2026):** when a founder presses "Send me my report", the `send-report`
  function now also creates or updates the GHL contact (upsert on email) with
  first name, email, the assessment code, score and band. Tags:
  `fr-<code>` (for example `fr-md`), `fr-<code>-<band>` (for example
  `fr-md-strong-potential`) and `fr-report-requested`; source "ATM Founder
  Platform". It switches on when these Supabase secrets are set:
  `GHL_API_KEY` (a private integration token with contacts write),
  `GHL_LOCATION_ID`, and optionally `GHL_FIELD_ASSESSMENT`, `GHL_FIELD_SCORE`
  and `GHL_FIELD_BAND` (custom field ids, if you want the values in fields as
  well as tags). The outcome is recorded on the lead (`ghl_contact_id`,
  `ghl_synced_at`, `ghl_error`); a GHL failure never stops the report email.
- **Consent is recorded per assessment, not globally.** The `leads.consent`
  column records that the founder agreed to ATM storing their answers and
  contacting them about their results, at that timestamp. It is not consent
  for a wider marketing programme, and it is separate from whatever consent
  the GHL booking form captures. Do not treat one as covering the other.

Still true, and worth stating plainly: nothing is written to cookies,
localStorage or sessionStorage anywhere on the site. There is no analytics and
there are no ad pixels. Campaign source is read from the URL and passed
straight on, which is why it survives only a single journey (below).

**Campaign source survives one journey only.** The free pages carry no
cookies, no localStorage and no analytics, that is a deliberate design rule,
not an oversight. So the source is read from the URL the founder is on at that
moment and passed straight to GHL. In practice:

- a founder who lands on a campaign link and books in the same visit will
  carry the right source; but
- a founder who lands on a campaign link, navigates to a page whose link
  does not carry the parameter, and books from there will arrive as
  `Founder Readiness Direct`.

There is no way to close that gap without adding tracking to the free pages,
which we will not do. If reliable multi-page attribution matters more than the
no-tracking rule, that is a decision for David, not something we can engineer
around.

Finally, the link degrades safely: if anything in the parameter-building code
fails, the founder is sent to the plain booking URL. Booking never breaks
because attribution broke.
