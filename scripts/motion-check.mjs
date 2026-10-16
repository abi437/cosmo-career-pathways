import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const profile = path.join(root, 'artifacts', 'motion-chrome-profile');
await mkdir(profile, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-sandbox',
  '--remote-debugging-port=9335', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [];
let ws;

try {
  let target;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const targets = await (await fetch('http://127.0.0.1:9335/json')).json();
      target = targets.find(item => item.type === 'page');
      if (target) break;
    } catch {}
    await sleep(150);
  }
  assert(target, 'Motion check Chrome debugging endpoint did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timeout);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    }
  });
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
      pending.set(id, { resolve, reject, timeout });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function waitFor(expression, description = expression, timeout = 3000) {
    const deadline = Date.now() + timeout;
    do {
      if (await evaluate(expression)) return;
      await sleep(35);
    } while (Date.now() < deadline);
    throw new Error(`Timed out waiting for ${description}`);
  }
  async function frames() {
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  }
  async function click(selector) {
    assert(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), `Missing ${selector}`);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  }
  async function focusAndSet(selector, value, event, resultSelector, count) {
    const result = await evaluate(`(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      input.focus(); input.value = ${JSON.stringify(value)};
      input.dispatchEvent(new Event(${JSON.stringify(event)}, { bubbles: true }));
      return { focused: document.activeElement === input, count: document.querySelectorAll(${JSON.stringify(resultSelector)}).length };
    })()`);
    assert(result.focused, `${selector} lost focus during its synchronous result update`);
    assert.equal(result.count, count, `${selector} did not update results immediately`);
  }
  async function moveOver(selector, xFraction = .8, yFraction = .3) {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'center', behavior: 'instant' })`);
    await frames();
    const point = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.left + r.width * ${xFraction}, y: r.top + r.height * ${yFraction} }; })()`);
    await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
    await frames();
  }
  const activeAnimations = 'document.getAnimations().filter(animation => animation.playState === "running" || animation.pending)';
  const pointerReset = `(() => {
    const hero = document.querySelector('#hero');
    const cards = [...document.querySelectorAll('.career-card, .course-card')];
    return [[hero, ['--pointer-x', '--pointer-y']], ...cards.map(card => [card, ['--tilt-x', '--tilt-y']])]
      .every(([element, properties]) => properties.every(property => {
        const value = getComputedStyle(element).getPropertyValue(property).trim();
        return !value || Math.abs(Number.parseFloat(value)) < .001;
      }));
  })()`;
  function pointerChanged(selector, properties) {
    return `(() => { const style = getComputedStyle(document.querySelector(${JSON.stringify(selector)})); return ${JSON.stringify(properties)}.some(property => Math.abs(Number.parseFloat(style.getPropertyValue(property)) || 0) > .001); })()`;
  }
  async function settleCards(selector) {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'center', behavior: 'instant' })`);
    await frames();
    await waitFor(`![...document.querySelectorAll(${JSON.stringify(selector)})].some(element => element.getAnimations({ subtree: true }).some(animation => (animation.playState === 'running' || animation.pending) && animation.effect?.getComputedTiming().iterations !== Infinity))`, 'finite card animations to finish', 1800);
    assert(await evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].every(element => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      for (let node = element; node instanceof Element; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (Number(style.opacity) < .99 || style.visibility !== 'visible' || style.display === 'none') return false;
      }
      return true;
    })`), `${selector} remains hidden after its reveal`);
  }
  async function setReducedMotion(value) {
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value }] });
    await frames();
  }
  async function waitUntilReady() {
    await waitFor('document.documentElement.classList.contains("motion-ready") && document.querySelectorAll(".career-card").length === 6', 'the explorer and motion controller');
  }
  async function showHero() {
    await evaluate('window.scrollTo({ top: 0, behavior: "instant" })');
    await frames();
    await waitFor('!document.querySelector("#hero").hidden && document.querySelector("#hero").classList.contains("motion-in-view")', 'the visible hero');
  }
  async function checkTraveller(moving, description) {
    const samples = await evaluate(`(async () => {
      const dot = document.querySelector('.route-traveller');
      const read = () => [Number(dot.getAttribute('cx')), Number(dot.getAttribute('cy'))];
      const before = read();
      await new Promise(resolve => setTimeout(resolve, 150));
      return { before, after: read() };
    })()`);
    if (moving) {
      assert(Math.hypot(samples.after[0] - samples.before[0], samples.after[1] - samples.before[1]) > .1, `${description}: route traveller did not move over 150ms`);
    } else {
      assert.deepEqual(samples.after, samples.before, `${description}: route traveller kept moving`);
    }
  }
  async function checkPathProgress() {
    await evaluate('window.scrollTo({ top: 0, behavior: "instant" })');
    await frames();
    const before = await evaluate('({ scroll: scrollY, progress: Number(getComputedStyle(document.querySelector(".roadmap-steps")).getPropertyValue("--path-progress")) })');
    await call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 1000, y: 700, deltaX: 0, deltaY: 600 });
    await waitFor(`scrollY > ${before.scroll + 100}`, 'actual wheel input to scroll the roadmap');
    await waitFor(`Number(getComputedStyle(document.querySelector('.roadmap-steps')).getPropertyValue('--path-progress')) > ${before.progress + .05}`, 'the pathway line to progress after scrolling');
  }

  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Emulation.setTouchEmulationEnabled', { enabled: false });
  await setReducedMotion('no-preference');
  await call('Page.navigate', { url: 'http://127.0.0.1:8080/' });
  await waitUntilReady();
  await evaluate('localStorage.clear(); localStorage.setItem("pathfinder-motion", "enabled")');
  await call('Page.reload');
  await waitUntilReady();
  assert(await evaluate('matchMedia("(hover: hover) and (pointer: fine)").matches'), 'Desktop pointer emulation is unavailable');
  assert.equal(await evaluate('document.querySelector("#motion-toggle").getAttribute("aria-pressed")'), 'false');
  await waitFor(`${activeAnimations}.length > 0`, 'normal motion to start');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Desktop overflow with motion');
  await showHero();
  await checkTraveller(true, 'Visible normal motion');

  await focusAndSet('#career-search', 'ethical hacker', 'input', '.career-card', 1);
  await settleCards('.career-card');
  await focusAndSet('#career-search', '', 'input', '.career-card', 6);
  await settleCards('.career-card');
  await click('[data-view="courses"]');
  await focusAndSet('#course-search', 'cybersecurity', 'input', '.course-card', 1);
  await settleCards('.course-card');
  await focusAndSet('#course-search', '', 'input', '.course-card', 3);
  await click('[data-view="roadmap"]');
  await focusAndSet('#goal-select', 'ciso', 'change', '.roadmap-step', 5);
  await focusAndSet('#qualification-select', 'hnd', 'change', '.roadmap-step', 5);
  await focusAndSet('#experience-input', '4', 'change', '.roadmap-step', 5);
  await checkPathProgress();

  await focusAndSet('#goal-select', 'associate-security-analyst', 'change', '.roadmap-step', 1);
  await click('[data-view="explore"]');
  await showHero();
  await click('.journey-start');
  assert(await evaluate('document.querySelector("#goal-select")?.value === "associate-security-analyst" && document.querySelector("#qualification-select")?.value === "hnd" && document.querySelector("#experience-input")?.value === "4" && document.querySelector("[data-view=roadmap]").getAttribute("aria-current") === "page"'), 'The profile journey button did not open the retained roadmap choices');
  await click('[data-view="explore"]');
  await showHero();
  await click('.journey-middle');
  assert(await evaluate('document.querySelectorAll(".career-card").length === 6 && !!document.querySelector("#career-search") && document.querySelector("[data-view=explore]").getAttribute("aria-current") === "page"'), 'The roles journey button did not open career exploration');
  await showHero();
  await click('.journey-end');
  assert(await evaluate('document.querySelector("#goal-select")?.value === "ciso" && document.querySelectorAll(".roadmap-step").length === 5 && new URLSearchParams(location.search).get("goal") === "ciso"'), 'The goal journey button did not open the CISO pathway');

  await click('[data-view="explore"]');
  await click('[data-detail="associate-security-analyst"]');
  assert(await evaluate('document.querySelector("#detail-dialog").open'), 'Detail dialog did not open');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor('!document.querySelector("#detail-dialog").open', 'native Escape to close details');
  await click('[data-detail="associate-security-analyst"]');
  await click('[data-map="associate-security-analyst"]');
  assert(await evaluate('!document.querySelector("#detail-dialog").open && document.querySelectorAll(".roadmap-step").length === 1'), 'Reopened details could not map the career');
  await click('[data-view="explore"]');

  await moveOver('#hero');
  await waitFor(pointerChanged('#hero', ['--pointer-x', '--pointer-y']), 'hero parallax from a real mouse move');
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 4, y: 4 });
  await waitFor(pointerReset, 'hero parallax to reset after leaving');
  await settleCards('.career-card');
  await moveOver('.career-card', .8, .25);
  await waitFor(pointerChanged('.career-card', ['--tilt-x', '--tilt-y']), 'card tilt from a real mouse move');
  const enabledLabel = await evaluate('document.querySelector("#motion-toggle").textContent.trim()');
  assert(await evaluate(`${activeAnimations}.length > 0`), 'Pause was not exercised while motion was active');
  await click('#motion-toggle');
  await waitFor(`document.documentElement.classList.contains('motion-paused') && ${activeAnimations}.length === 0`, 'pause to stop active animations');
  assert(await evaluate(pointerReset), 'Pause retained pointer offsets');
  assert.equal(await evaluate('document.querySelector("#motion-toggle").getAttribute("aria-pressed")'), 'true');
  assert.notEqual(await evaluate('document.querySelector("#motion-toggle").textContent.trim()'), enabledLabel, 'Motion toggle label did not change');
  assert.equal(await evaluate('localStorage.getItem("pathfinder-motion")'), 'paused');
  await showHero();
  await checkTraveller(false, 'Manually paused motion');
  await call('Page.reload'); await waitUntilReady();
  assert(await evaluate('document.documentElement.classList.contains("motion-paused")'), 'Paused motion did not persist after reload');
  await waitFor(`${activeAnimations}.length === 0`, 'persisted pause to keep animations stopped');
  await settleCards('.career-card');
  await click('#motion-toggle');
  assert.equal(await evaluate('localStorage.getItem("pathfinder-motion")'), 'enabled');
  await waitFor(`!document.documentElement.classList.contains('motion-paused') && ${activeAnimations}.length > 0`, 'resume to restart normal motion');
  assert.equal(await evaluate('document.querySelector("#motion-toggle").getAttribute("aria-pressed")'), 'false');
  await call('Page.reload'); await waitUntilReady();
  assert(!await evaluate('document.documentElement.classList.contains("motion-paused")'), 'Enabled motion did not persist after reload');

  await setReducedMotion('reduce');
  await waitFor(`${activeAnimations}.length === 0`, 'the system reduced-motion preference to stop CSS and Web Animations');
  assert(await evaluate(pointerReset), 'Reduced motion retained pointer offsets');
  await showHero();
  await checkTraveller(false, 'System reduced motion');
  await focusAndSet('#career-search', 'ethical hacker', 'input', '.career-card', 1);
  await settleCards('.career-card');
  await moveOver('.career-card');
  assert(await evaluate(pointerReset), 'Reduced motion allowed pointer tilt');
  await focusAndSet('#career-search', '', 'input', '.career-card', 6);
  await call('Page.reload'); await waitUntilReady();
  await waitFor(`${activeAnimations}.length === 0`, 'reduced motion after reload');
  await settleCards('.career-card');

  await setReducedMotion('no-preference');
  await moveOver('#hero');
  await waitFor(pointerChanged('#hero', ['--pointer-x', '--pointer-y']), 'normal pointer effects after the system preference changes');
  await checkTraveller(true, 'Restored normal motion');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await frames();
  await waitFor(pointerReset, 'pointer offsets to reset on a touch layout');
  await checkTraveller(false, 'Hidden mobile hero artwork');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile overflow with motion');
  await moveOver('.career-card');
  assert(await evaluate(pointerReset), 'Touch layout allowed pointer transforms');
  await settleCards('.career-card');
  await click('#mobile-menu');
  assert(await evaluate('document.body.classList.contains("menu-open")'), 'Mobile navigation did not open');
  await click('#mobile-overlay');
  await click('[data-detail="associate-security-analyst"]');
  await waitFor('document.querySelector("#detail-dialog").getBoundingClientRect().right <= innerWidth', 'mobile detail entrance to finish');
  assert(await evaluate('document.querySelector("#detail-dialog").open && document.querySelector("#detail-dialog").getBoundingClientRect().right <= innerWidth'), 'Animated mobile details overflow');
  await click('#close-detail');
  assert.deepEqual(errors, [], 'Uncaught browser errors during motion checks');
  console.log('PASS: route travel, scroll progress, journey controls, motion completion, pointer effects, focus, pause/resume persistence, reduced motion, dialogs and mobile layout.');
  await call('Browser.close');
} finally {
  if (ws?.readyState === WebSocket.OPEN) ws.close();
  chrome.kill();
}
