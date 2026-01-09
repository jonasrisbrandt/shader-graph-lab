import { ComponentSpec, ComponentUniformOverrides, instantiateComponent } from "./component";
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
  uniforms?: ComponentUniformOverrides;
};

export type GraphSource = {
  passes?: PassSource[];
  components?: ComponentInstanceSource[];
  output: string;
  uiGroups?: Record<string, { label?: string; order?: number; collapsed?: boolean }>;
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
  uiGroups?: Record<string, { label?: string; order?: number; collapsed?: boolean }>;
};

export type Project = {
  baseUrl: string;
  shaders: Record<string, string>;
  components: Record<string, ComponentSpec>;
  assets: Record<string, AssetSpec>;
  graphs: Record<string, GraphResolved>;
};

const VALID_TEXTURE_FORMATS = new Set(["rgba8", "rgba16f"]);
const VALID_TEXTURE_FILTERS = new Set(["nearest", "linear"]);
const VALID_UNIFORM_TYPES = new Set(["f1", "f2", "f3", "f4"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertObject(value: unknown, label: string): Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function assertNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number.`);
  }
  return value;
}

function assertBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean.`);
  }
  return value;
}

function isIncludeRef(value: unknown): value is IncludeRef {
  return isObject(value) && typeof value.$include === "string";
}

function isRef(value: unknown): value is Ref {
  return isObject(value) && typeof value.$ref === "string";
}

function validateTextureFormat(value: unknown, label: string) {
  const format = assertString(value, label);
  if (!VALID_TEXTURE_FORMATS.has(format)) {
    throw new Error(`${label} must be one of ${Array.from(VALID_TEXTURE_FORMATS).join(", ")}.`);
  }
}

function validateTextureFilter(value: unknown, label: string) {
  const filter = assertString(value, label);
  if (!VALID_TEXTURE_FILTERS.has(filter)) {
    throw new Error(`${label} must be one of ${Array.from(VALID_TEXTURE_FILTERS).join(", ")}.`);
  }
}

function validateSizeSpec(value: unknown, label: string) {
  const size = assertObject(value, label);
  const kind = assertString(size.kind, `${label}.kind`);
  if (kind === "full" || kind === "half") {
    return;
  }
  if (kind === "scale") {
    const scale = assertNumber(size.scale, `${label}.scale`);
    if (scale <= 0) {
      throw new Error(`${label}.scale must be greater than 0.`);
    }
    return;
  }
  if (kind === "custom") {
    const width = assertNumber(size.width, `${label}.width`);
    const height = assertNumber(size.height, `${label}.height`);
    if (width <= 0 || height <= 0) {
      throw new Error(`${label} width/height must be greater than 0.`);
    }
    return;
  }
  if (kind === "input") {
    if ("input" in size && size.input !== undefined) {
      assertString(size.input, `${label}.input`);
    }
    if ("scale" in size && size.scale !== undefined) {
      const scale = assertNumber(size.scale, `${label}.scale`);
      if (scale <= 0) {
        throw new Error(`${label}.scale must be greater than 0.`);
      }
    }
    return;
  }
  throw new Error(`${label}.kind must be one of full, half, scale, custom, input.`);
}

function validateTextureDesc(value: unknown, label: string) {
  const desc = assertObject(value, label);
  validateTextureFormat(desc.format, `${label}.format`);
  validateSizeSpec(desc.size, `${label}.size`);
  if ("filter" in desc && desc.filter !== undefined) {
    validateTextureFilter(desc.filter, `${label}.filter`);
  }
  if ("persistent" in desc && desc.persistent !== undefined) {
    assertBoolean(desc.persistent, `${label}.persistent`);
  }
}

function validateTextureContract(value: unknown, label: string) {
  const contract = assertObject(value, label);
  if ("format" in contract && contract.format !== undefined) {
    validateTextureFormat(contract.format, `${label}.format`);
  }
  if ("size" in contract && contract.size !== undefined) {
    validateSizeSpec(contract.size, `${label}.size`);
  }
  if ("filter" in contract && contract.filter !== undefined) {
    validateTextureFilter(contract.filter, `${label}.filter`);
  }
}

