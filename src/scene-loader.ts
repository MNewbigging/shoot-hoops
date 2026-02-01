import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { createBodyFromMesh, createBodyFromGroup, Game } from "./game";

export class SceneLoader {
  private textureLoader = new THREE.TextureLoader();

  private readonly roomLength = 28;
  private readonly roomWidth = 15;
  private readonly wallHeight = 8;

  private roomLengthHalved: number;
  private roomWidthHalved: number;

  constructor(
    private scene: THREE.Scene,
    private renderer: THREE.WebGLRenderer,
    private addBody: (body: CANNON.Body | null) => void,
  ) {
    this.roomLengthHalved = this.roomLength / 2;
    this.roomWidthHalved = this.roomWidth / 2;
  }

  async loadScene() {
    await this.setupFloor();
    await this.setupWalls();
    this.setupCeiling();
    await this.setupHoops();
  }

  async loadBall() {
    const loader = new GLTFLoader();
    const url = getUrl("/models/basketball_ball.glb");
    const ball = await loader.loadAsync(url);
    return ball.scene;
  }

  private async setupFloor() {
    const floorTexture = await this.loadTexture("/textures/gym_floor.png");
    const floorMat = new THREE.MeshPhysicalMaterial({
      map: floorTexture,
      roughness: 0.45,
      metalness: 0.0,
    });

    const floorWidth = 28;
    const floorHeight = 15;
    const floorGeom = new THREE.PlaneGeometry(floorWidth, floorHeight);
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotateX(-Math.PI / 2);
    this.scene.add(floor);

    const body = createBodyFromMesh(floor, {
      type: CANNON.BODY_TYPES.STATIC,
      material: Game.floorMaterial,
    });
    this.addBody(body);

    // Add some grime to the floor
    for (let i = 0; i < 4; i++) {
      const decalSize = 2; // 0.2 + Math.random();
      const decalSizeHalved = decalSize / 2;
      const decal = await this.getGrimeDecal(decalSize);

      decal.position.set(
        randomRange(
          -this.roomLengthHalved + decalSizeHalved,
          this.roomLengthHalved - decalSizeHalved,
        ),
        0.01,
        randomRange(
          -this.roomWidthHalved + decalSizeHalved,
          this.roomWidthHalved - decalSizeHalved,
        ),
      );

      decal.rotateX(-Math.PI / 2);
      decal.rotateOnWorldAxis(
        new THREE.Vector3(0, 1, 0),
        Math.random() * Math.PI,
      );

      this.scene.add(decal);
    }
  }

  private async setupWalls() {
    const options: CANNON.BodyOptions = {
      type: CANNON.BODY_TYPES.STATIC,
      material: Game.wallMaterial,
    };

    // Walls
    const front = await this.buildWall(this.roomLength);
    front.position.z = -this.roomWidthHalved;
    this.addBody(createBodyFromGroup(front, options));

    const back = await this.buildWall(this.roomLength);
    back.position.z = this.roomWidthHalved;
    back.rotateY(Math.PI);
    this.addBody(createBodyFromGroup(back, options));

    const left = await this.buildWall(this.roomWidth);
    left.position.x = -this.roomLengthHalved;
    left.rotateY(Math.PI / 2);
    this.addBody(createBodyFromGroup(left, options));

    const right = await this.buildWall(this.roomWidth);
    right.position.x = this.roomLengthHalved;
    right.rotateY(-Math.PI / 2);
    this.scene.add(front, back, left, right);
    this.addBody(createBodyFromGroup(right, options));

    // Grime decals on walls
    await this.grimeWalls();

    // Props
    const door = await this.buildDoor();
    door.rotateY(-Math.PI / 2);
    door.position.x = this.roomLengthHalved - 0.001;
    door.position.z = this.roomWidthHalved / 2;

    this.scene.add(door);
  }

  private async buildWall(length: number) {
    // Get new textures because repeat differs per side/end wall
    const whiteTexture = await this.loadTexture("/textures/wall_white.png");
    const blueTexture = await this.loadTexture("/textures/wall_blue.png");
    const normal = await this.loadTexture("/textures/wall_normal.png");

    const repeat = new THREE.Vector2(length / 2, this.wallHeight / 4); // 2 rows so divide by 4
    whiteTexture.repeat.copy(repeat);
    blueTexture.repeat.copy(repeat);
    normal.repeat.copy(repeat);

    // Create materials
    const normalScale = new THREE.Vector2(1.8, 1.8);
    const whiteMaterial = new THREE.MeshPhysicalMaterial({
      map: whiteTexture,
      normalMap: normal,
      normalScale,
      roughness: 0.85,
      metalness: 0.0,
    });

    const blueMaterial = new THREE.MeshPhysicalMaterial({
      map: blueTexture,
      normalMap: normal,
      normalScale,
      roughness: 0.85,
      metalness: 0.0,
    });

    const wall = new THREE.Group();

    const bluePart = new THREE.Mesh(
      new THREE.PlaneGeometry(length, this.wallHeight / 2),
      blueMaterial,
    );

    bluePart.position.y = this.wallHeight / 4;

    const whitePart = new THREE.Mesh(
      new THREE.PlaneGeometry(length, this.wallHeight / 2),
      whiteMaterial,
    );

    whitePart.position.y = (this.wallHeight / 4) * 3;

    wall.add(bluePart, whitePart);

    return wall;
  }

