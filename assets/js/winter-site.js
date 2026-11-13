/* Pause decorative CSS motion offscreen; no checkout or product state access. */
(() => {
  const targets = [...document.querySelectorAll('.winter-santa-flight,.diwali-home-strip')];
  if (!targets.length || !('IntersectionObserver' in window)) return;
  const visible = new Set();
  const update = () => targets.forEach(node => node.classList.toggle('winter-motion-paused', document.hidden || !visible.has(node)));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
    update();
  });
  targets.forEach(node => observer.observe(node));
  document.addEventListener('visibilitychange', update);
})();
