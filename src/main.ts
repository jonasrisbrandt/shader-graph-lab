import { GraphRunner } from "./render/runtime";
import { loadProjectAssets } from "./render/assets";
import { buildGraphFromProject, loadProject, loadProjectWithResolver } from "./render/project";
import { OrbitCameraController, StaticCameraController } from "./ui/camera";
import { createDebugOverlay } from "./ui/debug-overlay";
import { createErrorOverlay } from "./ui/error-overlay";
import { createUniformUI } from "./ui/uniforms";
import { EditorSession } from "./editor/editor-session";
import {
  CompositeProjectStore,
  IdbProjectStore,
  isLocalProjectId,
  PublicProjectStore,
  stripLocalPrefix,
} from "./editor/project-store";
import { setupAppResizer } from "./editor-ui/resizers";

const canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2");
if (!gl) {
  throw new Error("WebGL2 is not supported in this browser.");
}

const errorOverlay = createErrorOverlay();
const debugOverlay = createDebugOverlay();
let debugEnabled = false;
let runner: GraphRunner | null = null;
let uniformUI: ReturnType<typeof createUniformUI> | null = null;
let outputScale = 1;
let cameraController: OrbitCameraController | StaticCameraController | null = null;
let editorSession: EditorSession | null = null;

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
  const editParam = params.get("edit");
  const renderScale = scaleParam ? Number.parseFloat(scaleParam) : 1;
  outputScale = Number.isFinite(renderScale) && renderScale > 0 ? renderScale : 1;
  debugEnabled = debugParam === "1" || debugParam === "true";
  debugOverlay.setVisible(debugEnabled);
  const editEnabled = editParam === "1" || editParam === "true";
  if (editEnabled) {
    document.body.classList.add("is-editing");
  } else {
    document.body.classList.remove("is-editing");
  }
  let currentProjectId = projectParam;
  const needsStore = editEnabled || isLocalProjectId(projectParam);
  const store = needsStore ? new CompositeProjectStore(new PublicProjectStore(), new IdbProjectStore()) : null;

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

  const isProjectUrl = (value: string) => value.includes("/") || value.endsWith(".json");
  const projectUrlFor = (projectId: string) => {
    if (isProjectUrl(projectId)) return projectId;
    const baseId = stripLocalPrefix(projectId);
    return `/projects/${baseId}/project.json`;
  };
  const fetchText = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch "${url}": ${response.status} ${response.statusText}`);
    }
    return response.text();
  };
  const createStoreResolver = (projectId: string) => {
    if (!store) return fetchText;
    const baseId = stripLocalPrefix(projectId);
    const basePrefix = `/projects/${baseId}/`;
    return async (url: string) => {
      const resolved = new URL(url, window.location.href);
      if (resolved.pathname.startsWith(basePrefix) && !isProjectUrl(projectId)) {
        const relativePath = resolved.pathname.slice(basePrefix.length);
        return store.readText(projectId, relativePath);
      }
      return fetchText(resolved.toString());
    };
  };
  const loadProjectForRender = async (projectId: string) => {
    currentProjectId = projectId;
    const url = projectUrlFor(projectId);
    const project = store
      ? await loadProjectWithResolver(url, createStoreResolver(projectId))
      : await loadProject(url);
    const assets = await loadProjectAssets(gl, project);
    const graph = buildGraphFromProject(project, graphName);
    uniformUI?.destroy();
    const renderRoot = document.getElementById("render-root") ?? undefined;
    uniformUI = createUniformUI(graph, { container: renderRoot });
    runner = new GraphRunner(gl, graph, assets, { debug: debugEnabled, glErrors: debugEnabled });
  };

  if (editEnabled) {
    const editorRoot = document.getElementById("editor-root");
    const renderRoot = document.getElementById("render-root");
    const appRoot = document.getElementById("app");
    const appResizer = document.getElementById("app-resizer");
    if (editorRoot && renderRoot && appRoot && appResizer) {
      setupAppResizer({
        app: appRoot,
        resizer: appResizer,
        editorRoot,
        renderRoot,
        minWidth: 320,
        storageKey: "sgl:editorSplit",
      });
    }
    if (editorRoot && store) {
      if (projectParam.includes("/") || projectParam.endsWith(".json")) {
        editorRoot.textContent = "Edit mode supports project ids only (no direct URLs).";
      } else {
        const session = new EditorSession({
          root: editorRoot,
          projectId: projectParam,
          store,
          onSaveProject: (nextProjectId) => {
            loadProjectForRender(nextProjectId).catch((error) => {
              console.error(error);
              errorOverlay.show(error);
            });
          },
        });
        session.init().catch((error) => {
          console.error(error);
          errorOverlay.show(error);
        });
        editorSession = session;
      }
    }
  }

  await loadProjectForRender(currentProjectId);
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
    runner?.setGlErrorsEnabled(debugEnabled);
  }
});
