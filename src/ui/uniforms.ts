import GUI from "lil-gui";
import { Graph } from "../render/graph";
import { UniformSpec } from "../render/types";

type Vec = [number, number] | [number, number, number] | [number, number, number, number];

function addScalar(gui: GUI, label: string, spec: UniformSpec) {
  const state = { value: spec.value as number };
  const ctrl = gui.add(state, "value");
  if (typeof spec.min === "number") ctrl.min(spec.min);
  if (typeof spec.max === "number") ctrl.max(spec.max);
  if (typeof spec.step === "number") ctrl.step(spec.step);
  ctrl.name(label);
  ctrl.onChange((v: number) => {
    spec.value = v;
  });
}

function addVector(gui: GUI, label: string, spec: UniformSpec) {
  const value = spec.value as Vec;
  const parts = ["x", "y", "z", "w"].slice(0, value.length);
  const state: Record<string, number> = {};
  parts.forEach((key, i) => {
    state[key] = value[i];
  });

  parts.forEach((key, i) => {
    const ctrl = gui.add(state, key);
    if (typeof spec.min === "number") ctrl.min(spec.min);
    if (typeof spec.max === "number") ctrl.max(spec.max);
    if (typeof spec.step === "number") ctrl.step(spec.step);
    ctrl.name(`${label}.${key}`);
    ctrl.onChange((v: number) => {
      state[key] = v;
      const next = parts.map((k) => state[k]) as Vec;
      spec.value = next;
    });
  });
}

export function createUniformUI(graph: Graph) {
  const gui = new GUI({ title: "Uniforms" });
  const folders = new Map<string, GUI>();
  const groupMeta = graph.uiGroups ?? {};

  for (const pass of graph.passes) {
    if (!pass.uniforms) continue;
    for (const [name, spec] of Object.entries(pass.uniforms)) {
      if (spec.ui?.show === false) continue;
      const group = spec.ui?.group ?? pass.id;
      let folder = folders.get(group);
      if (!folder) {
        const label = groupMeta[group]?.label ?? group;
        folder = gui.addFolder(label);
        if (groupMeta[group]?.collapsed) {
          folder.close();
        }
        folders.set(group, folder);
      }
      const label = spec.ui?.label ?? name;
      if (spec.type === "f1") {
        addScalar(folder, label, spec);
      } else {
        addVector(folder, label, spec);
      }
    }
  }

  const orderedGroups = Object.entries(groupMeta)
    .map(([group, meta]) => ({
      group,
      order: typeof meta.order === "number" ? meta.order : Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => a.order - b.order);
  for (const { group } of orderedGroups) {
    const folder = folders.get(group);
    if (folder && (folder as unknown as { domElement?: HTMLElement }).domElement) {
      gui.domElement.appendChild((folder as unknown as { domElement: HTMLElement }).domElement);
    }
  }

  return gui;
}
