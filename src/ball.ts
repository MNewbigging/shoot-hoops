import * as CANNON from "cannon-es";
import * as THREE from "three";
import { GRAVITY } from "./game";

export class Ball {
  body: CANNON.Body;
  held = false;

  private readonly radius = 0.15;
  private readonly handOffset = new THREE.Vector3(0.25, 0, -1);
  private readonly holdStiffness = 15;

  private ballHelper: THREE.Points;
  private readonly ballHelperPoints = 60;

  private throwPitch = 0; // radians
  private readonly minThrowPitch = -0.3;
  private readonly maxThrowPitch = 0.6;

  private chargingThrow = false;
  private throwCharge = 0; // 0 -> 1
  private readonly chargeTime = 0.8; // seconds to reach full power
  private readonly minThrowSpeed = 8; // m/s
  private readonly maxThrowSpeed = 18; // m/s

  private reused = {
    ballWorld: new THREE.Vector3(),
    cameraDir: new THREE.Vector3(),
  };

  constructor(
    public mesh: THREE.Group,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    material: CANNON.Material,
  ) {
    // Physics
    this.body = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Sphere(this.radius),
      material,
    });

    // Ball helper
    const helperGeometry = new THREE.BufferGeometry();
    helperGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(this.ballHelperPoints * 3), 3),
    );
    this.ballHelper = new THREE.Points(
      helperGeometry,
      new THREE.PointsMaterial({ size: 0.04, sizeAttenuation: true }),
    );
    this.ballHelper.visible = false;
    this.ballHelper.frustumCulled = false;
    this.scene.add(this.ballHelper);
  }

  addListeners() {
    window.addEventListener("wheel", this.onWheel);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  hold() {
    this.body.collisionFilterMask = 0; // don't hit anything
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.sleep();

    this.held = true;
  }

  throw(throwSpeed: number) {
    this.body.wakeUp();
    this.body.collisionFilterMask = -1; // collide with everything

    // Make sure start pos is set to mesh current values
    const pos = this.mesh.position;
    this.body.position.set(pos.x, pos.y, pos.z);
    const quat = this.mesh.quaternion;
    this.body.quaternion.set(quat.x, quat.y, quat.z, quat.w);

    // Get throw direction
    const direction = this.getThrowDirection();

    // Add velocity for throw
    this.body.velocity.set(
      direction.x * throwSpeed,
      direction.y * throwSpeed,
      direction.z * throwSpeed,
    );

    this.held = false;
  }

  update(dt: number) {
    this.updateMesh(dt);
    this.updateBallHelper();
    this.updateThrowCharge(dt);
  }

  private getThrowDirection() {
    const direction = this.camera.getWorldDirection(this.reused.cameraDir);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
      this.camera.quaternion,
    );
    direction.applyAxisAngle(right, this.throwPitch);
    direction.normalize();

    return direction;
  }

  private updateMesh(dt: number) {
    if (this.held) {
      // Follow camera
      // todo prevent going through walls
      this.camera.updateMatrixWorld(true);

      const targetPos = this.handOffset
        .clone()
        .applyMatrix4(this.camera.matrixWorld);

      const step = targetPos
        .clone()
        .sub(this.mesh.position)
        .multiplyScalar(dt * this.holdStiffness);

      this.mesh.position.add(step);
      this.mesh.quaternion.copy(this.camera.quaternion);
    } else {
      // Follow body
      this.mesh.position.copy(this.body.position);
      this.mesh.quaternion.copy(this.body.quaternion);
    }
  }

  private updateBallHelper() {
    // Only show when holding the ball
    if (!this.held) {
      this.ballHelper.visible = false;
      return;
    }

    this.ballHelper.visible = true;

    // todo add something that shows where it'll hit
    const startPos = this.mesh.getWorldPosition(this.reused.ballWorld);
    const direction = this.getThrowDirection();
    const velocity = direction.multiplyScalar(this.getThrowSpeed());
    const dt = 1 / 30; // Bigger number = bigger gap between points
    const steps = this.ballHelperPoints; // How many point positions to sample
    const points = this.sampleTrajectoryPoints(startPos, velocity, steps, dt);
    const posAttr = this.ballHelper.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    // Iterate over all points in the helper
    for (let i = 0; i < this.ballHelperPoints; i++) {
      // Assign a sampled position if it exists, or stack on last point if not
      const p = points[i] ?? points[points.length - 1];
      posAttr.setXYZ(i, p.x, p.y, p.z);
    }
    posAttr.needsUpdate = true;
  }

  private updateThrowCharge(dt: number) {
    if (this.chargingThrow) {
      this.throwCharge = Math.min(1, this.throwCharge + dt / this.chargeTime);
    }
  }

  private getThrowSpeed() {
    // Ease in rather than linear
    const t = this.throwCharge * this.throwCharge;
    return this.minThrowSpeed + (this.maxThrowSpeed - this.minThrowSpeed) * t;
  }

  private sampleTrajectoryPoints(
    startPoint: THREE.Vector3Like,
    velocity: THREE.Vector3Like,
    steps: number,
    fixedDt: number,
  ) {
    const points: THREE.Vector3Like[] = [];

    for (let i = 0; i < steps; i++) {
      const time = i * fixedDt;
      const point = {
        x: startPoint.x + velocity.x * time,
        y: startPoint.y + velocity.y * time + 0.5 * GRAVITY * time * time,
        z: startPoint.z + velocity.z * time,
      };
      points.push(point);
    }

    return points;
  }

  private onWheel = (e: WheelEvent) => {
    const delta = Math.sign(e.deltaY); // -1 for scroll up or 1 for scroll down

    const step = 0.03; // radians per tick
    this.throwPitch -= delta * step;

    this.throwPitch = THREE.MathUtils.clamp(
      this.throwPitch,
      this.minThrowPitch,
      this.maxThrowPitch,
    );
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.chargingThrow = true;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button !== 0) return;
    this.chargingThrow = false;

    if (!this.held) return;

    const throwSpeed = this.getThrowSpeed();
    this.throw(throwSpeed);
    this.throwCharge = 0; // reset after throw
  };
}
