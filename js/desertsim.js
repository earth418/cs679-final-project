// const wind = new THREE.Vector2(3.0, 0.0);

const wind = new THREE.Vector2(2.0, 0.0);

let grid = 250;
let fieldSize = 250.0; // meters
const tanThresholdAngleSediment = 0.60; // 33deg
const tanThresholdAngleWindShadowMin = 0.08; // 5deg
const tanThresholdAngleWindShadowMax = 0.26; // 15deg
const matterToMove = 0.1;
const MAX_BOUNCE = 3;

let cellSize = fieldSize / grid; 

// let sediments = new Array(gridX * gridY); // Array<THREE.Vector2>;
// let bedrock = new Array(grid * grid);
// for (i = 0; i < grid; ++i) {
// 	for (j = 0; j < grid; ++j) {
// 		bedrock[i * grid + j] = 5 * simplex.noise2D(i, j);
// 	}
// }

function GetSediment() {}

function SetSediment() {}

function AddSediment() {}

function gridToWorld(vec) {
	vec = Object.assign(new THREE.Vector2(), vec);
    return vec.multiplyScalar(fieldSize / (grid - 1)); // new THREE.Vector2(vec.x * fieldSize / gridX, vec.y * fieldSize / gridY);
}

function worldToGrid(vec) {
	vec = Object.assign(new THREE.Vector2(), vec);
    return vec.multiplyScalar((grid - 1) / fieldSize); // new THREE.Vector2(vec.x * fieldSize / gridX, vec.y * fieldSize / gridY);
}

function CopyVec(vec) {
	vec = Object.assign(new THREE.Vector2(), vec);
	return new THREE.Vector2(vec.x, vec.y);
}

function toIndices(vec) {
	vec = Object.assign(new THREE.Vector2(), vec);
	return [Math.floor(vec.x), Math.floor(vec.y)];
}

function Clamp(x, a = 0, b = 1) {
	return x < a ? a : x > b ? b : x;
}

function Lerp(a, b, alpha) {
	return a + (b - a) * alpha;
}

function GetSedimentBilinear(vec)
{

	vec = Object.assign(new THREE.Vector2(), vec);
	// vec = worldToGrid(vec);
	// let q = p / fieldSize * gridX;
	// d = box.Vertex(1) - box.Vertex(0);

	let texelX = 1.0 / (grid - 1);
	let texelY = 1.0 / (grid - 1);

	let u = vec.x / fieldSize;
	let v = vec.y / fieldSize;

	let i = Math.floor(v * (grid - 1));
	let j = Math.floor(u * (grid - 1));
	// i = Math.floor(Clamp(i, 1, gridX - 2));
	// j = Math.floor(Clamp(j, 1, gridY - 2));

	if (i < 0 || j < 0 || i > grid || j > grid)
		return -1.0;

	let anchorU = j * texelX;
	let anchorV = i * texelY;

	let localU = (u - anchorU) / texelX;
	let localV = (v - anchorV) / texelY;

	let v1 = GetSediment(i, j);
	let v2 = GetSediment(i + 1, j);
	let v3 = GetSediment(i + 1, j + 1);
	let v4 = GetSediment(i, j + 1);

	return (1 - localU) * (1 - localV) * v1
		+ (1 - localU) * localV * v2
		+ localU * (1 - localV) * v4
		+ localU * localV * v3;
}

function Height(vec) {
	vec = Object.assign(new THREE.Vector2(), vec);
	return GetSedimentBilinear(vec); // + GetBedrock(vec.x, vec.y); // bedrock is zero, not implementing that 
	// GetValueBilinear(bedrock, vec) + GetValueBilinear(sediments, vec);
}

function SnapWorld(vec) {
	vec = Object.assign(new THREE.Vector2(), vec);
	
	if (vec.x < 0)
		vec.x = fieldSize + vec.x;
	else if (vec.x >= fieldSize)
		vec.x = vec.x - fieldSize;
	
	if (vec.y < 0)
		vec.y = fieldSize + vec.y;
	else if (vec.y >= fieldSize)
		vec.y = vec.y - fieldSize;

	return vec;
	// return new THREE.Vector2(Clamp(vec.x, 0, fieldSize), Clamp(vec.y, 0, fieldSize));
}

function InvLerp(x, a, b)
{
	if (x < a)
		return 0.0;

	else if (x > b)
		return 1.0;

	else
		return (x - a) / (b - a);
}

function SedimentGradient(xi, yi) {
	ret = new THREE.Vector2(0.0, 0.0);

	// let cellSizeX = fieldSize / (gridX - 1);
	// let cellSizeY = fieldSize / (gridY - 1);

	let i = Math.floor(Clamp(xi, 0, grid - 1));
	let j = Math.floor(Clamp(yi, 0, grid - 1));

	// X Gradient
	if (i == 0)
		ret.x = (GetSediment(i + 1, j) - GetSediment(i, j)) / cellSize;
	else if (i == grid - 1)
		ret.x = (GetSediment(i, j) - GetSediment(i - 1, j)) / cellSize;
	else
		ret.x = (GetSediment(i + 1, j) - GetSediment(i - 1, j)) / (2.0 * cellSize);

	// Y Gradient
	if (j == 0)
		ret.y = (GetSediment(i, j + 1) - GetSediment(i, j)) / cellSize;
	else if (j == grid - 1)
		ret.y = (GetSediment(i, j) - GetSediment(i, j - 1)) / cellSize;
	else
		ret.y = (GetSediment(i, j + 1) - GetSediment(i, j - 1)) / (2.0 * cellSize);

	return ret;
}

