// Fixed timestep game loop

const FIXED_DT = 1 / 60;
const MAX_ACCUMULATOR = 0.25;

let lastTime = 0;
let accumulator = 0;
let running = false;
let updateFn = null;
let renderFn = null;

export function startLoop(update, render) {
  updateFn = update;
  renderFn = render;
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(tick);
}

export function stopLoop() {
  running = false;
}

function tick(timestamp) {
  if (!running) return;

  const elapsed = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  accumulator += Math.min(elapsed, MAX_ACCUMULATOR);

  while (accumulator >= FIXED_DT) {
    updateFn(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  renderFn();

  requestAnimationFrame(tick);
}