function validateUniformSpec(value: unknown, label: string) {
  const spec = assertObject(value, label);
  const type = assertString(spec.type, `${label}.type`);
  if (!VALID_UNIFORM_TYPES.has(type)) {
    throw new Error(`${label}.type must be one of ${Array.from(VALID_UNIFORM_TYPES).join(", ")}.`);
  }
  if (type === "f1") {
    assertNumber(spec.value, `${label}.value`);
  } else if (type === "f2") {
    if (!Array.isArray(spec.value) || spec.value.length !== 2) {
      throw new Error(`${label}.value must be a number[2].`);
    }
    spec.value.forEach((entry, index) => assertNumber(entry, `${label}.value[${index}]`));
  } else if (type === "f3") {
    if (!Array.isArray(spec.value) || spec.value.length !== 3) {
      throw new Error(`${label}.value must be a number[3].`);
    }
    spec.value.forEach((entry, index) => assertNumber(entry, `${label}.value[${index}]`));
  } else if (type === "f4") {
    if (!Array.isArray(spec.value) || spec.value.length !== 4) {
      throw new Error(`${label}.value must be a number[4].`);
    }
    spec.value.forEach((entry, index) => assertNumber(entry, `${label}.value[${index}]`));
  }
  let minValue: number | null = null;
  let maxValue: number | null = null;
  if ("min" in spec && spec.min !== undefined) {
    minValue = assertNumber(spec.min, `${label}.min`);
  }
  if ("max" in spec && spec.max !== undefined) {
    maxValue = assertNumber(spec.max, `${label}.max`);
  }
  if (minValue !== null && maxValue !== null && minValue > maxValue) {
    throw new Error(`${label} min must be <= max.`);
  }
  if ("step" in spec && spec.step !== undefined) {
    assertNumber(spec.step, `${label}.step`);
  }
  if ("ui" in spec && spec.ui !== undefined) {
    const ui = assertObject(spec.ui, `${label}.ui`);
    if ("show" in ui && ui.show !== undefined) {
      assertBoolean(ui.show, `${label}.ui.show`);
    }
    if ("label" in ui && ui.label !== undefined) {
      assertString(ui.label, `${label}.ui.label`);
    }
    if ("group" in ui && ui.group !== undefined) {
      assertString(ui.group, `${label}.ui.group`);
    }
  }
}

function validateUniformOverride(value: unknown, label: string) {
  const spec = assertObject(value, label);
  if ("type" in spec && spec.type !== undefined) {
    const type = assertString(spec.type, `${label}.type`);
    if (!VALID_UNIFORM_TYPES.has(type)) {
      throw new Error(`${label}.type must be one of ${Array.from(VALID_UNIFORM_TYPES).join(", ")}.`);
    }
  }
  if ("value" in spec && spec.value !== undefined) {
    if (typeof spec.value === "number") {
      // ok
    } else if (Array.isArray(spec.value)) {
      if (spec.value.length < 2 || spec.value.length > 4) {
        throw new Error(`${label}.value must be a number[2..4].`);
      }
      spec.value.forEach((entry, index) => assertNumber(entry, `${label}.value[${index}]`));
    } else {
      throw new Error(`${label}.value must be a number or array of numbers.`);
    }
  }
  if ("min" in spec && spec.min !== undefined) {
    assertNumber(spec.min, `${label}.min`);
  }
  if ("max" in spec && spec.max !== undefined) {
    assertNumber(spec.max, `${label}.max`);
  }
  if ("step" in spec && spec.step !== undefined) {
    assertNumber(spec.step, `${label}.step`);
  }
  if ("ui" in spec && spec.ui !== undefined) {
    const ui = assertObject(spec.ui, `${label}.ui`);
    if ("show" in ui && ui.show !== undefined) {
      assertBoolean(ui.show, `${label}.ui.show`);
    }
    if ("label" in ui && ui.label !== undefined) {
      assertString(ui.label, `${label}.ui.label`);
    }
    if ("group" in ui && ui.group !== undefined) {
      assertString(ui.group, `${label}.ui.group`);
    }
  }
}

