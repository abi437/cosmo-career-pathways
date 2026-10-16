import { buildRoadmap } from './career-model.js';
import { initializeMotion } from './motion.js';

const motion = initializeMotion();

const icons = {
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h6"/>',
  graduation: '<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v6c4 3 8 3 12 0v-6m4-2v7"/>',
  bookmark: '<path d="M6 4h12v17l-6-4-6 4V4Z"/>',
  sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Zm7-2v4m-2-2h4"/>',
  'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
  'chevron-right': '<path d="m9 5 7 7-7 7"/>',
  'book-open': '<path d="M12 6c-3-3-7-3-10-2v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 2Zm0 0v15"/>',
  'circle-help': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/>',
  'badge-check': '<path d="m12 2 3 2 4 .5.5 4 2 3-2 3-.5 4-4 .5-3 2-3-2-4-.5-.5-4-2-3 2-3 .5-4 4-.5 3-2Z"/><path d="m8 12 3 3 5-6"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  flag: '<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  shield: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/><path d="m8 12 3 3 5-6"/>',
  monitor: '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8m-4-5v5"/>',
  network: '<rect x="8" y="2" width="8" height="6" rx="1"/><rect x="2" y="16" width="7" height="6" rx="1"/><rect x="15" y="16" width="7" height="6" rx="1"/><path d="M12 8v4H5.5v4M12 12h6.5v4"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4c-1-1 0-3 2-3h2a4 4 0 0 0 4-4c0-4-5-7-10-7Z"/><path d="M7 10h.01M10 6h.01M15 7h.01M6 15h.01"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  share: '<path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  refresh: '<path d="M20 7a9 9 0 0 0-15-2L2 8m0-6v6h6m-4 9a9 9 0 0 0 15 2l3-3m0 6v-6h-6"/>',
  heart: '<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 3 11 8 15 5-4 13-10 8-15Z"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.compass}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = value => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? esc(url.href) : '#'; } catch { return '#'; } };
const external = (url, text, cls = '') => `<a class="${cls}" href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${text}${icon('arrow-up-right')}</a>`;
const sectorIcons = { 'it-services': 'monitor', 'telecom-network': 'network', 'apps-solutions': 'code', 'ict-security': 'shield', 'digital-media': 'palette', 'data-ai': 'database' };
const sectorColors = { 'it-services': ['#1E2859', '#EEF0F8'], 'telecom-network': ['#43558F', '#EEF1FA'], 'apps-solutions': ['#5967A1', '#F1F2FA'], 'ict-security': ['#896700', '#FFF8D6'], 'digital-media': ['#9A7300', '#FFF4CC'], 'data-ai': ['#30437D', '#EAF0FA'] };
const stageNames = { entry: 'Entry level', mid: 'Mid level', senior: 'Senior level', top: 'Leadership' };
const qualifications = { olevel: { label: 'O Level / equivalent', bdqf: 3 }, alevel: { label: 'A Level / HNTec', bdqf: 4 }, hnd: { label: 'HND / Advanced Diploma', bdqf: 5 }, degree: { label: "Bachelor's degree or above", bdqf: 6 } };
const labels = { explore: 'Explore careers', roadmap: 'My roadmap', courses: 'Explore courses', saved: 'Saved careers' };
function readStorage(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
const state = { view: 'explore', query: '', sector: 'all', stage: 'all', limit: 9, courseQuery: '', courseType: 'all', goal: 'ciso', from: 'hnd', years: 0, route: 0, saved: new Set(readStorage('pathfinder-saved', []).filter?.(id => typeof id === 'string') || []) };
Object.assign(state, readStorage('pathfinder-profile', {}));
let roles = [], sectors = [], courses = [], roleCourses = {}, metadata = {}, toastTimer;
const content = document.getElementById('view-content');
const dialog = document.getElementById('detail-dialog');
function fillIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
function sectorById(id) { return sectors.find(sector => sector.id === id) || { id, short: 'ICT', name: 'ICT' }; }
function sectorStyle(id) { const [color, bg] = sectorColors[id] || ['#1E2859', '#EEF0F8']; return `--sector-color:${color};--sector-bg:${bg}`; }
function notify(message) { const toast = document.getElementById('toast'); toast.textContent = message; toast.hidden = false; motion.toast(toast); clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3500); }
function persist(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function saveProfile() { persist('pathfinder-profile', { from: state.from, years: state.years, goal: state.goal }); }
function readLocation() {
  const params = new URLSearchParams(location.search);
  state.view = params.has('goal') ? 'roadmap' : Object.hasOwn(labels, params.get('view')) ? params.get('view') : 'explore';
  state.goal = roles.some(r => r.id === params.get('goal')) ? params.get('goal') : roles.some(r => r.id === state.goal) ? state.goal : roles[0]?.id;
  const from = params.get('from') === 'working' ? 'hnd' : params.get('from');
  if (Object.hasOwn(qualifications, from)) state.from = from;
  if (!Object.hasOwn(qualifications, state.from)) state.from = 'hnd';
  if (params.has('exp')) state.years = /^\d+$/.test(params.get('exp')) ? Math.min(50, Number(params.get('exp'))) : 0;
  state.years = Math.max(0, Math.min(50, Number(state.years) || 0));
  state.route = params.get('r') === '1' ? 1 : 0;
  state.sector = sectors.some(s => s.id === params.get('sector')) ? params.get('sector') : 'all';
  state.stage = Object.hasOwn(stageNames, params.get('stage')) ? params.get('stage') : 'all';
}
function updateLocation(replace = true) {
  const url = new URL(location.href); url.search = '';
  if (state.view === 'roadmap') { url.searchParams.set('goal', state.goal); url.searchParams.set('from', state.from); url.searchParams.set('exp', state.years); if (state.route) url.searchParams.set('r', '1'); }
  else { if (state.view !== 'explore') url.searchParams.set('view', state.view); if (state.sector !== 'all' && state.view === 'explore') url.searchParams.set('sector', state.sector); if (state.stage !== 'all' && state.view === 'explore') url.searchParams.set('stage', state.stage); }
  history[replace ? 'replaceState' : 'pushState']({}, '', url);
}
function navigate(view, goal) {
  state.view = view; if (goal) { state.goal = goal; state.route = 0; saveProfile(); }
  updateLocation(false); closeMenu(); render(); window.scrollTo({ top: 0, behavior: 'instant' });
}
function sectionHeading(eyebrow, title, description, right = '') { return `<div class="section-heading"><div><div class="section-eyebrow">${eyebrow}</div><h2>${title}</h2><p>${description}</p></div>${right}</div>`; }
function render() {
  document.getElementById('hero').hidden = !['explore', 'saved'].includes(state.view);
  document.getElementById('breadcrumb-title').textContent = labels[state.view];
  document.querySelectorAll('.nav-link').forEach(el => { const active = el.dataset.view === state.view; el.classList.toggle('active', active); if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
  document.getElementById('saved-count').textContent = state.saved.size;
  if (state.view === 'roadmap') renderRoadmap();
  else if (state.view === 'courses') renderCourses();
  else renderExplorer();
  motion.refresh(content);
}
function renderExplorer() {
  const saved = state.view === 'saved';
  content.innerHTML = sectionHeading(saved ? 'YOUR SHORTLIST' : 'A WORLD OF OPPORTUNITY', saved ? 'Keep your possibilities close.' : 'Find where you belong.', saved ? 'The roles that caught your eye, all in one place.' : 'Different interests. Different strengths. A place for yours.', `<span class="section-meta"><strong>${roles.length}</strong> career roles <span>across ${sectors.length} sectors</span></span>`)
    + `<div class="sector-tabs" role="group" aria-label="Filter by career sector"><button class="sector-tab ${state.sector === 'all' ? 'active' : ''}" data-sector="all" aria-pressed="${state.sector === 'all'}">${icon('grid')}All sectors<span>${roles.length}</span></button>${sectors.map(s => `<button class="sector-tab ${state.sector === s.id ? 'active' : ''}" data-sector="${esc(s.id)}" aria-pressed="${state.sector === s.id}">${icon(sectorIcons[s.id])}${esc(s.short)}<span>${roles.filter(r => r.sector === s.id).length}</span></button>`).join('')}</div>`
    + `<div class="explorer-tools"><div class="search-field">${icon('search')}<input id="career-search" type="search" placeholder="Search careers, skills, or something you love…" aria-label="Search careers" value="${esc(state.query)}"><kbd>/</kbd></div><div class="filter-select"><label for="stage-filter">Career stage</label><select id="stage-filter"><option value="all">All stages</option>${Object.entries(stageNames).map(([k, v]) => `<option value="${k}" ${state.stage === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div><div class="result-summary" id="result-summary" role="status" aria-live="polite"></div><div class="career-grid" id="career-grid"></div><div class="load-more-row" id="load-more-row"></div>`
    + `<div class="insight-banner"><span class="insight-icon">${icon('route')}</span><div><h3>A goal is a great place to start.</h3><p>See how your qualification and experience connect to your next role.</p></div><button class="button button-secondary" data-navigate="roadmap">Map my next step ${icon('arrow-right')}</button></div>`;
  updateCareerResults();
}
function matchingRoles() {
  const query = state.query.toLocaleLowerCase().trim();
  return roles.filter(role => (state.view !== 'saved' || state.saved.has(role.id)) && (state.sector === 'all' || role.sector === state.sector) && (state.stage === 'all' || role.stage === state.stage) && (!query || [role.title, role.summary, ...(role.aka || []), ...(role.skills || []).map(s => s[0]), ...(role.certs || [])].join(' ').toLocaleLowerCase().includes(query)));
}
function careerCard(role) {
  const sector = sectorById(role.sector), saved = state.saved.has(role.id);
  const minBdqf = role.routes?.length ? Math.min(...role.routes.map(r => r.bdqf)) : null;
  return `<article class="career-card" style="${sectorStyle(role.sector)}"><div class="card-top"><span class="sector-icon">${icon(sectorIcons[role.sector])}</span><button class="icon-button save-button ${saved ? 'saved' : ''}" data-save="${esc(role.id)}" aria-label="${saved ? 'Unsave' : 'Save'} ${esc(role.title)}" aria-pressed="${saved}">${icon('bookmark')}</button></div><div class="sector-name">${esc(sector.short)}</div><h3><button class="card-title-button" data-detail="${esc(role.id)}">${esc(role.title)}</button></h3><p class="role-summary">${esc(role.summary)}</p><div class="role-tags"><span class="tag stage-${esc(role.stage)}"><span></span>${esc(stageNames[role.stage] || role.stage)}</span>${role.unavailable ? '<span class="tag">Details coming soon</span>' : (role.skills || []).slice(0, 1).map(s => `<span class="tag skill-tag">${esc(s[0])}</span>`).join('')}</div><div class="card-footer"><span class="qualification-hint">${icon('graduation')}${minBdqf ? `BDQF ${minBdqf}+` : 'Requirements pending'}</span><button class="text-button" data-detail="${esc(role.id)}">Explore role ${icon('arrow-right')}</button></div></article>`;
}
function emptyState(title, description, button = '') { return `<div class="empty-state">${icon('compass')}<h3>${title}</h3><p>${description}</p>${button}</div>`; }
function updateCareerResults() {
  const matches = matchingRoles();
  document.getElementById('result-summary').innerHTML = `<span>Showing <strong>${Math.min(matches.length, state.limit)}</strong> of <strong>${matches.length}</strong> ${state.view === 'saved' ? 'saved ' : ''}career roles${state.sector !== 'all' ? ` in ${esc(sectorById(state.sector).short)}` : ''}</span><span>One of these could be your next chapter ${icon('sparkles')}</span>`;
  document.getElementById('career-grid').innerHTML = matches.length ? matches.slice(0, state.limit).map(careerCard).join('') : emptyState(state.view === 'saved' ? 'Your next chapter is still unwritten.' : 'A different direction, perhaps?', state.view === 'saved' ? 'Tap the bookmark on any career to keep it here.' : state.sector !== 'all' && !roles.some(r => r.sector === state.sector) ? 'This sector has no role examples in the supplied specification. Explore another sector while the full data is unavailable.' : 'Try another search, or clear your filters to explore more possibilities.', '<button class="button button-secondary" data-reset-filters>Explore all careers '+icon('arrow-right')+'</button>');
  document.getElementById('load-more-row').innerHTML = matches.length > state.limit ? `<button class="button button-secondary" data-load-more>Discover more careers ${icon('arrow-right')}</button>` : '';
  motion.refresh(document.getElementById('career-grid'));
}
function courseCard(course) {
  const links = (course.careerLinks || []).filter(l => roles.some(r => r.id === l.role));
  return `<article class="course-card"><div class="card-top"><span class="sector-icon">${icon(course.type === 'short-course' ? 'sparkles' : 'graduation')}</span><span class="course-type">${course.type === 'short-course' ? 'Short course' : 'Qualification'}</span></div><div class="sector-name">${esc(course.awardingBody || course.provider)}</div><h3>${esc(course.title)}</h3><p>${course.note ? esc(course.note) : course.type === 'short-course' ? 'Build focused, practical skills for your next step in ICT.' : `Develop your foundation with a ${course.bdqf ? `BDQF ${course.bdqf}` : ''} qualification from ${esc(course.provider)}.`}</p><div class="role-tags">${course.bdqf ? `<span class="tag">BDQF ${course.bdqf}${course.bdqfSource === 'estimated' ? ' · estimated' : ''}</span>` : '<span class="tag">Skills development</span>'}${links.length ? `<span class="tag">${links.length} available career links</span>` : ''}</div>${course.bdqfSource === 'estimated' ? '<p class="route-note">Estimated BDQF level. Confirm with COSMO.</p>' : ''}<div class="course-footer">${external(course.url, 'View course', 'text-button')}</div></article>`;
}
function renderCourses() {
  content.innerHTML = sectionHeading('LEARN WITH A DIRECTION', 'Skills for the path ahead.', 'Explore COSMO courses and see how learning connects to your career.', `<span class="section-meta"><strong>${courses.length}</strong> available courses</span>`)
    + `<div class="explorer-tools"><div class="search-field">${icon('search')}<input type="search" id="course-search" aria-label="Search courses" placeholder="Find a course or qualification…" value="${esc(state.courseQuery)}"></div><div class="filter-select"><label for="course-type">Course type</label><select id="course-type"><option value="all">All courses</option><option value="qualification" ${state.courseType === 'qualification' ? 'selected' : ''}>Qualifications</option><option value="short-course" ${state.courseType === 'short-course' ? 'selected' : ''}>Short courses</option></select></div></div><div class="result-summary" id="course-summary" role="status" aria-live="polite"></div><div class="course-grid" id="course-grid"></div><div class="insight-banner"><span class="insight-icon">${icon('info')}</span><div><h3>Make your next step an informed one.</h3><p>Check fees, intakes and entry requirements directly with COSMO. Short courses build skills; they are not entry qualifications.</p></div>${external('https://cosmo.edu.bn', 'Visit COSMO', 'button button-secondary')}</div>`;
  updateCourseResults();
}
function updateCourseResults() {
  const matches = courses.filter(c => (state.courseType === 'all' || c.type === state.courseType) && `${c.title} ${c.area} ${c.awardingBody}`.toLocaleLowerCase().includes(state.courseQuery.toLocaleLowerCase().trim()));
  document.getElementById('course-summary').textContent = `${matches.length} ${matches.length === 1 ? 'course' : 'courses'} to explore`;
  document.getElementById('course-grid').innerHTML = matches.length ? matches.map(courseCard).join('') : emptyState('No courses found.', 'Try a broader search or choose a different course type.');
  motion.refresh(document.getElementById('course-grid'));
}
function statusLabel(status) {
  if (status.type === 'ok') return status.soft ? 'Check experience / portfolio' : 'Qualification & years met';
  if (status.type === 'experience') return `${status.years} more ${status.years === 1 ? 'year' : 'years'} of experience`;
  if (status.type === 'study') return `Study to BDQF ${status.needBdqf}`;
  return 'Details coming soon';
}
function linkedCourses(id) {
  const fromCourses = courses.flatMap(course => (course.careerLinks || []).filter(l => l.role === id).map(link => ({ ...link, course: course.id, title: course.title, type: course.type, url: course.url, bdqfSource: course.bdqfSource })));
  const existing = new Set(fromCourses.map(c => c.course));
  return [...fromCourses, ...(roleCourses[id] || []).filter(c => !existing.has(c.course))];
}
function fitDescription(link) {
  if (link.fit === 'builds-skills') return 'Builds skills · not an entry qualification';
  if (link.fit === 'needs-experience-or-portfolio') return 'Also requires experience or a portfolio';
  if (link.fit === 'with-experience') return `Qualification route · ${link.years} years' experience also required`;
  return 'Meets a qualification route · check all entry conditions';
}
function courseLink(link) { return `<a class="course-link" href="${safeUrl(link.url)}" target="_blank" rel="noopener noreferrer"><span class="course-link-icon">${icon(link.type === 'short-course' ? 'sparkles' : 'graduation')}</span><span><strong>${esc(link.title)}</strong><small>${esc(fitDescription(link))}</small>${link.why ? `<small>${esc(link.why)}</small>` : ''}${link.bdqfSource === 'estimated' ? '<small>Estimated BDQF — confirm with COSMO</small>' : ''}</span>${icon('arrow-up-right')}</a>`; }
function renderRoadmap() {
  content.innerHTML = sectionHeading('YOUR AMBITION, WITH A PLAN', 'Make your next move clearer.', 'Start where you are. See the experience and learning that could take you further.', '<button class="button button-secondary" data-share>'+icon('share')+' Share roadmap</button>')
    + `<div class="profile-panel"><div><label for="goal-select">I want to become</label><select id="goal-select">${roles.map(r => `<option value="${esc(r.id)}" ${state.goal === r.id ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></div><div><label for="qualification-select">My current qualification</label><select id="qualification-select">${Object.entries(qualifications).map(([k, v]) => `<option value="${k}" ${state.from === k ? 'selected' : ''}>${esc(v.label)} · BDQF ${v.bdqf}</option>`).join('')}</select></div><div><label for="experience-input">Relevant experience (years)</label><input id="experience-input" type="number" min="0" max="50" step="1" value="${state.years}"></div></div><div id="roadmap-body" aria-live="polite"></div>`;
  updateRoadmap();
}
function updateRoadmap() {
  const goal = roles.find(r => r.id === state.goal);
  const roadmap = buildRoadmap(roles, state.goal, qualifications[state.from].bdqf, state.years, state.route);
  const body = document.getElementById('roadmap-body');
  if (!roadmap) { body.innerHTML = emptyState('No pathway available yet.', 'Choose another goal to see a documented progression route.'); motion.refresh(body); return; }
  if (goal.unavailable) { body.innerHTML = emptyState('This career is still taking shape.', 'The source lists this role, but has not published its entry requirements or skills. Explore the official profile for updates.', external(goal.url, 'View official role', 'button button-primary')); motion.refresh(body); return; }
  const links = linkedCourses(roadmap.ids[0]);
  body.innerHTML = `<div class="roadmap-summary"><div><span>YOUR GOAL</span><strong>${esc(goal.title)}</strong></div><div><span>CAREER STEPS</span><strong>${roadmap.header.steps} <small>roles on this route</small></strong></div><div><span>GOAL EXPERIENCE REQUIREMENT</span><strong>${roadmap.header.years === null ? 'Not specified' : `${roadmap.header.years} years`} <small>cumulative, not per step</small></strong></div></div><div class="roadmap-layout"><div><div class="roadmap-heading"><h3>Your possible pathway</h3>${roadmap.hasAlt ? `<div class="route-options"><button class="button ${!state.route ? 'button-primary' : 'button-secondary'}" data-route="0" aria-pressed="${!state.route}">Route A</button><button class="button ${state.route ? 'button-primary' : 'button-secondary'}" data-route="1" aria-pressed="${!!state.route}">Route B</button></div>` : '<span>One step at a time</span>'}</div><div class="roadmap-steps">${roadmap.study ? `<article class="roadmap-step"><div class="step-number">${icon('graduation')}</div><div class="step-content"><span class="status-badge status-study">Your learning step</span><h3>Build your qualification to BDQF ${roadmap.study.needBdqf}</h3><p>The first role's lowest published entry route starts at this level. Check subject, certification and experience requirements too.</p><button class="text-button" data-navigate="courses">Explore courses ${icon('arrow-right')}</button></div></article>` : ''}${roadmap.steps.map(({ role, status }, index) => `<article class="roadmap-step"><div class="step-number ${status.type === 'ok' ? 'step-complete' : ''}">${status.type === 'ok' ? icon('check') : String(index + 1).padStart(2, '0')}</div><div class="step-content"><div class="step-top"><span class="sector-name">${esc(stageNames[role.stage])}${index === roadmap.steps.length - 1 ? ' · YOUR GOAL' : ''}</span><span class="status-badge status-${status.type}">${esc(statusLabel(status))}</span></div><h3><button class="card-title-button" data-detail="${esc(role.id)}">${esc(role.title)} ${icon('arrow-up-right')}</button></h3><p>${esc(role.summary)}</p>${status.route ? `<p class="route-note">${esc(status.route.note)}</p>` : ''}<div class="step-skills">${role.skills.slice(0, 3).map(([skill]) => `<span class="tag">${esc(skill)}</span>`).join('')}</div></div></article>`).join('')}</div></div><aside class="roadmap-aside"><span class="sector-icon">${icon('graduation')}</span><h3>Learning that moves you forward.</h3><p>Courses linked to ${esc(roles.find(r => r.id === roadmap.ids[0])?.title)}.</p>${links.length ? links.map(courseLink).join('') : '<p>No course links have been published for this role.</p>'}<p class="source-note">Qualification and experience indicators are a guide. Relevant subjects, certifications, portfolios and all conditions in the official entry route still apply. Experience is cumulative across your career.</p></aside></div>`;
  motion.refresh(body);
}
function openRole(id) {
  const role = roles.find(r => r.id === id); if (!role) return;
  const sector = sectorById(role.sector), links = linkedCourses(role.id);
  document.getElementById('detail-content').innerHTML = `<div class="detail-header" style="${sectorStyle(role.sector)}"><span class="sector-icon">${icon(sectorIcons[role.sector])}</span><div class="detail-kicker">${esc(sector.name)} <span> / </span> ${esc(stageNames[role.stage])}</div><h2 id="detail-title">${esc(role.title)}</h2><p>${esc(role.summary)}</p>${role.aka?.length ? `<p class="also-known">Also known as ${esc(role.aka.join(', '))}</p>` : ''}</div><div class="dialog-actions"><button class="button button-primary" data-map="${esc(role.id)}">Map this career ${icon('route')}</button><button class="button button-secondary" data-save="${esc(role.id)}">${icon('bookmark')}${state.saved.has(role.id) ? 'Saved to your careers' : 'Save career'}</button></div>${role.unavailable ? '<section class="detail-section"><h3>Details coming soon</h3><p>The official source has not published requirements, skills or certifications for this role yet.</p></section>' : `<section class="detail-section"><h3>Ways into this role</h3><p class="route-note">Alternative entry routes — check every condition in the route that applies to you.</p>${role.routes.map(route => `<div class="entry-route"><div><span class="tag">BDQF ${route.bdqf}</span><span>${route.years === null ? 'Experience / portfolio required' : route.years === 0 ? 'No minimum years stated' : `${route.years} years' experience`}</span></div><p>${esc(route.note)}</p></div>`).join('')}</section><section class="detail-section"><h3>Skills to build</h3><div class="skill-list">${role.skills.map(([skill, level]) => `<div><span>${esc(skill)}</span><span class="tag">Level ${esc(level)}</span></div>`).join('')}</div>${role.soft ? `<p class="route-note">Soft skills: ${esc(role.soft)}</p>` : ''}</section><section class="detail-section"><h3>Relevant certifications</h3><div class="cert-list">${role.certs.map(cert => `<span class="tag">${esc(cert)}</span>`).join('') || '<p>None published in the source.</p>'}</div></section>`}<section class="detail-section"><h3>Learning connected to this career</h3>${links.length ? links.map(courseLink).join('') : '<p>No linked courses are included for this role in the available data.</p>'}</section><div class="detail-section source-note">${external(role.url, 'View full BIICF role requirements', 'text-button')}<p>This unofficial student guide is based on the supplied BIICF-derived data. Confirm current requirements with the official framework.</p></div>`;
  dialog.showModal();
  motion.refresh(dialog);
}
function openAbout() {
  document.getElementById('detail-content').innerHTML = `<div class="about-content"><span class="sector-icon">${icon('compass')}</span><div class="detail-kicker">A LITTLE CONTEXT</div><h2 id="detail-title">A clearer starting point.</h2><p>PathFinder helps you explore Brunei's ICT careers and connect your current qualification and experience to a possible pathway.</p><section class="detail-section"><h3>Where the information comes from</h3><p>Career and course information comes from the ${external('https://ccctmacademy.edu.bn/showcase_2026/openapi.json', 'supplied PathFinder OpenAPI specification', 'inline-link')}, which cites the Brunei ICT Industry Competency Framework and COSMO course information.</p><p>${metadata.mode === 'spec-examples' ? `The full dataset endpoints returned 404 errors when this page was built. This version shows ${roles.length} documented role examples and ${courses.length} full course examples extracted from the specification. Sectors without role examples remain visible so you can see the framework's scope.` : 'This page uses a locally bundled snapshot of the public datasets.'}</p></section><section class="detail-section"><h3>Use it as a guide</h3><p>Roadmaps follow the source's progression links. Experience is cumulative, and meeting the level and years shown does not automatically meet subject, certification or portfolio requirements. Short courses build skills and do not replace entry qualifications. Estimated BDQF levels must be confirmed with COSMO.</p><p>This is an unofficial student guide and is not affiliated with AITI, MISC or BIICF. Check official sources for the latest requirements, fees and intakes.</p></section><section class="detail-section"><h3>Your shortlist stays with you</h3><p>Saved careers and your qualification choices are stored in this browser only. No account is needed.</p></section><div class="dialog-actions">${external('https://www.biicf.bn', 'Official BIICF framework', 'button button-primary')}${external('https://cosmo.edu.bn', 'COSMO courses', 'button button-secondary')}</div></div>`;
  dialog.showModal();
  motion.refresh(dialog);
}
const mobileLayout = matchMedia('(max-width: 760px)');
function syncMenuAccessibility() { document.getElementById('sidebar').inert = mobileLayout.matches && !document.body.classList.contains('menu-open'); }
function closeMenu() { document.body.classList.remove('menu-open'); document.getElementById('mobile-menu').setAttribute('aria-expanded', 'false'); document.getElementById('mobile-overlay').hidden = true; syncMenuAccessibility(); }
document.addEventListener('click', async event => {
  const viewLink = event.target.closest('[data-view], [data-navigate]');
  if (viewLink) { event.preventDefault(); navigate(viewLink.dataset.view || viewLink.dataset.navigate); return; }
  const detail = event.target.closest('[data-detail]'); if (detail) { openRole(detail.dataset.detail); return; }
  const map = event.target.closest('[data-map]'); if (map) { dialog.close(); navigate('roadmap', map.dataset.map); return; }
  const save = event.target.closest('[data-save]');
  if (save) {
    const id = save.dataset.save; const removing = state.saved.has(id); if (removing) state.saved.delete(id); else state.saved.add(id);
    const stored = persist('pathfinder-saved', [...state.saved]);
    document.getElementById('saved-count').textContent = state.saved.size;
    if (['explore', 'saved'].includes(state.view)) updateCareerResults();
    if (dialog.open) { save.innerHTML = `${icon('bookmark')}${state.saved.has(id) ? 'Saved to your careers' : 'Save career'}`; }
    motion.saved(id);
    notify(`${removing ? 'Career removed from your shortlist.' : 'Career saved to your shortlist.'}${stored ? '' : ' Browser storage is unavailable; kept for this visit.'}`); return;
  }
  const sector = event.target.closest('[data-sector]'); if (sector) { state.sector = sector.dataset.sector; state.limit = 9; document.querySelectorAll('[data-sector]').forEach(el => { const active = el.dataset.sector === state.sector; el.classList.toggle('active', active); el.setAttribute('aria-pressed', active); }); updateLocation(); updateCareerResults(); return; }
  if (event.target.closest('[data-load-more]')) { state.limit += 9; updateCareerResults(); return; }
  if (event.target.closest('[data-reset-filters]')) { state.query = ''; state.sector = 'all'; state.stage = 'all'; if (state.view === 'saved') navigate('explore'); else { updateLocation(); renderExplorer(); } return; }
  const route = event.target.closest('[data-route]'); if (route) { state.route = Number(route.dataset.route); updateLocation(); updateRoadmap(); return; }
  if (event.target.closest('[data-share]')) {
    try { await navigator.clipboard.writeText(location.href); notify('Roadmap link copied.'); }
    catch { document.getElementById('detail-content').innerHTML = `<div class="about-content"><h2 id="detail-title">Share your roadmap</h2><p>Copy this link to return to these qualification and experience choices.</p><input class="share-url" aria-label="Roadmap link" value="${esc(location.href)}" readonly></div>`; dialog.showModal(); const input = dialog.querySelector('input'); input.focus(); input.select(); } return;
  }
});
document.addEventListener('input', event => {
  if (event.target.id === 'career-search') { state.query = event.target.value; state.limit = 9; updateCareerResults(); }
  if (event.target.id === 'course-search') { state.courseQuery = event.target.value; updateCourseResults(); }
});
document.addEventListener('change', event => {
  const { id, value } = event.target;
  if (id === 'stage-filter') { state.stage = value; state.limit = 9; updateLocation(); updateCareerResults(); }
  if (id === 'course-type') { state.courseType = value; updateCourseResults(); }
  if (['goal-select', 'qualification-select', 'experience-input'].includes(id)) {
    if (id === 'goal-select') { state.goal = value; state.route = 0; }
    if (id === 'qualification-select') state.from = value;
    if (id === 'experience-input') { state.years = Math.max(0, Math.min(50, Number.parseInt(value, 10) || 0)); event.target.value = state.years; }
    saveProfile(); updateLocation(); updateRoadmap();
  }
});
document.getElementById('hero-button').addEventListener('click', () => navigate('roadmap'));
document.getElementById('direction-button').addEventListener('click', () => { navigate('explore'); document.querySelector('.sector-tabs')?.scrollIntoView({ behavior: motion.enabled ? 'smooth' : 'instant', block: 'center' }); });
document.querySelectorAll('[data-journey]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.journey === 'roles') { navigate('explore'); document.querySelector('.sector-tabs')?.scrollIntoView({ behavior: motion.enabled ? 'smooth' : 'instant', block: 'center' }); }
  else navigate('roadmap', button.dataset.journey === 'goal' ? 'ciso' : undefined);
}));
document.getElementById('close-detail').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
document.getElementById('about-link').addEventListener('click', event => { event.preventDefault(); openAbout(); });
document.getElementById('footer-about').addEventListener('click', openAbout);
document.getElementById('mobile-menu').addEventListener('click', () => { const open = !document.body.classList.contains('menu-open'); document.body.classList.toggle('menu-open', open); document.getElementById('mobile-menu').setAttribute('aria-expanded', open); document.getElementById('mobile-overlay').hidden = !open; syncMenuAccessibility(); });
mobileLayout.addEventListener('change', () => { if (!mobileLayout.matches) closeMenu(); else syncMenuAccessibility(); });
syncMenuAccessibility();
document.getElementById('mobile-overlay').addEventListener('click', closeMenu);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); if (event.key === '/' && !dialog.open && !/input|select|textarea/i.test(event.target.tagName)) { const search = document.getElementById('career-search') || document.getElementById('course-search'); if (search) { event.preventDefault(); search.focus(); } } });
window.addEventListener('popstate', () => { readLocation(); render(); });
fillIcons();
async function loadData() {
  const status = document.getElementById('data-status');
  try {
    const responses = await Promise.all(['roles', 'sectors', 'courses', 'role-courses', 'metadata'].map(async name => { const response = await fetch(`./data/${name}.json`); if (!response.ok) throw new Error(`Could not load ${name}`); return response.json(); }));
    [roles, sectors, courses, roleCourses, metadata] = responses;
    if (!Array.isArray(roles) || !roles.length || !Array.isArray(sectors) || !Array.isArray(courses)) throw new Error('Invalid career data');
    const stageOrder = { entry: 0, mid: 1, senior: 2, top: 3 };
    roles.sort((a, b) => (stageOrder[a.stage] ?? 4) - (stageOrder[b.stage] ?? 4) || Number(!!a.unavailable) - Number(!!b.unavailable));
    state.saved = new Set([...state.saved].filter(id => roles.some(r => r.id === id)));
    if (metadata.mode === 'spec-examples') { status.className = 'data-status warning'; status.innerHTML = `${icon('info')}<span><strong>A preview of your possibilities.</strong> Showing ${roles.length} role examples and ${courses.length} course examples from the API specification. Full data links are currently unavailable.</span><button class="text-button" id="data-about">Details ${icon('arrow-up-right')}</button>`; document.getElementById('data-about').addEventListener('click', openAbout); }
    else status.hidden = true;
    readLocation(); render();
  } catch (error) { status.className = 'data-status warning'; status.innerHTML = `${icon('info')}<span>Career data couldn't be loaded. Please try again.</span><button class="button button-secondary" id="retry-data">Retry ${icon('refresh')}</button>`; document.getElementById('retry-data').addEventListener('click', loadData); }
}
loadData();
