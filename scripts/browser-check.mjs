import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const artifacts = path.join(root, 'artifacts');
await mkdir(artifacts, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-sandbox', '--remote-debugging-port=9333', `--user-data-dir=${path.join(artifacts, 'chrome-profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
const errors = [];
try {
  let target;
  for (let attempt = 0; attempt < 80; attempt++) {
    try { const targets = await (await fetch('http://127.0.0.1:9333/json')).json(); target = targets.find(t => t.type === 'page'); if (target) break; } catch {}
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
    if (message.id) { const request = pending.get(message.id); if (request) { pending.delete(message.id); clearTimeout(request.timeout); if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result); } }
  });
  function call(method, params = {}) { return new Promise((resolve, reject) => { const id = nextId++; const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000); pending.set(id, { resolve, reject, timeout }); ws.send(JSON.stringify({ id, method, params })); }); }
  async function evaluate(expression) { const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; }
  async function waitFor(expression) { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await sleep(50); } throw new Error(`Timed out waiting for: ${expression}`); }
  async function click(selector) { assert(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), `Missing selector ${selector}`); await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); }
  async function setValue(selector, value, event = 'change') { await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event(${JSON.stringify(event)}, { bubbles: true })); })()`); }
  async function screenshot(name, full = false) { const metrics = await call('Page.getLayoutMetrics'); const dimensions = metrics.cssContentSize; const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, ...(full ? { clip: { x: 0, y: 0, width: dimensions.width, height: dimensions.height, scale: 1 } } : {}) }); await writeFile(path.join(artifacts, name), Buffer.from(result.data, 'base64')); }
  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: 'http://127.0.0.1:8080/' });
  await waitFor('document.querySelectorAll(".career-card").length === 6');
  await evaluate('localStorage.clear()');
  await call('Page.reload'); await waitFor('document.querySelectorAll(".career-card").length === 6');
  assert(await evaluate('document.querySelector("#data-status").textContent.includes("6 role examples")'));
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Desktop horizontal overflow');
  await screenshot('desktop.png', true);
  await setValue('#career-search', 'ethical hacker', 'input');
  assert.equal(await evaluate('document.querySelectorAll(".career-card").length'), 1);
  assert(await evaluate('document.querySelector(".career-card h3").textContent.includes("Associate")'));
  await setValue('#career-search', '', 'input');
  await setValue('#stage-filter', 'entry'); assert.equal(await evaluate('document.querySelectorAll(".career-card").length'), 1);
  await setValue('#stage-filter', 'all');
  await click('[data-sector="data-ai"]'); assert.equal(await evaluate('document.querySelectorAll(".career-card").length'), 1);
  await click('[data-sector="it-services"]'); assert(await evaluate('!!document.querySelector(".empty-state")'));
  await click('[data-reset-filters]');
  await click('[data-save="associate-security-analyst"]');
  assert.equal(await evaluate('document.querySelector("#saved-count").textContent'), '1');
  await click('[data-view="saved"]'); assert.equal(await evaluate('document.querySelectorAll(".career-card").length'), 1);
  await click('[data-detail="associate-security-analyst"]');
  assert(await evaluate('document.querySelector("#detail-dialog").open'));
  assert(await evaluate('document.querySelector("#detail-content").textContent.includes("CompTIA Security+")'));
  await click('[data-map="associate-security-analyst"]');
  assert.equal(await evaluate('document.querySelectorAll(".roadmap-step").length'), 1);
  await setValue('#goal-select', 'ciso');
  assert.equal(await evaluate('document.querySelectorAll(".roadmap-step").length'), 5);
  assert(await evaluate('document.querySelector(".roadmap-summary").textContent.includes("12 years")'));
  await screenshot('roadmap.png', true);
  await setValue('#qualification-select', 'degree');
  assert(await evaluate('document.querySelector(".roadmap-summary").textContent.includes("10 years")'));
  await setValue('#experience-input', '10');
  assert.equal(await evaluate('document.querySelectorAll(".status-ok").length'), 5);
  await setValue('#qualification-select', 'olevel');
  assert(await evaluate('document.querySelectorAll(".status-study").length > 0'));
  await setValue('#goal-select', 'data-architect');
  assert(await evaluate('document.querySelector("#roadmap-body").textContent.includes("not published")'));
  await click('[data-view="courses"]'); assert.equal(await evaluate('document.querySelectorAll(".course-card").length'), 3);
  await setValue('#course-type', 'short-course'); assert.equal(await evaluate('document.querySelectorAll(".course-card").length'), 1);
  await setValue('#course-search', 'cybersecurity', 'input'); assert.equal(await evaluate('document.querySelectorAll(".course-card").length'), 1);
  await setValue('#course-search', 'nonexistent', 'input'); assert(await evaluate('!!document.querySelector(".empty-state")'));
  await click('#footer-about'); assert(await evaluate('document.querySelector("#detail-content").textContent.includes("404")'));
  await click('#close-detail');
  await call('Page.navigate', { url: 'http://127.0.0.1:8080/?goal=ciso&from=hnd&exp=4' });
  await waitFor('document.querySelectorAll(".roadmap-step").length === 5');
  assert.equal(await evaluate('document.querySelector("#experience-input").value'), '4');
  assert.equal(await evaluate('document.querySelectorAll(".status-ok").length'), 3);
  assert.equal(await evaluate('document.querySelector("#saved-count").textContent'), '1');
  await click('[data-share]');
  assert(await evaluate('!document.querySelector("#toast").hidden || document.querySelector("#detail-dialog").open'));
  await evaluate('document.querySelector("#detail-dialog").close()');
  await click('[data-view="explore"]');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile horizontal overflow');
  await waitFor('document.querySelector("#sidebar").getBoundingClientRect().right <= 1');
  await screenshot('mobile.png', true);
  await click('#mobile-menu'); assert(await evaluate('document.body.classList.contains("menu-open")'));
  await click('#mobile-overlay'); assert(await evaluate('!document.body.classList.contains("menu-open")'));
  await click('[data-detail="associate-security-analyst"]');
  assert(await evaluate('document.querySelector("#detail-dialog").getBoundingClientRect().right <= innerWidth'));
  await screenshot('mobile-detail.png');
  assert.deepEqual(errors, [], 'Uncaught browser errors');
  console.log('PASS: desktop/mobile layout, search, sector/stage filters, saved careers, details, qualification/experience roadmaps, course filters, deep links, sharing and local persistence.');
  console.log('Screenshots saved in artifacts/.');
  await call('Browser.close');
} finally { if (ws?.readyState === WebSocket.OPEN) ws.close(); chrome.kill(); }
