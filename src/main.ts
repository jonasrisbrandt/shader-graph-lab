import { GraphRunner } from "./render/runtime";
import { loadProjectAssets } from "./render/assets";
import { buildGraphFromProject, loadProject, loadProjectWithResolver } from "./render/project";
import "./ui/reset.css";
import "./ui/theme.css";
import "./ui/components";
import "./ui/components/components.css";
import "./ui/editor.css";
import "./ui/base.css";
import "./ui/overlays.css";
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
import type { UiSelect } from "./ui/components/ui-select";
import { withCacheBust } from "./utils/cache-bust";
import { getIconSvg } from "./ui/icons";

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
  const scaleStorageKey = "sgl:renderScale";
  const scaleOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const parseScale = (value: string | null) => {
    if (!value) return null;
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  };
  const loadStoredScale = () => {
    try {
      const raw = window.localStorage.getItem(scaleStorageKey);
      return parseScale(raw);
    } catch {
      return null;
    }
  };
  const saveStoredScale = (value: number) => {
    try {
      window.localStorage.setItem(scaleStorageKey, String(value));
    } catch {
      return;
    }
  };
  const mobileQuery = window.matchMedia("(max-width: 900px)");
  const defaultScale = mobileQuery.matches ? 0.5 : 1;
  const paramScale = parseScale(scaleParam);
  const storedScale = loadStoredScale();
  const initialScale = paramScale ?? storedScale ?? defaultScale;
  outputScale = initialScale;
  debugEnabled = debugParam === "1" || debugParam === "true";
  debugOverlay.setVisible(debugEnabled);
  const editEnabled = editParam === "1" || editParam === "true";
  const appBaseUrl = new URL(".", window.location.href);
  const projectsBaseUrl = new URL("projects/", appBaseUrl);
  const projectsBasePath = projectsBaseUrl.pathname;
  let currentProjectId = projectParam;
  const store = new CompositeProjectStore(new PublicProjectStore(), new IdbProjectStore());
  const editorRoot = document.getElementById("editor-root");
  const renderRoot = document.getElementById("render-root");
  const appRoot = document.getElementById("app");
  const appResizer = document.getElementById("app-resizer");
  const renderMenu = document.getElementById("render-menu");
  const menuToggle = document.getElementById("menu-toggle");
  const menuPanel = document.getElementById("menu-panel");
  const menuEdit = document.getElementById("menu-edit");
  const menuIconNodes = document.querySelectorAll<HTMLElement>("[data-icon]");
  const scaleSelect = document.getElementById("scale-select") as UiSelect | null;
  const resizerControl =
    editorRoot && renderRoot && appRoot && appResizer
      ? setupAppResizer({
          app: appRoot,
          resizer: appResizer,
          editorRoot,
          renderRoot,
          minWidth: 320,
          storageKey: "sgl:editorSplit",
        })
      : null;

  const isProjectUrl = (value: string) => value.includes("/") || value.endsWith(".json");
  const projectUrlFor = (projectId: string) => {
    if (isProjectUrl(projectId)) return projectId;
    const baseId = stripLocalPrefix(projectId);
    return new URL(`${baseId}/project.json`, projectsBaseUrl).toString();
  };
  const fetchText = async (url: string) => {
    const response = await fetch(withCacheBust(url));
    if (!response.ok) {
      throw new Error(`Failed to fetch "${url}": ${response.status} ${response.statusText}`);
    }
    return response.text();
  };
  const createStoreResolver = (projectId: string) => {
    if (!store) return fetchText;
    const baseId = stripLocalPrefix(projectId);
    const basePrefix = `${projectsBasePath}${baseId}/`;
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

  const setEditMode = (enabled: boolean) => {
    document.body.classList.toggle("is-editing", enabled);
    const url = new URL(window.location.href);
    if (enabled) {
      url.searchParams.set("edit", "1");
    } else {
      url.searchParams.delete("edit");
    }
    window.history.replaceState({}, "", url);
    if (enabled) {
      if (mobileQuery.matches) {
        if (editorRoot) {
          editorRoot.style.flex = "";
          editorRoot.style.width = "";
        }
        if (renderRoot) {
          renderRoot.style.flex = "";
        }
      } else {
        resizerControl?.applyStoredWidth();
      }
      if (editorRoot) {
        const flexValue = editorRoot.style.flex;
        if (!flexValue || flexValue === "0 0 0px" || flexValue === "0 0 0") {
          editorRoot.style.flex = "";
          editorRoot.style.width = "";
        }
        if (isProjectUrl(currentProjectId)) {
          editorRoot.textContent = "Edit mode supports project ids only (no direct URLs).";
        } else if (!editorSession) {
          const session = new EditorSession({
            root: editorRoot,
            projectId: currentProjectId,
            store,
            onSaveProject: (nextProjectId) => {
              loadProjectForRender(nextProjectId).catch((error) => {
                console.error(error);
                errorOverlay.show(error);
              });
            },
            onClose: () => setEditMode(false),
            onProjectChange: async (nextProjectId) => {
              try {
                const url = new URL(window.location.href);
                url.searchParams.set("project", nextProjectId);
                window.history.replaceState({}, "", url);
                await loadProjectForRender(nextProjectId);
                await editorSession?.switchProject(nextProjectId);
              } catch (error) {
                console.error(error);
                errorOverlay.show(error);
              }
            },
          });
          session.init().catch((error) => {
            console.error(error);
            errorOverlay.show(error);
          });
          editorSession = session;
        }
      }
    } else {
      resizerControl?.collapse();
      if (editorSession) {
        editorSession.dispose();
        editorSession = null;
      }
      if (editorRoot) {
        editorRoot.textContent = "";
      }
    }
  };

  let menuOpen = false;
  const setMenuOpen = (open: boolean) => {
    menuOpen = open;
    document.body.classList.toggle("is-menu-open", open);
    if (renderMenu) {
      renderMenu.dataset.open = open ? "true" : "false";
    }
    if (menuPanel) {
      menuPanel.setAttribute("aria-hidden", open ? "false" : "true");
    }
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
  };

  const toggleMenu = (event?: Event) => {
    event?.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  for (const node of menuIconNodes) {
    const iconName = node.dataset.icon;
    if (!iconName) continue;
    node.innerHTML = getIconSvg(iconName);
  }

  menuToggle?.addEventListener("click", toggleMenu);
  menuEdit?.addEventListener("click", () => {
    setMenuOpen(false);
    setEditMode(true);
  });

  document.addEventListener("click", (event) => {
    if (!menuOpen) return;
    const target = event.target as Node | null;
    if (target && renderMenu?.contains(target)) return;
    setMenuOpen(false);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  });

  setMenuOpen(false);

  if (scaleSelect) {
    const options = scaleOptions.slice();
    if (!options.includes(initialScale)) {
      options.unshift(initialScale);
    }
    scaleSelect.options = options.map((value) => ({
      value: String(value),
      label: `${value}x`,
    }));
    scaleSelect.value = String(initialScale);
    scaleSelect.addEventListener("change", () => {
      const nextScale = parseScale(scaleSelect.value) ?? defaultScale;
      outputScale = nextScale;
      resizeCanvas(outputScale);
      saveStoredScale(nextScale);
      const url = new URL(window.location.href);
      url.searchParams.set("scale", String(nextScale));
      window.history.replaceState({}, "", url);
    });
  }

  mobileQuery.addEventListener("change", () => {
    if (!document.body.classList.contains("is-editing")) return;
    if (editorRoot) {
      editorRoot.style.flex = "";
      editorRoot.style.width = "";
    }
    if (renderRoot) {
      renderRoot.style.flex = "";
    }
  });

  setEditMode(editEnabled);

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

  

  resizeCanvas(outputScale);
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
