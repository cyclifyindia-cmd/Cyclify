(function () {
  'use strict';
  const root = document.getElementById('cyclify-ride-studio');
  const model = window.CyclifyRideModel;
  if (!root || !model || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const find = selector => root.querySelector(selector);
  const all = selector => Array.from(root.querySelectorAll(selector));
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ids = Object.keys(model.styles);
  const nodes = Object.fromEntries(all('[data-rs-part]').map(el => [el.dataset.rsPart, el]));
  const tyres = all('.rs-tyre'), rims = all('.rs-rim'), treads = all('.rs-tread');
  let style = 'endurance', metric = 'stack', geometry = { ...model.styles.endurance.geometry };
  let frame = 0, tour = null;
  const explain = find('.rs-explain');
  const tourButton = find('[data-rs-tour]');
  function paintGeometry(g) {
    Object.entries(model.parts(g)).forEach(([id, attributes]) => {
      if (nodes[id]) Object.entries(attributes).forEach(([key, value]) => nodes[id].setAttribute(key, value));
    });
    tyres.forEach(el => { el.style.strokeWidth = g.tyre; });
    rims.forEach(el => { el.style.strokeWidth = g.rim; });
    treads.forEach(el => { el.style.opacity = g.tread; el.style.strokeWidth = g.tyre * .28; el.setAttribute('r', 115+g.tyre/2-1.5); });
    geometry = g;
  }
  function morph(target) {
    cancelAnimationFrame(frame);
    if (motion.matches) { paintGeometry({ ...target }); return; }
    const from = { ...geometry };
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now-start)/750);
      const eased = t < .5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
      const next = {};
      Object.keys(target).forEach(key => { next[key] = from[key]+(target[key]-from[key])*eased; });
      paintGeometry(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }
  function updateLesson() {
    const lesson = model.metrics[metric];
    find('[data-rs-lesson-title]').textContent = lesson.title;
    find('[data-rs-lesson-text]').textContent = lesson.text;
    find('[data-rs-lesson-tip]').textContent = lesson.tips[style];
    all('[data-rs-overlay]').forEach(el => el.setAttribute('visibility', explain.open && el.dataset.rsOverlay===metric ? 'visible' : 'hidden'));
    all('[data-rs-metric]').forEach(el => el.setAttribute('aria-pressed', el.dataset.rsMetric===metric));
  }
  function stopTour() {
    clearInterval(tour); tour = null;
    tourButton.setAttribute('aria-pressed','false');
    tourButton.innerHTML = '<span aria-hidden="true">▷</span> Play styles';
  }
  function selectStyle(id) {
    if (!model.styles[id]) return;
    style = id;
    const choice = model.styles[id];
    root.dataset.style = id;
    all('[data-rs-style]').forEach(el => el.setAttribute('aria-pressed', el.dataset.rsStyle===id));
    find('[data-rs-heading]').textContent = choice.title;
    find('[data-rs-description]').textContent = choice.description;
    find('[data-rs-terrain]').textContent = choice.terrain;
    find('[data-rs-style-name]').textContent = `0${ids.indexOf(id)+1} / ${choice.label.toUpperCase()}`;
    const features = find('[data-rs-features]');
    features.replaceChildren(...choice.features.map(text => { const li=document.createElement('li'); li.textContent=text; return li; }));
    const shop = find('[data-rs-shop]');
    shop.href = choice.shop;
    shop.replaceChildren(document.createTextNode(choice.shopLabel));
    const arrow = document.createElement('span'); arrow.textContent='↗'; arrow.setAttribute('aria-hidden','true'); shop.append(arrow);
    find('#rs-bike-title').textContent = choice.label+' bicycle concept';
    find('#rs-bike-desc').textContent = choice.description+' Features: '+choice.features.join(', ')+'.';
    updateLesson();
    morph(choice.geometry);
  }
  all('[data-rs-style]').forEach(el => el.addEventListener('click', () => { stopTour(); selectStyle(el.dataset.rsStyle); }));
  all('[data-rs-colour]').forEach(el => el.addEventListener('click', () => {
    const colour = model.colours[Number(el.dataset.rsColour)];
    if (!colour) return;
    all('[data-rs-colour]').forEach(button => button.setAttribute('aria-pressed', button===el));
    all('.rs-paint-main').forEach(stop => stop.setAttribute('stop-color',colour.value));
    find('.rs-paint-light').setAttribute('stop-color',colour.light);
    find('.rs-paint-dark').setAttribute('stop-color',colour.dark);
    find('[data-rs-colour-name]').textContent = colour.name;
  }));
  all('[data-rs-metric]').forEach(el => el.addEventListener('click', () => { stopTour(); metric = el.dataset.rsMetric; updateLesson(); }));
  explain.addEventListener('toggle', () => { stopTour(); updateLesson(); });
  tourButton.addEventListener('click', () => {
    if (tour) { stopTour(); return; }
    if (motion.matches || document.hidden) return;
    tourButton.setAttribute('aria-pressed','true');
    tourButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause styles';
    selectStyle(ids[(ids.indexOf(style)+1)%ids.length]);
    tour = setInterval(() => selectStyle(ids[(ids.indexOf(style)+1)%ids.length]), 3200);
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) stopTour();
  },{threshold:.1}).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopTour(); });
  window.addEventListener('pagehide', () => { stopTour(); cancelAnimationFrame(frame); });
  motion.addEventListener('change', () => { stopTour(); cancelAnimationFrame(frame); paintGeometry({...model.styles[style].geometry}); });
  paintGeometry(geometry);
  updateLesson();
})();
