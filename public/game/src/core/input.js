// =====================================================================
//  ENTRÉES — stick virtuel + tap pour se déplacer + pinch zoom
// =====================================================================
export class Input {
  constructor(stickEl, knobEl, canvas, cam) {
    this.stick = { x: 0, y: 0 };
    this.tapHandlers = [];
    this.cam = cam;
    this.radius = 46;
    this._id = null;
    this._origin = null;

    const rect = () => stickEl.getBoundingClientRect();

    const start = e => {
      if (this._id !== null) return;
      const t = e.changedTouches ? e.changedTouches[0] : e;
      this._id = t.identifier ?? 'mouse';
      const r = rect();
      this._origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      move(e);
      e.preventDefault();
    };
    const move = e => {
      if (this._id === null) return;
      const list = e.changedTouches ? Array.from(e.changedTouches) : [e];
      const t = list.find(p => (p.identifier ?? 'mouse') === this._id);
      if (!t) return;
      let dx = t.clientX - this._origin.x, dy = t.clientY - this._origin.y;
      const m = Math.hypot(dx, dy);
      const max = this.radius;
      if (m > max) { dx = dx / m * max; dy = dy / m * max; }
      knobEl.style.transform = `translate(${dx}px,${dy}px)`;
      const dead = 8;
      this.stick.x = Math.abs(dx) < dead ? 0 : dx / max;
      this.stick.y = Math.abs(dy) < dead ? 0 : dy / max;
      e.preventDefault();
    };
    const end = e => {
      const list = e.changedTouches ? Array.from(e.changedTouches) : [e];
      if (!list.some(p => (p.identifier ?? 'mouse') === this._id)) return;
      this._id = null; this.stick.x = 0; this.stick.y = 0;
      knobEl.style.transform = '';
    };
    stickEl.addEventListener('touchstart', start, { passive: false });
    stickEl.addEventListener('touchmove', move, { passive: false });
    stickEl.addEventListener('touchend', end);
    stickEl.addEventListener('touchcancel', end);
    stickEl.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);

    // tap sur la carte
    let downAt = null, downT = 0, pinch = null;
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        pinch = { d: dist(e.touches[0], e.touches[1]), z: cam.zoom };
      } else if (e.touches.length === 1) {
        downAt = { x: e.touches[0].clientX, y: e.touches[0].clientY }; downT = performance.now();
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      if (pinch && e.touches.length === 2) {
        const d = dist(e.touches[0], e.touches[1]);
        cam.zoom = Math.max(0.5, Math.min(2.4, pinch.z * d / pinch.d));
      }
    }, { passive: true });
    canvas.addEventListener('touchend', e => {
      if (pinch) { if (e.touches.length < 2) pinch = null; return; }
      if (!downAt) return;
      const t = e.changedTouches[0];
      if (Math.hypot(t.clientX - downAt.x, t.clientY - downAt.y) < 18 && performance.now() - downT < 500)
        this.fireTap(t.clientX, t.clientY);
      downAt = null;
    });
    canvas.addEventListener('click', e => this.fireTap(e.clientX, e.clientY));
    canvas.addEventListener('wheel', e => {
      cam.zoom = Math.max(0.5, Math.min(2.4, cam.zoom * (e.deltaY > 0 ? 0.93 : 1.075)));
    }, { passive: true });

    // clavier (desktop)
    this.keys = {};
    window.addEventListener('keydown', e => { this.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
  }
  onTap(fn) { this.tapHandlers.push(fn); }
  fireTap(x, y) { for (const f of this.tapHandlers) f(x, y); }
  vector() {
    const k = this.keys;
    let x = this.stick.x, y = this.stick.y;
    if (k['arrowleft'] || k['a'] || k['q']) x -= 1;
    if (k['arrowright'] || k['d']) x += 1;
    if (k['arrowup'] || k['w'] || k['z']) y -= 1;
    if (k['arrowdown'] || k['s']) y += 1;
    const m = Math.hypot(x, y);
    return m > 1 ? { x: x / m, y: y / m } : { x, y };
  }
}
const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
