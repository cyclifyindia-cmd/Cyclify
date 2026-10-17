(function () {
  'use strict';
  function updateCampaign() {
    const campaign = window.CyclifyCampaign;
    if (!campaign) return;
    document.documentElement.classList.toggle('cyclify-diwali', campaign.isActive());
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