  private async buildDoor() {
    const map = await this.loadTexture("/textures/door_albedo.png");
    const normalMap = await this.loadTexture("/textures/door_normal.png");

    const mat = new THREE.MeshStandardMaterial({
      map,
      normalMap,
      normalScale: new THREE.Vector2(2.2, 2.2),
      transparent: true,
      roughness: 0.65,
      metalness: 0.05,
      alphaTest: 0.5,
      depthWrite: false,
    });

    const height = 3.2;
    const width = 3.2;

    const door = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);

    door.position.y += height / 2 - 0.295;

    return door;
  }

  private async grimeWalls() {
    const minDecalsPerWall = 2;
    const maxDecalsPerWall = 5;

    // Front wall
    const frontDecals = randomRangeInt(minDecalsPerWall, maxDecalsPerWall);
    for (let i = 0; i < frontDecals; i++) {
      const decalSize = 0.3 + Math.random();
      const decal = await this.getGrimeDecal(decalSize);
      decal.position.set(
        randomRange(-this.roomLengthHalved + decalSize, this.roomLengthHalved),
        randomRange(decalSize, this.wallHeight - decalSize),
        -this.roomWidthHalved + 0.01,
      );
      decal.rotateZ(Math.random() * Math.PI);
      this.scene.add(decal);
    }

    // Back wall
    const backDecals = randomRangeInt(minDecalsPerWall, maxDecalsPerWall);
    for (let i = 0; i < backDecals; i++) {
      const decalSize = 0.3 + Math.random();
      const decal = await this.getGrimeDecal(decalSize);
      decal.position.set(
        randomRange(-this.roomLengthHalved + decalSize, this.roomLengthHalved),
        randomRange(decalSize, this.wallHeight - decalSize),
        this.roomWidthHalved - 0.01,
      );
      decal.rotateY(Math.PI);
      decal.rotateZ(Math.random() * Math.PI);
      this.scene.add(decal);
    }

    // Left end
    const leftEndDecals = randomRangeInt(minDecalsPerWall, maxDecalsPerWall);
    for (let i = 0; i < leftEndDecals; i++) {
      const decalSize = 0.3 + Math.random();
      const decal = await this.getGrimeDecal(decalSize);
      decal.position.set(
        -this.roomLengthHalved + 0.01,
        randomRange(decalSize, this.wallHeight - decalSize),
        randomRange(
          -this.roomWidthHalved + decalSize,
          this.roomWidthHalved - decalSize,
        ),
      );
      decal.rotateY(Math.PI / 2);
      decal.rotateOnWorldAxis(
        new THREE.Vector3(1, 0, 0),
        Math.random() * Math.PI,
      );
      this.scene.add(decal);
    }

    // Right end
    const rightEndDecals = randomRangeInt(minDecalsPerWall, maxDecalsPerWall);
    for (let i = 0; i < rightEndDecals; i++) {
      const decalSize = 0.3 + Math.random();
      const decal = await this.getGrimeDecal(decalSize);
      decal.position.set(
        this.roomLengthHalved - 0.01,
        randomRange(decalSize, this.wallHeight - decalSize),
        randomRange(
          -this.roomWidthHalved + decalSize,
          this.roomWidthHalved - decalSize,
        ),
      );
      decal.rotateY(-Math.PI / 2);
      decal.rotateOnWorldAxis(
        new THREE.Vector3(1, 0, 0),
        Math.random() * Math.PI,
      );
      this.scene.add(decal);
    }
  }

  private async getGrimeDecal(size: number) {
    const grimeToUse = Math.random() < 0.5 ? "grime_1" : "grime_2";
    const map = await this.loadTexture(`/textures/${grimeToUse}.png`);

    const grimeMat = new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      depthWrite: false,
      roughness: 1.0,
      metalness: 0.0,
      opacity: 0.2 + Math.random() * 0.3,
    });

    const decal = new THREE.Mesh(new THREE.PlaneGeometry(size, size), grimeMat);

    decal.position.y += size / 2;

    //decal.rotateZ(Math.random() * Math.PI);

    return decal;
  }

  private async setupCeiling() {
    const options: CANNON.BodyOptions = {
      type: CANNON.BODY_TYPES.STATIC,
      material: Game.wallMaterial,
    };

    // Ceiling plane
    const ceilingGeom = new THREE.PlaneGeometry(
      this.roomLength,
      this.roomWidth,
    );
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,
      roughness: 0.95,
      metalness: 0.0,
    });
    const ceiling = new THREE.Mesh(ceilingGeom, ceilingMat);
    ceiling.rotateX(Math.PI / 2);
    ceiling.position.y = this.wallHeight;
    this.scene.add(ceiling);

    const ceilingBody = createBodyFromMesh(ceiling, options);
    this.addBody(ceilingBody);

    // Beams
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0xe5e5e5,
      roughness: 0.9,
      metalness: 0.0,
    });

    const beamWidth = 0.25;
    const beamHeight = 0.35;

    // Length-wise beams
    const beam1 = new THREE.Mesh(
      new THREE.BoxGeometry(this.roomLength, beamHeight, beamWidth),
      beamMat,
    );
    beam1.position.set(0, this.wallHeight, -this.roomWidth / 4);

    const beam2 = new THREE.Mesh(
      new THREE.BoxGeometry(this.roomLength, beamHeight, beamWidth),
      beamMat,
    );
    beam2.position.set(0, this.wallHeight, this.roomWidth / 4);

    this.scene.add(beam1, beam2);
    this.addBody(createBodyFromMesh(beam1, options));
    this.addBody(createBodyFromMesh(beam2, options));

    // Cross beams
    for (let x = -12; x <= 12; x += 4) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(beamWidth, beamHeight, this.roomWidth),
        beamMat,
      );
      beam.position.set(x, this.wallHeight, 0);
      this.scene.add(beam);
      this.addBody(createBodyFromMesh(beam, options));
    }

    // Light boxes
    const lb1 = this.buildLightBox(-6, 7.7, -3.75);
    const lb2 = this.buildLightBox(6, 7.7, -3.75);
    const lb3 = this.buildLightBox(-6, 7.7, 3.75);
    const lb4 = this.buildLightBox(6, 7.7, 3.75);

    this.scene.add(lb1, lb2, lb3, lb4);

    this.addBody(createBodyFromGroup(lb1, options));
    this.addBody(createBodyFromGroup(lb2, options));
    this.addBody(createBodyFromGroup(lb3, options));
    this.addBody(createBodyFromGroup(lb4, options));
  }

  private buildLightBox(xPos: number, yPos: number, zPos: number) {
    const width = 0.5;
    const length = 2.4;
    const height = 0.2;

    // The box
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(length + 0.1, height, width + 0.1),
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 1.0,
        metalness: 0.0,
      }),
    );

    // The light panel
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(length, width),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 2.0, // visual brightness
        roughness: 0.3,
        metalness: 0.0,
      }),
    );
    panel.rotateX(Math.PI / 2);
    panel.position.y -= 0.11;

    // The light
    // const light = new THREE.RectAreaLight(0xffffff, 8, length, width);
    // light.rotateX(-Math.PI / 2);
    // light.position.y -= height / 2 + 0.01;

    const lightbox = new THREE.Group();
    lightbox.add(box, panel); // add light

    lightbox.position.set(xPos, yPos, zPos);

    return lightbox;
  }

  private async setupHoops() {
    // Todo build hoop base myself
    const loader = new GLTFLoader();
    const url = getUrl("/models/hoop2.glb");
    const gltf = await loader.loadAsync(url);
    const hoopModel = gltf.scene;
    hoopModel.scale.multiplyScalar(0.015);

    const mountDepth = 1.5;
    const hoopHeight = 4;

    const leftHoop = this.buildHoop(
      hoopModel,
      mountDepth,
      {
        x: -this.roomLengthHalved + mountDepth,
        y: hoopHeight,
        z: 0,
      },
      {
        axis: { x: 0, y: 1, z: 0 },
        angle: Math.PI / 2,
      },
    );
    this.scene.add(leftHoop);

    const rightHoop = this.buildHoop(
      hoopModel.clone(true),
      mountDepth,
      {
        x: this.roomLengthHalved - mountDepth,
        y: hoopHeight,
        z: 0,
      },
      {
        axis: { x: 0, y: 1, z: 0 },
        angle: -Math.PI / 2,
      },
    );
    this.scene.add(rightHoop);
  }

  private buildHoop(
    hoopModel: THREE.Group,
    mountDepth: number,
    pos: THREE.Vector3Like,
    axisAngle: { axis: THREE.Vector3Like; angle: number },
  ) {
    // Create the mount
    const mountMaterial = new THREE.MeshStandardMaterial({
      color: 0x191f22,
      roughness: 0.45,
      metalness: 0.7,
    });

    // Backboard is 0.63m wide, 1.5m tall
    const mountThickness = 0.06;
    const middleOffset = 0.5;

    const wallBracketLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1.2, mountThickness),
      mountMaterial,
    );
    wallBracketLeft.name = "wall-bracket-left";
    const wallBracketRight = wallBracketLeft.clone();
    wallBracketRight.name = "wall-bracket-right";

    wallBracketLeft.position.x = -middleOffset;
    wallBracketRight.position.x = middleOffset;

    const upperArmLeft = new THREE.Mesh(
      new THREE.BoxGeometry(mountThickness, mountThickness, mountDepth),
      mountMaterial,
    );
    const upperArmRight = upperArmLeft.clone();
    const lowerArmLeft = upperArmLeft.clone();
    const lowerArmRight = upperArmLeft.clone();

    upperArmLeft.name = "upper-arm-left";
    upperArmRight.name = "upper-arm-right";
    lowerArmLeft.name = "lower-arm-left";
    lowerArmRight.name = "lower-arm-right";

    upperArmLeft.position.set(-middleOffset, 0.25, mountDepth / 2);
    upperArmRight.position.set(middleOffset, 0.25, mountDepth / 2);
    lowerArmLeft.position.set(-middleOffset, -0.25, mountDepth / 2);
    lowerArmRight.position.set(middleOffset, -0.25, mountDepth / 2);

    const mount = new THREE.Group();
    mount.add(
      wallBracketLeft,
      wallBracketRight,
      upperArmLeft,
      upperArmRight,
      lowerArmLeft,
      lowerArmRight,
    );

    mount.position.z = -mountDepth;

    const hoop = new THREE.Group();
    hoop.add(mount, hoopModel);

    hoop.position.copy(pos);
    hoop.setRotationFromAxisAngle(
      new THREE.Vector3().copy(axisAngle.axis),
      axisAngle.angle,
    );

    // Now we can do physics bodies
    const options: CANNON.BodyOptions = {
      type: CANNON.BODY_TYPES.STATIC,
      material: Game.floorMaterial,
    };

    this.addBody(createBodyFromMesh(wallBracketLeft, options));
    this.addBody(createBodyFromMesh(wallBracketRight, options));
    this.addBody(createBodyFromMesh(upperArmLeft, options));
    this.addBody(createBodyFromMesh(upperArmRight, options));
    this.addBody(createBodyFromMesh(lowerArmLeft, options));
    this.addBody(createBodyFromMesh(lowerArmRight, options));

    hoopModel.traverse((child) => {
      if (child.name === "Backboard" && child instanceof THREE.Mesh) {
        // todo split the backboard in blender so this will work
        this.addBody(createBodyFromMesh(child, options));
      }
      if (child.name === "Rim_frame" && child instanceof THREE.Mesh) {
        this.addBody(createBodyFromMesh(child, options));
      }
    });

    // Hoop rims are tricky - they require a ring of spheres
    const rim = hoopModel.getObjectByName("Rim");
    if (rim) {
      const pos = rim.getWorldPosition(new THREE.Vector3());
      this.makeRimBodies(pos);
    }

    return hoop;
  }

  private makeRimBodies(center: THREE.Vector3) {
    const rimRadius = 0.25;
    const tubeRadius = 0.01;
    const sphereCount = 40;

    const body = new CANNON.Body({
      type: CANNON.BODY_TYPES.STATIC,
      material: Game.floorMaterial,
    });

    const shape = new CANNON.Sphere(tubeRadius);

    for (let i = 0; i < sphereCount; i++) {
      const a = (i / sphereCount) * Math.PI * 2;
      const x = Math.cos(a) * rimRadius;
      const z = Math.sin(a) * rimRadius;
      body.addShape(shape, new CANNON.Vec3(x, 0, z));
    }

    body.position.set(center.x, center.y, center.z);
    this.addBody(body);
  }

  private async loadTexture(path: string) {
    const url = getUrl(path);
    const texture = await this.textureLoader.loadAsync(url);

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    // const t = texture;
    // console.log("for texture: ", path);
    // console.log("map size:", t.image.width, t.image.height);
    // console.log("wrapS/wrapT:", t.wrapS, t.wrapT); // should be 1000 / 1000

    texture.needsUpdate = true;

    return texture;
  }
}

function getUrl(path: string) {
  // Add path prefix if not on localhost
  const prefix = location.hostname === "localhost" ? "" : "/shoot-hoops";
  const adjustedPath = `${prefix}${path}`;
  return new URL(adjustedPath, import.meta.url).href;
}

function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomRangeInt(min: number, max: number) {
  const result = Math.floor(randomRange(min, max));
  return result;
}

/**
 * For static objects:
 * - build, place and rotate objects first
 * - then make the physics body for it
 */
