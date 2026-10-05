"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Clock3, Gauge, LoaderCircle, RotateCcw, X, Zap } from "lucide-react";

type ViewerState = "loading" | "ready" | "error";
type Rotation = { x: number; y: number };
type ParsedMesh = { positions: Float32Array; normals: Float32Array; indices: Uint16Array | Uint32Array; triangleCount: number; indexType: number };

const vertexShaderSource = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform vec2 uRotation;
uniform float uZoom;
uniform float uAspect;
out vec3 vNormal;
void main() {
  float cy = cos(uRotation.y); float sy = sin(uRotation.y);
  float cx = cos(uRotation.x); float sx = sin(uRotation.x);
  vec3 p = aPosition;
  float x = p.x * cy + p.z * sy;
  float z = -p.x * sy + p.z * cy;
  float y = p.y * cx - z * sx;
  float depthOffset = p.y * sx + z * cx;
  float cameraDepth = 3.7 - depthOffset;
  float focal = 2.35 * uZoom;
  float nearPlane = 1.4; float farPlane = 6.2;
  float clipZ = cameraDepth * (farPlane + nearPlane) / (farPlane - nearPlane) - (2.0 * farPlane * nearPlane) / (farPlane - nearPlane);
  gl_Position = vec4(x * focal / uAspect, y * focal, clipZ, cameraDepth);
  vec3 n = vec3(aNormal.x * cy + aNormal.z * sy, aNormal.y * cx - (-aNormal.x * sy + aNormal.z * cy) * sx, aNormal.y * sx + (-aNormal.x * sy + aNormal.z * cy) * cx);
  vNormal = normalize(n);
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
in vec3 vNormal;
out vec4 outColor;
void main() {
  float diffuse = abs(dot(normalize(vNormal), normalize(vec3(-0.42, 0.78, 0.64))));
  float light = 0.32 + diffuse * 0.68;
  outColor = vec4(vec3(0.34, 0.64, 0.75) * light, 1.0);
}`;

const meshPromises = new Map<string, Promise<ParsedMesh>>();

function loadMesh(url: string) {
  if (!meshPromises.has(url)) {
    meshPromises.set(url, fetch(url).then(async (response) => {
      if (!response.ok) throw new Error("Model mesin tidak bisa dimuat.");
      return parseMesh(await response.arrayBuffer());
    }));
  }
  return meshPromises.get(url)!;
}

function GlbMachineModel({ modelUrl, className = "" }: { modelUrl: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    let viewer: HTMLElement | null = null;
    void import("@google/model-viewer").then(() => {
      if (disposed || !containerRef.current) return;
      viewer = document.createElement("model-viewer");
      viewer.setAttribute("src", modelUrl);
      viewer.setAttribute("alt", "Interactive 3D machine model");
      viewer.setAttribute("camera-controls", "");
      viewer.setAttribute("auto-rotate", "");
      viewer.setAttribute("loading", "eager");
      viewer.setAttribute("shadow-intensity", "1");
      viewer.setAttribute("exposure", "1");
      viewer.style.width = "100%";
      viewer.style.height = "100%";
      viewer.style.display = "block";
      viewer.addEventListener("load", () => setLoaded(true), { once: true });
      viewer.addEventListener("error", () => setFailed(true), { once: true });
      containerRef.current.appendChild(viewer);
      (viewer as HTMLElement & { dismissPoster: () => void }).dismissPoster();
    }).catch(() => setFailed(true));
    return () => { disposed = true; viewer?.remove(); };
  }, [modelUrl]);

  return <div ref={containerRef} className={className}>
    {!loaded && !failed && <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-cyan-300/70"><LoaderCircle size={18} className="animate-spin"/></span>}
    {failed && <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 text-xs text-rose-300"><AlertCircle size={15}/>Model gagal dimuat</span>}
  </div>;
}

function parseMesh(buffer: ArrayBuffer): ParsedMesh {
  const header = new DataView(buffer);
  if (String.fromCharCode(...new Uint8Array(buffer, 0, 4)) !== "SSM1") throw new Error("Format mesh pratinjau tidak valid.");
  const vertexCount = header.getUint32(4, true);
  const triangleCount = header.getUint32(8, true);
  const indexBytes = header.getUint32(12, true);
  if (!vertexCount || !triangleCount || (indexBytes !== 2 && indexBytes !== 4)) throw new Error("Data mesh pratinjau tidak lengkap.");
  const positionsOffset = 16;
  const indicesOffset = positionsOffset + vertexCount * 3 * 4;
  const expectedSize = indicesOffset + triangleCount * 3 * indexBytes;
  if (buffer.byteLength < expectedSize) throw new Error("File mesh pratinjau terpotong.");
  const positions = new Float32Array(buffer, positionsOffset, vertexCount * 3);
  const indices = indexBytes === 2
    ? new Uint16Array(buffer, indicesOffset, triangleCount * 3)
    : new Uint32Array(buffer, indicesOffset, triangleCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3; const b = indices[i + 1] * 3; const c = indices[i + 2] * 3;
    const ux = positions[b] - positions[a]; const uy = positions[b + 1] - positions[a + 1]; const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a]; const vy = positions[c + 1] - positions[a + 1]; const vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
    for (const at of [a, b, c]) { normals[at] += nx; normals[at + 1] += ny; normals[at + 2] += nz; }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= length; normals[i + 1] /= length; normals[i + 2] /= length;
  }
  return { positions, normals, indices, triangleCount, indexType: indexBytes === 2 ? 2 : 4 };
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL shader tidak dapat dibuat.");
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "WebGL shader gagal dikompilasi.";
    gl.deleteShader(shader); throw new Error(message);
  }
  return shader;
}

function buildProgram(gl: WebGL2RenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  if (!program) throw new Error("WebGL program tidak dapat dibuat.");
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "WebGL program gagal ditautkan.";
    gl.deleteProgram(program); throw new Error(message);
  }
  return program;
}

function WarehouseModelCanvas({ className, rotation, zoom, onRotate, onZoom, onActivate, hint = false, modelUrl = "/models/warehouse-lathe.ssm" }: {
  className: string;
  rotation: Rotation;
  zoom: number;
  onRotate: (rotation: Rotation) => void;
  onZoom: (zoom: number) => void;
  onActivate?: () => void;
  hint?: boolean;
  modelUrl?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const rotationRef = useRef(rotation); rotationRef.current = rotation;
  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const [viewerState, setViewerState] = useState<ViewerState>("loading");

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let gl: WebGL2RenderingContext | null = null;
    let program: WebGLProgram | null = null;
    const buffers: WebGLBuffer[] = [];

    async function initialize() {
      try {
        const mesh = await loadMesh(modelUrl);
        if (disposed || !canvasRef.current) return;
        gl = canvasRef.current.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power" });
        if (!gl) throw new Error("Browser ini tidak mendukung pratinjau WebGL 2.");
        program = buildProgram(gl);
        const positionBuffer = gl.createBuffer(); const normalBuffer = gl.createBuffer(); const indexBuffer = gl.createBuffer();
        if (!positionBuffer || !normalBuffer || !indexBuffer) throw new Error("Buffer mesh tidak dapat dibuat.");
        buffers.push(positionBuffer, normalBuffer, indexBuffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer); gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
        gl.useProgram(program);
        const positionLocation = gl.getAttribLocation(program, "aPosition");
        const normalLocation = gl.getAttribLocation(program, "aNormal");
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); gl.enableVertexAttribArray(positionLocation); gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer); gl.enableVertexAttribArray(normalLocation); gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
        const rotationLocation = gl.getUniformLocation(program, "uRotation");
        const zoomLocation = gl.getUniformLocation(program, "uZoom");
        const aspectLocation = gl.getUniformLocation(program, "uAspect");
        const indexType = mesh.indexType === 2 ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT;
        const render = () => {
          const canvas = canvasRef.current;
          if (!canvas || !gl || !program) return;
          const rect = canvas.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const ratio = Math.min(window.devicePixelRatio || 1, 2);
          const width = Math.round(rect.width * ratio); const height = Math.round(rect.height * ratio);
          if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
          gl.viewport(0, 0, width, height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.uniform2f(rotationLocation, rotationRef.current.x, rotationRef.current.y);
          gl.uniform1f(zoomLocation, zoomRef.current);
          gl.uniform1f(aspectLocation, width / height);
          gl.drawElements(gl.TRIANGLES, mesh.triangleCount * 3, indexType, 0);
        };
        renderRef.current = render; render();
        observer = new ResizeObserver(render); observer.observe(canvasRef.current);
        setViewerState("ready");
      } catch {
        if (!disposed) setViewerState("error");
      }
    }

    void initialize();
    return () => {
      disposed = true; observer?.disconnect(); renderRef.current = null;
      if (gl) { for (const buffer of buffers) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); }
    };
  }, [modelUrl]);

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggedRef.current = false;
    pointerRef.current = { x: event.clientX, y: event.clientY };
  }
  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current;
    if (!pointer) return;
    const dx = event.clientX - pointer.x; const dy = event.clientY - pointer.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) draggedRef.current = true;
    const nextRotation = { x: Math.max(-1.2, Math.min(1.2, rotationRef.current.x + dy * 0.009)), y: rotationRef.current.y + dx * 0.009 };
    pointerRef.current = { x: event.clientX, y: event.clientY };
    onRotate(nextRotation); renderRef.current?.();
  }
  function activate() { if (onActivate && !draggedRef.current) onActivate(); }

  return <div role={onActivate ? "button" : undefined} tabIndex={onActivate ? 0 : -1} aria-label={onActivate ? "Pratinjau 3D mesin Warehouse. Klik untuk memperbesar dan melihat detail." : undefined} title={onActivate ? "Seret untuk memutar · scroll untuk zoom · klik untuk perbesar" : "Seret untuk memutar · scroll untuk zoom"} onClick={activate} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { pointerRef.current = null; }} onPointerCancel={() => { pointerRef.current = null; }} onWheel={(event) => { event.preventDefault(); const nextZoom = Math.max(0.65, Math.min(2.2, zoomRef.current - event.deltaY * 0.001)); onZoom(nextZoom); renderRef.current?.(); }} onKeyDown={(event) => { if (onActivate && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onActivate(); } }} className={`relative touch-none select-none rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-cyan-300/70 ${onActivate ? "cursor-grab active:cursor-grabbing" : "cursor-grab active:cursor-grabbing"} ${className}`}>
    <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true"/>
    {hint && <span className="absolute left-0 top-0 rounded-md border border-cyan-300/10 bg-[#090d12]/75 px-1.5 py-1 text-[8px] font-medium text-cyan-200/80">3D · perbesar</span>}
    {viewerState === "loading" && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-cyan-300/70"><LoaderCircle size={15} className="animate-spin"/></span>}
    {viewerState === "error" && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-500"><AlertCircle size={15}/></span>}
  </div>;
}

function MachineDetails({ rotation, zoom, onRotate, onZoom, onClose }: {
  rotation: Rotation;
  zoom: number;
  onRotate: (rotation: Rotation) => void;
  onZoom: (zoom: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="warehouse-machine-title" onClick={(event) => event.stopPropagation()} className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0e141b] shadow-2xl">
      <header className="flex shrink-0 items-start justify-between border-b border-white/[0.07] px-5 py-4"><div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80">Warehouse · machine details</div><h2 id="warehouse-machine-title" className="mt-1 text-[15px] font-semibold text-slate-100">Double-station lathe loading and unloading</h2><p className="mt-1 text-[10px] text-slate-500">Warehouse · Z-04</p></div><button onClick={onClose} aria-label="Tutup detail mesin" className="rounded-lg border border-white/[0.08] p-2 text-slate-400 hover:text-slate-100"><X size={15}/></button></header>
      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_330px] lg:overflow-hidden">
        <div className="relative min-h-[320px] border-b border-white/[0.06] bg-[#090f16] sm:min-h-[420px] lg:min-h-[540px] lg:border-b-0 lg:border-r" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.06) 1px, transparent 1px), radial-gradient(ellipse at center, rgba(16,48,61,.35), transparent 70%)", backgroundSize: "32px 32px,32px 32px,auto" }}>
          <WarehouseModelCanvas className="absolute inset-0" rotation={rotation} zoom={zoom} onRotate={onRotate} onZoom={onZoom}/>
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-white/[0.07] bg-[#090d12]/75 px-3 py-2 text-[9px] text-slate-400">Seret untuk memutar · scroll untuk zoom</div>
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#090d12]/80 p-1"><button onClick={() => onZoom(Math.max(0.65, zoom - 0.15))} aria-label="Perkecil model" className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-white/[0.07] hover:text-white">−</button><button onClick={() => onZoom(Math.min(2.2, zoom + 0.15))} aria-label="Perbesar model" className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-white/[0.07] hover:text-white">+</button><button onClick={() => { onRotate({ x: -0.38, y: 0.68 }); onZoom(1.15); }} aria-label="Reset tampilan model" className="ml-1 rounded px-2 py-1 text-slate-400 hover:bg-white/[0.07] hover:text-white"><RotateCcw size={12}/></button></div>
        </div>
        <aside className="space-y-4 p-4 sm:p-5 lg:overflow-y-auto"><div className="flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-2.5 text-[10px] text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Status mesin: aktif <span className="ml-auto text-[9px] text-slate-500">Data contoh</span></div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"><div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-slate-500"><AlertCircle size={13} className="text-emerald-300"/>Kendala</div><div className="mt-2 text-[11px] font-medium text-slate-200">Tidak ada kendala aktif</div><div className="mt-1 text-[9px] text-slate-600">Belum ada alarm tercatat untuk zona ini.</div></div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"><div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-slate-500"><Clock3 size={13} className="text-cyan-300"/>Waktu pakai hari ini</div><div className="mt-2 font-mono text-lg font-medium text-slate-100">6j 42m</div><div className="mt-1 text-[9px] text-slate-600">Contoh runtime shift berjalan.</div></div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"><div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-slate-500"><Zap size={13} className="text-amber-300"/>Energi Warehouse</div><div className="mt-2 font-mono text-lg font-medium text-slate-100">68 <span className="text-[10px] font-normal text-slate-400">kWh</span></div><div className="mt-1 text-[9px] text-slate-600">Konsumsi zona hari ini · data contoh.</div></div>
          <div className="flex items-start gap-2 rounded-lg border border-cyan-300/10 bg-cyan-300/[0.035] p-3 text-[9px] leading-relaxed text-slate-500"><Gauge size={13} className="mt-0.5 shrink-0 text-cyan-300"/>Runtime dan energi ditampilkan sebagai contoh telemetri; sambungkan meter mesin untuk mendapatkan pembacaan aktual.</div>
        </aside>
      </div>
    </section>
  </div>;
}

export function WarehouseMachineViewer({ className = "" }: { className?: string }) {
  const [rotation, setRotation] = useState<Rotation>({ x: -0.38, y: 0.68 });
  const [zoom, setZoom] = useState(1.15);
  const [detailsOpen, setDetailsOpen] = useState(false);
  return <>
    <WarehouseModelCanvas className={className} rotation={rotation} zoom={zoom} onRotate={setRotation} onZoom={setZoom} onActivate={() => setDetailsOpen(true)} hint/>
    {detailsOpen && <MachineDetails rotation={rotation} zoom={zoom} onRotate={setRotation} onZoom={setZoom} onClose={() => setDetailsOpen(false)}/>}
  </>;
}

export function MachineModelPreview({ modelUrl, className = "" }: { modelUrl: string; className?: string }) {
  if (modelUrl.toLowerCase().endsWith(".glb")) return <GlbMachineModel modelUrl={modelUrl} className={className}/>;
  return <SsmMachineModel modelUrl={modelUrl} className={className}/>;
}

function SsmMachineModel({ modelUrl, className }: { modelUrl: string; className: string }) {
  const [rotation, setRotation] = useState<Rotation>({ x: -0.38, y: 0.68 });
  const [zoom, setZoom] = useState(1.15);
  return <WarehouseModelCanvas className={className} rotation={rotation} zoom={zoom} onRotate={setRotation} onZoom={setZoom} modelUrl={modelUrl}/>;
}
