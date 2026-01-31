import * as THREE from "three";

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
    const { whiteMaterial, blueMaterial } = await this.getWallMaterials();

    // Direction are looking down -z
    const frontWall = this.buildWall(
      blueMaterial,
      whiteMaterial,
      this.roomLength,
    );
    frontWall.position.z -= this.roomWidth / 2;

    const backWall = this.buildWall(
      blueMaterial,
      whiteMaterial,
      this.roomLength,
    );
    backWall.position.z += this.roomWidth / 2;
    backWall.rotateY(Math.PI);

    const leftEnd = this.buildWall(blueMaterial, whiteMaterial, this.roomWidth);
    leftEnd.position.x = -this.roomLength / 2;
    leftEnd.rotateY(Math.PI / 2);

    const rightEnd = this.buildWall(
      blueMaterial,
      whiteMaterial,
      this.roomWidth,
    );
    rightEnd.position.x = this.roomLength / 2;
    rightEnd.rotateY(-Math.PI / 2);

    this.scene.add(frontWall, backWall, leftEnd, rightEnd);
  }

  private async getWallMaterials() {
    const wallRepeat = new THREE.Vector2(
      this.roomLength / 2,
      this.wallHeight / 4,
    );

    const whiteTexture = await this.loadTexture("/textures/wall_white.png");
    const blueTexture = await this.loadTexture("/textures/wall_blue.png");
    const normal = await this.loadTexture("/textures/wall_normal.png");

    whiteTexture.repeat.copy(wallRepeat);
    blueTexture.repeat.copy(wallRepeat);
    normal.repeat.copy(wallRepeat);

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

    return { whiteMaterial, blueMaterial };
  }

  private buildWall(
    blueMaterial: THREE.MeshPhysicalMaterial,
    whiteMaterial: THREE.MeshPhysicalMaterial,
    length: number,
  ) {
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
  return new URL(path, import.meta.url).href;
}
