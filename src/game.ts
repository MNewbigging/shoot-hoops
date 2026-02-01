import * as THREE from "three";
import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { SceneLoader } from "./scene-loader";
import { Ball } from "./ball";

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

  private loading = false;

  private physicsWorld: CANNON.World;
  private physicsDebugger: {
    update: () => void;
  };

  private ball?: Ball;
  private ballMaterial = new CANNON.Material("ball");
  static floorMaterial = new CANNON.Material("floor");
  static wallMaterial = new CANNON.Material("wall");

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

    // Physics
    this.physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.81, 0),
    });

    this.physicsDebugger = CannonDebugger(this.scene, this.physicsWorld, {
      color: 0xff0000,
    });

    this.setupPhysics();
  }

  async load(onComplete: () => void) {
    if (this.loading) {
      return;
    }

    this.loading = true;

    const sceneLoader = new SceneLoader(
      this.scene,
      this.renderer,
      this.addBody,
    );

    await sceneLoader.loadScene();

    const ballMesh = await sceneLoader.loadBall();
    this.ball = new Ball(ballMesh, this.ballMaterial);
    this.ball.body.position.y = 5;
    this.ball.mesh.position.y = 5;
    this.scene.add(this.ball.mesh);
    this.physicsWorld.addBody(this.ball.body);

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

    this.ball?.updateMesh();

    this.physicsWorld.step(1 / 60, dt, 3);

    this.physicsDebugger.update();

    this.renderer.render(this.scene, this.camera);
  };

  private movePlayer(dt: number) {
    const direction = new THREE.Vector3();
    direction.z = Number(this.keys.w) - Number(this.keys.s);
    direction.x = Number(this.keys.d) - Number(this.keys.a);

    this.controls.moveForward(direction.z * this.moveSpeed * dt);
    this.controls.moveRight(direction.x * this.moveSpeed * dt);

    const object = this.controls.object;
    // object.position.x = THREE.MathUtils.clamp(object.position.x, -13.5, 13.5);
    // object.position.z = THREE.MathUtils.clamp(object.position.z, -7, 7);
  }

  private setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.6);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(0, 12, 0);
    sun.target.position.set(0, 0, 0);
    this.scene.add(sun);
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

  private addBody = (body: CANNON.Body | null) => {
    if (body) this.physicsWorld.addBody(body);
  };

  private setupPhysics() {
    // Contact materials
    const ballFloorMaterial = new CANNON.ContactMaterial(
      this.ballMaterial,
      Game.floorMaterial,
      {
        restitution: 0.78,
        friction: 0.35,
        contactEquationRelaxation: 3,
        contactEquationStiffness: 1e8,
      },
    );
    this.physicsWorld.addContactMaterial(ballFloorMaterial);

    const ballWallMaterial = new CANNON.ContactMaterial(
      this.ballMaterial,
      Game.wallMaterial,
      {
        restitution: 0.65,
        friction: 0.4,
      },
    );
    this.physicsWorld.addContactMaterial(ballWallMaterial);
  }
}

export function createBodyFromMesh(
  mesh: THREE.Mesh,
  options?: CANNON.BodyOptions,
) {
  mesh.updateWorldMatrix(true, false);

  const geom = mesh.geometry;
  if (!geom.boundingBox) geom.computeBoundingBox();
  if (!geom.boundingBox) return null;

  const worldBox = new THREE.Box3()
    .copy(geom.boundingBox)
    .applyMatrix4(mesh.matrixWorld);

  const size = worldBox.getSize(new THREE.Vector3());
  const center = worldBox.getCenter(new THREE.Vector3());

  const body = new CANNON.Body(options);

  body.position.set(center.x, center.y, center.z);
  body.addShape(
    new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
  );

  return body;
}

export function createBodyFromGroup(
  group: THREE.Group,
  options?: CANNON.BodyOptions,
) {
  group.updateWorldMatrix(true, false);

  const worldBox = new THREE.Box3().setFromObject(group);

  const size = worldBox.getSize(new THREE.Vector3());
  const center = worldBox.getCenter(new THREE.Vector3());

  const body = new CANNON.Body(options);

  body.position.set(center.x, center.y, center.z);
  body.addShape(
    new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
  );

  return body;
}

export const game = new Game();
