import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const artifacts = path.join(process.cwd(), 'artifacts');
const baseUrl = process.env.PATHFINDER_URL || 'http://127.0.0.1:8080/';
await mkdir(artifacts, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-sandbox',
  '--remote-debugging-port=9333', `--user-data-dir=${path.join(artifacts, 'chrome-profile')}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [];
let ws;

try {
  let target;
  for (let attempt = 0; attempt < 80; attempt++) {
    try { target = (await (await fetch('http://127.0.0.1:9333/json')).json()).find(item => item.type === 'page'); if (target) break; } catch {}
    await sleep(150);
  }
  assert(target, 'Chrome debugging endpoint did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); clearTimeout(request.timeout);
    if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
  });
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
      pending.set(id, { resolve, reject, timeout }); ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function load(method, params = {}) {
    let loaded;
    let failed;
    const complete = new Promise((resolve, reject) => { loaded = resolve; failed = reject; });
    const listener = event => { if (JSON.parse(event.data).method === 'Page.loadEventFired') loaded(); };
    const timeout = setTimeout(() => failed(new Error(`Load timeout: ${method}`)), 10000);
    ws.addEventListener('message', listener);
    try { await call(method, params); await complete; }
    finally { clearTimeout(timeout); ws.removeEventListener('message', listener); }
  }
  async function waitFor(expression, description = expression, timeout = 5000) {
    const deadline = Date.now() + timeout;
    do { if (await evaluate(expression)) return; await sleep(40); } while (Date.now() < deadline);
    throw new Error(`Timed out waiting for ${description}`);
  }
  async function frames() { await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'); }
  async function click(selector) {
    assert(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), `Missing ${selector}`);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await frames();
  }
  async function setValue(selector, value, event = 'change') {
    await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.value = ${JSON.stringify(value)}; input.dispatchEvent(new Event(${JSON.stringify(event)}, { bubbles: true })); })()`); await frames();
  }
  async function escape() {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await waitFor('!document.querySelector("#detail-dialog").open', 'native Escape to close the dialog');
  }
  async function closeDialog() { if (await evaluate('document.querySelector("#detail-dialog").open')) await click('#close-detail'); }
  async function screenshot(name, full = false) {
    await frames();
    await waitFor('!document.getAnimations().some(animation => animation.playState === "running" || animation.pending)', 'the page to settle before screenshot');
    const dimensions = (await call('Page.getLayoutMetrics')).cssContentSize;
    const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, ...(full ? { clip: { x: 0, y: 0, width: dimensions.width, height: dimensions.height, scale: 1 } } : {}) });
    await writeFile(path.join(artifacts, name), Buffer.from(result.data, 'base64'));
  }
  async function checkHorizontalScroll() {
    await evaluate('document.querySelector(".pathway-scroll").scrollIntoView({ block: "center", behavior: "instant" }); document.querySelector(".pathway-scroll").scrollLeft = 0'); await frames();
    const rect = await evaluate('(() => { const element = document.querySelector(".pathway-scroll"); const rect = element.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: Math.min(innerHeight - 20, rect.top + rect.height / 2), overflow: element.scrollWidth - element.clientWidth }; })()');
    assert(rect.overflow > 50, 'The pathway row should contain horizontally scrollable cards');
    await call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: rect.x, y: rect.y, deltaX: 500, deltaY: 0 });
    await waitFor('document.querySelector(".pathway-scroll").scrollLeft > 50', 'horizontal wheel input to scroll the pathway');
  }
  async function navigate(query = '') {
    await load('Page.navigate', { url: new URL(query, baseUrl).href });
    await waitFor('document.querySelector(".profile-panel") && document.querySelector("#goal-select") && document.querySelectorAll(".pathway-card").length > 0', 'the pathway page to load'); await frames();
  }

  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(); await evaluate('localStorage.clear()'); await load('Page.reload');
  await waitFor('document.querySelectorAll(".pathway-card").length === 5', 'the default five-role security pathway');
  assert.equal(await evaluate('document.querySelector("h1").textContent.trim()'), 'Your career, step by step.');
  assert(await evaluate('!!document.querySelector(".brandbar") && !!document.querySelector(".study-card")'), 'Default layout is missing its brand bar or study preparation');
  assert.equal(await evaluate('document.querySelector(".qualification-pill[aria-pressed=true]").dataset.qualification'), 'olevel');
  assert.equal(await evaluate('document.querySelector("#goal-select").value'), 'ciso');
  assert.equal(await evaluate('document.querySelector("#experience-slider").max'), '50');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Desktop document has horizontal overflow');
  await screenshot('desktop.png', true);

  await click('[data-qualification="btec3"]');
  assert.equal(await evaluate('document.querySelector("[data-qualification=btec3]").getAttribute("aria-pressed")'), 'true');
  assert(await evaluate('document.querySelectorAll(".status-study, .status-experience").length > 0'), 'BTEC Level 3 does not show remaining study or experience requirements');
  await click('[data-qualification="hnd"]');
  const slider = await evaluate('(() => { const input = document.querySelector("#experience-slider"); input.focus(); input.value = "4"; input.dispatchEvent(new Event("input", { bubbles: true })); return { focus: document.activeElement === input, output: document.querySelector("#experience-output").textContent.trim(), ready: document.querySelectorAll(".pathway-card .status-ready").length }; })()');
  assert(slider.focus, 'Updating experience replaced the focused slider'); assert.equal(slider.output, '4');
  assert.equal(slider.ready, 3, 'HND and four years should make three security steps ready');
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card .status-experience").length'), 2);
  assert(!await evaluate('!!document.querySelector(".study-card")'), 'HND should not need a preparation card');
  await checkHorizontalScroll();

  await click('.card-open[data-detail="associate-security-analyst"]');
  assert(await evaluate('document.querySelector("#detail-dialog").open'), 'Role details did not open');
  assert(await evaluate('document.querySelector("#detail-dialog").textContent.includes("CompTIA Security+")'), 'Full certification list is absent');
  await escape(); await click('.card-open[data-detail="associate-security-analyst"]'); await click('[data-goal="associate-security-analyst"]');
  assert(await evaluate('!document.querySelector("#detail-dialog").open && document.querySelector("#goal-select").value === "associate-security-analyst" && document.querySelectorAll(".pathway-card").length === 1'), 'A detail goal did not produce the one-step pathway');
  await click('.card-save[data-save="associate-security-analyst"]');
  assert.equal(await evaluate('document.querySelector(".card-save[data-save=associate-security-analyst]").getAttribute("aria-pressed")'), 'true');
  assert(await evaluate('JSON.parse(localStorage.getItem("pathfinder-saved")).includes("associate-security-analyst")'), 'Saved role was not persisted');
  await load('Page.reload');
  await waitFor('document.querySelector(".card-save[data-save=associate-security-analyst]")?.getAttribute("aria-pressed") === "true"', 'saved state to survive reload');
  await click('#saved-button'); assert.equal(await evaluate('document.querySelectorAll("#detail-dialog .saved-role").length'), 1); await closeDialog();

  await click('#sector-tabs [data-sector="apps-solutions"]');
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 0, 'Software should not invent role data');
  assert(await evaluate('!!document.querySelector(".empty-state")'), 'Software has no explicit empty state');
  await click('#sector-tabs [data-sector="telecom-network"]');
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 0, 'Network should not invent role data');
  await setValue('#more-sectors', 'it-services');
  assert(await evaluate('!!document.querySelector(".empty-state") && document.querySelectorAll(".pathway-card").length === 0'), 'IT Services has no empty state');
  await setValue('#more-sectors', 'digital-media'); assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 0);
  await click('#sector-tabs [data-sector="data-ai"]'); assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 1);
  await click('.card-open[data-detail="data-architect"]');
  assert(await evaluate('/not published|coming soon|unavailable/i.test(document.querySelector("#detail-dialog").textContent)'), 'Data Architect should explain unavailable detail data');
  await closeDialog(); await click('#sector-tabs [data-sector="ict-security"]');
  await setValue('#goal-select', 'associate-security-analyst'); assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 1);
  await setValue('#goal-select', 'ciso'); assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 5);
  await click('#courses-button'); assert.equal(await evaluate('document.querySelectorAll("#detail-dialog .course-card").length'), 3); await closeDialog();
  await click('#about-button');
  const about = await evaluate('document.querySelector("#detail-dialog").textContent');
  assert(/(?:6|six)\s+(?:complete\s+)?(?:role|career)/i.test(about), 'Data provenance does not disclose six role examples');
  assert(/(?:3|three)\s+(?:complete\s+)?course/i.test(about), 'Data provenance does not disclose three course examples'); await closeDialog();

  await navigate('?sector=ict-security&from=hnd&exp=4&goal=ciso');
  assert.equal(await evaluate('document.querySelector(".qualification-pill[aria-pressed=true]").dataset.qualification'), 'hnd');
  assert.equal(await evaluate('document.querySelector("#experience-slider").value'), '4');
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card .status-ready").length'), 3);
  assert.equal(await evaluate('document.querySelector(".card-save[data-save=associate-security-analyst]").getAttribute("aria-pressed")'), 'true');
  await evaluate('history.pushState(null, "", "?sector=data-ai&from=degree&exp=9&goal=data-architect"); dispatchEvent(new PopStateEvent("popstate"))');
  await waitFor('document.querySelector("#goal-select").value === "data-architect" && document.querySelectorAll(".pathway-card").length === 1', 'popstate to restore URL choices');
  assert.equal(await evaluate('document.querySelector("#experience-slider").value'), '9');
  await navigate('?sector=ict-security&from=hnd&exp=4&goal=ciso'); await click('#share-button');
  await waitFor('!!document.querySelector(".share-url") || (document.querySelector("#toast") && !document.querySelector("#toast").hidden)', 'share confirmation or URL fallback');
  const fallbackUrl = await evaluate('document.querySelector(".share-url")?.value || document.querySelector(".share-url")?.textContent || null');
  if (fallbackUrl) {
    const shared = new URL(fallbackUrl.trim());
    assert.equal(shared.searchParams.get('goal'), 'ciso'); assert.equal(shared.searchParams.get('from'), 'hnd'); assert.equal(shared.searchParams.get('exp'), '4');
  }
  await closeDialog();

  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await navigate('?sector=ict-security&from=olevel&exp=0&goal=ciso'); await frames();
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile document has horizontal overflow');
  assert(await evaluate('[...document.querySelectorAll(".qualification-pill, #experience-slider, #goal-select, #more-sectors")].every(element => { const r = element.getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= innerWidth; })'), 'Mobile profile controls are clipped');
  await screenshot('mobile.png', true); await checkHorizontalScroll();
  await click('.card-open[data-detail="associate-security-analyst"]');
  assert(await evaluate('(() => { const dialog = document.querySelector("#detail-dialog"); const r = dialog.getBoundingClientRect(); return dialog.open && r.left >= 0 && r.right <= innerWidth && r.height <= innerHeight; })()'), 'Mobile role details do not fit');
  await screenshot('mobile-detail.png'); await escape();
  assert.deepEqual(errors, [], 'Uncaught browser errors');
  console.log('PASS: screenshot layout, profile/focus, pathway statuses, sectors, goals, details, saved persistence, courses, data provenance, deep links/popstate, sharing, horizontal scrolling and mobile layout.');
  console.log('Screenshots saved in artifacts/desktop.png, artifacts/mobile.png and artifacts/mobile-detail.png.');
  await call('Browser.close');
} finally { if (ws?.readyState === WebSocket.OPEN) ws.close(); chrome.kill(); }
