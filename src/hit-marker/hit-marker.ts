import * as THREE from "three";
import hitMarkerVS from "./hit-marker.vs?raw";
import hitMarkerFS from "./hit-marker.fs?raw";

// Placed where the ball will hit
export class HitMarker extends THREE.Mesh {
  constructor() {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.RawShaderMaterial({
      fragmentShader: hitMarkerFS,
      vertexShader: hitMarkerVS,
      glslVersion: THREE.GLSL3,
    });

    super(geometry, material);
  }
}
