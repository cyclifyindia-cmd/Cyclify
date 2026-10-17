'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cheerio = require('cheerio');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/diwali-home.js'), 'utf8');

async function harness({ reducedMotion = false, decode = true } = {}) {
  const listeners = {}, frames = new Map(), timers = new Map(), observers = [];
  let serial = 0, time = 0, mediaChange;
  const photos = Array.from({ length: 6 }, (_, n) => {
    const images = Array.from({ length: 4 }, () => ({ complete: decode, naturalWidth: decode ? 600 : 0, dataset: { src: 'photo.webp' }, decode: () => Promise.resolve() }));
    const slides = images.map((img, i) => ({ dataset: { name: `Product ${n}-${i}` }, style: {}, img }));
    const caption = {}, counter = {}, card = { dataset: {}, querySelector: s => s.includes('name') ? caption : counter };
    return { dataset: {}, parentElement: card, slides, images, setAttribute() {}, querySelectorAll: s => s.endsWith(' img') ? images : slides };
  });
  const window = { scrollY: 0, innerWidth: 1200, setInterval() {}, addEventListener: (k, fn) => { listeners[k] = fn; } };
  const document = { hidden: false, readyState: 'loading', querySelectorAll: () => photos, addEventListener: (k, fn) => { listeners[k] = fn; } };
  const media = { matches: reducedMotion, addEventListener: (_, fn) => { mediaChange = fn; } };
  const context = { window, document, matchMedia: () => media,
    requestAnimationFrame: fn => { const id = ++serial; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: fn => { const id = ++serial; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
    IntersectionObserver: class { constructor(fn, options) { this.fn = fn; this.options = options; observers.push(this); } observe() {} }
  };
  window.IntersectionObserver = context.IntersectionObserver;
  vm.runInNewContext(source, context);
  observers.forEach(o => o.fn(photos.map(target => ({ target, isIntersecting: true, intersectionRatio: 1 }))));
  await new Promise(resolve => setImmediate(resolve));
  const step = () => { time += 1000 / 60; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); };
  const flush = () => { for (let n = 0; frames.size && n < 150; n++) step(); assert.equal(frames.size, 0, 'Animation must stop requesting frames'); };
  return { photos, frames, media, step, flush,
    scroll: y => { window.scrollY = y; listeners.scroll(); },
    end: () => listeners.scrollend(),
    hide: () => { document.hidden = true; listeners.visibilitychange(); },
    reduce: () => { media.matches = true; mediaChange(); },
    leave: () => observers[1].fn(photos.map(target => ({ target, isIntersecting: false, intersectionRatio: 0 })))
  };
}
(async () => {
  const h = await harness();
  assert.deepEqual(h.photos.map(p => p.dataset.reelAxis), ['0,1','1,0','0,-1','-1,0','0,1','1,0']);
  assert(h.photos.every(p => p.dataset.reelIndex === '0'));
  h.scroll(190); h.step();
  const first = h.photos[0].slides[0].style.transform;
  assert(first.includes('-13.'), 'First frame eases into its journey instead of jumping the full distance');
  h.end();
  assert.equal(h.photos[0].slides[0].style.transform, first, 'scrollend must not snap the rendered position');
  h.flush();
  assert(h.photos.every(p => p.dataset.reelIndex === '1' && p.dataset.reelState === 'idle'));
  assert(h.photos.every(p => p.slides[1].style.transform === 'translate3d(0.000%,0.000%,0)'));
  h.scroll(210); h.step();
  assert(h.photos[0].slides[1].style.transform.includes('-'), 'Next downward swipe must not backtrack after settling');
  h.end(); h.flush();
  h.scroll(0); h.end(); h.flush();
  assert(h.photos.every(p => p.dataset.reelIndex === '0' && p.dataset.reelDirection === 'reverse'));
  h.scroll(-190); h.end(); h.flush();
  assert(h.photos.every(p => p.dataset.reelIndex === '3'), 'Reverse wrap to final photo');
  h.scroll(0); h.end(); h.flush();
  assert(h.photos.every(p => p.dataset.reelIndex === '0'), 'Forward wrap to first photo');
  h.scroll(50000); h.end(); h.flush();
  assert(h.photos.every(p => p.dataset.reelIndex === '1'), 'Huge jump has a bounded movement, not a long spinning backlog');
  h.leave(); h.scroll(50200); h.end(); h.flush();
  assert(h.photos.every(p => p.dataset.reelIndex === '1' && p.parentElement.dataset.festiveActive === 'false'));
  const reduced = await harness({ reducedMotion: true }); reduced.scroll(200); reduced.end(); reduced.flush();
  assert(reduced.photos.every(p => p.dataset.reelIndex === '0' && p.parentElement.dataset.festiveActive === 'false'));
  const late = await harness({ decode: false }); late.scroll(200); late.end(); late.flush();
  assert(late.photos.every(p => p.dataset.reelIndex === '0'), 'Keep hero visible until photos are decoded');
  const hidden = await harness(); hidden.scroll(200); hidden.step(); hidden.hide();
  assert.equal(hidden.frames.size, 0); assert(hidden.photos.every(p => p.dataset.reelState === 'idle'));
  const changed = await harness(); changed.scroll(200); changed.step(); changed.reduce();
  assert.equal(changed.frames.size, 0); assert(changed.photos.every(p => p.dataset.reelIndex === '0'));
  const $ = cheerio.load(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  assert.equal($('[data-category-reel]').length, 6);
  assert.equal($('.diwali-category-slide').length, 24);
  assert.equal($('.diwali-category-festive').length, 6);
  assert(!$('.diwali-category-top').text().includes('DIWALI EDIT'));
  $('.diwali-category-slide img').each((_, img) => assert(fs.existsSync(path.join(root, $(img).attr('src') || $(img).attr('data-src')))));
  console.log('Reels: eased entry/stop, 4 directions, both wrap seams, bounded jumps, decoded photos, offscreen/hidden pauses, reduced motion, 24 assets and 6 festive headers passed.');
})();
