// Frame-based animation system

export class Animation {
  constructor(frames, fps = 8, loop = true) {
    this.frames = frames;       // Array of sprite keys
    this.fps = fps;
    this.loop = loop;
    this.currentFrame = 0;
    this.timer = 0;
    this.done = false;
  }

  update(dt) {
    if (this.done) return;
    this.timer += dt;
    const frameDuration = 1 / this.fps;
    while (this.timer >= frameDuration) {
      this.timer -= frameDuration;
      this.currentFrame++;
      if (this.currentFrame >= this.frames.length) {
        if (this.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = this.frames.length - 1;
          this.done = true;
        }
      }
    }
  }

  getFrame() {
    return this.frames[this.currentFrame];
  }

  reset() {
    this.currentFrame = 0;
    this.timer = 0;
    this.done = false;
  }
}

// AnimationController: manages multiple named animations and transitions
export class AnimationController {
  constructor(animations) {
    // animations: { name: Animation }
    this.animations = animations;
    this.current = null;
    this.currentName = null;
  }

  play(name) {
    if (this.currentName === name) return;
    this.currentName = name;
    this.current = this.animations[name];
    if (this.current) this.current.reset();
  }

  update(dt) {
    if (this.current) this.current.update(dt);
  }

  getFrame() {
    if (this.current) return this.current.getFrame();
    return null;
  }

  isDone() {
    return this.current ? this.current.done : true;
  }
}
