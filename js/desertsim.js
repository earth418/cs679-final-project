const wind = new THREE.Vector2(5.0, 0.0);
const gridX = 500;
const gridY = gridX;
const fieldSize = 50; // meters
const tanThresholdAngleWindShadowMin = 5;
const tanThresholdAngleWindShadowMax = 15;
const matterToMove = 0.1;
const MAX_BOUNCE = 5;

let sediments = new Array(gridX * gridY); // Array<THREE.Vector2>;
let bedrock = new Array(gridX * gridY);

function gridToWorld(vec) {
    return new THREE.Vector2(vec.x * fieldSize / gridX, vec.y * fieldSize / gridY);
}

function ArrayVertex(bedrock, i, j) {
	return gridToWorld(new THREE.Vector2(i, j));
}

function ToIndex1D(x, y) {
    return x * gridY + y;
}

function Clamp(x, a, b) {
	return x < a ? a : x > b ? b : x;
}

function Lerp(a, b, alpha) {
	return a + (b - a) * alpha;
}

function GetValueBilinear(array, p)
{
	// let q = p / fieldSize * gridX;
	// d = box.Vertex(1) - box.Vertex(0);

	let texelX = 1.0 / (gridX - 1);
	let texelY = 1.0 / (gridY - 1);

	let u = p.x / fieldSize;
	let v = p.y / fieldSize;

	let i = Math.floor(v * (gridY - 1));
	let j = Math.floor(u * (gridX - 1));

	if (i < 0 || j < 0 || i > gridY || j > gridX)
		return -1.0;

	let anchorU = j * texelX;
	let anchorV = i * texelY;

	let localU = (u - anchorU) / texelX;
	let localV = (v - anchorV) / texelY;

	let v1 = array[ToIndex1D(i, j)];
	let v2 = array[ToIndex1D(i + 1, j)];
	let v3 = array[ToIndex1D(i + 1, j + 1)];
	let v4 = array[ToIndex1D(i, j + 1)];

	return (1 - localU) * (1 - localV) * v1
		+ (1 - localU) * localV * v2
		+ localU * (1 - localV) * v4
		+ localU * localV * v3;
}

function Height(vec) {
	return GetValueBilinear(bedrock, vec) + GetValueBilinear(sediments, vec);
}

function SnapWorld(vec) {
	return new THREE.Vector2(Clamp(vec.x, 0, fieldSize), Clamp(vec.y, 0, fieldSize));
}

function Step(x, a, b)
{
	if (x < a)
		return 0.0;

	else if (x > b)
		return 1.0;

	else
		return (x - a) / (b - a);
}


function Gradient(array, i, j) {
	ret = new THREE.Vector2();

	cellSizeX = fieldSize / (gridX - 1);
	cellSizeY = fieldSize / (gridY - 1);

	// X Gradient
	if (i == 0)
		ret.x = (array[ToIndex1D(i + 1, j)] - array[ToIndex1D(i, j)]) / cellSizeX;
	else if (i == gridY - 1)
		ret.x = (array[ToIndex1D(i, j)] - array[ToIndex1D(i - 1, j)]) / cellSizeX;
	else
		ret.x = (array[ToIndex1D(i + 1, j)] - array[ToIndex1D(i - 1, j)]) / (2.0 * cellSizeX);

	// Y Gradient
	if (j == 0)
		ret.y = (array[ToIndex1D(i, j + 1)] - array[ToIndex1D(i, j)]) / cellSizeY;
	else if (j == gridX - 1)
		ret.y = (array[ToIndex1D(i, j)] - array[ToIndex1D(i, j - 1)]) / cellSizeY;
	else
		ret.y = (array[ToIndex1D(i, j + 1)] - array[ToIndex1D(i, j - 1)]) / (2.0 * cellSizeY);

	return ret;
}

function PerformReptationOnCell(i, j, bounce)
{
	// Compute amount of sand to creep; function of number of bounce.
	let b = Clamp(bounce, 0, 3);
	let t = b / 3.0;
	let se = Lerp(matterToMove / 2.0, matterToMove, t);
	rReptationSquared = 2.0 * 2.0;
	let p = ArrayVertex(bedrock, i, j);

	// Distribute sand at the 2-steepest neighbours
	// Vector2i nei[8];
	let nei = new Array(8);
	let nslope = new Array(8);
	n = Math.min(2, CheckSedimentFlowRelative(new Vector2(i, j), tanThresholdAngleSediment, nei, nslope));
	nEffective = 0;
	for (let k = 0; k < n; k++)
	{
		let next = nei[k]; // vector 2i
		sei = se / n;

		// We don't perform reptation if the grid discretization is too low.
		// (If cells are too far away from each other in world space)
		let pk = ArrayVertex(bedrock, next.x, next.y);
		if (SquaredMagnitude(p - pk) > rReptationSquared)
			continue;

		// Distribute sediment to neighbour

		sediments[ToIndex1D(next)] += sei;

		// Count the amount of neighbour which received sand from the current cell (i, j)
		nEffective++;
	}

	// Remove sediment at the current cell
	if (n > 0 && nEffective > 0)
	{
		sediments[ToIndex1D(i, j)] -= se;
	}
}

