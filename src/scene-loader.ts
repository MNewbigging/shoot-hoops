import * as THREE from "three";

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
  ) {
    this.roomLengthHalved = this.roomLength / 2;
    this.roomWidthHalved = this.roomWidth / 2;
  }

  async loadScene() {
    await this.setupFloor();
    await this.setupWalls();
    this.setupCeiling();
  }

  async loadBall() {}

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
    // Walls
    const front = await this.buildWall(this.roomLength);
    front.position.z = -this.roomWidthHalved;

    const back = await this.buildWall(this.roomLength);
    back.position.z = this.roomWidthHalved;
    back.rotateY(Math.PI);

    const left = await this.buildWall(this.roomWidth);
    left.position.x = -this.roomLengthHalved;
    left.rotateY(Math.PI / 2);

    const right = await this.buildWall(this.roomWidth);
    right.position.x = this.roomLengthHalved;
    right.rotateY(-Math.PI / 2);

    this.scene.add(front, back, left, right);

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
    const frontDecals = randomRange(minDecalsPerWall, maxDecalsPerWall);
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
    const backDecals = randomRange(minDecalsPerWall, maxDecalsPerWall);
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
    const leftEndDecals = randomRange(minDecalsPerWall, maxDecalsPerWall);
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
    const rightEndDecals = randomRange(minDecalsPerWall, maxDecalsPerWall);
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

    // Cross beams
    for (let x = -12; x <= 12; x += 4) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(beamWidth, beamHeight, this.roomWidth),
        beamMat,
      );
      beam.position.set(x, this.wallHeight, 0);
      this.scene.add(beam);
    }

    // Light boxes
    this.scene.add(this.buildLightBox(-6, 7.7, -3.75));
    this.scene.add(this.buildLightBox(6, 7.7, -3.75));
    this.scene.add(this.buildLightBox(-6, 7.7, 3.75));
    this.scene.add(this.buildLightBox(6, 7.7, 3.75));
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
  return min + Math.random() * (max - min);
}
