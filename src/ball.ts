import * as CANNON from "cannon-es";
import * as THREE from "three";
import { GRAVITY } from "./game";

export class Ball {
  body: CANNON.Body;
  held = false;
  throwSpeed = 12;

  private readonly radius = 0.15;
  private handOffset = new THREE.Vector3(0.25, 0, -1);
  private holdStiffness = 15;

  private ballHelper: THREE.Points;
  private ballHelperPoints = 60;

  private reused = {
    ballWorld: new THREE.Vector3(),
    cameraDir: new THREE.Vector3(),
  };

  constructor(
    public mesh: THREE.Group,
    private scene: THREE.Scene,
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

  hold() {
    this.body.collisionFilterMask = 0; // don't hit anything
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.sleep();

    this.held = true;
  }

  throw(direction: THREE.Vector3Like, throwSpeed: number) {
    this.body.wakeUp();
    this.body.collisionFilterMask = -1; // collide with everything

    // Make sure start pos is set to mesh current values
    const pos = this.mesh.position;
    this.body.position.set(pos.x, pos.y, pos.z);
    const quat = this.mesh.quaternion;
    this.body.quaternion.set(quat.x, quat.y, quat.z, quat.w);

    // Add velocity for throw
    this.body.velocity.set(
      direction.x * throwSpeed,
      direction.y * throwSpeed,
      direction.z * throwSpeed,
    );

    this.held = false;
  }

  update(camera: THREE.PerspectiveCamera, dt: number) {
    this.updateMesh(camera, dt);
    this.updateBallHelper(camera);
  }

  private updateMesh(camera: THREE.PerspectiveCamera, dt: number) {
    if (this.held) {
      // Follow camera
      // todo prevent going through walls
      camera.updateMatrixWorld(true);

      const targetPos = this.handOffset
        .clone()
        .applyMatrix4(camera.matrixWorld);

      const step = targetPos
        .clone()
        .sub(this.mesh.position)
        .multiplyScalar(dt * this.holdStiffness);

      this.mesh.position.add(step);
      this.mesh.quaternion.copy(camera.quaternion);
    } else {
      // Follow body
      this.mesh.position.copy(this.body.position);
      this.mesh.quaternion.copy(this.body.quaternion);
    }
  }

  private updateBallHelper(camera: THREE.PerspectiveCamera) {
    // Only show when holding the ball
    if (!this.held) {
      this.ballHelper.visible = false;
      return;
    }

    this.ballHelper.visible = true;

    const startPos = this.mesh.getWorldPosition(this.reused.ballWorld);
    const direction = camera.getWorldDirection(this.reused.cameraDir);
    const velocity = direction.multiplyScalar(this.throwSpeed);
    const dt = 1 / 30; // Bigger number = bigger gap between points
    const steps = 30; // How many point positions to sample
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
}