function IsInShadow(i, j, windDir)
{
	const windStepLength = 1.0;
	windDir = Object.assign(new THREE.Vector2(), windDir);
	const windStep = new THREE.Vector2(
		windDir.x > 0.0 ? windStepLength : windDir.x < 0.0 ? -windStepLength : 0.0,
		windDir.y > 0.0 ? windStepLength : windDir.y < 0.0 ? -windStepLength : 0.0
	);
	let p = ArrayVertex(bedrock, i, j);
	let pShadow = p;
	let rShadow = 10.0;
	let hp = Height(p);
	let ret = 0.0;
	while (true)
	{
		pShadow = pShadow.sub(windStep);
		if (pShadow == p)
			break;
		let pShadowSnapped = pShadow;
		SnapWorld(pShadowSnapped);

		let d = (p.sub(pShadow)).length();
		if (d > rShadow)
			break;

		let step = Height(pShadowSnapped) - hp;
		let t = (step / d);
		let s = Step(t, tanThresholdAngleWindShadowMin, tanThresholdAngleWindShadowMax);
		ret = Math.max(ret, s);
	}
	return ret;
}

function ComputeWindAtCell(i, j, windDir)
{
	// Base wind direction
	windDir = wind;

	// Modulate wind strength with sediment layer: increase velocity on slope in the direction of the wind
	let g = Gradient(sediments, i, j);
	let similarity = 0.0;
	let slope = 0.0;
	const zeroVec = new THREE.Vector2(0.0, 0.0);
	if (g != zeroVec && windDir != zeroVec)
	{
		// (new THREE.Vector2()).le
		similarity = Clamp(g.normalize().dot(windDir.normalize()));
		slope = Clamp(g.length());
	}

	// Wind velocity is doubled in the best case
	t = (similarity + slope) / 2.0;
	windDir = windDir * (1 + t); // Lerp(windDir, 2.0 * windDir, t);
}

function CellInteger(vec) {
	return [vec.x / fieldSize * gridX, vec.y / fieldSize * gridY];
}

function IterateOnce() {

    startI = Math.floor(Math.random() * gridX);
	startJ = Math.floor(Math.random() * gridY);
    start1D = ToIndex1D(startI, startJ);
	
	// Compute wind at start cell
	let windDir;
	ComputeWindAtCell(startI, startJ, windDir);

	// No sediment to move
	if (sediments[start1D] <= 0.0)
		return;

	// Wind shadowing probability
	if (Math.random() < IsInShadow(startI, startJ, windDir))
	{
		StabilizeSedimentRelative(startI, startJ);
		return;
	}
	// Vegetation can retain sediments in the lifting process
	// if (vegetationOn && Random::Uniform() < vegetation[start1D])
	// {
	// 	StabilizeSedimentRelative(startI, startJ);
	// 	return;
	// }

	// (2) Lift grain at start cell
	sediments[start1D] -= matterToMove;

	// (3) Jump downwind by saltation hop length (wind direction). Repeat until sand is deposited.
	destI = startI;
	destJ = startJ;
	let pos = gridToWorld(new THREE.Vector2(startI, startJ));
	bounce = 0;
	
    while (bounce < MAX_BOUNCE)
	{
		// Compute wind at the current cell
		ComputeWindAtCell(destI, destJ, windDir);

		// Compute new world position and new grid position (after wind addition)
		pos = pos + windDir;
		SnapWorld(pos);
		destI, destJ = CellInteger(pos);

		// Conversion to 1D index to speed up computation
		destID = ToIndex1D(destI, destJ);

		// Abrasion of the bedrock occurs with low sand supply, weak bedrock and a low probability.
		if (abrasionOn && Math.random() < 0.2 && sediments.Get(destID) < 0.5)
			PerformAbrasionOnCell(destI, destJ, windDir);

		// Probability of deposition
		p = Math.random();

		// Shadowed cell
		if (p < IsInShadow(destI, destJ, windDir))
		{
			sediments[destID] += matterToMove;
			break;
		}
		// Sandy cell - 60% chance of deposition (if vegetation == 0.0)
		else if (sediments.Get(destID) > 0.0 && p < 0.6) // + (vegetationOn ? (vegetation.Get(destID) * 0.4) : 0.0))
		{
			sediments[destID] += matterToMove;
			break;
		}
		// Empty cell - 40% chance of deposition (if vegetation == 0.0)
		// else if (sediments.Get(destID) <= 0.0 && p < 0.4 + (vegetationOn ? (vegetation.Get(destID) * 0.6) : 0.0))
		// {
		// 	sediments[destID] += matterToMove;
		// 	break;
		// }

		// Perform reptation at each bounce
		bounce++;
		if (Math.random() < 1.0) // - vegetation[start1D])
			PerformReptationOnCell(destI, destJ, bounce);
	}
	// End of the deposition loop - we have move matter from (startI, startJ) to (destI, destJ)

	// Perform reptation at the deposition simulationStepCount
	if (Math.random() < 1.0) //- vegetation[start1D])
		PerformReptationOnCell(destI, destJ, bounce);

	// (4) Check for the angle of repose on the original cell
	// StabilizeSedimentRelative(startI, startJ);

	// (5) Check for the angle of repose on the destination cell if different
	// StabilizeSedimentRelative(destI, destJ);
}



function Simulate(size, verts, normals, iterations, amtSand) {

	// for (i = 0; i < size; ++i)
	// 	for (j = 0; j < size; ++j)
	// 		verts[(i * size + j) * 3 + 1] += (Math.random() - 0.5);

    // for (let its = 0; its < iterations; ++its)
    //     for (let i = 0; i < size; ++i)
	IterateOnce();

}