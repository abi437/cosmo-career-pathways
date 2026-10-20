/** The career chooser is a URL-driven introduction to the existing pathway. */
export const careerFields = [
  { id: 'it', title: 'IT', label: 'Information Technology', description: 'Build, connect and protect the digital world.', icon: 'compass', portrait: 'assets/field-it-smiling', portraitAlt: 'Smiling IT professional holding a laptop' },
  { id: 'creative', title: 'Creative', label: 'Creative & Digital Media', description: 'Bring ideas to life through design, content and digital experiences.', icon: 'bookmark', portrait: 'assets/field-creative-smiling', portraitAlt: 'Smiling Creative professional with a drawing tablet' },
  { id: 'business', title: 'Business', label: 'Business & Leadership', description: 'Explore the people, decisions and ideas behind organisations.', icon: 'book', portrait: 'assets/field-business-smiling', portraitAlt: 'Smiling Business professional in a navy suit holding a portfolio' },
];

export function initializeCareerFlow({ roles, sectorDisplay, characterFrame, icon, esc, motion, onStart, onLeaveJourney }) {
  const flow = document.getElementById('career-flow');
  const content = document.getElementById('flow-content');
  const progress = document.getElementById('flow-progress');
  const experience = document.getElementById('career-experience');
  const changeCareer = document.getElementById('change-career');
  const steps = [ ['welcome', 'Start'], ['fields', 'Field'], ['careers', 'Career'], ['profile', 'Your future'], ['journey', 'Journey'] ];
  const stageNames = { entry: 'Entry', mid: 'Mid-career', senior: 'Senior', top: 'Leadership' };
  const stageOrder = { entry: 0, mid: 1, senior: 2, top: 3 };
  let current = { screen: 'welcome', field: '', career: '' };
  let wasJourney = false;
  let searchQuery = '';
  const allRoles = Array.isArray(roles) ? roles : [];
  const fieldForRole = role => role?.sector === 'digital-media' ? 'creative' : role && Object.hasOwn(sectorDisplay, role.sector) ? 'it' : '';
  const fieldById = id => careerFields.find(field => field.id === id);
  const roleById = id => allRoles.find(role => role.id === id);
  const rolesInField = field => allRoles.filter(role => fieldForRole(role) === field).sort((a, b) => (stageOrder[a.stage] ?? 4) - (stageOrder[b.stage] ?? 4) || a.title.localeCompare(b.title));
  const sprite = frame => { const level = Math.max(0, Math.min(5, Number(frame) || 0)); return `<span class="character-sprite" data-character-level="${level}" style="--character-frame:${level}"></span>`; };
  const button = (action, label, primary = false) => `<button type="button" class="button ${primary ? 'button-primary flow-primary' : 'button-secondary flow-secondary'}" data-flow-action="${action}">${label}</button>`;
  const fieldPortrait = field => `<picture class="flow-field-picture"><source srcset="${field.portrait}.webp" type="image/webp"><img class="flow-field-photo" src="${field.portrait}.png" alt="${esc(field.portraitAlt)}" width="1086" height="1448" decoding="async"></picture>`;

  function resolveLocation() {
    const params = new URLSearchParams(location.search);
    const requested = params.get('screen');
    const field = fieldById(params.get('field'))?.id || '';
    const career = roleById(params.get('career'));
    const goal = roleById(params.get('goal'));
    if (!requested) return goal ? { screen: 'journey', field: fieldForRole(goal), career: goal.id } : { screen: 'welcome', field: '', career: '' };
    if (!steps.some(([id]) => id === requested)) return { screen: 'welcome', field: '', career: '' };
    if (requested === 'welcome' || requested === 'fields') return { screen: requested, field, career: career && fieldForRole(career) === field ? career.id : '' };
    if (requested === 'journey') {
      // A shared journey can use either the new career parameter or a legacy goal.
      const target = params.has('career') ? career : goal;
      if (target && (!field || fieldForRole(target) === field)) return { screen: 'journey', field: fieldForRole(target), career: target.id };
      const sector = params.get('sector');
      if (!params.has('career') && !params.has('goal') && Object.hasOwn(sectorDisplay, sector) && !allRoles.some(role => role.sector === sector)) return { screen: 'journey', field: sector === 'digital-media' ? 'creative' : 'it', career: '' };
      return { screen: field ? 'careers' : 'fields', field, career: '' };
    }
    if (!field) return { screen: 'fields', field: '', career: '' };
    if (requested === 'profile' && career && fieldForRole(career) === field) return { screen: 'profile', field, career: career.id };
    return { screen: 'careers', field, career: '' };
  }

  function writeLocation(next, push = true) {
    const url = new URL(location.href);
    url.searchParams.set('screen', next.screen);
    if (next.field) url.searchParams.set('field', next.field); else url.searchParams.delete('field');
    if (next.career) url.searchParams.set('career', next.career); else url.searchParams.delete('career');
    if (next.screen === 'journey') {
      const role = roleById(next.career);
      if (role) { url.searchParams.set('goal', role.id); url.searchParams.set('sector', role.sector); }
    }
    history[push ? 'pushState' : 'replaceState']({}, '', url);
  }

  function progressMarkup() {
    const index = steps.findIndex(([id]) => id === current.screen);
    return steps.map(([screen, title], position) => {
      const available = position < index && (screen !== 'careers' || current.field) && (screen !== 'profile' || current.career);
      return `<li><button type="button" data-flow-screen="${screen}" class="${position === index ? 'is-current' : position < index ? 'is-complete' : ''}" ${position === index ? 'aria-current="step"' : ''} ${available ? '' : 'disabled'}><span class="flow-progress-number" aria-hidden="true">${position < index ? icon('check') : String(position + 1).padStart(2, '0')}</span><span>${title}</span></button></li>`;
    }).join('');
  }

  function welcomeMarkup() {
    return `<div class="flow-screen flow-welcome"><div class="flow-welcome-copy"><span class="flow-kicker flow-eyebrow">YOUR FUTURE STARTS WITH A QUESTION</span><h1 class="flow-title" id="flow-title" tabindex="-1">What do you <br>want to be<span class="flow-title-dot">?</span></h1><p class="flow-intro">Find a career that feels like you. Meet your future self, then discover the steps to get there.</p><div class="flow-actions">${button('start', `Find my future ${icon('arrow-right')}`, true)}</div><p class="flow-caption">Choose a field. Find your role. Follow your pathway.</p></div><div class="flow-welcome-scene flow-character-stage" role="img" aria-label="An illustrated pathway from a student today to a future career character"><div class="flow-portrait flow-portrait-start">${sprite(0)}<span class="flow-scene-label"><small>THE START</small><strong>You, today</strong></span></div><div class="flow-scene-path" aria-hidden="true"><span>01</span><span>02</span><span>03</span></div><div class="flow-portrait flow-portrait-future">${sprite(5)}<span class="flow-scene-label"><small>THE POSSIBILITY</small><strong>Your future self</strong></span></div></div><div class="flow-welcome-foot"><span>${icon('compass')} A pathway, built around your goal</span><span>${icon('graduation')} Discover the learning and experience ahead</span></div></div>`;
  }

  function fieldsMarkup() {
    return `<div class="flow-screen"><div class="flow-heading"><span class="flow-kicker flow-eyebrow">02 / CHOOSE YOUR DIRECTION</span><h1 class="flow-title" id="flow-title" tabindex="-1">Which world interests you?</h1><p class="flow-intro">Start with a field. You can always come back and explore another direction.</p></div><div class="flow-field-grid">${careerFields.map((field, index) => {
      const count = rolesInField(field.id).length;
      return `<button type="button" class="flow-field-card" data-flow-field="${field.id}"><span class="flow-field-visual">${fieldPortrait(field)}<span class="flow-field-top" aria-hidden="true"><span class="flow-field-icon">${icon(field.icon)}</span><span class="flow-field-number">0${index + 1}</span></span></span><span class="flow-field-content"><span class="flow-field-copy"><strong>${field.title}</strong><span>${field.description}</span></span><span class="flow-field-footer"><span>${count ? `${count} published ${count === 1 ? 'career' : 'careers'}` : 'No profiles yet'}</span>${icon('arrow-up-right')}</span></span></button>`;
    }).join('')}</div><p class="flow-data-note">This preview uses the career examples available in the published source. More fields and careers will appear when their data is available.</p><div class="flow-actions">${button('back', `${icon('arrow-left')} Back`)}</div></div>`;
  }

  function careerCardsMarkup(items) {
    return items.map(role => `<button type="button" class="flow-career-card" data-flow-career="${esc(role.id)}"><span class="flow-career-portrait" aria-hidden="true">${sprite(characterFrame(role))}</span><div class="flow-career-info"><span class="flow-stage">${esc(stageNames[role.stage] || 'Career')}</span><h3>${esc(role.title)}</h3><p>${esc(role.summary)}</p><span class="flow-career-sector">${esc(sectorDisplay[role.sector]?.name || role.sector)}</span><span class="flow-career-link">Meet your future self ${icon('arrow-right')}</span></div></button>`).join('');
  }

  function careersMarkup() {
    const field = fieldById(current.field);
    const items = rolesInField(current.field);
    const heading = `<div class="flow-heading"><span class="flow-kicker flow-eyebrow">03 / EXPLORE ${esc(field.title.toUpperCase())}</span><h1 class="flow-title" id="flow-title" tabindex="-1">${items.length ? 'Who could you become?' : 'Your next chapter is coming.'}</h1><p class="flow-intro">${items.length ? `Explore ${items.length} published careers in ${esc(field.label)}. Choose one to see your future profile.` : `The source does not include ${esc(field.title.toLowerCase())} career profiles yet. You can explore the available IT pathways while more careers are added.`}</p></div>`;
    if (!items.length) return `<div class="flow-screen">${heading}<div class="flow-empty flow-empty-with-portrait" data-field="${field.id}"><div class="flow-empty-copy"><span class="flow-empty-icon" aria-hidden="true">${icon(field.icon)}</span><h2>No published careers here yet</h2><p>Your possibilities are bigger than this preview. Career profiles will appear here when the source provides them.</p><div class="flow-actions">${button('explore-it', `Explore IT careers ${icon('arrow-right')}`, true)}${button('fields', `${icon('arrow-left')} Back to fields`)}</div></div><div class="flow-empty-portrait">${fieldPortrait(field)}</div></div></div>`;
    return `<div class="flow-screen">${heading}<div class="flow-career-toolbar"><label class="flow-search-label" for="flow-search">Find a career<span class="flow-search-wrap">${icon('compass')}<input id="flow-search" type="search" placeholder="Search careers or skills" value="${esc(searchQuery)}" autocomplete="off"></span></label><span class="flow-caption" id="flow-result-count" aria-live="polite">${items.length} careers to explore</span></div><div class="flow-career-grid" id="flow-career-results">${careerCardsMarkup(items)}</div><p class="flow-data-note">Characters illustrate career progression. They do not represent a person’s appearance, qualification or guaranteed outcome.</p><div class="flow-actions">${button('fields', `${icon('arrow-left')} Back to fields`)}</div></div>`;
  }

  function profileMarkup() {
    const role = roleById(current.career);
    const skills = (role.skills || []).slice(0, 4);
    const routes = role.routes || [];
    return `<div class="flow-screen flow-profile"><div class="flow-profile-scene flow-profile-art"><span class="flow-kicker flow-eyebrow">YOUR FUTURE SELF</span><div class="flow-profile-character" role="img" aria-label="Illustrated ${esc(stageNames[role.stage] || 'career')} character">${sprite(characterFrame(role))}</div><span class="flow-caption">A direction to grow into. A journey to make your own.</span></div><div class="flow-profile-copy"><span class="flow-kicker flow-eyebrow">04 / MEET YOUR FUTURE</span><div class="flow-profile-badges"><span class="flow-stage">${esc(stageNames[role.stage] || 'Career')}</span><span>${esc(sectorDisplay[role.sector]?.name || role.sector)}</span></div><h1 class="flow-title" id="flow-title" tabindex="-1">${esc(role.title)}</h1><p class="flow-intro">${esc(role.summary)}</p>${skills.length ? `<div class="flow-profile-skills"><h2>What you could grow into</h2><div class="flow-skill-tags">${skills.map(([name]) => `<span>${esc(name)}</span>`).join('')}</div></div>` : ''}<div class="flow-profile-next"><span>${icon('compass')}</span><div><strong>${routes.length ? 'Your destination. Your starting point.' : 'A future to explore'}</strong><p>${routes.length ? 'Next, choose your qualification and experience. We’ll map the published stages and requirements leading toward this role.' : 'This role is listed in the source, but its detailed requirements are still pending. Your journey will show what is currently available.'}</p></div></div><div class="flow-actions">${button('ready', `I’m Ready ${icon('arrow-right')}`, true)}${button('back', `${icon('arrow-left')} Back to careers`)}</div><p class="flow-caption">Your selection starts an exploration. You can change it at any time.</p></div></div>`;
  }

  function render({ focus = false } = {}) {
    const journey = current.screen === 'journey';
    if (wasJourney && !journey) onLeaveJourney?.();
    wasJourney = journey;
    flow.hidden = journey;
    experience.hidden = !journey;
    const skip = document.getElementById('skip-link');
    if (skip) { skip.href = journey ? '#main-content' : '#career-flow'; skip.textContent = journey ? 'Skip to career pathway' : 'Skip to career selection'; }
    progress.innerHTML = progressMarkup();
    // Keep the progress navigation available on the chooser only.
    progress.closest('nav')?.toggleAttribute('hidden', journey);
    if (journey) { if (focus) document.getElementById('page-title')?.focus({ preventScroll: true }); return; }
    content.innerHTML = current.screen === 'welcome' ? welcomeMarkup() : current.screen === 'fields' ? fieldsMarkup() : current.screen === 'careers' ? careersMarkup() : profileMarkup();
    if (current.screen === 'careers' && searchQuery) filterCareers();
    motion?.refresh(content);
    if (focus) { document.getElementById('flow-title')?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  }

  function navigate(next, { focus = true } = {}) {
    if (next.field !== current.field || next.screen !== 'careers') searchQuery = '';
    current = next;
    writeLocation(current);
    render({ focus });
  }

  function filterCareers() {
    const query = searchQuery.trim().toLocaleLowerCase();
    const items = rolesInField(current.field).filter(role => [role.title, role.summary, ...(role.aka || []), ...(role.skills || []).map(([name]) => name)].join(' ').toLocaleLowerCase().includes(query));
    document.getElementById('flow-career-results').innerHTML = items.length ? careerCardsMarkup(items) : '<p class="flow-search-empty">No careers match that search. Try a different title or skill.</p>';
    document.getElementById('flow-result-count').textContent = `${items.length} ${items.length === 1 ? 'career' : 'careers'} ${query ? 'found' : 'to explore'}`;
  }

  function handleClick(event) {
    const control = event.target.closest('button');
    if (!control || control.disabled) return;
    if (control.dataset.flowField) return navigate({ screen: 'careers', field: control.dataset.flowField, career: '' });
    if (control.dataset.flowCareer) {
      const role = roleById(control.dataset.flowCareer);
      if (role && fieldForRole(role) === current.field) navigate({ screen: 'profile', field: current.field, career: role.id });
      return;
    }
    if (control.dataset.flowScreen) {
      const screen = control.dataset.flowScreen;
      if (steps.findIndex(([id]) => id === screen) < steps.findIndex(([id]) => id === current.screen)) navigate({ ...current, screen });
      return;
    }
    const action = control.dataset.flowAction;
    if (action === 'start' || action === 'fields') return navigate({ screen: 'fields', field: current.field, career: '' });
    if (action === 'explore-it') return navigate({ screen: 'careers', field: 'it', career: '' });
    if (action === 'back') return navigate(current.screen === 'profile' ? { screen: 'careers', field: current.field, career: '' } : { screen: 'welcome', field: '', career: '' });
    if (action === 'ready') {
      const role = roleById(current.career);
      if (current.screen !== 'profile' || !role || fieldForRole(role) !== current.field) return;
      current = { ...current, screen: 'journey' };
      writeLocation(current);
      onStart?.(role);
      render();
      document.getElementById('page-title')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  content.addEventListener('click', handleClick);
  progress.addEventListener('click', handleClick);
  content.addEventListener('input', event => { if (event.target.id === 'flow-search') { searchQuery = event.target.value; filterCareers(); } });
  changeCareer?.addEventListener('click', () => {
    const params = new URLSearchParams(location.search);
    const role = roleById(params.get('goal')) || roleById(params.get('career'));
    navigate(role ? { screen: 'profile', field: fieldForRole(role), career: role.id } : { screen: 'fields', field: '', career: '' });
  });

  return {
    syncFromLocation({ focus = false } = {}) {
      const params = new URLSearchParams(location.search);
      current = resolveLocation();
      if (params.has('screen')) writeLocation(current, false);
      if (current.screen === 'journey') {
        const role = roleById(current.career);
        if (role && (params.get('goal') !== role.id || params.get('sector') !== role.sector)) onStart?.(role);
      }
      render({ focus });
    },
    showWelcome() { navigate({ screen: 'welcome', field: '', career: '' }); },
  };
}