function validateInputSource(
  source: string,
  label: string,
  options: { allowInputRef: boolean; allowPassRefDots: boolean; allowAssetRef: boolean; allowPrevRef: boolean }
) {
  if (source.startsWith("$input.")) {
    if (!options.allowInputRef) {
      throw new Error(`${label} does not allow "$input.*" references.`);
    }
    const name = source.slice("$input.".length);
    if (!name) {
      throw new Error(`${label} must specify an input name after "$input.".`);
    }
    return;
  }
  if (source.startsWith("$prev.")) {
    if (!options.allowPrevRef) {
      throw new Error(`${label} does not allow "$prev.*" references.`);
    }
    const name = source.slice("$prev.".length);
    if (!name) {
      throw new Error(`${label} must specify an output name after "$prev.".`);
    }
    return;
  }
  if (source.startsWith("$asset.")) {
    if (!options.allowAssetRef) {
      throw new Error(`${label} does not allow "$asset.*" references.`);
    }
    const name = source.slice("$asset.".length);
    if (!name) {
      throw new Error(`${label} must specify an asset name after "$asset.".`);
    }
    return;
  }
  const idx = source.lastIndexOf(".");
  if (idx <= 0 || idx >= source.length - 1) {
    throw new Error(`${label} must be "pass.output".`);
  }
  if (!options.allowPassRefDots && source.split(".").length !== 2) {
    throw new Error(`${label} must reference a local pass output ("pass.output").`);
  }
}

function validateInputSpec(value: unknown, label: string, allowInputRef: boolean, allowPassRefDots: boolean) {
  const input = assertObject(value, label);
  const source = assertString(input.source, `${label}.source`);
  validateInputSource(source, `${label}.source`, {
    allowInputRef,
    allowPassRefDots,
    allowAssetRef: true,
    allowPrevRef: true,
  });
  if ("uniform" in input && input.uniform !== undefined) {
    assertString(input.uniform, `${label}.uniform`);
  }
  if ("expected" in input && input.expected !== undefined) {
    validateTextureContract(input.expected, `${label}.expected`);
  }
}

function validatePassSource(value: unknown, label: string, allowInputRef: boolean, allowPassRefDots: boolean) {
  const pass = assertObject(value, label);
  const id = assertString(pass.id, `${label}.id`);
  if (!allowPassRefDots && id.includes(".")) {
    throw new Error(`${label}.id must not include ".".`);
  }
  const fragment = pass.fragment;
  if (typeof fragment === "string") {
    if (!fragment.trim()) {
      throw new Error(`${label}.fragment must not be empty.`);
    }
  } else if (isRef(fragment)) {
    const ref = assertString(fragment.$ref, `${label}.fragment.$ref`);
    if (!ref.startsWith("shader.")) {
      throw new Error(`${label}.fragment.$ref must use "shader.<name>".`);
    }
  } else if (isIncludeRef(fragment)) {
    throw new Error(`${label}.fragment includes were not resolved.`);
  } else {
    throw new Error(`${label}.fragment must be a string or { "$ref": "shader.<name>" }.`);
  }

  if ("inputs" in pass && pass.inputs !== undefined) {
    const inputs = assertObject(pass.inputs, `${label}.inputs`);
    for (const [key, input] of Object.entries(inputs)) {
      validateInputSpec(input, `${label}.inputs.${key}`, allowInputRef, allowPassRefDots);
    }
  }
  if ("outputs" in pass && pass.outputs !== undefined) {
    const outputs = assertObject(pass.outputs, `${label}.outputs`);
    for (const [key, output] of Object.entries(outputs)) {
      validateTextureDesc(output, `${label}.outputs.${key}`);
    }
  }
  if ("uniforms" in pass && pass.uniforms !== undefined) {
    const uniforms = assertObject(pass.uniforms, `${label}.uniforms`);
    for (const [key, uniform] of Object.entries(uniforms)) {
      validateUniformSpec(uniform, `${label}.uniforms.${key}`);
    }
  }
}

function validateComponentOutputSpec(value: unknown, label: string) {
  const output = assertObject(value, label);
  const ref = assertString(output.ref, `${label}.ref`);
  validateInputSource(ref, `${label}.ref`, {
    allowInputRef: true,
    allowPassRefDots: false,
    allowAssetRef: false,
    allowPrevRef: false,
  });
  if ("contract" in output && output.contract !== undefined) {
    validateTextureContract(output.contract, `${label}.contract`);
  }
}

