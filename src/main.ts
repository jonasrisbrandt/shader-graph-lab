import { GraphRunner } from "./render/runtime";
import { loadProjectAssets } from "./render/assets";
import { buildGraphFromProject, loadProject } from "./render/project";
import { OrbitCameraController, StaticCameraController } from "./ui/camera";
import { createDebugOverlay } from "./ui/debug-overlay";
import { createErrorOverlay } from "./ui/error-overlay";
import { createUniformUI } from "./ui/uniforms";

const canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2");
if (!gl) {
  throw new Error("WebGL2 is not supported in this browser.");
}

const errorOverlay = createErrorOverlay();
const debugOverlay = createDebugOverlay();
let debugEnabled = false;
let runner: GraphRunner | null = null;
let outputScale = 1;
let cameraController: OrbitCameraController | StaticCameraController | null = null;

function resizeCanvas(scale: number) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const nextWidth = Math.floor(canvas.clientWidth * dpr * scale);
  const nextHeight = Math.floor(canvas.clientHeight * dpr * scale);
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
}
window.addEventListener("resize", () => resizeCanvas(outputScale));
resizeCanvas(outputScale);

async function start() {
  const params = new URLSearchParams(window.location.search);
  const projectParam = params.get("project") ?? "metaballs-light";
  const graphName = params.get("graph") ?? "main";
  const scaleParam = params.get("scale");
  const debugParam = params.get("debug");
  const cameraParam = params.get("camera") ?? "orbit";
  const renderScale = scaleParam ? Number.parseFloat(scaleParam) : 1;
  outputScale = Number.isFinite(renderScale) && renderScale > 0 ? renderScale : 1;
  debugEnabled = debugParam === "1" || debugParam === "true";
  debugOverlay.setVisible(debugEnabled);

  cameraController?.dispose();
  if (cameraParam === "static") {
    cameraController = new StaticCameraController({
      position: [0, 0, 3],
      target: [0, 0, 0],
      up: [0, 1, 0],
      fov: Math.PI / 3,
    });
  } else {
    cameraController = new OrbitCameraController(canvas, {
      target: [0, 0, 0],
      radius: 3,
      fov: Math.PI / 3,
    });
  }

  const projectUrl = projectParam.includes("/") || projectParam.endsWith(".json")
    ? projectParam
    : `/projects/${projectParam}/project.json`;

  const project = await loadProject(projectUrl);
  const assets = await loadProjectAssets(gl, project);
  const graph = buildGraphFromProject(project, graphName);
  createUniformUI(graph);
  runner = new GraphRunner(gl, graph, assets, { debug: debugEnabled });
  let lastFrameMs = 0;
  let fps = 0;

  function frame(time: number) {
    try {
      resizeCanvas(outputScale);
      if (runner) {
        const delta = lastFrameMs > 0 ? time - lastFrameMs : 0;
        lastFrameMs = time;
        const deltaSec = delta / 1000;
        cameraController?.update(deltaSec);
        if (cameraController) {
          runner.setCamera(cameraController.getState());
        }
        runner.render(time * 0.001, canvas.width, canvas.height);
        const instantFps = delta > 0 ? 1000 / delta : 0;
        fps = fps === 0 ? instantFps : fps * 0.9 + instantFps * 0.1;
        debugOverlay.update(runner.getDebugSnapshot(), {
          fps,
          width: canvas.width,
          height: canvas.height,
          scale: outputScale,
        });
      }
      requestAnimationFrame(frame);
    } catch (error) {
      console.error(error);
      errorOverlay.show(error);
    }
  }
  requestAnimationFrame(frame);
}

start().catch((error) => {
  console.error(error);
  errorOverlay.show(error);
});

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "d") {
    debugEnabled = !debugEnabled;
    debugOverlay.setVisible(debugEnabled);
    runner?.setDebugEnabled(debugEnabled);
  }
});
