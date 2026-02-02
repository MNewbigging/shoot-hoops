import * as CANNON from "cannon-es";
import * as THREE from "three";

export class Ball {
  body: CANNON.Body;

  held = false;

  private readonly radius = 0.15;
  private handOffset = new THREE.Vector3(0.25, 0, -1);
  private holdStiffness = 15;

  constructor(
    public mesh: THREE.Group,
    material: CANNON.Material,
  ) {
    this.body = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Sphere(this.radius),
      material,
    });
  }

  hold() {
    this.body.collisionFilterMask = 0; // don't hit anything
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.sleep();

    this.held = true;
  }

  updateMesh(camera: THREE.PerspectiveCamera, dt: number) {
    if (this.held) {
      // Follow camera
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
}