function validateComponentSpecSource(value: unknown, label: string) {
  if (isIncludeRef(value)) {
    throw new Error(`${label} includes were not resolved.`);
  }
  const spec = assertObject(value, label);
  assertString(spec.name, `${label}.name`);
  const inputs = assertObject(spec.inputs, `${label}.inputs`);
  for (const [key, input] of Object.entries(inputs)) {
    validateTextureContract(input, `${label}.inputs.${key}`);
  }
  const outputs = assertObject(spec.outputs, `${label}.outputs`);
  for (const [key, output] of Object.entries(outputs)) {
    validateComponentOutputSpec(output, `${label}.outputs.${key}`);
  }
  if (!Array.isArray(spec.passes)) {
    throw new Error(`${label}.passes must be an array.`);
  }
  const ids = new Set<string>();
  for (let i = 0; i < spec.passes.length; i++) {
    const passLabel = `${label}.passes[${i}]`;
    validatePassSource(spec.passes[i], passLabel, true, false);
    const passId = (spec.passes[i] as { id?: unknown }).id;
    if (typeof passId === "string") {
      if (ids.has(passId)) {
        throw new Error(`${label} has duplicate pass id "${passId}".`);
      }
      ids.add(passId);
    }
  }
}

function validateComponentInstance(value: unknown, label: string) {
  const instance = assertObject(value, label);
  assertString(instance.id, `${label}.id`);
  assertString(instance.component, `${label}.component`);
  const bindings = assertObject(instance.bindings, `${label}.bindings`);
  for (const [key, binding] of Object.entries(bindings)) {
    assertString(binding, `${label}.bindings.${key}`);
  }
  if ("uniforms" in instance && instance.uniforms !== undefined) {
    const overrides = assertObject(instance.uniforms, `${label}.uniforms`);
    for (const [passId, uniforms] of Object.entries(overrides)) {
      const uniformMap = assertObject(uniforms, `${label}.uniforms.${passId}`);
      for (const [name, uniform] of Object.entries(uniformMap)) {
        validateUniformOverride(uniform, `${label}.uniforms.${passId}.${name}`);
      }
    }
  }
}

function validateAssetSpec(value: unknown, label: string) {
  const asset = assertObject(value, label);
  const type = assertString(asset.type, `${label}.type`);
  if (type !== "image" && type !== "video") {
    throw new Error(`${label}.type must be "image" or "video".`);
  }
  assertString(asset.url, `${label}.url`);
  if ("filter" in asset && asset.filter !== undefined) {
    validateTextureFilter(asset.filter, `${label}.filter`);
  }
  if ("flipY" in asset && asset.flipY !== undefined) {
    assertBoolean(asset.flipY, `${label}.flipY`);
  }
  if ("loop" in asset && asset.loop !== undefined) {
    assertBoolean(asset.loop, `${label}.loop`);
  }
  if ("muted" in asset && asset.muted !== undefined) {
    assertBoolean(asset.muted, `${label}.muted`);
  }
  if ("autoplay" in asset && asset.autoplay !== undefined) {
    assertBoolean(asset.autoplay, `${label}.autoplay`);
  }
  if ("playsInline" in asset && asset.playsInline !== undefined) {
    assertBoolean(asset.playsInline, `${label}.playsInline`);
  }
  if ("lutSize" in asset && asset.lutSize !== undefined) {
    const lutSize = assertNumber(asset.lutSize, `${label}.lutSize`);
    if (lutSize <= 0) {
      throw new Error(`${label}.lutSize must be greater than 0.`);
    }
  }
}

function validateShaderMap(value: unknown, label: string) {
  const shaders = assertObject(value, label);
  for (const [key, shader] of Object.entries(shaders)) {
    if (typeof shader === "string") {
      if (!shader.trim()) {
        throw new Error(`${label}.${key} must not be empty.`);
      }
      continue;
    }
    if (isRef(shader)) {
      const ref = assertString(shader.$ref, `${label}.${key}.$ref`);
      if (!ref.startsWith("shader.")) {
        throw new Error(`${label}.${key}.$ref must use "shader.<name>".`);
      }
      continue;
    }
    if (isIncludeRef(shader)) {
      throw new Error(`${label}.${key} includes were not resolved.`);
    }
    throw new Error(`${label}.${key} must be a string or { "$ref": "shader.<name>" }.`);
  }
}

