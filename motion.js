/** Progressive motion: the content and every control work without animation. */
export function initializeMotion() {
  const html = document.documentElement;
  const hero = document.getElementById('hero');
  const toggle = document.getElementById('motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const selector = '.section-heading, .career-card, .course-card, .roadmap-step, .roadmap-aside, .insight-banner, .empty-state';
  const watched = new Set();
  const animations = new Map();
  let paused = false, observer, heroInView = false, routeFrame = 0, routeStarted = 0, progressFrame = 0, pointerFrame = 0, pointerJob;
  try { paused = localStorage.getItem('pathfinder-motion') === 'paused'; } catch {}
  const enabled = () => !paused && !reduced.matches;
  const path = hero?.querySelector('.route-trace');
  const traveller = hero?.querySelector('.route-traveller');
  const pathLength = path?.getTotalLength() || 0;
  const playIcon = '<path d="m9 5 10 7-10 7V5Z"/>';
  const pauseIcon = '<path d="M8 5v14M16 5v14"/>';

  function animate(element, frames, options = {}) {
    if (!enabled() || !element?.animate) return;
    animations.get(element)?.cancel();
    const animation = element.animate(frames, { duration: 520, easing: 'cubic-bezier(.2,.75,.25,1)', ...options });
    animations.set(element, animation);
    animation.finished.then(() => { if (animations.get(element) === animation) animations.delete(element); }, () => { if (animations.get(element) === animation) animations.delete(element); });
    return animation;
  }

  function observe() {
    if (!('IntersectionObserver' in window) || observer) return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        watched.delete(entry.target);
        const section = entry.target.matches('.section-heading, .roadmap-aside');
        animate(entry.target, [{ opacity: 0, translate: section ? '30px 0' : '0 24px' }, { opacity: 1, translate: '0 0' }], { delay: Number(entry.target.dataset.motionDelay || 0) });
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -18px 0px' });
  }

  function refresh(root = document) {
    for (const element of watched) if (!element.isConnected) { observer?.unobserve(element); watched.delete(element); }
    for (const [element, animation] of animations) if (!element.isConnected) { animation.cancel(); animations.delete(element); }
    const cards = root.querySelectorAll('.career-card, .course-card');
    cards.forEach(card => card.classList.add('motion-interactive'));
    if (enabled()) {
      observe();
      root.querySelectorAll(selector).forEach((element, index) => {
        if (element.dataset.motionSeen) return;
        element.dataset.motionSeen = 'true';
        element.dataset.motionDelay = String(Math.min(index % 4, 3) * 55);
        // No hidden styles are applied while an offscreen element waits.
        if (observer) { watched.add(element); observer.observe(element); }
        else animate(element, [{ opacity: 0, translate: '0 20px' }, { opacity: 1, translate: '0 0' }]);
      });
    }
    scheduleProgress();
  }

  function resetPointer(element) {
    if (pointerJob?.element === element) { cancelAnimationFrame(pointerFrame); pointerFrame = 0; pointerJob = undefined; }
    if (element === hero) { element.style.setProperty('--pointer-x', '0'); element.style.setProperty('--pointer-y', '0'); }
    else if (element) { element.style.setProperty('--tilt-x', '0deg'); element.style.setProperty('--tilt-y', '0deg'); element.style.removeProperty('--spot-x'); element.style.removeProperty('--spot-y'); }
  }

  function movePointer(element, event, kind) {
    if (!enabled() || !finePointer.matches || event.pointerType === 'touch') return;
    pointerJob = { element, x: event.clientX, y: event.clientY, kind };
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      const job = pointerJob; pointerJob = undefined;
      if (!job || !enabled() || !job.element.isConnected) return;
      const bounds = job.element.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (job.x - bounds.left) / bounds.width));
      const y = Math.min(1, Math.max(0, (job.y - bounds.top) / bounds.height));
      if (job.kind === 'hero') {
        job.element.style.setProperty('--pointer-x', ((x - .5) * 2).toFixed(3));
        job.element.style.setProperty('--pointer-y', ((y - .5) * 2).toFixed(3));
      } else {
        job.element.style.setProperty('--tilt-x', ((.5 - y) * 5).toFixed(2) + 'deg');
        job.element.style.setProperty('--tilt-y', ((x - .5) * 6).toFixed(2) + 'deg');
        job.element.style.setProperty('--spot-x', (x * 100).toFixed(1) + '%');
        job.element.style.setProperty('--spot-y', (y * 100).toFixed(1) + '%');
      }
    });
  }

  function routeTick(time) {
    routeFrame = 0;
    if (!enabled() || !heroInView || document.hidden || !path || !traveller) return;
    if (!routeStarted) routeStarted = time;
    const progress = ((time - routeStarted) % 6500) / 6500;
    const point = path.getPointAtLength(pathLength * progress);
    traveller.setAttribute('cx', point.x.toFixed(2));
    traveller.setAttribute('cy', point.y.toFixed(2));
    routeFrame = requestAnimationFrame(routeTick);
  }

  function updateRoute() {
    cancelAnimationFrame(routeFrame); routeFrame = 0;
    const artworkVisible = hero?.querySelector('.hero-art')?.getClientRects().length;
    if (enabled() && heroInView && artworkVisible && !document.hidden && path && traveller) routeFrame = requestAnimationFrame(routeTick);
  }

  function updateProgress() {
    progressFrame = 0;
    const steps = document.querySelector('.roadmap-steps');
    if (!steps) return;
    const nodes = [...steps.querySelectorAll('.roadmap-step')];
    if (!nodes.length) return;
    const length = nodes.at(-1).offsetTop - nodes[0].offsetTop;
    steps.style.setProperty('--path-length', length + 'px');
    const bounds = steps.getBoundingClientRect();
    const progress = enabled() ? Math.max(0, Math.min(1, (innerHeight * .68 - bounds.top - 16) / Math.max(length, 1))) : 1;
    steps.style.setProperty('--path-progress', progress.toFixed(4));
  }
  function scheduleProgress() { if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress); }

  function sync() {
    const active = enabled();
    html.classList.toggle('motion-paused', !active);
    html.classList.add('motion-ready');
    if (toggle) {
      toggle.disabled = reduced.matches;
      toggle.setAttribute('aria-pressed', String(!active));
      toggle.setAttribute('aria-label', reduced.matches ? 'Animations reduced to match your device setting' : active ? 'Pause animations' : 'Enable animations');
      toggle.title = reduced.matches ? 'Follows your device’s reduced motion setting' : active ? 'Pause animations' : 'Enable animations';
      toggle.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${active ? pauseIcon : playIcon}</svg><span class="motion-control-label">${reduced.matches ? 'Motion reduced' : active ? 'Motion on' : 'Motion off'}</span>`;
    }
    if (!active) {
      for (const animation of animations.values()) animation.cancel();
      animations.clear(); observer?.disconnect(); watched.clear();
      // CSS and JS are both stopped; content returns to its natural visible state.
      resetPointer(hero);
      document.querySelectorAll('.motion-interactive').forEach(resetPointer);
    }
    updateRoute(); refresh();
  }

  toggle?.addEventListener('click', () => {
    if (reduced.matches) return;
    paused = !paused;
    try { localStorage.setItem('pathfinder-motion', paused ? 'paused' : 'enabled'); } catch {}
    sync();
  });
  reduced.addEventListener('change', sync);
  finePointer.addEventListener('change', () => { resetPointer(hero); document.querySelectorAll('.motion-interactive').forEach(resetPointer); });
  hero?.addEventListener('pointermove', event => movePointer(hero, event, 'hero'), { passive: true });
  hero?.addEventListener('pointerleave', () => resetPointer(hero));
  document.addEventListener('pointermove', event => { const card = event.target.closest('.motion-interactive'); if (card) movePointer(card, event, 'card'); }, { passive: true });
  document.addEventListener('pointerout', event => { const card = event.target.closest('.motion-interactive'); if (card && !card.contains(event.relatedTarget)) resetPointer(card); }, { passive: true });
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', () => { resetPointer(hero); document.querySelectorAll('.motion-interactive').forEach(resetPointer); updateRoute(); scheduleProgress(); }, { passive: true });
  document.addEventListener('visibilitychange', updateRoute);
  document.getElementById('detail-dialog')?.addEventListener('close', () => {
    for (const [element, animation] of animations) if (element.closest('#detail-dialog')) { animation.cancel(); animations.delete(element); }
  });
  if (hero && 'IntersectionObserver' in window) new IntersectionObserver(([entry]) => { heroInView = entry.isIntersecting; hero.classList.toggle('motion-in-view', heroInView); updateRoute(); }, { threshold: .05 }).observe(hero);
  else heroInView = true;
  sync();
  return {
    get enabled() { return enabled(); },
    refresh,
    saved(id) {
      document.querySelectorAll('[data-save]').forEach(button => { if (button.dataset.save === id) animate(button.querySelector('svg'), [{ scale: '1' }, { scale: '.72', offset: .25 }, { scale: '1.22', offset: .6 }, { scale: '1' }], { duration: 400 }); });
    },
    toast(element) { animate(element, [{ opacity: 0, translate: '20px 0' }, { opacity: 1, translate: '0 0' }], { duration: 280 }); },
  };
}
