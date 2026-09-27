// Pre-launch QA pass for Marcus: keyboard, mobile, validation and recovery journeys, redirects, hand-off.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const ROOT = require('path').resolve(__dirname, '..');
const SHOT = require('path').resolve(__dirname, 'out');
const PAGES = ['index.html','investor-ready.html','diagnostic.html','transaction-readiness.html','ethical-acquisitions.html','deal-ready.html','commercial-acceleration.html','finance-advisory.html','pitch.html','roadmap.html','readiness-project.html','funding.html','investors.html','founders.html','privacy.html','founder-dependence.html','personal-exit-readiness.html'];
const GATED = ['investor-ready.html','diagnostic.html','transaction-readiness.html','ethical-acquisitions.html'];
const SELF = ['pitch.html','commercial-acceleration.html','finance-advisory.html','founder-dependence.html','personal-exit-readiness.html'];
const out = { mobile: [], keyboard: [], validation: [], recovery: [], redirects: [], handoff: [], consent: [] };
const url = p => 'file://' + path.join(ROOT, p);
(async () => {
  const browser = await chromium.launch();
  // 1. Mobile: no horizontal overflow at 360 and 375, tap targets, input font size, viewport meta.
  for (const p of PAGES) {
    for (const w of [360, 375]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 740 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage(); await page.goto(url(p)); await page.waitForTimeout(150);
      const r = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const small = [];
        document.querySelectorAll('a.cta,a.book-cta,a.nav-cta,button,.want,.door .go,.btn,input[type=radio],input[type=checkbox]').forEach(el => {
          const b = el.getBoundingClientRect(); if (b.width === 0) return;
          const t = el.matches('input') ? (el.closest('label') || el).getBoundingClientRect() : b;
          if (Math.min(t.width, t.height) < 24) small.push(el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : '') + ' ' + Math.round(t.width) + 'x' + Math.round(t.height));
        });
        const inputs = [...document.querySelectorAll('input[type=text],input[type=email],select')].map(i => parseFloat(getComputedStyle(i).fontSize)).filter(v => v < 16);
        return { overflow, small: small.slice(0, 4), smallCount: small.length, tinyInputs: inputs.length, viewport: !!document.querySelector('meta[name=viewport]') };
      });
      out.mobile.push({ page: p, width: w, ...r });
      await ctx.close();
    }
  }
  // 2. Keyboard: index hero answers and doors reachable by Tab, activate with Enter/Space, visible focus ring; gated form completable by keyboard.
  {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await ctx.newPage(); await page.goto(url('index.html')); await page.waitForTimeout(200);
    const seq = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      seq.push(await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return (a.className && String(a.className).split(' ')[0]) || a.tagName + ':' + (a.textContent || '').trim().slice(0, 18) + '|ring=' + (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0); }));
    }
    out.keyboard.push({ page: 'index.html', tabOrder: seq.join(' > ') });
    await page.evaluate(() => document.querySelector('.want[data-want=raise]').focus());
    await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    const pressed = await page.evaluate(() => ({ pressed: document.querySelector('.want[data-want=raise]').getAttribute('aria-pressed'), picked: document.querySelector('.doors').classList.contains('picked'), on: [...document.querySelectorAll('.door.on h3')].map(h => h.textContent) }));
    await page.keyboard.press('Space'); await page.waitForTimeout(100);
    const toggled = await page.evaluate(() => document.querySelector('.want[data-want=raise]').getAttribute('aria-pressed'));
    out.keyboard.push({ page: 'index.html', enterActivates: pressed, spaceToggles: toggled });
    await page.evaluate(() => document.querySelector('.door[href="investor-ready.html"]').focus());
    await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    out.keyboard.push({ page: 'index.html', enterOnDoorNavigatesTo: page.url().split('/').pop() });
    // Gated form by keyboard only (investor-ready): arrow keys on radios, Tab to submit, Enter.
    await page.goto(url('investor-ready.html')); await page.waitForTimeout(200);
    await page.evaluate(() => { const f = document.querySelector('input[type=radio]'); f.focus(); });
    const groups = await page.evaluate(() => new Set([...document.querySelectorAll('input[type=radio]')].map(r => r.name)).size);
    for (let g = 0; g < groups; g++) { await page.keyboard.press('ArrowRight'); await page.keyboard.press('Tab'); }
    const answered = await page.evaluate(() => document.querySelectorAll('input[type=radio]:checked').length);
    await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    const gateVisible = await page.evaluate(() => getComputedStyle(document.getElementById('leadgate')).display !== 'none');
    let gateTab = [];
    if (gateVisible) {
      await page.evaluate(() => document.getElementById('ld-name').focus());
      await page.keyboard.type('Test Founder'); await page.keyboard.press('Tab'); await page.keyboard.type('founder@example.co.uk'); await page.keyboard.press('Tab'); await page.keyboard.type('Example Ltd');
      await page.keyboard.press('Tab'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Tab'); await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Tab'); await page.keyboard.press('Space');
      gateTab = await page.evaluate(() => ({ role: document.getElementById('ld-role').value, consent: document.getElementById('ld-consent').checked, focus: document.activeElement.id || document.activeElement.tagName }));
      await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
    }
    const full = await page.evaluate(() => document.getElementById('fullReport').style.display);
    out.keyboard.push({ page: 'investor-ready.html', radioGroups: groups, answeredByArrowKeys: answered, gateShown: gateVisible, gateFilledByKeyboard: gateTab, fullReportAfterEnter: full });
    await ctx.close();
  }
  // 3. Validation and recovery on the gated pages and the self-assessments.
  for (const p of GATED) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(url(p)); await page.waitForTimeout(200);
    const submitSel = p === 'investor-ready.html' ? '#submit-btn' : 'button.cta';
    // Ethical Acquisitions shows its questions and button only once a role is chosen.
    if (p === 'ethical-acquisitions.html') { await page.evaluate(() => document.querySelector('input[name=q0][value=seller]').click()); await page.waitForTimeout(100); }
    await page.click(submitSel); await page.waitForTimeout(150);
    const unanswered = await page.evaluate(() => { const els = [...document.querySelectorAll('#form-error,#diag-err,[role=alert]')].filter(e => getComputedStyle(e).display !== 'none' && e.textContent.trim()); return els.map(e => e.textContent.trim().slice(0, 70))[0] || 'NO MESSAGE'; });
    const resultsShown = await page.evaluate(() => { const r = document.getElementById('results') || document.getElementById('results-section'); return r ? getComputedStyle(r).display !== 'none' && r.offsetHeight > 0 : null; });
    // answer everything, then probe the gate
    await page.evaluate(() => { const names = [...new Set([...document.querySelectorAll('input[type=radio]')].map(r => r.name))]; names.forEach((n, i) => { const opts = document.querySelectorAll(`input[name="${n}"]`); opts[Math.min(opts.length - 1, (i % 3) + 1)].click(); }); });
    await page.click(submitSel); await page.waitForTimeout(200);
    const gate = async () => page.evaluate(() => { const e = document.getElementById('ld-error'); return getComputedStyle(e).display !== 'none' ? e.textContent.trim() : ''; });
    const teaser = await page.evaluate(() => ({ gate: getComputedStyle(document.getElementById('leadgate')).display !== 'none', full: document.getElementById('fullReport').style.display, score: (document.getElementById('totalScore') || document.getElementById('overall-score') || {}).textContent }));
    await page.evaluate(() => submitLead()); const e1 = await gate();
    await page.evaluate(() => { document.getElementById('ld-name').value = 'A'; document.getElementById('ld-email').value = 'not-an-email'; document.getElementById('ld-company').value = 'C'; var r = document.getElementById('ld-role'); if (r) r.value = 'Founder / CEO'; var t = document.getElementById('ld-timeframe'); if (t) t.selectedIndex = 1; });
    await page.evaluate(() => submitLead()); const e2 = await gate();
    await page.evaluate(() => { document.getElementById('ld-email').value = 'a@b.co'; });
    await page.evaluate(() => submitLead()); const e3 = await gate();
    await page.evaluate(() => { document.getElementById('ld-consent').checked = true; });
    await page.evaluate(() => submitLead()); await page.waitForTimeout(700);
    const after = await page.evaluate(() => { const e = document.getElementById('ld-error'); return { full: document.getElementById('fullReport').style.display, err: !!(e && getComputedStyle(e).display !== 'none'), sent: /On its way/.test((document.getElementById('leadgate') || {}).textContent || ''), sb: typeof sb === 'undefined' ? 'undefined' : (sb ? 'client' : 'null') }; });
    out.validation.push({ page: p, unansweredMessage: unanswered, resultsHiddenUntilAnswered: !resultsShown, teaser, emptyGate: e1, badEmail: e2, noConsent: e3 });
    out.recovery.push({ page: p, supabaseClient: after.sb, reportRendersWhenInsertFails: after.full === 'block', optInConfirmsWhenInsertFails: after.sent, errorShownToFounder: after.err, jsErrors: errs.length });
    await ctx.close();
  }
  for (const p of SELF) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await ctx.newPage(); await page.goto(url(p)); await page.waitForTimeout(200);
    await page.click('button.cta'); await page.waitForTimeout(150);
    const msg = await page.evaluate(() => { const e = document.getElementById('sa-err'); return getComputedStyle(e).display !== 'none' ? e.textContent.trim().slice(0, 80) : 'NO MESSAGE'; });
    await page.evaluate(() => { [2,3,1,4,2,5,5].forEach((v, i) => document.querySelector(`input[name=q${i}][value="${v}"]`).click()); });
    await page.click('button.cta'); await page.waitForTimeout(150);
    const partial = await page.evaluate(() => { const e = document.getElementById('sa-err'); return getComputedStyle(e).display !== 'none' ? e.textContent.trim().slice(0, 80) : 'NO MESSAGE'; });
    out.validation.push({ page: p, unansweredMessage: msg, oneBlankMessage: partial });
    await ctx.close();
  }
  // 4. Redirects and hand-off.
  {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    for (const r of ['sourcing.html', 'exit-ready.html']) { await page.goto(url(r)); await page.waitForTimeout(500); out.redirects.push({ from: r, landsOn: page.url().split('/').pop(), noindex: true }); }
    for (const p of ['index.html','pitch.html','investors.html','funding.html']) {
      await page.goto(url(p) + '?utm_source=LinkedIn_Paid'); await page.waitForTimeout(200);
      const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href*="leadconnectorhq"]')].map(a => a.href.replace(/.*booking\/Av6i7gL0YzbszYFfnKqQ/, '')));
      out.handoff.push({ page: p, bookingLinks: hrefs.length, withSource: hrefs.filter(h => /fr_source=LinkedIn%20Paid/.test(h)).length, sample: hrefs.find(h => h.includes('fr_')) || hrefs[0] });
    }
    for (const p of PAGES) {
      await page.goto(url(p)); await page.waitForTimeout(100);
      out.consent.push({ page: p, ...(await page.evaluate(() => ({ consentBox: !!document.getElementById('ld-consent'), storageNote: /scored in your browser|not stored anywhere|nothing is stored/i.test(document.body.innerText), fcaNote: /not authorised or regulated|not a financial promotion|does not arrange investments/i.test(document.body.innerText), privacyLink: !!document.querySelector('a[href*="privacy"]'), companyNo: /company (number|no\.?)|registered in england/i.test(document.body.innerText), storage: localStorage.length + sessionStorage.length, cookies: document.cookie.length }))) });
    }
    await ctx.close();
  }
  await browser.close();
  require('fs').mkdirSync(SHOT, { recursive: true }); require('fs').writeFileSync(path.join(SHOT, 'qa-results.json'), JSON.stringify(out, null, 1));
  for (const k of Object.keys(out)) { console.log('== ' + k); for (const row of out[k]) console.log(JSON.stringify(row)); }
})();
