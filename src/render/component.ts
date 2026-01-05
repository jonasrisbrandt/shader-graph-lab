import { PassDef, TextureContract, TextureDesc, UniformSpec, TextureFilter, SizeSpec } from "./types";

export type ComponentInputSpec = TextureContract;

export type ComponentOutputSpec = {
  ref: string;
  contract?: TextureContract;
};

export type ComponentSpec = {
  name: string;
  passes: PassDef[];
  inputs: Record<string, ComponentInputSpec>;
  outputs: Record<string, ComponentOutputSpec>;
};

export type ComponentInstance = {
  id: string;
  passes: PassDef[];
  outputs: Record<string, string>;
};

function prefixPassId(instanceId: string, passId: string) {
  return `${instanceId}.${passId}`;
}

function normalizeFilter(filter?: TextureFilter) {
  return filter ?? "linear";
}

function sizeToScale(size: SizeSpec): number | null {
  if (size.kind === "full") return 1;
  if (size.kind === "half") return 0.5;
  if (size.kind === "scale") return size.scale;
  return null;
}

function isSizeCompatible(expected: SizeSpec, actual: SizeSpec) {
  if (expected.kind === "input" || actual.kind === "input") {
    if (expected.kind !== "input" || actual.kind !== "input") {
      return false;
    }
    const expectedScale = expected.scale ?? 1;
    const actualScale = actual.scale ?? 1;
    return Math.abs(expectedScale - actualScale) < 1e-6;
  }
  if (expected.kind === "custom" || actual.kind === "custom") {
    return (
      expected.kind === "custom" &&
      actual.kind === "custom" &&
      expected.width === actual.width &&
      expected.height === actual.height
    );
  }
  const expectedScale = sizeToScale(expected);
  const actualScale = sizeToScale(actual);
  if (expectedScale !== null && actualScale !== null) {
    return Math.abs(expectedScale - actualScale) < 1e-6;
  }
  return expected.kind === actual.kind;
}

function validateTextureContract(label: string, contract: TextureContract, actual: TextureDesc) {
  if (contract.format && contract.format !== actual.format) {
    throw new Error(`${label} expects format "${contract.format}" but got "${actual.format}".`);
  }
  if (contract.filter && normalizeFilter(actual.filter) !== contract.filter) {
    throw new Error(`${label} expects filter "${contract.filter}" but got "${normalizeFilter(actual.filter)}".`);
  }
  if (contract.size && !isSizeCompatible(contract.size, actual.size)) {
    throw new Error(`${label} expects size "${contract.size.kind}" but got "${actual.size.kind}".`);
  }
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
  if (source.startsWith("$asset.") || source.startsWith("$prev.")) {
    return source;
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

function collectPassOutputs(passes: PassDef[]) {
  const outputs = new Map<string, TextureDesc>();
  for (const pass of passes) {
    for (const [name, desc] of Object.entries(pass.outputs ?? {})) {
      outputs.set(`${pass.id}.${name}`, desc);
    }
  }
  return outputs;
}

function collectInputRefs(passes: PassDef[]) {
  const refs = new Set<string>();
  for (const pass of passes) {
    for (const input of Object.values(pass.inputs ?? {})) {
      if (input.source.startsWith("$input.")) {
        refs.add(input.source.slice("$input.".length));
      }
    }
  }
  return refs;
}

function validateComponentSpec(spec: ComponentSpec) {
  const outputDescs = collectPassOutputs(spec.passes);
  const inputRefs = collectInputRefs(spec.passes);
  for (const inputName of inputRefs) {
    if (!spec.inputs[inputName]) {
      throw new Error(`Component "${spec.name}" missing input contract for "${inputName}".`);
    }
  }
  for (const pass of spec.passes) {
    for (const [outputName, desc] of Object.entries(pass.outputs ?? {})) {
      if (desc.size.kind === "input") {
        const inputKey = desc.size.input ?? Object.keys(pass.inputs ?? {})[0];
        if (!inputKey) {
          throw new Error(`Pass "${pass.id}" output "${outputName}" uses input sizing but has no inputs.`);
        }
        if (!(pass.inputs && pass.inputs[inputKey])) {
          throw new Error(`Pass "${pass.id}" output "${outputName}" references missing input "${inputKey}".`);
        }
        const scale = desc.size.scale ?? 1;
        if (scale <= 0) {
          throw new Error(`Pass "${pass.id}" output "${outputName}" uses non-positive input scale.`);
        }
      }
    }
  }
  for (const [name, output] of Object.entries(spec.outputs)) {
    const ref = output.ref;
    if (ref.startsWith("$input.")) {
      const inputName = ref.slice("$input.".length);
      if (!spec.inputs[inputName]) {
        throw new Error(`Component "${spec.name}" output "${name}" references missing input "${inputName}".`);
      }
      continue;
    }
    const desc = outputDescs.get(ref);
    if (!desc) {
      throw new Error(`Component "${spec.name}" output "${name}" references missing pass output "${ref}".`);
    }
    if (output.contract) {
      validateTextureContract(`Component "${spec.name}" output "${name}"`, output.contract, desc);
    }
  }
}

export function instantiateComponent(
  spec: ComponentSpec,
  instanceId: string,
  bindings: Record<string, string>
): ComponentInstance {
  validateComponentSpec(spec);
  for (const inputName of Object.keys(spec.inputs)) {
    if (!bindings[inputName]) {
      throw new Error(`Component "${spec.name}" missing binding for input "${inputName}".`);
    }
  }

  const passes: PassDef[] = spec.passes.map((pass) => {
    const inputs: PassDef["inputs"] = pass.inputs
      ? Object.fromEntries(
          Object.entries(pass.inputs).map(([key, input]) => [
            key,
            {
              ...input,
              source: mapSource(instanceId, input.source, bindings),
              expected:
                input.source.startsWith("$input.")
                  ? input.expected ?? spec.inputs[input.source.slice("$input.".length)]
                  : input.expected,
            },
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
    outputs[name] = mapSource(instanceId, ref.ref, bindings);
  }

  return { id: instanceId, passes, outputs };
}
