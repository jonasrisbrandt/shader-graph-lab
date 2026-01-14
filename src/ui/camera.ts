import { vec3 } from "gl-matrix";

export type CameraState = {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
};

export interface CameraController {
  update: (deltaSec: number) => void;
  getState: () => CameraState;
  dispose: () => void;
}

type OrbitOptions = {
  target?: [number, number, number];
  radius?: number;
  minRadius?: number;
  maxRadius?: number;
  theta?: number;
  phi?: number;
  fov?: number;
  rotateSpeed?: number;
  panSpeed?: number;
  zoomSpeed?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export class OrbitCameraController implements CameraController {
  private canvas: HTMLCanvasElement;
  private target = vec3.fromValues(0, 0, 0);
  private position = vec3.fromValues(0, 0, 3);
  private up = vec3.fromValues(0, 1, 0);
  private radius = 3;
  private minRadius = 0.5;
  private maxRadius = 20;
  private theta = Math.PI * 0.25;
  private phi = Math.PI * 0.15;
  private fov = Math.PI / 3;
  private rotateSpeed = 2.5;
  private panSpeed = 0.002;
  private zoomSpeed = 0.001;
  private dragging = false;
  private mode: "rotate" | "pan" = "rotate";
  private lastX = 0;
  private lastY = 0;
  private touchPointers = new Map<number, { x: number; y: number }>();
  private touchLastX = 0;
  private touchLastY = 0;
  private touchLastCenter: { x: number; y: number } | null = null;
  private touchLastDistance = 0;

  private onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      event.preventDefault();
      this.touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.touchPointers.size === 1) {
        this.touchLastX = event.clientX;
        this.touchLastY = event.clientY;
        this.touchLastCenter = null;
        this.touchLastDistance = 0;
      } else if (this.touchPointers.size >= 2) {
        const [a, b] = this.getTouchPoints();
        if (a && b) {
          this.touchLastCenter = this.getMidpoint(a, b);
          this.touchLastDistance = this.getDistance(a, b);
        }
      }
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0 && event.button !== 2) return;
    this.dragging = true;
    this.mode = event.button === 2 || event.shiftKey ? "pan" : "rotate";
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.canvas.setPointerCapture(event.pointerId);
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      event.preventDefault();
      this.touchPointers.delete(event.pointerId);
      this.canvas.releasePointerCapture(event.pointerId);
      if (this.touchPointers.size === 1) {
        const [remaining] = this.getTouchPoints();
        if (remaining) {
          this.touchLastX = remaining.x;
          this.touchLastY = remaining.y;
        }
        this.touchLastCenter = null;
        this.touchLastDistance = 0;
      } else if (this.touchPointers.size === 0) {
        this.touchLastCenter = null;
        this.touchLastDistance = 0;
      }
      return;
    }
    if (!this.dragging) return;
    this.dragging = false;
    this.canvas.releasePointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      if (!this.touchPointers.has(event.pointerId)) return;
      event.preventDefault();
      this.touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.touchPointers.size === 1) {
        const dx = event.clientX - this.touchLastX;
        const dy = event.clientY - this.touchLastY;
        this.touchLastX = event.clientX;
        this.touchLastY = event.clientY;
        this.applyRotation(dx, dy);
      } else if (this.touchPointers.size >= 2) {
        const [a, b] = this.getTouchPoints();
        if (!a || !b) return;
        const center = this.getMidpoint(a, b);
        const distance = this.getDistance(a, b);
        if (this.touchLastCenter && this.touchLastDistance > 0) {
          const dx = center.x - this.touchLastCenter.x;
          const dy = center.y - this.touchLastCenter.y;
          this.applyPan(dx, dy);
          const ratio = distance / this.touchLastDistance;
          if (Number.isFinite(ratio) && ratio > 0) {
            this.radius = clamp(this.radius / ratio, this.minRadius, this.maxRadius);
          }
        }
        this.touchLastCenter = center;
        this.touchLastDistance = distance;
      }
      this.updatePosition();
      return;
    }
    if (!this.dragging) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    if (this.mode === "rotate") {
      this.applyRotation(dx, dy);
    } else {
      this.applyPan(dx, dy);
    }
    this.updatePosition();
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const next = this.radius * (1 + event.deltaY * this.zoomSpeed);
    this.radius = clamp(next, this.minRadius, this.maxRadius);
    this.updatePosition();
  };

  private onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  constructor(canvas: HTMLCanvasElement, options: OrbitOptions = {}) {
    this.canvas = canvas;
    if (options.target) this.target = vec3.fromValues(...options.target);
    if (options.radius !== undefined) this.radius = options.radius;
    if (options.minRadius !== undefined) this.minRadius = options.minRadius;
    if (options.maxRadius !== undefined) this.maxRadius = options.maxRadius;
    if (options.theta !== undefined) this.theta = options.theta;
    if (options.phi !== undefined) this.phi = options.phi;
    if (options.fov !== undefined) this.fov = options.fov;
    if (options.rotateSpeed !== undefined) this.rotateSpeed = options.rotateSpeed;
    if (options.panSpeed !== undefined) this.panSpeed = options.panSpeed;
    if (options.zoomSpeed !== undefined) this.zoomSpeed = options.zoomSpeed;
    this.updatePosition();

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerUp);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("contextmenu", this.onContextMenu);
  }

  private updatePosition() {
    const cosPhi = Math.cos(this.phi);
    const sinPhi = Math.sin(this.phi);
    const cosTheta = Math.cos(this.theta);
    const sinTheta = Math.sin(this.theta);
    this.position[0] = this.target[0] + this.radius * cosPhi * sinTheta;
    this.position[1] = this.target[1] + this.radius * sinPhi;
    this.position[2] = this.target[2] + this.radius * cosPhi * cosTheta;
  }

  private applyRotation(dx: number, dy: number) {
    const nx = dx / Math.max(1, this.canvas.clientWidth);
    const ny = dy / Math.max(1, this.canvas.clientHeight);
    this.theta -= nx * Math.PI * this.rotateSpeed;
    this.phi -= ny * Math.PI * this.rotateSpeed;
    const limit = Math.PI * 0.49;
    this.phi = clamp(this.phi, -limit, limit);
  }

  private applyPan(dx: number, dy: number) {
    const forward = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), this.target, this.position));
    const right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), forward, this.up));
    const upVec = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), right, forward));
    const scale = this.radius * this.panSpeed;
    vec3.scaleAndAdd(this.target, this.target, right, -dx * scale);
    vec3.scaleAndAdd(this.target, this.target, upVec, dy * scale);
  }

  private getTouchPoints() {
    return Array.from(this.touchPointers.values());
  }

  private getMidpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
    return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
  }

  private getDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  update(_deltaSec: number) {}

  getState(): CameraState {
    return {
      position: [this.position[0], this.position[1], this.position[2]],
      target: [this.target[0], this.target[1], this.target[2]],
      up: [this.up[0], this.up[1], this.up[2]],
      fov: this.fov,
    };
  }

  dispose() {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("pointerleave", this.onPointerUp);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
  }
}

export class StaticCameraController implements CameraController {
  private state: CameraState;

  constructor(state: CameraState) {
    this.state = state;
  }

  update(_deltaSec: number) {}

  getState() {
    return this.state;
  }

  dispose() {}
}
