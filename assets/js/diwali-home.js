(function () {
  'use strict';
  function updateCampaign() {
    const campaign = window.CyclifyCampaign;
    if (!campaign) return;
    // Keep the Diwali storefront design as Cyclify's current visual layout even
    // after the promotion ends. Campaign pricing still expires independently
    // through CyclifyCampaign.isActive().
    document.documentElement.classList.add('cyclify-diwali');
    document.documentElement.dataset.campaignActive = String(campaign.isActive());
    document.querySelectorAll('[data-popular-product]').forEach(card => {
      const id = Number(card.dataset.popularProduct);
      // The resolver uses the saved regular price even after a static sale build.
      const result = campaign.resolveProduct({ id, price: 0 });
      if (!result || !Number(result.price)) return;
      const price = card.querySelector('.price');
      const mrp = Number((card.querySelector('.mrp')?.textContent || '').replace(/[^0-9.]/g, ''));
      if (price) price.textContent = '₹' + campaign.formatPrice(result.price);
      const saving = card.querySelector('.cyclify-card-saving');
      const discount = card.querySelector('.cyclify-card-discount');
      if (saving && mrp > result.price) saving.textContent = 'Save ₹' + campaign.formatPrice(Math.round((mrp - result.price) * 100) / 100);
      if (discount && mrp > result.price) discount.textContent = Math.round((mrp - result.price) / mrp * 100) + '% OFF';
    });
  }
  document.addEventListener('DOMContentLoaded', updateCampaign);
  if (document.readyState !== 'loading') updateCampaign();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateCampaign(); });
  window.setInterval(updateCampaign, 60000);
})();

