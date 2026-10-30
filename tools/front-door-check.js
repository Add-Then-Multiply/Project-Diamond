// Front-door check: every assessment, tick by tick (door, validation, scoring self-test, report,
// booking hand-off, print button and A4 print layout, opt-in, consent, database outage, phone size).
// Every Supabase call is answered or blocked here, so nothing reaches the client's live project.
// Run: PW=$(npm root -g)/playwright node tools/front-door-check.js   (PDFs land in tools/out/pdf/)
const { chromium, devices } = require(process.env.PW || 'playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..') + '/', OUT = path.resolve(__dirname, 'out');
fs.mkdirSync(path.join(OUT, 'pdf'), { recursive: true });
const T = [
  { name: 'Funding Scorecard', page: 'investor-ready.html', door: true, scored: true, code: 'IR', used: 'Raising (14)' },
  { name: 'Grow by Acquiring', page: 'deal-ready.html', door: true, landing: true, used: 'Acquiring (4): landing page' },
  { name: 'Ethical Acquisitions Scorecard', page: 'ethical-acquisitions.html', scored: true, code: 'EA', used: 'Acquiring (4)' },
  { name: 'Transaction Readiness Assessment', page: 'transaction-readiness.html', scored: true, code: 'RD', used: 'Exit or acquiring, deeper' },
  { name: 'Commercial Acceleration', page: 'commercial-acceleration.html', door: true, scored: true, code: 'CA', used: 'Any table' },
  { name: 'Insourcing: Finance Advisory', page: 'finance-advisory.html', door: true, scored: true, code: 'FA', used: 'Any table' },
  { name: 'Pitching', page: 'pitch.html', door: true, scored: true, code: 'PI', used: 'Raising (14)' },
  { name: 'Exit Ready (Multiplier Diagnostic)', page: 'diagnostic.html', door: true, scored: true, code: 'MD', used: 'Exit (2), and everyone' },
];
async function answerAll(page) {
  for (let pass = 0; pass < 4; pass++) {
    const left = await page.evaluate(() => {
      const names = [...new Set([...document.querySelectorAll('input[type=radio]')].filter(i => i.offsetParent !== null || i.closest('label')?.offsetParent !== null).map(i => i.name))];
      let n = 0;
      for (const nm of names) { const opts = [...document.querySelectorAll(`input[type=radio][name="${nm}"]`)]; if (opts.some(o => o.checked)) continue;
        const pick = nm === 'q0' && opts.some(o => o.value === 'buyer') ? opts.find(o => o.value === 'buyer') : opts[Math.floor(opts.length * 0.6)];
        pick.click(); n++; }
      return n; });
    if (!left) break; await page.waitForTimeout(150);
  }
}
async function scoreBtn(page) { const b = page.locator('#submit-btn:visible, button.cta:visible').first(); if (!(await b.count())) return false; await b.click({ timeout: 5000 }); await page.waitForTimeout(400); return true; }
(async () => {
  const browser = await chromium.launch(); const rows = [];
  for (const t of T) {
    const R = { name: t.name, used: t.used, ticks: {}, notes: [] };
    const tick = (k, ok, note) => { R.ticks[k] = ok === null ? 'n/a' : ok ? 'PASS' : 'FAIL'; if (note) R.notes.push(k + ': ' + note); };
    let ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const writes = []; let dbDown = false;
    await ctx.route(/supabase\.co/, async route => { const q = route.request(); if (dbDown) return route.abort();
      writes.push({ m: q.method(), u: q.url(), b: q.postData() });
      await route.fulfill({ status: q.method() === 'POST' ? 201 : 200, contentType: 'application/json', body: q.url().includes('send-report') ? '{"ok":true}' : '[]' }); });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errs.push(m.text()); });
    // 1. door
    if (t.door) { await page.goto('file://' + ROOT + 'index.html'); await page.click(`a.door[href="${t.page}"]`); await page.waitForLoadState('load'); tick('1 Opens from its door on the homepage', path.basename(page.url().split('?')[0]) === t.page); }
    else { await page.goto('file://' + ROOT + t.page); tick('1 Opens from its door on the homepage', null, 'reached from the Grow by Acquiring and Exit pages, not a homepage door'); }
    await page.waitForTimeout(300);
    if (t.landing) {
      const ok = await page.evaluate(() => { const b = document.getElementById('bookBtn'); return !!b && /booking/.test(b.href); });
      tick('2 Blocks an incomplete submission', null); tick('3 Scoring self-test passes', null); tick('4 Score and band shown', null); tick('5 Full report free on screen', null);
      tick('6 Booking link carries assessment, score, band', null, 'landing page: booking carries the campaign source only (no assessment on this page)');
      tick('6b Booking button works', ok);
      for (const k of ['7 Print button on the report', '8 Prints report only, on A4', '9 Opt-in saves the lead', '10 Opt-in refuses without consent', '11 Report still works if the database is down']) tick(k, null);
      tick('12 Nothing stored without opt-in', writes.filter(w => w.m !== 'GET').length === 0);
    } else {
      // 2. incomplete blocked
      await scoreBtn(page);
      const blocked = await page.evaluate(() => { const fr = document.getElementById('fullReport'); const res = document.getElementById('results') || document.getElementById('results-section');
        const shown = fr ? getComputedStyle(fr).display !== 'none' : (res && getComputedStyle(res).display !== 'none' && /\d/.test((document.getElementById('totalScore')||{}).textContent||''));
        return !shown; });
      tick('2 Blocks an incomplete submission', blocked);
      // 3 runTests
      const rt = await page.evaluate(() => { if (typeof runTests !== 'function') return 'none'; try { return runTests(); } catch (e) { return 'threw ' + e.message; } });
      tick('3 Scoring self-test passes', rt !== false && rt !== 'none' && !String(rt).startsWith('threw'), rt === 'none' ? 'no self-test' : '');
      await page.reload(); await page.waitForTimeout(300);
      await answerAll(page); await scoreBtn(page);
      const s = await page.evaluate(() => { const sc = document.getElementById('totalScore') || document.getElementById('overall-score'); const bd = document.getElementById('bandLabel') || document.getElementById('band-label');
        return { score: sc ? sc.textContent.trim() : '', band: bd ? bd.textContent.trim() : '' }; });
      tick('4 Score and band shown', /\d/.test(s.score) && s.band.length > 1, s.score + ' ' + s.band);
      const rep = await page.evaluate(() => { const fr = document.getElementById('fullReport') || document.getElementById('results'); return fr && getComputedStyle(fr).display !== 'none' && fr.innerText.length > 300; });
      tick('5 Full report free on screen', rep);
      const bk = await page.evaluate(() => { const b = document.getElementById('booking-cta') || document.getElementById('bookBtn'); return b ? b.href : ''; });
      tick('6 Booking link carries assessment, score, band', bk.includes('fr_assessment=' + t.code) && /fr_score=\d/.test(bk) && /fr_band=/.test(bk), decodeURIComponent(bk.replace(/.*\?/, '')));
      // 7 print button
      await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
      const pb = page.locator('button:has-text("Print"):visible').first();
      let pOK = false; if (await pb.count()) { await pb.click(); pOK = await page.evaluate(() => window.__printed === 1); }
      tick('7 Print button on the report', pOK);
      // 8 print layout + PDF
      await page.emulateMedia({ media: 'print' });
      const pv = await page.evaluate(() => { const vis = el => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
        const q = document.querySelector('input[type=radio]');
        return { nav: vis(document.querySelector('header')), optin: vis(document.getElementById('leadgate')), questions: vis(q && (q.closest('form') || q.closest('label'))), head: vis(document.querySelector('.rep-print-head')), date: (document.querySelector('.rep-print-date') || {}).textContent || '' }; });
      const pdfPath = path.join(OUT, 'pdf', t.page.replace('.html', '') + '-report.pdf');
      await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
      const pages = (fs.readFileSync(pdfPath).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      await page.setViewportSize({ width: 794, height: 1123 });
      await page.screenshot({ path: path.join(OUT, 'pdf', t.page.replace('.html', '') + '-print.png'), fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.emulateMedia({ media: 'screen' });
      tick('8 Prints report only, on A4', !pv.nav && !pv.optin && !pv.questions && pv.head && pages >= 1 && pages <= 5, `${pages} page(s); header ${pv.nav ? 'shown' : 'hidden'}, questions ${pv.questions ? 'shown' : 'hidden'}, form ${pv.optin ? 'shown' : 'hidden'}, dated "${pv.date}"`);
      if (t.scored) {
        const before = writes.filter(w => w.m !== 'GET').length;
        tick('12 Nothing stored without opt-in', before === 0);
        // 10 consent required
        await page.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
          set('ld-name', 'Tick Test'); set('ld-email', 'tick.test@example.com'); set('ld-company', 'Test Ltd'); set('ld-role', 'Founder / CEO');
          for (const id of ['ld-revenue', 'ld-timeframe']) { const e = document.getElementById(id); if (e && e.options) e.selectedIndex = 1; }
          document.getElementById('ld-consent').checked = false; });
        await page.evaluate(() => submitLead()); await page.waitForTimeout(500);
        const noConsent = writes.filter(w => w.m === 'POST').length === 0;
        const msg = await page.evaluate(() => (document.getElementById('ld-error') || {}).textContent || '');
        tick('10 Opt-in refuses without consent', noConsent && msg.length > 5, msg.trim().slice(0, 70));
        // 11 db down
        dbDown = true; await page.evaluate(() => { document.getElementById('ld-consent').checked = true; submitLead(); }); await page.waitForTimeout(1500);
        const downMsg = await page.evaluate(() => { const e = document.getElementById('ld-error'); return e && getComputedStyle(e).display !== 'none' ? e.textContent.trim() : (document.body.innerText.match(/(couldn.t|could not|try again|unable)[^.]*\./i) || [''])[0]; });
        const stillReport = await page.evaluate(() => getComputedStyle(document.getElementById('fullReport') || document.getElementById('results')).display !== 'none');
        tick('11 Report still works if the database is down', stillReport && downMsg.length > 5, downMsg.slice(0, 90));
        // 9 opt-in saves
        dbDown = false; await page.reload(); await page.waitForTimeout(300); await answerAll(page); await scoreBtn(page);
        await page.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
          set('ld-name', 'Tick Test'); set('ld-email', 'tick.test@example.com'); set('ld-company', 'Test Ltd'); set('ld-role', 'Founder / CEO');
          for (const id of ['ld-revenue', 'ld-timeframe']) { const e = document.getElementById(id); if (e && e.options) e.selectedIndex = 1; }
          document.getElementById('ld-consent').checked = true; submitLead(); });
        await page.waitForTimeout(1500);
        const ins = writes.find(w => w.m === 'POST' && /rest\/v1\/leads/.test(w.u)); const fn = writes.find(w => /send-report/.test(w.u));
        let b = {}; try { b = JSON.parse(ins.b); if (Array.isArray(b)) b = b[0]; } catch (e) {}
        tick('9 Opt-in saves the lead', !!ins && !!fn && b.consent === true && b.report_requested === true && (b.report_html || '').length > 500,
          ins ? `instrument ${b.instrument}, ${b.score_pct}% ${b.band}, report ${Math.round((b.report_html || '').length / 1000)}k chars, email ${fn ? 'triggered' : 'NOT triggered'}` : 'no lead saved');
        R.reportHtmlHasScore = (b.report_html || '').includes(String(b.score_pct));
      } else {
        for (const k of ['9 Opt-in saves the lead', '10 Opt-in refuses without consent', '11 Report still works if the database is down']) tick(k, null, k.startsWith('9') ? 'self-assessment: nothing is ever stored (by design)' : '');
        tick('12 Nothing stored without opt-in', writes.filter(w => w.m !== 'GET').length === 0);
      }
    }
    // 13 phone
    await ctx.close();
    ctx = await browser.newContext({ ...devices['iPhone 13'] });
    await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    const ph = await ctx.newPage(); await ph.goto('file://' + ROOT + t.page); await ph.waitForTimeout(300);
    let phOK = await ph.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    if (!t.landing) { await answerAll(ph); await scoreBtn(ph); phOK = phOK && await ph.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
      const pbv = await ph.locator('button:has-text("Print"):visible').count(); if (!pbv) R.notes.push('13: print button not visible on phone'); phOK = phOK && pbv > 0;
      await ph.screenshot({ path: path.join(OUT, 'pdf', t.page.replace('.html', '') + '-phone.png') }); }
    tick('13 Works on a phone (iPhone size)', phOK);
    await ctx.close();
    tick('14 No script errors', errs.length === 0, errs.slice(0, 2).join(' | '));
    rows.push(R);
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'front-door-results.json'), JSON.stringify(rows, null, 2));
  const keys = [...new Set(rows.flatMap(r => Object.keys(r.ticks)))].sort((a, b) => parseFloat(a) - parseFloat(b));
  for (const r of rows) { console.log('\n## ' + r.name + ' [' + r.used + ']'); for (const k of keys) if (r.ticks[k]) console.log((r.ticks[k] + '   ').slice(0, 5), k); if (r.notes.length) console.log('   notes: ' + r.notes.join(' ;; ')); }
})();
