import { GraphRunner } from "./render/runtime";
import { buildCircleBloomGraph } from "./scenes/circle";
import { buildGradientGraph } from "./scenes/gradient";
import { buildPlasmaBloomGraph } from "./scenes/plasma";
import { buildSolidGraph } from "./scenes/solid";
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

const scene = new URLSearchParams(window.location.search).get("scene") ?? "plasma";
const graph =
  scene === "circle"
    ? buildCircleBloomGraph()
    : scene === "solid"
    ? buildSolidGraph()
    : scene === "gradient"
      ? buildGradientGraph()
      : buildPlasmaBloomGraph();

createUniformUI(graph);

const runner = new GraphRunner(gl, graph);

function frame(time: number) {
  resizeCanvas();
  runner.render(time * 0.001, canvas.width, canvas.height);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
