import { GraphRunner } from "./render/runtime";
import { loadProjectAssets } from "./render/assets";
import { buildCircleBloomGraph } from "./scenes/circle";
import { buildGradientGraph } from "./scenes/gradient";
import { buildInputSizedGraph } from "./scenes/input-sized";
import { buildPlasmaBloomGraph } from "./scenes/plasma";
import { buildSolidGraph } from "./scenes/solid";
import { buildGraphFromProject, loadProject } from "./render/project";
import { createUniformUI } from "./ui/uniforms";

const canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2");
if (!gl) {
  throw new Error("WebGL2 is not supported in this browser.");
}

function resizeCanvas() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

async function start() {
  const params = new URLSearchParams(window.location.search);
  const projectParam = params.get("project");
  const graphName = params.get("graph") ?? "main";
  const scene = params.get("scene") ?? "plasma";

  const projectUrl = projectParam
    ? projectParam.includes("/") || projectParam.endsWith(".json")
      ? projectParam
      : `/projects/${projectParam}/project.json`
    : null;

  if (projectUrl) {
    const project = await loadProject(projectUrl);
    const assets = await loadProjectAssets(gl, project);
    const graph = buildGraphFromProject(project, graphName);
    createUniformUI(graph);
    const runner = new GraphRunner(gl, graph, assets);
    function frame(time: number) {
      resizeCanvas();
      runner.render(time * 0.001, canvas.width, canvas.height);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return;
  }

  const graph =
    scene === "circle"
      ? buildCircleBloomGraph()
      : scene === "solid"
      ? buildSolidGraph()
      : scene === "gradient"
        ? buildGradientGraph()
        : scene === "input"
          ? buildInputSizedGraph()
          : buildPlasmaBloomGraph();

  createUniformUI(graph);

  const runner = new GraphRunner(gl, graph);

  function frame(time: number) {
    resizeCanvas();
    runner.render(time * 0.001, canvas.width, canvas.height);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start().catch((error) => {
  console.error(error);
});
