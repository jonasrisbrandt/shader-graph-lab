import { GraphDef, InputSpec, PassDef, SizeSpec, TextureContract, TextureDesc, TextureFilter } from "./types";

export type OutputRef = {
  passId: string;
  outputName: string;
};

export type ResolvedInput = {
  key: string;
  uniform: string;
  ref: OutputRef;
  expected?: TextureContract;
};

export type PassNode = PassDef & {
  resolvedInputs: ResolvedInput[];
};

export type Graph = {
  passes: PassNode[];
  output: OutputRef;
  usageCounts: Map<string, number>;
};

function parseRef(ref: string): OutputRef {
  const idx = ref.lastIndexOf(".");
  if (idx <= 0 || idx >= ref.length - 1) {
    throw new Error(`Invalid output ref "${ref}". Use "passId.outputName".`);
  }
  return { passId: ref.slice(0, idx), outputName: ref.slice(idx + 1) };
}

function resolveInputs(inputs?: Record<string, InputSpec>): ResolvedInput[] {
  if (!inputs) return [];
  return Object.entries(inputs).map(([key, spec]) => ({
    key,
    uniform: spec.uniform ?? key,
    ref: parseRef(spec.source),
    expected: spec.expected,
  }));
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

export class GraphBuilder {
  private passes: PassDef[] = [];
  private outputRef: OutputRef | null = null;

  addPass(pass: PassDef) {
    this.passes.push(pass);
    return this;
  }

  addComponent(instance: { passes: PassDef[] }) {
    for (const pass of instance.passes) {
      this.passes.push(pass);
    }
    return this;
  }

  output(ref: string) {
    this.outputRef = parseRef(ref);
    return this;
  }

  build(): Graph {
    if (!this.outputRef) {
      throw new Error("Graph output not set.");
    }

    const passIds = new Set(this.passes.map((p) => p.id));
    const outputKeys = new Set<string>();
    const outputDescs = new Map<string, TextureDesc>();
    for (const pass of this.passes) {
      if (pass.outputs) {
        for (const [name, desc] of Object.entries(pass.outputs)) {
          const key = `${pass.id}.${name}`;
          outputKeys.add(key);
          outputDescs.set(key, desc);
          if (desc.size.kind === "input") {
            const inputKey = desc.size.input ?? Object.keys(pass.inputs ?? {})[0];
            if (!inputKey) {
              throw new Error(`Pass "${pass.id}" output "${name}" uses input sizing but has no inputs.`);
            }
            if (!(pass.inputs && pass.inputs[inputKey])) {
              throw new Error(`Pass "${pass.id}" output "${name}" references missing input "${inputKey}".`);
            }
            const scale = desc.size.scale ?? 1;
            if (scale <= 0) {
              throw new Error(`Pass "${pass.id}" output "${name}" uses non-positive input scale.`);
            }
          }
        }
      }
    }

    const resolved: PassNode[] = this.passes.map((p) => ({
      ...p,
      resolvedInputs: resolveInputs(p.inputs),
    }));

    for (const pass of resolved) {
      for (const input of pass.resolvedInputs) {
        if (!passIds.has(input.ref.passId)) {
          throw new Error(`Pass "${pass.id}" references unknown pass "${input.ref.passId}".`);
        }
        const key = `${input.ref.passId}.${input.ref.outputName}`;
        if (!outputKeys.has(key)) {
          throw new Error(`Pass "${pass.id}" references missing output "${key}".`);
        }
        if (input.expected) {
          const desc = outputDescs.get(key);
          if (desc) {
            validateTextureContract(`Pass "${pass.id}" input "${input.key}"`, input.expected, desc);
          }
        }
      }
    }

    const passOrder = resolved.map((pass) => pass.id);
    const passMap = new Map<string, PassNode>();
    for (const pass of resolved) {
      passMap.set(pass.id, pass);
    }
    const dependents = new Map<string, string[]>();
    const indegree = new Map<string, number>();
    for (const pass of resolved) {
      indegree.set(pass.id, 0);
    }
    for (const pass of resolved) {
      for (const input of pass.resolvedInputs) {
        if (input.ref.passId === pass.id) {
          throw new Error(`Pass "${pass.id}" has a self-referential input.`);
        }
        const list = dependents.get(input.ref.passId) ?? [];
        list.push(pass.id);
        dependents.set(input.ref.passId, list);
        indegree.set(pass.id, (indegree.get(pass.id) ?? 0) + 1);
      }
    }
    const sorted: PassNode[] = [];
    const processed = new Set<string>();
    while (sorted.length < resolved.length) {
      let nextId: string | null = null;
      for (const id of passOrder) {
        if (processed.has(id)) continue;
        if ((indegree.get(id) ?? 0) === 0) {
          nextId = id;
          break;
        }
      }
      if (!nextId) {
        throw new Error("Graph contains a cycle; cannot resolve pass order.");
      }
      processed.add(nextId);
      const pass = passMap.get(nextId);
      if (pass) sorted.push(pass);
      for (const dep of dependents.get(nextId) ?? []) {
        indegree.set(dep, (indegree.get(dep) ?? 0) - 1);
      }
    }

    const usageCounts = new Map<string, number>();
    for (const key of outputKeys) {
      usageCounts.set(key, 0);
    }
    for (const pass of sorted) {
      for (const input of pass.resolvedInputs) {
        const key = `${input.ref.passId}.${input.ref.outputName}`;
        usageCounts.set(key, (usageCounts.get(key) ?? 0) + 1);
      }
    }
    const outputKey = `${this.outputRef.passId}.${this.outputRef.outputName}`;
    if (!outputKeys.has(outputKey)) {
      throw new Error(`Graph output "${outputKey}" does not exist.`);
    }

    return {
      passes: sorted,
      output: this.outputRef,
      usageCounts,
    };
  }
}
