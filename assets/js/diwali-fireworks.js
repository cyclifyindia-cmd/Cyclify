/* Cyclify Diwali: a small real-art firework scene, animated only while visible. */
(function () {
  'use strict';
  const scene = document.querySelector('[data-diwali-fireworks]');
  if (!scene) return;
  const hero = scene.closest('.diwali-home-hero');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'diwali-firework-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  document.body.appendChild(canvas);
  const rocketImage = new Image();
  rocketImage.src = 'assets/campaigns/diwali-2026/rocket-real.webp';
  rocketImage.decoding = 'async';
  const sparks = [];
  let width = 0, height = 0, dpr = 1, frame = 0, lastTime = 0;
  let inView = false, rocket = null, flash = null, cooldownUntil = 0;
  let previousY = window.scrollY, downTravel = 0, fuseBudget = 0;
  let anchor = null, dirtyAnchor = true, launches = 0, bursts = 0;
  const random = (a, b) => a + Math.random() * (b - a);
  const canMove = () => !reduced.matches && !document.hidden && document.documentElement.classList.contains('cyclify-diwali');

  function size() {
    width = window.innerWidth; height = window.innerHeight;
    // A light transparent overlay: cap pixel density and particle count on phones.
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirtyAnchor = true;
  }
  function schedule() {
    if (!frame && canMove() && (inView || rocket || flash || sparks.length)) frame = requestAnimationFrame(draw);
  }
  function addSpark(x, y, vx, vy, life, kind, hue) {
    const limit = width < 600 ? 135 : 185;
    if (sparks.length >= limit) return;
    sparks.push({ x, y, px: x, py: y, vx, vy, age: 0, life, kind, hue, size: random(.7, 1.5) });
  }
  function glow(x, y, radius, opacity, colour) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(' + colour + ',' + opacity + ')');
    gradient.addColorStop(1, 'rgba(' + colour + ',0)');
    ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function burst(x, y, now) {
    const count = width < 600 ? 72 : 105;
    const spread = Math.min(155, width * .34);
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 2 * i / count + random(-.025, .025);
      const speed = random(spread * .55, spread * 1.25);
      addSpark(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, random(1.15, 1.9), 'burst', i % 7 === 0 ? 22 : random(36, 48));
    }
    flash = { x, y, born: now };
    scene.dataset.fireworkBursts = String(++bursts);
    scene.dataset.fireworkState = 'burst';
  }
  function launch(now) {
    if (!anchor || rocket || now < cooldownUntil || !rocketImage.complete || !rocketImage.naturalWidth) return;
    const startX = Math.min(width - 25, anchor.left + anchor.width * .77);
    const startY = Math.min(height * .86, Math.max(anchor.bottom - 8, height * .65));
    const endX = Math.max(width * .65, Math.min(width - 45, startX - width * .055));
    const endY = Math.max(85, Math.min(height * .25, startY - 180));
    rocket = { startX, startY, endX, endY, born: now, duration: 1120, tail: 0 };
    cooldownUntil = now + 6500; downTravel = 0;
    scene.dataset.fireworkLaunches = String(++launches);
    scene.dataset.fireworkState = 'flying';
    schedule();
  }
  function draw(now) {
    frame = 0;
    if (!canMove()) { stop(); return; }
    const dt = Math.min(.035, lastTime ? (now - lastTime) / 1000 : .0167);
    lastTime = now;
    if (dirtyAnchor) { anchor = scene.getBoundingClientRect(); dirtyAnchor = false; }
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    if (inView && anchor && anchor.bottom > 0) {
      fuseBudget += dt * 32;
      while (fuseBudget >= 1) {
        fuseBudget--;
        const tip = Math.random() < .55 ? [.807, .245] : [.535, .4];
        const x = anchor.left + anchor.width * tip[0], y = anchor.top + anchor.height * tip[1];
        addSpark(x, y, random(-28, 28), random(-42, -12), random(.22, .6), 'fuse', random(25, 45));
      }
    }
    if (rocket) {
      const t = Math.min(1, (now - rocket.born) / rocket.duration);
      // Acceleration, then a gentle curve: the paper rocket leads its ember trail.
      const travel = .18 * t + .82 * t * t;
      const x = rocket.startX + (rocket.endX - rocket.startX) * travel + Math.sin(t * Math.PI) * 12;
      const y = rocket.startY + (rocket.endY - rocket.startY) * travel;
      const bodyHeight = width < 600 ? 94 : 125;
      const bodyWidth = bodyHeight * 141 / 512;
      rocket.tail += dt * 90;
      while (rocket.tail >= 1) {
        rocket.tail--;
        addSpark(x + random(-2, 2), y + bodyHeight * .48, random(-12, 12), random(27, 65), random(.24, .58), 'trail', random(27, 47));
      }
      glow(x, y + bodyHeight * .46, 20, .22, '255,154,55');
      ctx.save(); ctx.translate(x, y); ctx.rotate(-.08);
      ctx.drawImage(rocketImage, -bodyWidth / 2, -bodyHeight * .46, bodyWidth, bodyHeight);
      ctx.restore(); ctx.globalCompositeOperation = 'lighter';
      if (t >= 1) { burst(x, y - bodyHeight * .3, now); rocket = null; }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i]; p.age += dt;
      if (p.age >= p.life) { sparks.splice(i, 1); continue; }
      p.px = p.x; p.py = p.y;
      const drag = Math.pow(p.kind === 'burst' ? .48 : .7, dt);
      p.vx *= drag; p.vy = p.vy * drag + (p.kind === 'burst' ? 43 : 28) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const life = 1 - p.age / p.life;
      const opacity = Math.pow(life, .7) * (p.kind === 'burst' ? .8 + .2 * Math.sin(p.age * 42) : 1);
      ctx.strokeStyle = 'hsla(' + p.hue + ',100%,72%,' + opacity + ')';
      ctx.lineWidth = p.size * Math.max(.4, life);
      ctx.beginPath(); ctx.moveTo(p.px - p.vx * .017, p.py - p.vy * .017); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    if (flash) {
      const age = (now - flash.born) / 1000;
      if (age < .42) glow(flash.x, flash.y, 45 + age * 95, .23 * (1 - age / .42), '255,190,93');
      if (age > 2) { flash = null; scene.dataset.fireworkState = 'cooldown'; }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (!rocket && !flash && now > cooldownUntil) scene.dataset.fireworkState = 'idle';
    schedule();
    if (!frame) lastTime = 0;
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; lastTime = 0; rocket = null; flash = null; sparks.length = 0; downTravel = 0;
    ctx.clearRect(0, 0, width, height);
    scene.dataset.fireworkActive = 'false'; scene.dataset.fireworkState = 'idle';
  }
  function sync() {
    const active = inView && canMove();
    scene.dataset.fireworkActive = String(active);
    if (active) { dirtyAnchor = true; schedule(); }
    else if (!canMove()) stop();
  }
  size();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (!inView) downTravel = 0;
      sync();
    }, { threshold: 0 }).observe(scene);
  } else { inView = true; sync(); }
  window.addEventListener('scroll', () => {
    const y = window.scrollY, delta = y - previousY; previousY = y; dirtyAnchor = true;
    if (!canMove()) return;
    if (delta < -8) downTravel = 0;
    const bounds = hero.getBoundingClientRect();
    if (delta > 0 && bounds.bottom > 100 && bounds.top < height && bounds.top > -height * .75) {
      downTravel += Math.min(delta, 80);
      if (downTravel >= 28) {
        anchor = scene.getBoundingClientRect(); dirtyAnchor = false;
        launch(performance.now());
      }
    }
    schedule();
  }, { passive: true });
  window.addEventListener('resize', () => { size(); schedule(); }, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener?.('change', sync);
  rocketImage.addEventListener('load', schedule, { once: true });
  // A restored page may already be far down; it waits for a fresh downward gesture.
  scene.dataset.fireworkLaunches = '0';
  scene.dataset.fireworkBursts = '0';
})();