function validateProjectSource(source: ProjectSource) {
  assertObject(source, "project");
  if (source.shaders !== undefined) {
    validateShaderMap(source.shaders, "project.shaders");
  }
  if (source.assets !== undefined) {
    const assets = assertObject(source.assets, "project.assets");
    for (const [key, asset] of Object.entries(assets)) {
      validateAssetSpec(asset, `project.assets.${key}`);
    }
  }
  if (source.components !== undefined) {
    const components = assertObject(source.components, "project.components");
    for (const [key, component] of Object.entries(components)) {
      validateComponentSpecSource(component, `project.components.${key}`);
    }
  }
  const graphs = assertObject(source.graphs, "project.graphs");
  if (Object.keys(graphs).length === 0) {
    throw new Error("project.graphs must define at least one graph.");
  }
  for (const [key, graph] of Object.entries(graphs)) {
    const graphLabel = `project.graphs.${key}`;
    const graphObj = assertObject(graph, graphLabel);
    const output = assertString(graphObj.output, `${graphLabel}.output`);
    validateInputSource(output, `${graphLabel}.output`, {
      allowInputRef: false,
      allowPassRefDots: true,
      allowAssetRef: false,
      allowPrevRef: false,
    });
    if ("passes" in graphObj && graphObj.passes !== undefined) {
      if (!Array.isArray(graphObj.passes)) {
        throw new Error(`${graphLabel}.passes must be an array.`);
      }
      const ids = new Set<string>();
      for (let i = 0; i < graphObj.passes.length; i++) {
        const passLabel = `${graphLabel}.passes[${i}]`;
        validatePassSource(graphObj.passes[i], passLabel, false, true);
        const passId = (graphObj.passes[i] as { id?: unknown }).id;
        if (typeof passId === "string") {
          if (ids.has(passId)) {
            throw new Error(`${graphLabel} has duplicate pass id "${passId}".`);
          }
          ids.add(passId);
        }
      }
    }
    if ("components" in graphObj && graphObj.components !== undefined) {
      if (!Array.isArray(graphObj.components)) {
        throw new Error(`${graphLabel}.components must be an array.`);
      }
      for (let i = 0; i < graphObj.components.length; i++) {
        validateComponentInstance(graphObj.components[i], `${graphLabel}.components[${i}]`);
      }
    }
    if ("uiGroups" in graphObj && graphObj.uiGroups !== undefined) {
      const groups = assertObject(graphObj.uiGroups, `${graphLabel}.uiGroups`);
      for (const [groupName, groupSpec] of Object.entries(groups)) {
        const groupObj = assertObject(groupSpec, `${graphLabel}.uiGroups.${groupName}`);
        if ("label" in groupObj && groupObj.label !== undefined) {
          assertString(groupObj.label, `${graphLabel}.uiGroups.${groupName}.label`);
        }
        if ("order" in groupObj && groupObj.order !== undefined) {
          assertNumber(groupObj.order, `${graphLabel}.uiGroups.${groupName}.order`);
        }
        if ("collapsed" in groupObj && groupObj.collapsed !== undefined) {
          assertBoolean(groupObj.collapsed, `${graphLabel}.uiGroups.${groupName}.collapsed`);
        }
      }
    }
  }
}

function resolveUrl(baseUrl: string, path: string) {
  const base = new URL(baseUrl, window.location.href);
  return new URL(path, base).toString();
}

type IncludeState = {
  cache: Map<string, string>;
  sourceIds: Map<string, number>;
  idToUrl: Map<number, string>;
};

function getSourceId(state: IncludeState, url: string) {
  const existing = state.sourceIds.get(url);
  if (existing !== undefined) return existing;
  const id = state.sourceIds.size;
  state.sourceIds.set(url, id);
  state.idToUrl.set(id, url);
  return id;
}

function countNewlines(text: string) {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") count++;
  }
  return count;
}

function injectSourceMapHeader(source: string, state: IncludeState, rootUrl: string) {
  const rootId = getSourceId(state, rootUrl);
  const entries = Array.from(state.idToUrl.entries()).sort((a, b) => a[0] - b[0]);
  const headerLines = entries.map(([id, url]) => `// @source ${id} ${url}`);
  headerLines.push(`#line 1 ${rootId}`);
  const header = `${headerLines.join("\n")}\n`;
  if (source.startsWith("#version")) {
    const endLine = source.indexOf("\n");
    if (endLine === -1) {
      return `${source}\n${header}`;
    }
    return `${source.slice(0, endLine + 1)}${header}${source.slice(endLine + 1)}`;
  }
  return `${header}${source}`;
}

