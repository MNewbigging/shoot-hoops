import * as THREE from "three";

import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper";

export class SceneLoader {
  private textureLoader = new THREE.TextureLoader();

  private readonly roomLength = 28;
  private readonly roomWidth = 15;
  private readonly wallHeight = 8;

  constructor(
    private scene: THREE.Scene,
    private renderer: THREE.WebGLRenderer,
  ) {}

  async loadScene() {
    await this.setupFloor();
    await this.setupWalls();
    this.setupCeiling();
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
  }

  private async setupWalls() {
    // Walls
    const front = await this.buildWall(this.roomLength);
    front.position.z = -this.roomWidth / 2;

    const back = await this.buildWall(this.roomLength);
    back.position.z = this.roomWidth / 2;
    back.rotateY(Math.PI);

    const left = await this.buildWall(this.roomWidth);
    left.position.x = -this.roomLength / 2;
    left.rotateY(Math.PI / 2);

    const right = await this.buildWall(this.roomWidth);
    right.position.x = this.roomLength / 2;
    right.rotateY(-Math.PI / 2);

    this.scene.add(front, back, left, right);

    // Props
    const door = await this.buildDoor();
    door.rotateY(-Math.PI / 2);
    door.position.x = this.roomLength / 2 - 0.001;

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
    });

    const height = 3.2;
    const width = 2.8;

    const door = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);

    door.position.y += height / 2 - 0.3;

    return door;
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
