// Camera: tracks player, converts world coords to screen coords

export const camera = {
  x: 0,
  y: 0,
  width: 480,
  height: 270,
};

export function updateCamera(targetX, targetY) {
  // Center camera on target
  camera.x = targetX - camera.width / 2;
  camera.y = 0; // Fixed vertical camera
}

export function worldToScreen(wx, wy) {
  return {
    sx: wx - camera.x,
    sy: wy - camera.y,
  };
}

export function screenToWorld(sx, sy) {
  return {
    wx: sx + camera.x,
    wy: sy + camera.y,
  };
}

export function isOnScreen(wx, wy, w, h, margin = 64) {
  const sx = wx - camera.x;
  const sy = wy - camera.y;
  return (
    sx + w + margin > 0 &&
    sx - margin < camera.width &&
    sy + h + margin > 0 &&
    sy - margin < camera.height
  );
}
