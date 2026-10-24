const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const ROOT = require('path').resolve(__dirname, '..');
const SHOT = require('path').resolve(__dirname, 'out');
require('fs').mkdirSync(SHOT, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  // Never touch the client's live systems: every Supabase call (lead insert, send-report) is answered here.
  await context.route(/supabase\.co/, r => r.fulfill({ status: r.request().method() === 'POST' ? 201 : 200, contentType: 'application/json', body: r.request().url().includes('send-report') ? '{"ok":true}' : '[]' }));
  for (const p of ['pitch.html','commercial-acceleration.html','finance-advisory.html','founder-dependence.html','personal-exit-readiness.html','diagnostic.html','investor-ready.html','transaction-readiness.html','index.html']) {
    const page = await context.newPage();
    const errs = [], logs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { logs.push(m.text()); if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) errs.push(m.text()); });
    await page.goto('file://' + path.join(ROOT, p) + '?utm_source=Referral');
    await page.waitForTimeout(250);
    if (p === 'index.html') { console.log(p, '| errors:', errs.length ? errs : 'none'); await page.close(); continue; }
    const r = await page.evaluate(() => runTests());
    const summary = logs.find(l => /tests passed|Test Summary/.test(l));
    const fails = logs.filter(l => /^FAIL/.test(l));
    console.log(p, '| runTests:', r, '|', (summary || '').trim(), fails.length ? '| FAILS: ' + fails.join(' || ') : '', '| errors:', errs.length ? errs : 'none');
    if (['pitch.html','commercial-acceleration.html','finance-advisory.html','founder-dependence.html','personal-exit-readiness.html'].includes(p)) {
      await page.evaluate(() => { [2,3,1,4,2,5,5,4].forEach((v, i) => document.querySelector(`input[name=q${i}][value="${v}"]`).click()); });
      await page.click('button.cta'); await page.waitForTimeout(300);
      const st = await page.evaluate(() => ({
        score: document.getElementById('totalScore').textContent, band: document.getElementById('bandLabel').textContent,
        rows: document.querySelectorAll('#rows .row').length, weak: [...document.querySelectorAll('#rows .row.weak .n')].map(n => n.textContent).join(','),
        target: document.getElementById('targetLine').textContent, levers: document.querySelectorAll('#levers .lever').length,
        leverIdx: [...document.querySelectorAll('#levers .lever b')].map(b => b.textContent.match(/statement (\d)/)[1]).join(','),
        entry: (document.querySelector('#planSteps li.here') || {}).textContent, route: document.querySelector('#route h3').textContent,
        book: document.getElementById('bookBtn').href.replace(/.*booking\//, ''),
      }));
      console.log('  report:', st);
      await page.click('button[onclick="copySummary()"]'); await page.waitForTimeout(300);
      const msg = await page.evaluate(() => document.getElementById('copyMsg').textContent);
      let clip = ''; try { clip = await page.evaluate(() => navigator.clipboard.readText()); } catch (e) { clip = 'unreadable'; }
      console.log('  copy msg:', JSON.stringify(msg), '| clipboard first line:', JSON.stringify(clip.split('\n')[0]), '| lines:', clip.split('\n').length);
      if (p === 'pitch.html' || p === 'commercial-acceleration.html') await page.screenshot({ path: SHOT + '/' + p.replace('.html','') + '-report.png', fullPage: true });
      await page.emulateMedia({ media: 'print' });
      const pr = await page.evaluate(() => ({
        sa: getComputedStyle(document.getElementById('sa')).display, header: getComputedStyle(document.querySelector('header')).display,
        results: getComputedStyle(document.getElementById('results')).display, tools: getComputedStyle(document.querySelector('.tools')).display,
        book: getComputedStyle(document.getElementById('bookBtn')).display, head: getComputedStyle(document.querySelector('.rep-print-head')).display,
        whoFor: getComputedStyle(document.querySelector('.grid3')).display,
      }));
      console.log('  print media:', pr);
      if (p === 'pitch.html') await page.pdf({ path: SHOT + '/pitch-report.pdf', format: 'A4' });
      await page.emulateMedia({ media: 'screen' });
      await page.setViewportSize({ width: 375, height: 800 });
      console.log('  mobile overflow:', await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth));
    }
    if (p === 'investor-ready.html') {
      await page.evaluate(() => { questionBank.forEach((q, i) => document.querySelector(`input[name=${q.id}][value="${[1,2,3,4][i % 4]}"]`).click()); });
      await page.click('#submit-btn'); await page.waitForTimeout(200);
      await page.evaluate(() => { document.getElementById('ld-name').value = 'A'; document.getElementById('ld-email').value = 'a@b.co'; document.getElementById('ld-company').value = 'C'; document.getElementById('ld-role').value = 'Founder / CEO'; document.getElementById('ld-consent').checked = true; });
      await page.evaluate(() => submitLead()); await page.waitForTimeout(800);
      console.log('  IR report:', await page.evaluate(() => ({ full: document.getElementById('fullReport').style.display, score: document.getElementById('overall-score').textContent, target: document.getElementById('ir-targetLine').textContent, levers: document.querySelectorAll('#ir-levers .lever').length, entry: (document.querySelector('#ir-planSteps li.here') || {}).textContent, plan: document.getElementById('ir-planText').textContent.slice(0, 60) })));
      await page.screenshot({ path: SHOT + '/ir-report.png', fullPage: true });
    }
    if (p === 'diagnostic.html') {
      await page.evaluate(() => { for (let i = 0; i < 20; i++) document.querySelector(`input[name=q${i}][value="${[3,4,2,5,3][i % 5]}"]`).click(); });
      await page.click('button.cta'); await page.waitForTimeout(200);
      await page.evaluate(() => { document.getElementById('ld-name').value = 'A'; document.getElementById('ld-email').value = 'a@b.co'; document.getElementById('ld-company').value = 'C'; document.getElementById('ld-role').value = 'Founder / CEO'; document.getElementById('ld-consent').checked = true; });
      await page.evaluate(() => submitLead()); await page.waitForTimeout(800);
      console.log('  MD report:', await page.evaluate(() => ({ full: document.getElementById('fullReport').style.display, score: document.getElementById('totalScore').textContent, target: document.getElementById('md-targetLine').textContent, levers: document.querySelectorAll('#md-levers .lever').length, entry: (document.querySelector('#md-planSteps li.here') || {}).textContent, svc: document.getElementById('svcMatch').textContent.slice(0, 40) })));
      await page.screenshot({ path: SHOT + '/md-report.png', fullPage: true });
    }
    await page.close();
  }
  await browser.close();
})();
