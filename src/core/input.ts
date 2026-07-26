/**
 * Keyboard + pointer input. Owns its listeners and can detach them cleanly,
 * so restarting the game never leaks handlers.
 */

export interface PointerState {
  /** Pointer position in CSS pixels relative to the canvas. */
  x: number;
  y: number;
  /** Set on mousedown, cleared once the game has consumed the click. */
  fired: boolean;
}

const MOVE_KEYS: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

export class Input {
  private held = new Set<string>();
  private pressedThisFrame = new Set<string>();
  readonly pointer: PointerState = { x: 0, y: 0, fired: false };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    // Stop the page from scrolling out from under the farmyard.
    if (MOVE_KEYS[e.code] || e.code === 'Space') e.preventDefault();
    this.held.add(e.code);
    this.pressedThisFrame.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };

  private onBlur = (): void => {
    this.held.clear();
  };

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.onPointerMove(e);
    this.pointer.fired = true;
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerdown', this.onPointerDown);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.held.clear();
    this.pressedThisFrame.clear();
  }

  isDown(code: string): boolean {
    return this.held.has(code);
  }

  wasPressed(code: string): boolean {
    return this.pressedThisFrame.has(code);
  }

  /** Normalized movement axis from arrows or WASD. */
  axis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    for (const code of this.held) {
      const dir = MOVE_KEYS[code];
      if (dir === 'up') y -= 1;
      else if (dir === 'down') y += 1;
      else if (dir === 'left') x -= 1;
      else if (dir === 'right') x += 1;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  /** Called once at the end of every frame. */
  endFrame(): void {
    this.pressedThisFrame.clear();
    this.pointer.fired = false;
  }
}
