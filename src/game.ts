import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { SceneLoader } from "./scene-loader";

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
    const sceneLoader = new SceneLoader(this.scene, this.renderer);

    await sceneLoader.loadScene();

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

    const object = this.controls.object;
    object.position.x = THREE.MathUtils.clamp(object.position.x, -13.5, 13.5);
    object.position.z = THREE.MathUtils.clamp(object.position.z, -7, 7);
  }

  private setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(0, 12, 0);
    sun.target.position.set(0, 0, 0);
    this.scene.add(sun);

    const addPanelLight = (x: number, z: number) => {
      const light = new THREE.RectAreaLight(0xffffff, 8, 6, 1);
      light.position.set(x, 8, z);
      light.rotation.x = -Math.PI / 2;
      this.scene.add(light);
    };

    addPanelLight(-6, -4);
    addPanelLight(6, -4);
    addPanelLight(-6, 4);
    addPanelLight(6, 4);
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