export type TextResolver = (url: string) => Promise<string>;

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch "${url}": ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function expandShaderIncludes(
  source: string,
  baseUrl: string,
  stack: Set<string>,
  state: IncludeState,
  readText: TextResolver
): Promise<string> {
  const includePattern = /^[ \t]*#include\s+"([^"]+)"\s*$/gm;
  let result = "";
  let lastIndex = 0;
  let lineNumber = 1;
  const currentId = getSourceId(state, baseUrl);
  let match: RegExpExecArray | null;
  while ((match = includePattern.exec(source)) !== null) {
    const before = source.slice(lastIndex, match.index);
    result += before;
    lineNumber += countNewlines(before);
    const includePath = match[1];
    const includeUrl = resolveUrl(baseUrl, includePath);
    if (stack.has(includeUrl)) {
      throw new Error(`Shader include cycle detected at "${includeUrl}".`);
    }
    const cached = state.cache.get(includeUrl);
    const includeId = getSourceId(state, includeUrl);
    if (cached !== undefined) {
      result += `#line 1 ${includeId}\n${cached}\n#line ${lineNumber + 1} ${currentId}\n`;
    } else {
      stack.add(includeUrl);
      const includeText = await readText(includeUrl);
      const expanded = await expandShaderIncludes(includeText, includeUrl, stack, state, readText);
      stack.delete(includeUrl);
      state.cache.set(includeUrl, expanded);
      result += `#line 1 ${includeId}\n${expanded}\n#line ${lineNumber + 1} ${currentId}\n`;
    }
    lastIndex = includePattern.lastIndex;
  }
  result += source.slice(lastIndex);
  return result;
}

async function resolveIncludes(
  value: unknown,
  baseUrl: string,
  state: IncludeState,
  readText: TextResolver
): Promise<unknown> {
  if (isIncludeRef(value)) {
    const url = resolveUrl(baseUrl, value.$include);
    const text = await readText(url);
    if (url.toLowerCase().endsWith(".json")) {
      const parsed = JSON.parse(text) as unknown;
      return resolveIncludes(parsed, url, state, readText);
    }
    const expanded = await expandShaderIncludes(text, url, new Set([url]), state, readText);
    return injectSourceMapHeader(expanded, state, url);
  }
  if (Array.isArray(value)) {
    const resolved = [] as unknown[];
    for (const entry of value) {
      resolved.push(await resolveIncludes(entry, baseUrl, state, readText));
    }
    return resolved;
  }
  if (isObject(value)) {
    const resolved: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      resolved[key] = await resolveIncludes(entry, baseUrl, state, readText);
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
      uiGroups: graph.uiGroups,
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

export async function loadProjectWithResolver(url: string, readText: TextResolver): Promise<Project> {
  const resolvedUrl = new URL(url, window.location.href).toString();
  const text = await readText(resolvedUrl);
  let raw: ProjectSource;
  try {
    raw = JSON.parse(text) as ProjectSource;
  } catch (error) {
    throw new Error(`Failed to parse project JSON from "${resolvedUrl}".`);
  }
  const includeState: IncludeState = {
    cache: new Map<string, string>(),
    sourceIds: new Map<string, number>(),
    idToUrl: new Map<number, string>(),
  };
  const resolved = (await resolveIncludes(raw, resolvedUrl, includeState, readText)) as ProjectSource;
  validateProjectSource(resolved);
  return buildProject(resolved, resolvedUrl);
}

export async function loadProject(url: string): Promise<Project> {
  return loadProjectWithResolver(url, fetchText);
}

export function buildGraphFromProject(project: Project, graphName: string) {
  const graph = project.graphs[graphName];
  if (!graph) {
    throw new Error(`Graph "${graphName}" not found in project.`);
  }

  const builder = new GraphBuilder();
  const componentOutputs = new Map<string, string>();
  const componentInstances: Array<{ instance: ComponentInstanceSource; component: ReturnType<typeof instantiateComponent> }> = [];

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
    const component = instantiateComponent(spec, instance.id, instance.bindings, instance.uniforms);
    componentInstances.push({ instance, component });
    for (const [name, ref] of Object.entries(component.outputs)) {
      componentOutputs.set(`${instance.id}.${name}`, ref);
    }
  }

  for (const entry of componentInstances) {
    const updatedPasses = entry.component.passes.map((pass) => {
      const resolved = resolveGraphPassInputs(pass, componentOutputs);
      validateAssetRefs(resolved);
      return applyAssetUniforms(resolved);
    });
    builder.addComponent({ passes: updatedPasses });
  }

  for (const pass of graph.passes ?? []) {
    validateAssetRefs(pass);
    const resolved = resolveGraphPassInputs(pass, componentOutputs);
    builder.addPass(applyAssetUniforms(resolved));
  }

  const outputRef = resolveGraphRef(graph.output, componentOutputs);
  return builder.output(outputRef).build(graph.uiGroups);
}
