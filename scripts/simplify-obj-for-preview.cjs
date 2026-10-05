const fs = require("node:fs");
const readline = require("node:readline");

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: node simplify-obj-for-preview.cjs <input.obj> <output.bin>");

async function scan(callback) {
  const stream = fs.createReadStream(input, { encoding: "utf8" });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) callback(line);
}

async function main() {
  let vertexCount = 0;
  let sourceFaceCount = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  await scan((line) => {
    if (line.startsWith("v ")) {
      const point = line.slice(2).trim().split(/\s+/).map(Number);
      if (point.length >= 3 && point.slice(0, 3).every(Number.isFinite)) {
        vertexCount += 1;
        for (let axis = 0; axis < 3; axis += 1) {
          min[axis] = Math.min(min[axis], point[axis]);
          max[axis] = Math.max(max[axis], point[axis]);
        }
      }
    } else if (line.startsWith("f ")) sourceFaceCount += 1;
  });

  const vertices = new Float32Array(vertexCount * 3);
  const selectedFaces = new Map();
  let vertexAt = 0;
  const cellSize = 28;
  await scan((line) => {
    if (line.startsWith("v ")) {
      const point = line.slice(2).trim().split(/\s+/).map(Number);
      if (point.length >= 3 && point.slice(0, 3).every(Number.isFinite)) {
        vertices.set(point.slice(0, 3), vertexAt * 3);
        vertexAt += 1;
      }
    } else if (line.startsWith("f ")) {
      const corners = line.slice(2).trim().split(/\s+/).map((corner) => {
        const raw = Number(corner.split("/")[0]);
        return raw < 0 ? vertexAt + raw : raw - 1;
      });
      if (corners.length < 3 || corners.some((index) => !Number.isInteger(index) || index < 0 || index >= vertexAt)) return;
      for (let i = 1; i < corners.length - 1; i += 1) {
        const a = corners[0]; const b = corners[i]; const c = corners[i + 1];
        if (a === b || b === c || c === a) continue;
        const ax = vertices[a * 3]; const ay = vertices[a * 3 + 1]; const az = vertices[a * 3 + 2];
        const ux = vertices[b * 3] - ax; const uy = vertices[b * 3 + 1] - ay; const uz = vertices[b * 3 + 2] - az;
        const vx = vertices[c * 3] - ax; const vy = vertices[c * 3 + 1] - ay; const vz = vertices[c * 3 + 2] - az;
        const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
        const area = Math.hypot(nx, ny, nz);
        if (area < 0.001) continue;
        const cx = (ax + vertices[b * 3] + vertices[c * 3]) / 3;
        const cy = (ay + vertices[b * 3 + 1] + vertices[c * 3 + 1]) / 3;
        const cz = (az + vertices[b * 3 + 2] + vertices[c * 3 + 2]) / 3;
        const normalLength = area;
        const normalX = Math.round((nx / normalLength) * 1.4);
        const normalY = Math.round((ny / normalLength) * 1.4);
        const normalZ = Math.round((nz / normalLength) * 1.4);
        const cellX = Math.floor((cx - min[0]) / cellSize);
        const cellY = Math.floor((cy - min[1]) / cellSize);
        const cellZ = Math.floor((cz - min[2]) / cellSize);
        const key = `${cellX},${cellY},${cellZ},${normalX},${normalY},${normalZ}`;
        const previous = selectedFaces.get(key);
        if (!previous || previous.area < area) selectedFaces.set(key, { a, b, c, area });
      }
    }
  });

  const faceList = Array.from(selectedFaces.values());
  const remap = new Uint32Array(vertexAt);
  remap.fill(0xffffffff);
  const compactVertices = [];
  const compactIndices = [];
  const center = min.map((value, axis) => (value + max[axis]) / 2);
  const scale = 2 / Math.max(...max.map((value, axis) => value - min[axis]));
  for (const face of faceList) {
    for (const sourceIndex of [face.a, face.b, face.c]) {
      let index = remap[sourceIndex];
      if (index === 0xffffffff) {
        index = compactVertices.length / 3;
        remap[sourceIndex] = index;
        const x = (vertices[sourceIndex * 3] - center[0]) * scale;
        const y = (vertices[sourceIndex * 3 + 1] - center[1]) * scale;
        const z = (vertices[sourceIndex * 3 + 2] - center[2]) * scale;
        // The source model uses Z-up; put Z on screen-space Y for the viewer.
        compactVertices.push(x, z, y);
      }
      compactIndices.push(index);
    }
  }

  const vertexBytes = compactVertices.length * 4;
  const indexBytes = compactVertices.length / 3 < 65536 ? 2 : 4;
  const headerBytes = 16;
  const outputBuffer = Buffer.alloc(headerBytes + vertexBytes + compactIndices.length * indexBytes);
  outputBuffer.write("SSM1", 0, "ascii");
  outputBuffer.writeUInt32LE(compactVertices.length / 3, 4);
  outputBuffer.writeUInt32LE(compactIndices.length / 3, 8);
  outputBuffer.writeUInt32LE(indexBytes, 12);
  let offset = headerBytes;
  for (const value of compactVertices) { outputBuffer.writeFloatLE(value, offset); offset += 4; }
  for (const index of compactIndices) {
    if (indexBytes === 2) { outputBuffer.writeUInt16LE(index, offset); offset += 2; }
    else { outputBuffer.writeUInt32LE(index, offset); offset += 4; }
  }
  fs.writeFileSync(output, outputBuffer);
  console.log(`Simplified ${sourceFaceCount.toLocaleString()} source faces to ${faceList.length.toLocaleString()} preview triangles; ${(compactVertices.length / 3).toLocaleString()} vertices; ${(outputBuffer.length / 1024 / 1024).toFixed(2)} MB.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
