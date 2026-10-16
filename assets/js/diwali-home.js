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

// Category reels follow the page, with no timer-driven autoplay or gesture interception.
(function () {
  'use strict';
  const photos = Array.from(document.querySelectorAll('[data-category-reel]'));
  if (!photos.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  const reels = photos.map(photo => ({
    photo,
    track: photo.querySelector('.diwali-category-track'),
    slides: Array.from(photo.querySelectorAll('.diwali-category-slide:not(.is-clone)')),
    images: Array.from(photo.querySelectorAll('img')),
    caption: photo.parentElement.querySelector('[data-reel-name]'),
    counter: photo.parentElement.querySelector('[data-reel-count]'),
    progress: 0,
    loaded: false
  }));
  let previousY = window.scrollY, frame = 0, idleTimer = 0;

  function paint(reel, stopped = false) {
    const count = reel.slides.length;
    reel.progress = ((reel.progress % count) + count) % count;
    const index = Math.round(reel.progress) % count;
    const name = reel.slides[index].dataset.name;
    reel.track.style.transform = 'translate3d(0,' + (-reel.progress * 100) + '%,0)';
    reel.caption.textContent = name;
    reel.counter.textContent = (index + 1) + ' / ' + count;
    reel.photo.setAttribute('aria-label', name);
    reel.photo.dataset.reelIndex = String(index);
    reel.photo.dataset.reelState = stopped ? 'idle' : 'moving';
  }
  function preload(reel) {
    if (reel.loaded) return;
    reel.loaded = true;
    reel.images.forEach(img => {
      img.loading = 'eager';
      if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
    });
  }
  function settle() {
    clearTimeout(idleTimer);
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    reels.forEach(reel => {
      reel.progress = reduced.matches ? 0 : Math.round(reel.progress);
      paint(reel, true);
    });
    previousY = window.scrollY;
  }
  function render() {
    frame = 0;
    const y = window.scrollY, delta = y - previousY;
    previousY = y;
    if (!delta || reduced.matches || document.hidden) return;
    const travel = window.innerWidth <= 900 ? 200 : 240;
    visible.forEach(reel => {
      // Keep the hero in place until every frame is available to avoid blank slots.
      if (!reel.images.every(img => img.complete && img.naturalWidth > 0)) return;
      reel.progress += delta / travel;
      reel.photo.dataset.reelDirection = delta > 0 ? 'forward' : 'reverse';
      paint(reel);
    });
  }
  if ('IntersectionObserver' in window) {
    const nearby = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const reel = reels.find(item => item.photo === entry.target);
        if (!reduced.matches) preload(reel);
      });
    }, { rootMargin: '500px 0px' });
    const onscreen = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const reel = reels.find(item => item.photo === entry.target);
        if (entry.isIntersecting && entry.intersectionRatio >= .1) visible.add(reel);
        else {
          visible.delete(reel);
          reel.progress = Math.round(reel.progress);
          paint(reel, true);
        }
      });
    }, { threshold: [0, .1] });
    photos.forEach(photo => { nearby.observe(photo); onscreen.observe(photo); });
  } else {
    reels.forEach(reel => { preload(reel); visible.add(reel); });
  }
  window.addEventListener('scroll', () => {
    if (reduced.matches || document.hidden) { previousY = window.scrollY; return; }
    if (!frame) frame = requestAnimationFrame(render);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(settle, 100);
  }, { passive: true });
  window.addEventListener('scrollend', settle, { passive: true });
  document.addEventListener('visibilitychange', settle);
  reduced.addEventListener?.('change', () => {
    reels.forEach(reel => { reel.progress = 0; if (!reduced.matches) preload(reel); });
    settle();
  });
  settle();
})();
