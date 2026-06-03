// Keyboard input state manager

const keys = {};
const justPressed = {};
const justReleased = {};

export function initInput() {
  window.addEventListener('keydown', (e) => {
    if (!keys[e.code]) {
      justPressed[e.code] = true;
    }
    keys[e.code] = true;
    // Prevent default for game keys
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    justReleased[e.code] = true;
  });
}

export function isDown(code) {
  return !!keys[code];
}

export function isJustPressed(code) {
  return !!justPressed[code];
}

export function isJustReleased(code) {
  return !!justReleased[code];
}

export function clearFrame() {
  // Clear per-frame states
  for (const k in justPressed) delete justPressed[k];
  for (const k in justReleased) delete justReleased[k];
}

export function isLeft() {
  return isDown('ArrowLeft') || isDown('KeyA');
}

export function isRight() {
  return isDown('ArrowRight') || isDown('KeyD');
}

export function isJump() {
  return isJustPressed('Space') || isJustPressed('Enter');
}

export function isConfirm() {
  return isJustPressed('Space') || isJustPressed('Enter');
}

export function isNavLeft() {
  return isJustPressed('ArrowLeft') || isJustPressed('KeyA');
}

export function isNavRight() {
  return isJustPressed('ArrowRight') || isJustPressed('KeyD');
}
