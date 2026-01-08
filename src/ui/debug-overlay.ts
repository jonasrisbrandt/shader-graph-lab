import { PassDebugInfo } from "../render/runtime";

type DebugStats = {
  fps: number;
  width: number;
  height: number;
  scale: number;
};

type DebugOverlay = {
  setVisible: (visible: boolean) => void;
  isVisible: () => boolean;
  update: (passes: PassDebugInfo[], stats: DebugStats) => void;
  element: HTMLDivElement;
};

function formatOverlay(passes: PassDebugInfo[], stats: DebugStats) {
  const lines: string[] = [];
  lines.push(
    `fps ${stats.fps.toFixed(1)} | render ${stats.width}x${stats.height} | scale ${stats.scale.toFixed(2)}`
  );
  lines.push(`passes ${passes.length}`);
  for (const pass of passes) {
    lines.push(`[${pass.id}] ${pass.renderSize.width}x${pass.renderSize.height}`);
    for (const [key, input] of Object.entries(pass.inputs)) {
      lines.push(`  in  ${key} <- ${input.source} (${input.width}x${input.height})`);
    }
    for (const [name, output] of Object.entries(pass.outputs)) {
      const filter = output.filter ? ` ${output.filter}` : "";
      const persistent = output.persistent ? " persistent" : "";
      lines.push(
        `  out ${name} (${output.width}x${output.height}) ${output.format}${filter}${persistent}`
      );
    }
  }
  return lines.join("\n");
}

export function createDebugOverlay(): DebugOverlay {
  const overlay = document.createElement("div");
  overlay.id = "debug-overlay";

  const header = document.createElement("div");
  header.className = "overlay-header";
  header.textContent = "Debug";

  const body = document.createElement("pre");
  body.className = "overlay-message";

  overlay.append(header, body);
  document.body.appendChild(overlay);

  let visible = false;
  let lastUpdate = 0;

  return {
    element: overlay,
    setVisible: (next: boolean) => {
      visible = next;
      overlay.classList.toggle("is-visible", visible);
    },
    isVisible: () => visible,
    update: (passes, stats) => {
      if (!visible) return;
      const now = performance.now();
      if (now - lastUpdate < 200) return;
      lastUpdate = now;
      body.textContent = formatOverlay(passes, stats);
    },
  };
}