let neighbors = [ new THREE.Vector2(1, 0), new THREE.Vector2(1, 1), new THREE.Vector2(0, 1), new THREE.Vector2(-1, 1), 
	new THREE.Vector2(-1, 0), new THREE.Vector2(-1, -1), new THREE.Vector2(0, -1), new THREE.Vector2(1, -1) ];

function CheckSedimentFlowRelative(i, j, tanThresholdAngle)
{
	// p = Object.assign(new THREE.Vector2(), p)
	let p = new THREE.Vector2(i, j);

	let nei = [];
	let nslope = [];
	const zp = GetSediment(i, j);
	
	let slopesum = 0.0;
	for (i = 0; i < 8; i++)
	{
		const nv = neighbors[i];
		let b = CopyVec(p);
		b.add(nv);

		// console.log(b);

		if (b.x < 0 || b.x >= grid || b.y < 0 || b.y >= grid)
			continue;

		let step = zp - GetSediment(Math.floor(b.x), Math.floor(b.y));

		if (step > 0.0 && (step / cellSize * nv.length()) > tanThresholdAngle)
		{
			nei.push(b);
			let slope = step / nv.length();
			nslope.push(slope);
			slopesum += slope;
		}
	}

	// normalize
	for (k = 0; k < nslope.length; k++)
		nslope[k] = nslope[k] / slopesum;

	return [nei, nslope];
}

function StabilizeSedimentRelative(i, j)
{
	let stabilizeQueue = [];
	// Vector2i pts[8];
	// float s[8];
	n = 0;
	stabilizeQueue.push(new THREE.Vector2(i, j));
	while (stabilizeQueue.length > 0)
	{
		let current = stabilizeQueue.shift();

		[idi, idj] = toIndices(current);
		if (GetSediment(idi, idj) <= 0.0)
			continue;

		[pts, s] = CheckSedimentFlowRelative(idi, idj, tanThresholdAngleSediment);
		let n = pts.length;
		if (n == 0)
			continue;

		// Distribute to neighbours
		for (let a = 0; a < n; a++)
		{
			[nIDi, nIDj] = toIndices(pts[a]);

			// sediments[nID] += matterToMove * s[a];
			AddSediment(nIDi, nIDj, matterToMove * s[a]);

			// Push neighbour to latter check stabilization
			stabilizeQueue.push(pts[a]);
		}

		// Remove sediments from the current point
		AddSediment(idi, idj, -matterToMove);
	}
}

function PerformReptationOnCell(i, j, bounce)
{
	// Compute amount of sand to reptate; function of number of bounce.
	let t = Clamp(bounce, 0, MAX_BOUNCE) / 3.0;
	let se = Lerp(matterToMove / 2.0, matterToMove, t);
	let rReptationSquared = 2.0 * 2.0; // 2 grid cells
	let p = gridToWorld(new THREE.Vector2(i, j));

	// Distribute sand at the 2-steepest neighbours
	// Vector2i nei[8];
	[nei, nslope] = CheckSedimentFlowRelative(i, j, tanThresholdAngleSediment);
	let n = Math.min(2, nei.length);
	let nEffective = 0;

	for (let k = 0; k < n; k++)
	{
		let next = CopyVec(nei[k]); // vector 2i
		let sei = se / n;

		// We don't perform reptation if the grid discretization is too low.
		// (If cells are too far away from each other in world space)
		let pk = gridToWorld(next);
		let diff = CopyVec(p).sub(pk);
		if (diff.lengthSq() > rReptationSquared)
			continue;

		// Distribute sediment to neighbour

		// sediments[ToIndex1D(next)] += sei;
		[nI, nJ] = toIndices(next);
		// console.log(nI, nJ);
		AddSediment(nI, nJ, sei);

		// Count the amount of neighbour which received sand from the current cell (i, j)
		nEffective++;
	}

	// Remove sediment at the current cell
	if (n > 0 && nEffective > 0)
	{
		AddSediment(i, j, -se);
	}
}

