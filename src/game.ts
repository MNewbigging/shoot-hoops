import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";

export interface GameKeys {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}

export class Game {
  private renderer: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera();
  private scene = new THREE.Scene();
  private clock = new THREE.Clock();
  private controls: PointerLockControls;

  private moveSpeed = 5;

  private keys: GameKeys = {
    w: false,
    a: false,
    s: false,
    d: false,
  };

  constructor() {
    // Setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.setupLights();

    this.camera.position.set(0, 1.8, 3);
    this.controls = new PointerLockControls(
      this.camera,
      this.renderer.domElement,
    );

    // Listeners
    window.addEventListener("resize", this.onCanvasResize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  async load(onComplete: () => void) {
    const loader = new THREE.TextureLoader();

    // Gym floor
    const floorUrl = getUrl("/textures/gym_floor.png");
    const floorTexture = await loader.loadAsync(floorUrl);
    floorTexture.colorSpace = THREE.SRGBColorSpace;
    floorTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const floorWidth = 28;
    const floorHeight = 15;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorWidth, floorHeight),
      new THREE.MeshPhysicalMaterial({
        map: floorTexture,
        roughness: 0.45,
        metalness: 0.0,
      }),
    );
    floor.rotateX(-Math.PI / 2);
    this.scene.add(floor);

    // Done
    onComplete();
  }

  start() {
    document.body.appendChild(this.renderer.domElement);
    this.onCanvasResize();
    this.controls.lock();
    this.update();
  }

  update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    this.movePlayer(dt);

    this.renderer.render(this.scene, this.camera);
  };

  private movePlayer(dt: number) {
    const direction = new THREE.Vector3();
    direction.z = Number(this.keys.w) - Number(this.keys.s);
    direction.x = Number(this.keys.d) - Number(this.keys.a);

    this.controls.moveForward(direction.z * this.moveSpeed * dt);
    this.controls.moveRight(direction.x * this.moveSpeed * dt);
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(undefined, 1);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight(undefined, Math.PI);
    directLight.position.copy(new THREE.Vector3(0.75, 1, 0.75).normalize());
    this.scene.add(directLight);
  }

  private onCanvasResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "w":
        this.keys.w = true;
        break;
      case "a":
        this.keys.a = true;
        break;
      case "s":
        this.keys.s = true;
        break;
      case "d":
        this.keys.d = true;
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.key) {
      case "w":
        this.keys.w = false;
        break;
      case "a":
        this.keys.a = false;
        break;
      case "s":
        this.keys.s = false;
        break;
      case "d":
        this.keys.d = false;
        break;
    }
  };
}

function getUrl(path: string) {
  return new URL(path, import.meta.url).href;
}
