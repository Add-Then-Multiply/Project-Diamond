// send-report: email a founder the report they asked to keep.
//
// Called from the assessment pages after the lead row is inserted, with the
// row id the page generated. Runs with the service role so it can read the
// row and mark it sent. Sends through Resend. Never returns the row to the
// caller, and never sends twice.
//
// It also creates or updates the founder's GoHighLevel contact (first name,
// email, assessment code, score and band) so the call team knows who they are.
// That step is optional: with no GHL_API_KEY set it is skipped, and if it
// fails the report still goes out. The outcome is recorded on the lead.
//
// Environment (set with `supabase secrets set`):
//   RESEND_API_KEY      the Resend API key
//   REPORT_FROM         e.g. "Add Then Multiply <info@mail.addthenmultiply.com>"
//   REPORT_REPLY_TO     optional: where replies go, e.g. hello@addthenmultiply.com
//   REPORT_BCC          optional: a team inbox that receives every copy
//   SITE_URL            e.g. https://addthenmultiply.github.io/Project-Diamond
//   GHL_API_KEY         optional: GoHighLevel private integration token (contacts write)
//   GHL_LOCATION_ID     the GoHighLevel sub-account (location) id; required with GHL_API_KEY
//   GHL_FIELD_ASSESSMENT, GHL_FIELD_SCORE, GHL_FIELD_BAND
//                       optional: custom field ids to fill; without them the
//                       values travel as tags only
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INSTRUMENT_NAMES: Record<string, string> = {
  multiplier_diagnostic: "Multiplier Diagnostic",
  investor_ready: "Funding Scorecard",
  transaction_readiness: "Transaction Readiness Assessment",
  ethical_acquisitions: "Ethical Acquisitions Scorecard",
};

const PAGE_FOR: Record<string, string> = {
  multiplier_diagnostic: "diagnostic.html",
  investor_ready: "investor-ready.html",
  transaction_readiness: "transaction-readiness.html",
  ethical_acquisitions: "ethical-acquisitions.html",
};

// The assessment codes David agreed on 20 September (see GHL-DATA-MAP.md).
const CODE_FOR: Record<string, string> = {
  multiplier_diagnostic: "MD",
  investor_ready: "IR",
  transaction_readiness: "RD",
  ethical_acquisitions: "EA",
};

