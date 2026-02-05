import * as CANNON from "cannon-es";
import * as THREE from "three";
import { GRAVITY } from "./game";
import { ROOM_SIZE_HALVED } from "./scene-loader";
import { HitMarker } from "./hit-marker/hit-marker";

export class Ball {
  body: CANNON.Body;
  held = false;

  private readonly radius = 0.15;
  private readonly handOffset = new THREE.Vector3(0.25, 0, -1);
  private readonly holdStiffness = 15;

  private throwArc: THREE.Points;
  private readonly throwArcPoints = 60;

  private throwPitch = 0; // radians
  private readonly minThrowPitch = -0.3;
  private readonly maxThrowPitch = 0.6;

  private chargingThrow = false;
  private throwCharge = 0; // 0 -> 1
  private readonly chargeTime = 0.8; // seconds to reach full power
  private readonly minThrowSpeed = 8; // m/s
  private readonly maxThrowSpeed = 18; // m/s

  private roomColliders: THREE.Plane[] = [];
  private hitMarker: HitMarker;

  private reused = {
    ballWorld: new THREE.Vector3(),
    cameraDir: new THREE.Vector3(),
    markerDir: new THREE.Vector3(0, 0, 1),
  };

  constructor(
    public mesh: THREE.Group,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private canvas: HTMLElement,
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
      new THREE.BufferAttribute(new Float32Array(this.throwArcPoints * 3), 3),
    );
    this.throwArc = new THREE.Points(
      helperGeometry,
      new THREE.PointsMaterial({ size: 0.04, sizeAttenuation: true }),
    );
    this.throwArc.visible = false;
    this.throwArc.frustumCulled = false;
    this.scene.add(this.throwArc);

    // Generate the room colliders
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const frontWall = new THREE.Plane(
      new THREE.Vector3(0, 0, -1),
      ROOM_SIZE_HALVED.z,
    );
    const backWall = new THREE.Plane(
      new THREE.Vector3(0, 0, 1),
      ROOM_SIZE_HALVED.z,
    );
    const leftWall = new THREE.Plane(
      new THREE.Vector3(1, 0, 0),
      ROOM_SIZE_HALVED.x,
    );
    const rightWall = new THREE.Plane(
      new THREE.Vector3(-1, 0, 0),
      ROOM_SIZE_HALVED.x,
    );
    this.roomColliders.push(floor, frontWall, backWall, leftWall, rightWall);

    // Hit marker
    this.hitMarker = new HitMarker();
    this.scene.add(this.hitMarker);
    this.hitMarker.visible = false;
  }

  addListeners() {
    this.canvas.addEventListener("wheel", this.onWheel);
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("mouseup", this.onMouseUp);
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
    this.updateThrowArc(); // todo - limit how often this runs (but not when inputting?)
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
      this.camera.updateMatrixWorld(true);

      const targetPos = this.handOffset
        .clone()
        .applyMatrix4(this.camera.matrixWorld);

      const step = targetPos
        .clone()
        .sub(this.mesh.position)
        .multiplyScalar(dt * this.holdStiffness);

      this.mesh.position.add(step);

      // Clamp within room
      this.mesh.position.x = THREE.MathUtils.clamp(
        this.mesh.position.x,
        -ROOM_SIZE_HALVED.x + this.radius,
        ROOM_SIZE_HALVED.x - this.radius,
      );
      this.mesh.position.z = THREE.MathUtils.clamp(
        this.mesh.position.z,
        -ROOM_SIZE_HALVED.z + this.radius,
        ROOM_SIZE_HALVED.z - this.radius,
      );

      this.mesh.quaternion.copy(this.camera.quaternion);
    } else {
      // Follow body
      this.mesh.position.copy(this.body.position);
      this.mesh.quaternion.copy(this.body.quaternion);
    }
  }

  private updateThrowArc() {
    // Only show when holding the ball
    if (!this.held) {
      this.throwArc.visible = false;
      return;
    }

    this.throwArc.visible = true;

    const startPos = this.mesh.getWorldPosition(this.reused.ballWorld);
    const direction = this.getThrowDirection();
    const velocity = direction.multiplyScalar(this.getThrowSpeed());

    const dt = 1 / 30; // Bigger number = bigger gap between points
    const steps = this.throwArcPoints; // How many point positions to sample
    const points = this.sampleTrajectoryPoints(startPos, velocity, steps, dt);
    const posAttr = this.throwArc.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    // Iterate over all points in the helper
    for (let i = 0; i < this.throwArcPoints; i++) {
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
    startPoint: THREE.Vector3,
    velocity: THREE.Vector3Like,
    steps: number,
    fixedDt: number,
  ) {
    const points: THREE.Vector3[] = [];
    points.push(startPoint);

    for (let i = 1; i < steps; i++) {
      const time = i * fixedDt;

      const prevPoint = points[i - 1];

      const currentPoint = new THREE.Vector3(
        startPoint.x + velocity.x * time,
        startPoint.y + velocity.y * time + 0.5 * GRAVITY * time * time,
        startPoint.z + velocity.z * time,
      );

      points.push(currentPoint);

      // Test whether the arc would hit a collider and stop the arc there
      const line = new THREE.Line3(prevPoint, currentPoint);
      for (const collider of this.roomColliders) {
        const intersectionPoint = collider.intersectLine(
          line,
          new THREE.Vector3(),
        );
        if (intersectionPoint) {
          // Update hit marker position to just above area hit
          const adjustedPoint = intersectionPoint
            .clone()
            .add(collider.normal.clone().multiplyScalar(0.01));
          this.hitMarker.position.copy(adjustedPoint);

          // Rotate in line with collider normal
          this.hitMarker.quaternion.copy(
            new THREE.Quaternion().setFromUnitVectors(
              this.reused.markerDir,
              collider.normal,
            ),
          );
          this.hitMarker.visible = true;
          return points; // exit early
        }
      }
    }

    this.hitMarker.visible = false;
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

    this.hitMarker.visible = false;
  };
}
