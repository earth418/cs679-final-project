const wind = new THREE.Vector2(5.0, 2.0);
let grid = 125;
let fieldSize = 125.0; // meters
const tanThresholdAngleSediment = 0.60; // 33deg
const tanThresholdAngleWindShadowMin = 0.08; // 5deg
const tanThresholdAngleWindShadowMax = 0.26; // 15deg
// float tanThresholdAngleSediment = 0.60f;		// ~33�
	// float tanThresholdAngleWindShadowMin = 0.08f;	// ~5�
	// float tanThresholdAngleWindShadowMax = 0.26f;	// ~15�
	// float tanThresholdAngleBedrock = 2.5f;			// ~68�
const matterToMove = 0.05;
const MAX_BOUNCE = 3;
const cellSize = fieldSize / grid; 

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
    return vec.multiplyScalar(fieldSize / grid); // new THREE.Vector2(vec.x * fieldSize / gridX, vec.y * fieldSize / gridY);
}

function CopyVec(vec) {
	vec = Object.assign(new THREE.Vector2(), vec);
	return new THREE.Vector2(vec.x, vec.y);
}

function toIndices(vec) {
	vec = Object.assign(new THREE.Vector2(), vec);
	return [Math.floor(vec.x), Math.floor(vec.y)];
}

function Clamp(x, a, b) {
	return x < a ? a : x > b ? b : x;
}

function Lerp(a, b, alpha) {
	return a + (b - a) * alpha;
}

function GetBedrock(a, b) {
	return 2 * (1 + simplex.noise2D(3.2 + 0.01 * a, 0.3 - 0.01 * b));
}

function GetSedimentBilinear(vec)
{
	vec = Object.assign(new THREE.Vector2(), vec);
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
	return GetSedimentBilinear(vec) + GetBedrock(vec.x, vec.y); // bedrock is zero, not implementing that 
	// GetValueBilinear(bedrock, vec) + GetValueBilinear(sediments, vec);
}