function IsInShadow(i, j, windDir)
{
	const windStepLength = 1.0;
	windDir = Object.assign(new THREE.Vector2(), windDir);

	const windStep = new THREE.Vector2(
		Math.sign(windDir.x) * windStepLength,
		Math.sign(windDir.y) * windStepLength
	);

	let p = gridToWorld(new THREE.Vector2(i, j));
	let pShadow = CopyVec(p);
	let rShadow = 10.0;
	let hp = Height(p);
	let ret = 0.0;
	// const MAX_ITS = 5;
	// let its = 0;

	while (true)
	{
		pShadow.sub(windStep);

		if (pShadow.equals(p))
			break;

		// console.log(pShadow);

		// let pShadowSnapped = new THREE.Vector2(Clamp(pShadow.x, 0, grid), Clamp(pShadow.y, 0, grid));
		let pShadowSnapped = SnapWorld(pShadow);

		let d = CopyVec(p).sub(pShadow).length();
		if (d > rShadow)
			break;

		let step = Height(pShadowSnapped) - hp;
		// console.log(step / d);
		let s = InvLerp(step / d, tanThresholdAngleWindShadowMin, tanThresholdAngleWindShadowMax);
		ret = Math.max(ret, s);
		// ++its;
	}

	return ret;
}

function ComputeWindAtCell(i, j)
{
	// Base wind direction
	let windDir = new THREE.Vector2(wind.x, wind.y);

	// Modulate wind strength with sediment layer: increase velocity on slope in the direction of the wind
	let g = SedimentGradient(i, j);
	// console.log(g);
	let similarity = 0.0;
	let slope = 0.0;
	const zeroVec = new THREE.Vector2(0.0, 0.0);
	if (!g.equals(zeroVec) && !windDir.equals(zeroVec))
	{
		// (new THREE.Vector2()).le
		slope = Clamp(g.length());
		let normWindDir = CopyVec(windDir).normalize();
		similarity = Clamp(g.normalize().dot(normWindDir));
	}

	// Wind velocity is doubled in the best case
	t = (similarity + slope) / 2.0;

	return windDir.multiplyScalar(1 + t); // Lerp(windDir, 2.0 * windDir, t);
}

function CellInteger(vec) {
	vec = Object.assign(new THREE.Vector2(), vec);
	return [Math.floor(vec.x / fieldSize * grid), Math.floor(vec.y / fieldSize * grid)];
}

function IterateOnce() {

    startI = Math.floor(Math.random() * grid);
	startJ = Math.floor(Math.random() * grid);
    // start1D = ToIndex1D(startI, startJ);
	
	// Compute wind at start cell
	let windDir = ComputeWindAtCell(startI, startJ);
	// console.log(windDir);

	// No sediment to move
	if (GetSediment(startI, startJ) <= 0.0)
		return;

	// Wind shadowing probability
	// console.log(IsInShadow(startI, startJ, windDir));
	if (Math.random() * 1.0 < IsInShadow(startI, startJ, windDir))
	{
		StabilizeSedimentRelative(startI, startJ);
		return;
	}

	// (Lift grain at start cell
	// sediments[start1D] -= matterToMove;
	AddSediment(startI, startJ, -matterToMove);

	// Begin jumping loop, repeat until sand is deposited or MAX_BOUNCE is reached
	let destI = startI;
	let destJ = startJ;
	
	let pos = gridToWorld(new THREE.Vector2(startI, startJ));
	bounce = 0;
	
    while (bounce < MAX_BOUNCE)
	{
		// Compute wind at the current cell
		windDir = ComputeWindAtCell(destI, destJ);

		// Compute new world position and new grid position (after wind addition)
		
		pos.add(windDir);
		pos = SnapWorld(pos);
		[destI, destJ] = CellInteger(pos);

		// Probability of deposition
		p = Math.random();

		// Shadowed cell
		if (p * 1.0 < IsInShadow(destI, destJ, windDir))
		{
			AddSediment(destI, destJ, matterToMove);
			break;
		}
		// Sandy cell - 60% chance of deposition 
		else if (GetSediment(destI, destJ) > 0.0 && p < 0.6) 
		{
			AddSediment(destI, destJ, matterToMove);
			break;
		}
		// Empty cell - 40% chance of deposition 
		else if (GetSediment(destI, destJ) <= 0.0 && p < 0.4) 
		{
			AddSediment(destI, destJ, matterToMove);
			break;
		}

		++bounce;

		// Perform reptation at each bounce
		PerformReptationOnCell(destI, destJ, bounce);
	}
	// End of the deposition loop - sand moved from (startI, startJ) to (destI, destJ)

	// Perform reptation at the deposition location
	PerformReptationOnCell(destI, destJ, bounce);

	// (4) Check for the angle of repose on the original cell
	StabilizeSedimentRelative(startI, startJ);

	// (5) Check for the angle of repose on the destination cell if different
	StabilizeSedimentRelative(destI, destJ);
}

function Simulate(size, verts) {

	GetSediment = function(i, j) {
		let v = verts[(i * size + j) * 3 + 1];
		return v;
	}

	SetSediment = function(i, j, value) {
		verts[(i * size + j) * 3 + 1] = value;
	}

	AddSediment = function(i, j, value) {
		verts[(i * size + j) * 3 + 1] += value;
	}

	grid = size;
	fieldSize = Math.floor(size * 0.5);
	// fieldSize = size;
	cellSize = fieldSize / (size - 1);

	for (let i = 0; i < size*size; ++i)
		IterateOnce();

}