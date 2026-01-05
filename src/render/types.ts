export type SizeSpec =
  | { kind: "full" }
  | { kind: "half" }
  | { kind: "scale"; scale: number }
  | { kind: "custom"; width: number; height: number }
  | { kind: "input"; input?: string; scale?: number };

export type TextureFormat = "rgba8" | "rgba16f";

export type TextureFilter = "nearest" | "linear";

export type TextureDesc = {
  format: TextureFormat;
  size: SizeSpec;
  filter?: TextureFilter;
  persistent?: boolean;
};

export type TextureContract = {
  format?: TextureFormat;
  size?: SizeSpec;
  filter?: TextureFilter;
};

export type InputSpec = {
  source: string;
  uniform?: string;
  expected?: TextureContract;
};

export type UniformType = "f1" | "f2" | "f3" | "f4";

export type UniformSpec = {
  type: UniformType;
  value: number | [number, number] | [number, number, number] | [number, number, number, number];
  min?: number;
  max?: number;
  step?: number;
  ui?: {
    show?: boolean;
    label?: string;
    group?: string;
  };
};

export type PassDef = {
  id: string;
  fragment: string;
  inputs?: Record<string, InputSpec>;
  outputs?: Record<string, TextureDesc>;
  uniforms?: Record<string, UniformSpec>;
};

export type GraphDef = {
  passes: PassDef[];
  output: string;
};