function SnapWorld(vec) {
	vec = Object.assign(new THREE.Vector2(), vec);
	return new THREE.Vector2(Clamp(vec.x, 0, fieldSize), Clamp(vec.y, 0, fieldSize));
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
	// console.log(xi, yi);
	ret = new THREE.Vector2(0.0, 0.0);

	// let cellSizeX = fieldSize / (gridX - 1);
	// let cellSizeY = fieldSize / (gridY - 1);

	let i = Math.floor(Clamp(xi, 1, grid - 2));
	let j = Math.floor(Clamp(yi, 1, grid - 2));

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

let next8 = [ new THREE.Vector2(1, 0), new THREE.Vector2(1, 1), new THREE.Vector2(0, 1), new THREE.Vector2(-1, 1), 
	new THREE.Vector2(-1, 0), new THREE.Vector2(-1, -1), new THREE.Vector2(0, -1), new THREE.Vector2(1, -1) ];

function CheckSedimentFlowRelative(p, tanThresholdAngle)
{
	p = Object.assign(new THREE.Vector2(), p);

	let nei = new Array(8);
	let nslope = new Array(8);
	const zp = Height(p);
	n = 0;
	slopesum = 0.0;
	for (i = 0; i < 8; i++)
	{
		const nv = next8[i];
		let b = CopyVec(p);
		b.add(nv);

		// console.log(b);

		if (b.x < 0 || b.x >= grid || b.y < 0 || b.y >= grid)
			continue;
		let step = zp - Height(b);

		// console.log(step);

		if (step > 0.0 && (step / (fieldSize / grid) * nv.length()) > tanThresholdAngle)
		{
			nei[n] = CopyVec(b);
			nslope[n] = step / nv.length();
			slopesum += nslope[n];
			n++;
			// console.log(slopesum);
		}
	}
	for (k = 0; k < n; k++)
		nslope[k] = nslope[k] / slopesum;

	return [n, nei, nslope];
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

		[n, pts, s] = CheckSedimentFlowRelative(current, tanThresholdAngleSediment);
		if (n == 0)
			continue;

		// Distribute to neighbours
		for (a = 0; a < n; a++)
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
	// Compute amount of sand to creep; function of number of bounce.
	let b = Clamp(bounce, 0, 3);
	let t = b / 3.0;
	let se = Lerp(matterToMove / 2.0, matterToMove, t);
	let rReptationSquared = 2.0 * 2.0;
	let p = gridToWorld(new THREE.Vector2(i, j));

	// Distribute sand at the 2-steepest neighbours
	// Vector2i nei[8];
	[n, nei, nslope] = CheckSedimentFlowRelative(new THREE.Vector2(i, j), tanThresholdAngleSediment);
	n = Math.min(2, n);
	nEffective = 0;
	for (let k = 0; k < n; k++)
	{
		let next = CopyVec(nei[k]); // vector 2i
		sei = se / n;

		// We don't perform reptation if the grid discretization is too low.
		// (If cells are too far away from each other in world space)
		let pk = gridToWorld(CopyVec(next));
		if ((CopyVec(p).sub(pk)).lengthSq() > rReptationSquared)
			continue;

		// Distribute sediment to neighbour

		// sediments[ToIndex1D(next)] += sei;
		nI, nJ = toIndices(next);
		AddSediment(nI, nJ, sei);

		// Count the amount of neighbour which received sand from the current cell (i, j)
		nEffective++;
	}

	// Remove sediment at the current cell
	if (n > 0 && nEffective > 0)
	{
		AddSediment(i, j, -sei);
	}
}

function IsInShadow(i, j, windDir)
{

	// console.log(i, j);

	const windStepLength = 1.0;
	windDir = Object.assign(new THREE.Vector2(), windDir);

	const windStep = new THREE.Vector2(
		Math.sign(windDir.x) * windStepLength,
		Math.sign(windDir.y) * windStepLength
	);

	let p = gridToWorld(new THREE.Vector2(i, j));
	// console.log(p);
	let pShadow = CopyVec(p);
	let rShadow = 10.0;
	let hp = Height(p);
	let ret = 0.0;
	const MAX_ITS = 5;
	let its = 0;

	while (its < MAX_ITS)
	{
		// console.log(pShadow);
		pShadow.sub(windStep);
		// new THREE.Vector2().eq
		if (pShadow.equals(p))
			break;

		// console.log(pShadow);

		let pShadowSnapped = new THREE.Vector2(Clamp(pShadow.x, 0, grid), Clamp(pShadow.y, 0, grid));
		// pShadowSnapped = SnapWorld(pShadowSnapped);

		let dv = CopyVec(p).sub(pShadow);
		let d = dv.length();
		if (d > rShadow)
			break;

		let step = Height(pShadowSnapped) - hp;
		// console.log(step / d);
		let s = InvLerp(step / d, tanThresholdAngleWindShadowMin, tanThresholdAngleWindShadowMax);

		// if (s == NaN)
		// console.log(ret);

		// console.log(s);
		ret = Math.max(ret, s);
		++its;
	}

	// console.log("Done.");

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
		similarity = Clamp(g.normalize().dot(CopyVec(windDir).normalize()));
	}

	// Wind velocity is doubled in the best case
	t = (similarity + slope) / 2.0;
	windDir.multiplyScalar(1 + t); // Lerp(windDir, 2.0 * windDir, t);

	return windDir;
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

	// No sediment to move
	if (GetSediment(startI, startJ) <= 0.0)
		return;

	// Wind shadowing probability
	// console.log(IsInShadow(startI, startJ, windDir));
	if (Math.random() < IsInShadow(startI, startJ, windDir))
	{
		// StabilizeSedimentRelative(startI, startJ);
		return;
	}
	// Vegetation can retain sediments in the lifting process
	// if (vegetationOn && Random::Uniform() < vegetation[start1D])
	// {
	// 	StabilizeSedimentRelative(startI, startJ);
	// 	return;
	// }

	// (2) Lift grain at start cell
	// sediments[start1D] -= matterToMove;
	AddSediment(startI, startJ, -matterToMove);

	// (3) Jump downwind by saltation hop length (wind direction). Repeat until sand is deposited.
	let destI = startI;
	let destJ = startJ;
	// console.log(destI, destJ);
	
	let pos = gridToWorld(new THREE.Vector2(startI, startJ));
	bounce = 0;
	
    while (bounce < MAX_BOUNCE)
	{
		// Compute wind at the current cell
		windDir = ComputeWindAtCell(destI, destJ);

		// Compute new world position and new grid position (after wind addition)
		
		// console.log(pos);
		
		pos.add(windDir);
		pos = SnapWorld(pos);
		[destI, destJ] = CellInteger(pos);

		// console.log(destI, destJ);

		// Conversion to 1D index to speed up computation
		// destID = ToIndex1D(destI, destJ);

		// Abrasion of the bedrock occurs with low sand supply, weak bedrock and a low probability.
		// if (abrasionOn && Math.random() < 0.2 && GetSediment(destI, destJ) < 0.5)
		// 	PerformAbrasionOnCell(destI, destJ, windDir);

		// Probability of deposition
		p = Math.random();

		// Shadowed cell
		if (p < IsInShadow(destI, destJ, windDir))
		{
			AddSediment(destI, destJ, matterToMove);
			break;
		}
		// Sandy cell - 60% chance of deposition (if vegetation == 0.0)
		else if (GetSediment(destI, destJ) > 0.0 && p < 0.6) // + (vegetationOn ? (vegetation.Get(destID) * 0.4) : 0.0))
		{
			AddSediment(destI, destJ, matterToMove);
			break;
		}
		// Empty cell - 40% chance of deposition (if vegetation == 0.0)
		else if (GetSediment(destI, destJ) <= 0.0 && p < 0.4) // + (vegetationOn ? (vegetation.Get(destID) * 0.6) : 0.0))
		{
			AddSediment(destI, destJ, matterToMove);
			break;
		}

		++bounce;

		// Perform reptation at each bounce

		// PerformReptationOnCell(destI, destJ, bounce);

	}
	// End of the deposition loop - we have move matter from (startI, startJ) to (destI, destJ)

	// Perform reptation at the deposition simulationStepCount
	// PerformReptationOnCell(destI, destJ, bounce);

	// (4) Check for the angle of repose on the original cell
	// StabilizeSedimentRelative(startI, startJ);

	// (5) Check for the angle of repose on the destination cell if different
	// StabilizeSedimentRelative(destI, destJ);
}



function Simulate(size, verts, iterations, amtSand, getBedrock) {

	GetBedrock = getBedrock;

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

	grid = grid = size;
	fieldSize = size;

    for (let its = 0; its < iterations; ++its)
        for (let i = 0; i < size*size; ++i)
			IterateOnce();

}