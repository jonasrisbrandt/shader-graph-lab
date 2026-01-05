import { ComponentSpec, instantiateComponent } from "./component";
import { GraphBuilder } from "./graph";
import { AssetSpec, PassDef } from "./types";

export type IncludeRef = { $include: string };
export type Ref = { $ref: string };

export type FragmentSource = string | IncludeRef | Ref;

export type PassSource = Omit<PassDef, "fragment"> & { fragment: FragmentSource };

export type ComponentSpecSource = Omit<ComponentSpec, "passes"> & { passes: PassSource[] };

export type ComponentSource = ComponentSpecSource | IncludeRef;

export type ComponentInstanceSource = {
  id: string;
  component: string;
  bindings: Record<string, string>;
};

export type GraphSource = {
  passes?: PassSource[];
  components?: ComponentInstanceSource[];
  output: string;
};

export type ProjectSource = {
  shaders?: Record<string, FragmentSource>;
  components?: Record<string, ComponentSource>;
  assets?: Record<string, AssetSpec>;
  graphs: Record<string, GraphSource>;
};

export type GraphResolved = {
  passes?: PassDef[];
  components?: ComponentInstanceSource[];
  output: string;
};

export type Project = {
  baseUrl: string;
  shaders: Record<string, string>;
  components: Record<string, ComponentSpec>;
  assets: Record<string, AssetSpec>;
  graphs: Record<string, GraphResolved>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIncludeRef(value: unknown): value is IncludeRef {
  return isObject(value) && typeof value.$include === "string";
}

function isRef(value: unknown): value is Ref {
  return isObject(value) && typeof value.$ref === "string";
}

function resolveUrl(baseUrl: string, path: string) {
  const base = new URL(baseUrl, window.location.href);
  return new URL(path, base).toString();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch "${url}": ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function resolveIncludes(value: unknown, baseUrl: string): Promise<unknown> {
  if (isIncludeRef(value)) {
    const url = resolveUrl(baseUrl, value.$include);
    const text = await fetchText(url);
    if (url.toLowerCase().endsWith(".json")) {
      const parsed = JSON.parse(text) as unknown;
      return resolveIncludes(parsed, url);
    }
    return text;
  }
  if (Array.isArray(value)) {
    const resolved = [] as unknown[];
    for (const entry of value) {
      resolved.push(await resolveIncludes(entry, baseUrl));
    }
    return resolved;
  }
  if (isObject(value)) {
    const resolved: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      resolved[key] = await resolveIncludes(entry, baseUrl);
    }
    return resolved;
  }
  return value;
}

function resolveFragmentSource(source: FragmentSource, shaders: Record<string, string>): string {
  if (typeof source === "string") {
    return source;
  }
  if (isRef(source)) {
    const ref = source.$ref;
    const prefix = "shader.";
    if (!ref.startsWith(prefix)) {
      throw new Error(`Invalid fragment ref "${ref}". Use "shader.<name>".`);
    }
    const name = ref.slice(prefix.length);
    const shader = shaders[name];
    if (!shader) {
      throw new Error(`Missing shader "${name}".`);
    }
    return shader;
  }
  if (isIncludeRef(source)) {
    throw new Error("Unresolved include in fragment source.");
  }
  throw new Error("Invalid fragment source.");
}

function resolvePasses(passes: PassSource[], shaders: Record<string, string>): PassDef[] {
  return passes.map((pass) => ({
    ...pass,
    fragment: resolveFragmentSource(pass.fragment, shaders),
  }));
}

function resolveShaderMap(sources: Record<string, FragmentSource>): Record<string, string> {
  const shaders: Record<string, string> = {};
  for (const [name, source] of Object.entries(sources)) {
    if (typeof source === "string") {
      shaders[name] = source;
      continue;
    }
    if (isRef(source)) {
      const ref = source.$ref;
      const prefix = "shader.";
      if (!ref.startsWith(prefix)) {
        throw new Error(`Invalid shader ref "${ref}". Use "shader.<name>".`);
      }
      const target = ref.slice(prefix.length);
      const shader = shaders[target];
      if (!shader) {
        throw new Error(`Shader "${name}" references missing shader "${target}".`);
      }
      shaders[name] = shader;
      continue;
    }
    throw new Error(`Shader "${name}" must be a string or ref.`);
  }
  return shaders;
}

function resolveComponentMap(
  sources: Record<string, ComponentSource>,
  shaders: Record<string, string>
): Record<string, ComponentSpec> {
  const components: Record<string, ComponentSpec> = {};
  for (const [name, source] of Object.entries(sources)) {
    if (isIncludeRef(source)) {
      throw new Error(`Unresolved include for component "${name}".`);
    }
    if (!isObject(source) || !Array.isArray((source as ComponentSpecSource).passes)) {
      throw new Error(`Component "${name}" is missing passes.`);
    }
    const specSource = source as ComponentSpecSource;
    components[name] = {
      ...specSource,
      passes: resolvePasses(specSource.passes, shaders),
    };
  }
  return components;
}

function resolveGraphMap(sources: Record<string, GraphSource>, shaders: Record<string, string>): Record<string, GraphResolved> {
  const graphs: Record<string, GraphResolved> = {};
  for (const [name, graph] of Object.entries(sources)) {
    graphs[name] = {
      passes: graph.passes ? resolvePasses(graph.passes, shaders) : undefined,
      components: graph.components,
      output: graph.output,
    };
  }
  return graphs;
}

function resolveGraphRef(ref: string, componentOutputs: Map<string, string>) {
  return componentOutputs.get(ref) ?? ref;
}

function resolveGraphPassInputs(pass: PassDef, componentOutputs: Map<string, string>): PassDef {
  if (!pass.inputs) return pass;
  const inputs = Object.fromEntries(
    Object.entries(pass.inputs).map(([key, input]) => [
      key,
      { ...input, source: resolveGraphRef(input.source, componentOutputs) },
    ])
  );
  return { ...pass, inputs };
}

function buildProject(source: ProjectSource, baseUrl: string): Project {
  const shaders = resolveShaderMap(source.shaders ?? {});
  const components = resolveComponentMap(source.components ?? {}, shaders);
  const graphs = resolveGraphMap(source.graphs, shaders);
  return { baseUrl, shaders, components, assets: source.assets ?? {}, graphs };
}

export async function loadProject(url: string): Promise<Project> {
  const resolvedUrl = new URL(url, window.location.href).toString();
  const text = await fetchText(resolvedUrl);
  let raw: ProjectSource;
  try {
    raw = JSON.parse(text) as ProjectSource;
  } catch (error) {
    throw new Error(`Failed to parse project JSON from "${resolvedUrl}".`);
  }
  const resolved = (await resolveIncludes(raw, resolvedUrl)) as ProjectSource;
  return buildProject(resolved, resolvedUrl);
}

export function buildGraphFromProject(project: Project, graphName: string) {
  const graph = project.graphs[graphName];
  if (!graph) {
    throw new Error(`Graph "${graphName}" not found in project.`);
  }

  const builder = new GraphBuilder();
  const componentOutputs = new Map<string, string>();

  const applyAssetUniforms = (pass: PassDef): PassDef => {
    let lutSize: number | null = null;
    for (const input of Object.values(pass.inputs ?? {})) {
      if (!input.source.startsWith("$asset.")) continue;
      const name = input.source.slice("$asset.".length);
      const asset = project.assets[name];
      const assetLut = asset?.lutSize;
      if (assetLut === undefined) continue;
      if (lutSize !== null && Math.abs(lutSize - assetLut) > 1e-6) {
        throw new Error(`Pass "${pass.id}" references assets with different LUT sizes.`);
      }
      lutSize = assetLut;
    }
    if (lutSize === null) {
      return pass;
    }
    const uniforms = { ...(pass.uniforms ?? {}) };
    uniforms.uLutSize = {
      type: "f1",
      value: lutSize,
      ui: { show: false },
    };
    return { ...pass, uniforms };
  };

  const validateAssetRefs = (pass: PassDef) => {
    for (const input of Object.values(pass.inputs ?? {})) {
      if (!input.source.startsWith("$asset.")) continue;
      const name = input.source.slice("$asset.".length);
      if (!project.assets[name]) {
        throw new Error(`Missing asset "${name}" for pass "${pass.id}".`);
      }
    }
  };

  for (const instance of graph.components ?? []) {
    const spec = project.components[instance.component];
    if (!spec) {
      throw new Error(`Component "${instance.component}" not found in project.`);
    }
    const component = instantiateComponent(spec, instance.id, instance.bindings);
    const updatedPasses = component.passes.map((pass) => {
      validateAssetRefs(pass);
      return applyAssetUniforms(pass);
    });
    builder.addComponent({ passes: updatedPasses });
    for (const [name, ref] of Object.entries(component.outputs)) {
      componentOutputs.set(`${instance.id}.${name}`, ref);
    }
  }

  for (const pass of graph.passes ?? []) {
    validateAssetRefs(pass);
    const resolved = resolveGraphPassInputs(pass, componentOutputs);
    builder.addPass(applyAssetUniforms(resolved));
  }

  const outputRef = resolveGraphRef(graph.output, componentOutputs);
  return builder.output(outputRef).build();
}
