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
const light = new THREE.DirectionalLight(0xffaaaa, 1);
light.position.set(0.5, 1.0, 0.5);
light.target.position.set(0.0, 0.0, 0.0);
light.castShadow = true;

scene.add(light.target);

scene.add(light);

// light.shadow.mapSize.width = 512;
// light.shadow.mapSize.height = 512;
// light.shadow.camera.near = 0.5;
// light.shadow.camera.far = 500;

// Generating geometry

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

function GetBedrock(a, b) {
	return 5 * (1 + simplex.noise2D(3.2 + 0.01 * a, 0.3 - 0.01 * b));
}

// sandGen = function(x, y, hscale, fscale) {
//     return [0.5 + 1.5 * (1 + simplex.noise2D(x * fscale, y * fscale)), 10];
// }

// Barchan Dunes
// sandGen = function(x, y, hscale, fscale) {
//     return [0.5 + 1.5 * Math.random(), 2];
// }

// Transverse Dunes
// sandGen = function(x, y, hscale, fscale) {
//     return [landProperties.sandAmount * 0.75 + 0.25 * landProperties.sandAmount * Math.random(), 6];
// }

// // data = getProcGenData(size, scale, noiseFunc);
// let data = getProcGenData(landProperties.size, landProperties.scale, sandGen);
// let verts = data[0];
// let tris = data[1];
// let colors = new Float32Array(data[2]);
// let normals = new Float32Array(data[3]);

// geo.setIndex(tris);
// geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
// geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
// geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
// geo.getAttribute('position').needsUpdate = true;
// geo.getAttribute('normal').needsUpdate = true;

// const mat = new THREE.MeshStandardMaterial( {
//     side: THREE.DoubleSide,
//     vertexColors: true,
//     flatShading: true
// });

// // Mesh - Scene Component
// let mesh = new THREE.Mesh(geo, mat);

// mesh.position.x = -landProperties.scale * landProperties.size;
// mesh.position.z = -landProperties.scale * landProperties.size;
// mesh.castShadow = true;
// mesh.receiveShadow = true;
let mesh;
// scene.add(mesh);

// Constants

let mov = new THREE.Vector3(0.0, 0.0, 0.0);
let mouseMove = false;
let ogMouseX = 0;
let ogMouseY = 0;
let mouseX = 0.0;
let mouseY = 0.0;
const speed = 0.2;
const sensitivity = 0.03 / Math.min(window.innerHeight, window.innerWidth);
// mesh.geometry.attributes.position.needsUpdate = true;
// mesh.geometry.attributes.normals.needsUpdate = true;

let simulate = false;
let iterations = 0;
let phi = 0;
let theta = 135;

let landProperties = {size : 200, scale : 1.0, minSandAmount : 3.0, maxSandAmount : 4.0, wind : new THREE.Vector2(2.0, 1.0), cellSize : 1.0};

let meshStuff = {Rerender : function() {

    sandGen = function(x, y, hscale, fscale) {
        return [landProperties.minSandAmount + (landProperties.maxSandAmount - landProperties.minSandAmount) * Math.random(), landProperties.maxSandAmount];
    }

    scene.remove(mesh);

    // verts = [];
    // tris = [];
    // colors = [];
    // normals = [];

    const data = getProcGenData(landProperties.size, landProperties.scale * 0.5, sandGen);
    verts = new Float32Array(data[0]);
    tris = data[1];
    colors = new Float32Array(data[2]);
    normals = new Float32Array(data[3]);
    
    const geo = new THREE.BufferGeometry();
    
    geo.setIndex(tris);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.getAttribute('position').needsUpdate = true;
    geo.getAttribute('normal').needsUpdate = true;
    
    const mat = new THREE.MeshStandardMaterial( {
        side: THREE.DoubleSide,
        vertexColors: true,
        flatShading: true
    });

    // Mesh - Scene Component
    mesh = new THREE.Mesh(geo, mat);
    
    mesh.position.x = -landProperties.scale * landProperties.size * 0.5;
    mesh.position.z = -landProperties.scale * landProperties.size * 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // if (!scene.children.includes(mesh))
    scene.add(mesh);
}};

meshStuff.Rerender();

const gui = new dat.GUI();
const landFolder = gui.addFolder('Land');
landFolder.add(landProperties, 'size', 32, 512);
landFolder.add(landProperties, 'scale', 0.1, 2.0);
landFolder.add(landProperties, 'cellSize', 0.25, 2.0);
landFolder.add(landProperties.wind, 'x', -10.0, 10.0);
landFolder.add(landProperties.wind, 'y', -10.0, 10.0);
landFolder.add(landProperties, 'minSandAmount', 0.1, 10.0);
landFolder.add(landProperties, 'maxSandAmount', 0.1, 10.0);
landFolder.add(meshStuff, 'Rerender');
landFolder.open();

function anim() {
    requestAnimationFrame(anim);
    
    if (mouseMove) {
        theta += (mouseX - ogMouseX) * sensitivity;
        phi += (mouseY - ogMouseY) * sensitivity * 0.5;
    }
    // ogMouseX = mouseX;
    // ogMouseY = mouseY;
    let targetPos = new THREE.Vector3();
    targetPos.setFromSphericalCoords(1, 90 - phi, theta).add(camera.position);
    camera.lookAt(targetPos);

    // light.position.x += 0.1;

    let newx = mov.x * Math.cos(camera.rotation.y) + mov.z * Math.sin(camera.rotation.y);
    let newz = -mov.x * Math.sin(camera.rotation.y) + mov.z * Math.cos(camera.rotation.y);
    let dp = new THREE.Vector3(newx, mov.y, newz);
    // let dp = forward.multiplyScalar(speed);
    // dp = dp.multiply(mov);
    camera.position.add(dp);

    if (simulate && iterations % 5 == 0) {

        console.log("Simulating...");

        // let poss = mesh.geometry.getAttribute('position').array;
        // let norms = mesh.geometry.getAttribute('normal').array;
        let poss = mesh.geometry.attributes.position.array;
        // let norms = mesh.geometry.attributes.normal.array;
        Simulate(landProperties.size, poss, landProperties.cellSize, landProperties.wind);

        // for (i = 0; i < landProperties.size; ++i) 
        //     for (j = 0; j < landProperties.size; ++j)
        //         poss[3 * (i * landProperties.size + j) + 1] = 4 * verts[3 * (i * landProperties.size + j) + 1]; 

        mesh.geometry.attributes.position.needsUpdate = true;
        // mesh.geometry.attributes.normal.needsUpdate = true;
    }

    ++iterations;
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
        case "e":
            mov.y = sc;
            break;
        case "q":
            mov.y = -sc;
            break;
        case " ":
            simulate = key_down;
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