function slug(s: unknown): string {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Create or update the GoHighLevel contact for a lead. Returns the contact id,
// null when GoHighLevel is not configured, or throws with the reason.
async function syncToGhl(lead: Record<string, unknown>): Promise<string | null> {
  const token = Deno.env.get("GHL_API_KEY");
  if (!token) return null;
  const locationId = Deno.env.get("GHL_LOCATION_ID");
  if (!locationId) throw new Error("GHL_LOCATION_ID not set");
  const code = CODE_FOR[String(lead.instrument)] ?? "FR";
  const tags = [`fr-${code.toLowerCase()}`, `fr-${code.toLowerCase()}-${slug(lead.band)}`, "fr-report-requested"];
  const customFields: { id: string; field_value: unknown }[] = [];
  const field = (env: string, value: unknown) => {
    const id = Deno.env.get(env);
    if (id) customFields.push({ id, field_value: value });
  };
  field("GHL_FIELD_ASSESSMENT", code);
  field("GHL_FIELD_SCORE", lead.score_pct);
  field("GHL_FIELD_BAND", lead.band);
  const body: Record<string, unknown> = {
    locationId,
    firstName: lead.first_name ?? undefined,
    email: lead.email,
    source: "ATM Founder Platform",
    tags,
  };
  if (customFields.length) body.customFields = customFields;
  const r = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28", "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`GoHighLevel ${r.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text)?.contact?.id ?? "";
  } catch {
    return "";
  }
}

function escape(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { lead_id } = await req.json();
    if (typeof lead_id !== "string" || !/^[0-9a-f-]{36}$/i.test(lead_id)) {
      return new Response(JSON.stringify({ ok: false, error: "bad id" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: lead, error } = await admin.from("leads")
      .select("id, instrument, score_pct, band, first_name, email, company, consent, report_requested, report_html, report_sent_at, source_page")
      .eq("id", lead_id).single();
    if (error || !lead) return new Response(JSON.stringify({ ok: false, error: "not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    if (!lead.consent || !lead.report_requested || !lead.email) {
      return new Response(JSON.stringify({ ok: false, error: "not requested" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (lead.report_sent_at) return new Response(JSON.stringify({ ok: true, already: true }), { headers: { ...cors, "Content-Type": "application/json" } });

    // Hand the founder to GoHighLevel first; a failure here never stops the report.
    try {
      const contactId = await syncToGhl(lead);
      if (contactId !== null) {
        await admin.from("leads").update({ ghl_contact_id: contactId || null, ghl_synced_at: new Date().toISOString(), ghl_error: null }).eq("id", lead.id);
      }
    } catch (e) {
      await admin.from("leads").update({ ghl_error: String(e).slice(0, 500) }).eq("id", lead.id);
    }

    const name = INSTRUMENT_NAMES[lead.instrument] ?? "assessment";
    const site = (Deno.env.get("SITE_URL") ?? "https://addthenmultiply.github.io/Project-Diamond").replace(/\/$/, "");
    const page = `${site}/${PAGE_FOR[lead.instrument] ?? "index.html"}`;
    const first = escape(lead.first_name || "there");
    const body = `<!doctype html><html lang="en-GB"><body style="margin:0;background:#F8FAFC;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
<div style="background:#2B2A29;border-bottom:4px solid #E4342D;padding:18px 24px;color:#fff;font-family:Georgia,serif;font-size:18px;">ADD THEN <span style="color:#F38E00">MULTIPLY</span></div>
<div style="max-width:680px;margin:0 auto;padding:24px;">
<p style="font-size:15px;">Hello ${first},</p>
<p style="font-size:15px;">Here is your ${escape(name)} report: <b>${escape(lead.score_pct)}%</b>, <b>${escape(lead.band)}</b>. A member of our team reads every report before a Readiness Call. Nothing in it is financial or investment advice: it shows how ready the business is, and what to do next is a recommendation we make with you on the call.</p>
<div style="background:#fff;border:1px solid #E2E8F0;border-radius:6px;padding:18px;font-size:14px;line-height:1.55;">${lead.report_html ?? "<p>Your report is on the page you completed; open the link below to see it again.</p>"}</div>
<p style="margin-top:20px;"><a href="https://api.leadconnectorhq.com/widget/booking/Av6i7gL0YzbszYFfnKqQ" style="display:inline-block;background:#2B2A29;color:#fff;padding:12px 20px;border:2px solid #2B2A29;border-radius:4px;text-decoration:none;font-weight:600;margin:0 8px 8px 0;">Book your free Readiness Call</a><a href="${page}" style="display:inline-block;background:#fff;color:#2B2A29;padding:12px 20px;border:2px solid #2B2A29;border-radius:4px;text-decoration:none;font-weight:600;margin:0 0 8px 0;">Retake test</a></p>
<p style="font-size:12px;color:#475569;border-top:1px solid #E2E8F0;padding-top:12px;margin-top:24px;">Add Then Multiply Limited is registered in England and Wales, company number 04623437. It is not authorised or regulated by the Financial Conduct Authority. This email describes our services and is not a financial promotion. You asked for this copy on our website; we will not add you to any list without a separate consent. To have your details deleted, reply to this email.</p>
</div></body></html>`;

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) {
      await admin.from("leads").update({ report_error: "RESEND_API_KEY not set" }).eq("id", lead.id);
      return new Response(JSON.stringify({ ok: false, error: "mail not configured" }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const payload: Record<string, unknown> = {
      from: Deno.env.get("REPORT_FROM") ?? "Add Then Multiply <info@mail.addthenmultiply.com>",
      to: [lead.email],
      subject: `Your ${name} report: ${lead.score_pct}%, ${lead.band}`,
      html: body,
    };
    const replyTo = Deno.env.get("REPORT_REPLY_TO");
    if (replyTo) payload.reply_to = replyTo;
    const bcc = Deno.env.get("REPORT_BCC");
    if (bcc) payload.bcc = [bcc];
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const text = await r.text();
      await admin.from("leads").update({ report_error: text.slice(0, 500) }).eq("id", lead.id);
      return new Response(JSON.stringify({ ok: false, error: "send failed" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }
    await admin.from("leads").update({ report_sent_at: new Date().toISOString(), report_error: null }).eq("id", lead.id);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e).slice(0, 200) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
