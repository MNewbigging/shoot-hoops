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
  rmb: boolean;
}

export const GRAVITY = -9.82;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera();
  private scene = new THREE.Scene();
  private clock = new THREE.Clock();
  private controls: PointerLockControls;

  private loading = false;

  private physicsWorld: CANNON.World;
  private ballMaterial = new CANNON.Material("ball");
  static floorMaterial = new CANNON.Material("floor");
  static wallMaterial = new CANNON.Material("wall");
  private physicsDebugger: {
    update: () => void;
  };

  private ball?: Ball;
  private ballHelper: THREE.Points;
  private ballHelperPoints = 60;
  private throwSpeed = 12;
  private moveSpeed = 5;

  private keys: GameKeys = {
    w: false,
    a: false,
    s: false,
    d: false,
    rmb: false,
  };

  constructor() {
    // Setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.setupLights();

    this.camera.position.set(0, 1.8, 3);
    this.camera.fov = 60;
    this.camera.near = 0.05;
    this.camera.far = 100;
    this.controls = new PointerLockControls(
      this.camera,
      this.renderer.domElement,
    );

    // Listeners
    window.addEventListener("resize", this.onCanvasResize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);

    // Physics
    this.physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, GRAVITY, 0),
    });

    this.physicsDebugger = CannonDebugger(this.scene, this.physicsWorld, {
      color: 0xff0000,
    });

    this.setupPhysics();

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
    this.pickupBall();
    this.updateBallHelper();

    this.ball?.updateMesh(this.camera, dt);

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
    object.position.x = THREE.MathUtils.clamp(object.position.x, -13.5, 13.5);
    object.position.z = THREE.MathUtils.clamp(object.position.z, -7, 7);
    object.updateMatrixWorld(true);
  }

  private pickupBall() {
    if (!this.ball) return;
    if (!this.keys.rmb) return;
    if (this.ball.held) return;

    const grabRange = 0.2 + this.camera.position.y;
    if (this.ball.mesh.position.distanceTo(this.camera.position) < grabRange) {
      this.ball.hold();
    }
  }

  private updateBallHelper() {
    // Only show when holding the ball
    if (!this.ball?.held) {
      this.ballHelper.visible = false;
      return;
    }

    this.ballHelper.visible = true;

    const startPos = this.ball.mesh.getWorldPosition(new THREE.Vector3());
    const direction = this.camera.getWorldDirection(new THREE.Vector3());
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

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 2) this.keys.rmb = true;
    if (e.button !== 0) return;
    // todo track time started
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 2) this.keys.rmb = false;
    if (e.button !== 0) return;
    if (!this.ball?.held) return;

    const direction = this.camera.getWorldDirection(new THREE.Vector3());
    this.ball.throw(direction, this.throwSpeed);
  };

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

  private sampleTrajectoryPoints(
    startPoint: THREE.Vector3Like,
    velocity: THREE.Vector3Like,
    steps: number,
    fixedDt: number,
  ) {
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < steps; i++) {
      const time = i * fixedDt;
      const point = new THREE.Vector3(
        startPoint.x + velocity.x * time,
        startPoint.y + velocity.y * time + 0.5 * GRAVITY * time * time,
        startPoint.z + velocity.z * time,
      );
      points.push(point);
    }

    return points;
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
  group.updateWorldMatrix(true, true);

  const worldBox = new THREE.Box3().setFromObject(group);

  const size = worldBox.getSize(new THREE.Vector3());

  // Enforce a minimum size for the box
  const minSize = 0.3;
  if (size.x < minSize) size.x = minSize;
  if (size.y < minSize) size.y = minSize;
  if (size.z < minSize) size.z = minSize;

  const body = new CANNON.Body(options);

  const center = worldBox.getCenter(new THREE.Vector3());
  body.position.set(center.x, center.y, center.z);

  body.addShape(
    new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
  );

  return body;
}

export function createBodyFromProps(
  pos: THREE.Vector3Like,
  size: THREE.Vector3Like,
  options?: CANNON.BodyOptions,
) {
  const body = new CANNON.Body(options);
  body.position.set(pos.x, pos.y, pos.z);

  body.addShape(
    new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
  );

  return body;
}

export const game = new Game();
