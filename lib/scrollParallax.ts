/**
 * A single shared scroll-parallax engine. One RAF loop drives every registered
 * element, so adding dozens of parallax layers costs almost nothing.
 *
 * Each element translates on Y proportional to how far its center sits from the
 * viewport center — elements "lag" or "lead" the scroll, creating depth. Speed
 * is small (0.05–0.25 feels right); clamp caps the max travel in px so clipped
 * images never reveal an edge.
 */

type Axis = 'y' | 'x';

type Item = {
  el: HTMLElement;
  speed: number;
  clamp: number;
  axis: Axis;
};

const items = new Set<Item>();
let running = false;

function tick() {
  const vh = window.innerHeight || 1;
  const center = vh / 2;

  items.forEach((it) => {
    const rect = it.el.getBoundingClientRect();
    const elCenter = rect.top + rect.height / 2;
    let d = (center - elCenter) * it.speed;
    if (it.clamp) d = Math.max(-it.clamp, Math.min(it.clamp, d));
    it.el.style.transform =
      it.axis === 'y'
        ? `translate3d(0, ${d.toFixed(2)}px, 0)`
        : `translate3d(${d.toFixed(2)}px, 0, 0)`;
  });

  if (running) requestAnimationFrame(tick);
}

export function registerParallax(
  el: HTMLElement | null,
  speed = 0.15,
  clamp = 120,
  axis: Axis = 'y'
): () => void {
  if (typeof window === 'undefined' || !el) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const item: Item = { el, speed, clamp, axis };
  items.add(item);

  if (!running) {
    running = true;
    requestAnimationFrame(tick);
  }

  return () => {
    items.delete(item);
    el.style.transform = '';
    if (items.size === 0) running = false;
  };
}
