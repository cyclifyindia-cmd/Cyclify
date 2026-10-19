(function () {
  'use strict';
  const root = document.getElementById('cyclify-ride-studio'), model = window.CyclifyRideModel;
  if (!root || !model || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const find = selector => root.querySelector(selector);
  const all = selector => Array.from(root.querySelectorAll(selector));
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ids = Object.keys(model.styles), photo = find('[data-rs-photo]'), stage = find('[data-rs-stage]');
  const status = find('[data-rs-photo-status]'), tourButton = find('[data-rs-tour]');
  let style = 'endurance', view = 0, metric = 'stack', tour = null, request = 0, loadingTimer = null, photoAnimation = null;
  function stopTour() {
    clearInterval(tour); tour = null;
    tourButton.setAttribute('aria-pressed','false');
    tourButton.textContent = 'Play styles';
  }
  function photoError() {
    stage.setAttribute('aria-busy','false');
    photo.hidden = true; status.hidden = false;
    status.textContent = 'Photo unavailable. Choose a view to try again.';
  }
  // Preload before changing the image. A sequence id prevents a slow previous
  // request from displaying the wrong bike after rapid tab clicks.
  function selectPhoto(index) {
    const image = model.styles[style].images[index];
    if (!image) return;
    view = index;
    const token = ++request, pending = new Image();
    clearTimeout(loadingTimer);
    if (photoAnimation) photoAnimation.cancel();
    photo.hidden = true; status.hidden = true;
    stage.setAttribute('aria-busy','true');
    all('[data-rs-view]').forEach(el => el.setAttribute('aria-pressed', Number(el.dataset.rsView) === index));
    function fail() {
      if (token !== request) return;
      clearTimeout(loadingTimer);
      request++; // Ignore a late load following timeout.
      photoError(); stopTour();
    }
    pending.onload = () => {
      if (token !== request) return;
      clearTimeout(loadingTimer);
      photo.setAttribute('srcset', image.small+' 640w, '+image.src+' 1536w');
      photo.setAttribute('src', image.src);
      photo.setAttribute('alt', image.alt);
      photo.hidden = false; status.hidden = true;
      stage.setAttribute('aria-busy','false');
      if (!motion.matches && typeof photo.animate === 'function') {
        photoAnimation = photo.animate([{opacity:0},{opacity:1}], {duration:220,easing:'ease-out'});
      }
    };
    pending.onerror = fail;
    loadingTimer = setTimeout(fail, 15000);
    pending.sizes = photo.getAttribute('sizes');
    pending.srcset = image.small+' 640w, '+image.src+' 1536w';
    pending.src = image.src;
  }
  function updateLesson() {
    const bike = model.styles[style], lesson = model.metrics[metric];
    find('[data-rs-lesson-value]').textContent = lesson.label+' · '+bike.values[metric];
    find('[data-rs-lesson-title]').textContent = lesson.title;
    find('[data-rs-lesson-text]').textContent = lesson.text;
    find('[data-rs-insight]').textContent = bike.insight;
    all('[data-rs-metric]').forEach(el => el.setAttribute('aria-pressed', el.dataset.rsMetric===metric));
    all('[data-rs-value]').forEach(el => { el.textContent = bike.values[el.dataset.rsValue]; });
  }
  function selectStyle(id) {
    if (!model.styles[id]) return;
    style = id;
    const bike = model.styles[id];
    root.dataset.style = id;
    all('[data-rs-style]').forEach(el => el.setAttribute('aria-pressed', el.dataset.rsStyle===id));
    find('[data-rs-name]').textContent = bike.name;
    find('[data-rs-build]').textContent = bike.build;
    find('[data-rs-heading]').textContent = bike.title;
    find('[data-rs-description]').textContent = bike.description;
    find('[data-rs-terrain]').textContent = bike.terrain;
    find('[data-rs-style-name]').textContent = bike.year+' · '+bike.label.toUpperCase();
    find('[data-rs-features]').replaceChildren(...bike.features.map(text => {
      const li=document.createElement('li'); li.textContent=text; return li;
    }));
    const shop=find('[data-rs-shop]');
    shop.href=bike.shop; shop.replaceChildren(document.createTextNode(bike.shopLabel));
    const arrow=document.createElement('span'); arrow.textContent='↗'; arrow.setAttribute('aria-hidden','true'); shop.append(arrow);
    find('[data-rs-summary]').textContent = 'Reference frame · Size '+bike.size+(id==='mtb'?' · Low setting':'');
    find('[data-rs-model-note]').textContent = bike.note;
    find('[data-rs-source]').href = bike.source;
    find('[data-rs-diagram]').setAttribute('src',bike.diagram);
    find('[data-rs-diagram]').setAttribute('alt','Specialized '+bike.name+' geometry reference diagram');
    updateLesson(); selectPhoto(0);
  }
  all('[data-rs-style]').forEach(el => el.addEventListener('click', () => { stopTour(); selectStyle(el.dataset.rsStyle); }));
  all('[data-rs-view]').forEach(el => el.addEventListener('click', () => { stopTour(); selectPhoto(Number(el.dataset.rsView)); }));
  all('[data-rs-metric]').forEach(el => el.addEventListener('click', () => { stopTour(); metric=el.dataset.rsMetric; updateLesson(); }));
  find('.rs-explain').addEventListener('toggle',stopTour);
  photo.addEventListener('error',photoError);
  if (photo.complete && photo.naturalWidth===0) photoError();
  tourButton.addEventListener('click', () => {
    if (tour) { stopTour(); return; }
    if (motion.matches || document.hidden) return;
    tourButton.setAttribute('aria-pressed','true'); tourButton.textContent='Pause styles';
    selectStyle(ids[(ids.indexOf(style)+1)%ids.length]);
    tour=setInterval(() => selectStyle(ids[(ids.indexOf(style)+1)%ids.length]),6500);
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) stopTour();
  },{threshold:.1}).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopTour(); });
  window.addEventListener('pagehide', () => { stopTour(); clearTimeout(loadingTimer); request++; });
  motion.addEventListener('change', () => { stopTour(); if(photoAnimation)photoAnimation.cancel(); });
  updateLesson();
})();
