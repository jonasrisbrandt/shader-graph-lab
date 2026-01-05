import { PassDef, UniformSpec } from "./types";

export type ComponentSpec = {
  name: string;
  passes: PassDef[];
  inputs: Record<string, string>;
  outputs: Record<string, string>;
};

export type ComponentInstance = {
  id: string;
  passes: PassDef[];
  outputs: Record<string, string>;
};

function prefixPassId(instanceId: string, passId: string) {
  return `${instanceId}.${passId}`;
}

function mapSource(instanceId: string, source: string, bindings: Record<string, string>) {
  if (source.startsWith("$input.")) {
    const key = source.slice("$input.".length);
    const bound = bindings[key];
    if (!bound) {
      throw new Error(`Missing binding for input "${key}".`);
    }
    return bound;
  }
  const parts = source.split(".");
  if (parts.length !== 2) {
    throw new Error(`Invalid source "${source}". Use "pass.output" or "$input.name".`);
  }
  return `${prefixPassId(instanceId, parts[0])}.${parts[1]}`;
}

function applyUniformGrouping(instanceId: string, uniforms?: Record<string, UniformSpec>) {
  if (!uniforms) return uniforms;
  const next: Record<string, UniformSpec> = {};
  for (const [name, spec] of Object.entries(uniforms)) {
    const ui = spec.ui ?? {};
    next[name] = {
      ...spec,
      ui: {
        ...ui,
        group: ui.group ?? instanceId,
      },
    };
  }
  return next;
}

export function instantiateComponent(
  spec: ComponentSpec,
  instanceId: string,
  bindings: Record<string, string>
): ComponentInstance {
  const passes: PassDef[] = spec.passes.map((pass) => {
    const inputs: PassDef["inputs"] = pass.inputs
      ? Object.fromEntries(
          Object.entries(pass.inputs).map(([key, input]) => [
            key,
            { ...input, source: mapSource(instanceId, input.source, bindings) },
          ])
        )
      : undefined;

    return {
      ...pass,
      id: prefixPassId(instanceId, pass.id),
      inputs,
      uniforms: applyUniformGrouping(instanceId, pass.uniforms),
    };
  });

  const outputs: Record<string, string> = {};
  for (const [name, ref] of Object.entries(spec.outputs)) {
    outputs[name] = mapSource(instanceId, ref, bindings);
  }

  return { id: instanceId, passes, outputs };
}
