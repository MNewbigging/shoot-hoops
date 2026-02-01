import * as CANNON from "cannon-es";
import * as THREE from "three";

export class Ball {
  body: CANNON.Body;

  private readonly radius = 0.15;

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

  updateMesh() {
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
  }
}
