// const { Vector3 } = require("./three");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, (window.innerWidth / window.innerHeight), 0.1, 1000);
camera.position.y = 2;

const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.margin = "0";
renderer.domElement.style.zIndex = "-1";
// renderer.domElement.style.position = "fixed";

document.body.appendChild(renderer.domElement);


// Light
const light = new THREE.DirectionalLight(0xffaaaa, 2.5);
light.position.set(1.0, 1.0, 1.0);
light.target.position.set(-1.0, 0.0, -1.0);
light.castShadow = true;

// scene.add(light.target);

scene.add(light);

// light.shadow.mapSize.width = 512;
// light.shadow.mapSize.height = 512;
// light.shadow.camera.near = 0.5;
// light.shadow.camera.far = 500;

// Generating geometry

const geo = new THREE.BufferGeometry();

let size = 100;
let scale = 2.0;

const simplex = new SimplexNoise();

noiseFunc = function(x, y, hscale, fscale) {

    let noise = 0.0;
    const persistence = 0.5;
    const lacunarity = 2.0;
    const octaves = 8;
    let pers = 0.5;
    let lac = 2.25;
    
    let hmax = 1.0;

    // noise = simplex.noise2D(x, y);
    // noise += simplex.noise2D(2 * x, 2 * y) * 0.5;
    // noise += simplex.noise2D(4 * x, 4 * y) * 0.25;
    // noise += simplex.noise2D(8 * x, 8 * y) * 0.125;

    for (let octave = 0; octave < octaves; octave++) {
        hmax += pers;

        noise += simplex.noise2D(x / lac * fscale, y / lac * fscale) * pers;
        pers *= persistence;
        lac /= lacunarity;
    }

    return [noise * hscale, hscale * hmax];
}

data = getProcGenData(size, scale, noiseFunc);
verts = data[0];
tris = data[1];
colors = data[2];
normals = data[3];

geo.setIndex(tris);
geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

const mat = new THREE.MeshStandardMaterial( {
    side: THREE.DoubleSide,
    vertexColors: true,
    flatShading: true
});

// Mesh - Scene Component
const mesh = new THREE.Mesh(geo, mat);

mesh.position.x = -scale * size;
mesh.position.z = -scale * size;
mesh.castShadow = true;
mesh.receiveShadow = true;

scene.add(mesh);

// Constants

let mov = new THREE.Vector3(0.0, 0.0, 0.0);
let mouseMove = false;
let ogMouseX = 0;
let ogMouseY = 0;
let mouseX = 0.0;
let mouseY = 0.0;
const speed = 0.2;
const sensitivity = 1.0 / Math.min(window.innerHeight, window.innerWidth);


function anim() {
    requestAnimationFrame(anim);

    // camera.rotation.x += 0.1;
    // mov.cross(camera.up);
    // let v = new THREE.Vector3();
    // camera.getWorldDirection(v);
    
    if (mouseMove) {
        camera.rotation.y += (mouseX - ogMouseX) * sensitivity;
        camera.rotation.x += (mouseY - ogMouseY) * sensitivity;
    }
    ogMouseX = mouseX;
    ogMouseY = mouseY;

    // light.position.x += 0.1;

    let newx = mov.x * Math.cos(camera.rotation.y) + mov.z * Math.sin(camera.rotation.y);
    let newz = -mov.x * Math.sin(camera.rotation.y) + mov.z * Math.cos(camera.rotation.y);
    let dp = new THREE.Vector3(newx, mov.y, newz);
    // let dp = forward.multiplyScalar(speed);
    // dp = dp.multiply(mov);
    camera.position.add(dp);

    renderer.render(scene, camera);
}

function keyPress(event, key_down) {
    if (event.defaultPrevented)
        return;

    const sc = key_down * 1.0;
    
    switch (event.key) {
        case "ArrowDown":
        case "s":
            mov.z = sc;
            break;
        case "ArrowUp":
        case "w":
            mov.z = -sc;
            break;
        case "ArrowLeft":
        case "a":
            mov.x = -sc;
            break;
        case "ArrowRight":
        case "d":
            mov.x = sc;
            break;
        case " ":
            mov.y = sc;
            break;
        case "Shift":
            mov.y = -sc;
            break;
    }

    event.preventDefault();
}

anim();
window.addEventListener("keydown", function(event) {keyPress(event, true);}, true);
window.addEventListener("keyup", function(event) {keyPress(event, false);}, true);

window.addEventListener("mousedown", function(event) {
    mouseMove = true;
    ogMouseX = event.clientX;
    ogMouseY = event.clientY;
}, true);

window.addEventListener("mousemove", function(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

window.addEventListener("mouseup", function(event) {
    mouseMove = false;
}, true);