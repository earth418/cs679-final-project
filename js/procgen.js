function lerpColors(a, b, alpha) {
    // (new THREE.Color()).mul
    return a.add((b.sub(a)).multiplyScalar(alpha));
}

function colorFromPoint(z, zmax) {
    // const bot = new THREE.Color(0.0, 0.5, 0.0);
    // const top = new THREE.Color(0.8, 0.8, 0.8);
    // const v = lerpColors(bot, top, z / zmax);
    const v = new THREE.Color(0.8, 0.7, 0.6);
    
    return v;
}

function vecFromArray(ind, array) {
    return new THREE.Vector3(array[ind], array[ind + 1], array[ind + 2]);
}

/**
 * @param verts the vertex positions
 * @param normals the normals
 * @param size the size of the map
 * @param erosion_its the number of iterations of erosion
 * @param kErosion How much erosion each iteration should do
 * @param kDepsosition How much each iteration should deposit
 * @param kFriction How much friction is applied to each iteration of erosion
 * @return The modified vertex array
 *
**/
function erode(verts, normals, size, erosion_its, kErosion, kDeposition, kFriction) {
    const maxIterations = 100;
    const speed = 1;
    const iterationScale = 0.05; 

    for (erosions = 0; erosions < erosion_its; ++erosions) {

        let pos = new THREE.Vector2(Math.random() * size, Math.random() * size);
        let lastPos = new THREE.Vector2(0.0, 0.0);
        let vel = new THREE.Vector2(0.0, 0.0);
        let sediment = 0;

        for (i = 0; i < maxIterations; ++i) {
            let index = Math.floor(pos.x) * size + Math.floor(pos.y);
            let normal = vecFromArray(index, normals);

            if (normal.y == 1.0)
                break;

            // the y value of the vertex
            const deposit = sediment * kDeposition * normal.y;
            const erosion = kErosion * (1 - normal.y) * Math.min(1, i * iterationScale);

            verts[index + 1] += deposit - erosion;
            sediment += erosion - deposit;

            vel.x = kFriction * vel.x + normal.x * speed;
            vel.z = kFriction * vel.z + normal.z * speed;
            lastPos = pos;
            pos += vel;
        }
    }
    
    return verts;
}

/**
* @return An array with four elements, in the following order: vertex data (positions), 
* index data (triangles), color data, and normals.
*
**/
function getProcGenData(size, scale, func)
{
    verts = [];
    tris = [];
    colors = [];
    normals = [];
    // const hmax = scale;

    for (i = 0; i < size; i++) {
        for (j = 0; j < size; j++) {
            x = i * scale;
            z = j * scale;
            [y, hmax] = func(x, z, scale * 20, 0.01);
            verts.push(x, y, z);
            const vin = i * size + j;
    
            if (i != size - 1 && j != size - 1) {
    
                tris.push(vin, vin + 1, vin + size + 1);
                tris.push(vin + size + 1, vin + size, vin); // for some reason, it has to be in this order
            }
    
            let p_v = new THREE.Vector3(verts[vin - 3], verts[vin - 2], verts[vin - 1]); // previous location
            let tan = p_v.sub(new THREE.Vector3(x, y, z));
            let norm = new THREE.Vector3(tan.x, -1.0, tan.z).normalize();

            // normals.push(0.0, 1.0, 0.0);
            normals.push(norm.x, norm.y, norm.z);
            cc = colorFromPoint(y, hmax);
            // (new THREE.Color()).r
            colors.push(cc.r, cc.g, cc.b);
        }
    }

    // verts = erode(verts, normals, size * scale, 50000, 0.03, 0.05, 0.5);

    return [verts, tris, colors, normals];
}