// Quiet, layered snowfall for the Winter Festival hero. The flakes are drawn
// as soft photographic particles rather than decorative icons, with wide
// spacing and three depth planes so the artwork remains the focal point.
(function () {
  'use strict';
  const hero = document.querySelector('.diwali-home-hero');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'winter-snow-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  hero.prepend(canvas);
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;
  let width = 0, height = 0, ratio = 1, frame = 0, previous = 0, visible = true;
  let flakes = [];
  const random = (min, max) => min + Math.random() * (max - min);
  function makeFlake(initial) {
    const depth = Math.random();
    return {
      x: random(0, width),
      y: initial ? random(0, height) : random(-40, -8),
      radius: .7 + depth * 2.6,
      speed: 8 + depth * 25,
      drift: random(-7, 7),
      phase: random(0, Math.PI * 2),
      alpha: .22 + depth * .58,
      blur: depth > .78 ? 1.8 : depth > .42 ? .7 : 0
    };
  }
  function resize() {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const density = width < 600 ? 20 : Math.min(54, Math.round(width / 28));
    flakes = Array.from({ length: density }, () => makeFlake(true));
  }
  function draw(time) {
    frame = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(.04, previous ? (time - previous) / 1000 : .016);
    previous = time;
    context.clearRect(0, 0, width, height);
    flakes.forEach(flake => {
      flake.phase += dt * .45;
      flake.y += flake.speed * dt;
      flake.x += (flake.drift + Math.sin(flake.phase) * 4) * dt;
      if (flake.y > height + 12 || flake.x < -20 || flake.x > width + 20) Object.assign(flake, makeFlake(false));
      context.save();
      context.globalAlpha = flake.alpha;
      context.filter = flake.blur ? 'blur(' + flake.blur + 'px)' : 'none';
      const glow = context.createRadialGradient(flake.x, flake.y, 0, flake.x, flake.y, flake.radius * 2.4);
      glow.addColorStop(0, 'rgba(255,255,255,1)');
      glow.addColorStop(.32, 'rgba(238,249,255,.9)');
      glow.addColorStop(1, 'rgba(205,234,249,0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(flake.x, flake.y, flake.radius * 2.4, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
    frame = requestAnimationFrame(draw);
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
    previous = 0;
    if (visible && !frame && !document.hidden) frame = requestAnimationFrame(draw);
    if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
  }, { threshold: 0 });
  observer.observe(hero);
  new ResizeObserver(resize).observe(hero);
  document.addEventListener('visibilitychange', () => {
    previous = 0;
    if (!document.hidden && visible && !frame) frame = requestAnimationFrame(draw);
  });
  resize();
  frame = requestAnimationFrame(draw);
})();

// Scroll-led, compositor-only reels. Ease both the entry and the final landing;
// there is no autoplay, scroll hijacking, or animation work while the reels rest.
(function () {
  'use strict';
  const photos = Array.from(document.querySelectorAll('[data-category-reel]'));
  if (!photos.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  const axes = [[0, 1], [1, 0], [0, -1], [-1, 0], [0, 1], [1, 0]];
  const reels = photos.map((photo, i) => ({
    photo,
    card: photo.parentElement,
    slides: Array.from(photo.querySelectorAll('.diwali-category-slide:not(.is-clone)')),
    images: Array.from(photo.querySelectorAll('.diwali-category-slide:not(.is-clone) img')),
    caption: photo.parentElement.querySelector('[data-reel-name]'),
    counter: photo.parentElement.querySelector('[data-reel-count]'),
    axis: axes[i % axes.length],
    cursor: 0, position: 0, target: 0, labelIndex: -1,
    loaded: false, ready: false
  }));
  let previousY = window.scrollY, frame = 0, idleTimer = 0, lastTime = 0, scrolling = false;
  const wrap = (n, count) => ((n % count) + count) % count;

  function paint(reel, stopped = false) {
    const count = reel.slides.length;
    const phase = wrap(reel.position, count);
    reel.slides.forEach((slide, i) => {
      // Reposition only fully clipped slides: no first/last seam in either direction.
      const offset = wrap(i - phase + count / 2, count) - count / 2;
      const onstage = Math.abs(offset) < 1.01;
      slide.style.visibility = onstage ? 'visible' : 'hidden';
      slide.style.transform = 'translate3d(' + (offset * reel.axis[0] * 100).toFixed(3) + '%,' + (offset * reel.axis[1] * 100).toFixed(3) + '%,0)';
      slide.style.willChange = !stopped && onstage ? 'transform' : 'auto';
    });
    const index = Math.round(phase) % count;
    if (reel.labelIndex !== index) {
      const name = reel.slides[index].dataset.name;
      reel.caption.textContent = name;
      reel.counter.textContent = (index + 1) + ' / ' + count;
      reel.photo.setAttribute('aria-label', name);
      reel.photo.dataset.reelIndex = String(index);
      reel.labelIndex = index;
    }
    reel.photo.dataset.reelState = stopped ? 'idle' : 'moving';
  }
  function preload(reel) {
    if (reel.loaded) return;
    reel.loaded = true;
    Promise.all(reel.images.map(img => {
      img.loading = 'eager';
      if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
      // Decode before the first transition, not during its first animation frame.
      if (img.decode) return img.decode().catch(() => {});
      return new Promise(resolve => {
        if (img.complete) resolve();
        else { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); }
      });
    })).then(() => { reel.ready = reel.images.every(img => img.complete && img.naturalWidth > 0); });
  }
  function schedule() {
    if (!frame && !document.hidden && !reduced.matches) frame = requestAnimationFrame(render);
  }
  function render(time) {
    frame = 0;
    const dt = Math.min(40, lastTime ? time - lastTime : 16.67);
    lastTime = time;
    // Time-based easing stays consistent on both 60 Hz and 120 Hz displays.
    const blend = 1 - Math.exp(-dt / (scrolling ? 85 : 65));
    let unfinished = false;
    visible.forEach(reel => {
      const distance = reel.target - reel.position;
      if (Math.abs(distance) > .0008) {
        reel.position += distance * blend;
        unfinished = true;
        paint(reel);
      } else {
        reel.position = reel.target;
        paint(reel, true);
      }
    });
    if (unfinished) schedule();
    else lastTime = 0;
  }
  function captureScroll() {
    const y = window.scrollY, delta = y - previousY;
    previousY = y;
    if (!delta || reduced.matches || document.hidden) return false;
    const travel = window.innerWidth <= 900 ? 200 : 260;
    visible.forEach(reel => {
      if (!reel.ready) return;
      // Bound very large wheel/page jumps so a backlog cannot keep spinning later.
      reel.cursor += Math.max(-.9, Math.min(.9, delta / travel));
      reel.target = reel.cursor;
      reel.photo.dataset.reelDirection = delta > 0 ? 'forward' : 'reverse';
    });
    return true;
  }
  function settle() {
    clearTimeout(idleTimer);
    captureScroll();
    scrolling = false;
    visible.forEach(reel => { reel.cursor = reel.target = Math.round(reel.cursor); });
    schedule();
  }
  function park(reel, reset = false) {
    const index = reset ? 0 : wrap(Math.round(reel.position), reel.slides.length);
    reel.cursor = reel.target = reel.position = index;
    paint(reel, true);
    reel.card.dataset.festiveActive = 'false';
  }
  if ('IntersectionObserver' in window) {
    const nearby = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const reel = reels.find(item => item.photo === entry.target);
        if (!reduced.matches) preload(reel);
      });
    }, { rootMargin: '650px 0px' });
    const onscreen = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const reel = reels.find(item => item.photo === entry.target);
        if (entry.isIntersecting && entry.intersectionRatio >= .1) {
          visible.add(reel);
          if (!reduced.matches) preload(reel);
          reel.card.dataset.festiveActive = String(!document.hidden && !reduced.matches);
        }
        else {
          visible.delete(reel);
          park(reel);
        }
      });
    }, { threshold: [0, .1] });
    photos.forEach(photo => { nearby.observe(photo); onscreen.observe(photo); });
  } else {
    reels.forEach(reel => { preload(reel); visible.add(reel); reel.card.dataset.festiveActive = String(!reduced.matches); });
  }
  window.addEventListener('scroll', () => {
    if (!captureScroll()) return;
    scrolling = true;
    schedule();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(settle, 120);
  }, { passive: true });
  window.addEventListener('scrollend', settle, { passive: true });
  function resetMotion() {
    clearTimeout(idleTimer);
    if (frame) cancelAnimationFrame(frame);
    frame = 0; lastTime = 0; scrolling = false; previousY = window.scrollY;
    reels.forEach(reel => {
      park(reel, reduced.matches);
      reel.card.dataset.festiveActive = String(visible.has(reel) && !document.hidden && !reduced.matches);
      if (!reduced.matches && !document.hidden && visible.has(reel)) preload(reel);
    });
  }
  document.addEventListener('visibilitychange', resetMotion);
  reduced.addEventListener?.('change', resetMotion);
  reels.forEach(reel => {
    reel.photo.dataset.reelAxis = reel.axis.join(',');
    paint(reel, true);
  });
})();
