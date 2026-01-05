# Architecture

## Overview
This project is a minimal WebGL2 fullscreen-pass render graph intended to scale into a reusable framework for 2D shader experiments.

## Goals
- Clear separation between graph description, runtime execution, and GPU resources.
- Explicit texture formats and sizes per pass.
- Easy to compose passes into reusable components (e.g., bloom).

## System Diagram (Text)
Graph Definition -> Graph Runner -> Pass Execution -> Texture Pool -> Framebuffer

## Render Flow
- init: create GL context, compile fullscreen shaders, create pass runtimes
- update: evaluate time and dynamic uniforms
- draw: bind inputs, render to pass outputs, present final output

## Graph Model
- Each pass defines 0..N inputs and 1..N outputs.
- Inputs reference prior pass outputs by name (`pass.output`).
- Outputs define format and size (`full`, `half`, or custom).

## GPU Resources
- Programs: shared fullscreen vertex shader + pass fragment shaders
- Textures: pooled by format + size
- Render targets: FBO with 1..N color attachments (MRT-ready)

## UI Integration
- Planned: uniform definitions with UI bindings for live tweaking
