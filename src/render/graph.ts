import { GraphDef, InputSpec, PassDef } from "./types";

export type OutputRef = {
  passId: string;
  outputName: string;
};

export type ResolvedInput = {
  key: string;
  uniform: string;
  ref: OutputRef;
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
  }));
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
    for (const pass of this.passes) {
      if (pass.outputs) {
        for (const name of Object.keys(pass.outputs)) {
          outputKeys.add(`${pass.id}.${name}`);
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
      }
    }

    const usageCounts = new Map<string, number>();
    for (const key of outputKeys) {
      usageCounts.set(key, 0);
    }
    for (const pass of resolved) {
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
      passes: resolved,
      output: this.outputRef,
      usageCounts,
    };
  }
}
