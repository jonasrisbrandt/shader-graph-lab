import "./ui/landing.css";
import { GraphRunner, type CameraUniforms } from "./render/runtime";
import { buildGraphFromProject, loadProject } from "./render/project";
import { loadProjectAssets } from "./render/assets";

type LandingCta = {
  label: string;
  href: string;
};

type LandingShowcase = {
  id: string;
  title?: string;
  description?: string;
  href?: string;
  previewTime?: number;
};

type LandingFeature = {
  title: string;
  body: string;
};

type LandingConfig = {
  brand?: string;
  title?: string;
  eyebrow?: string;
  tagline?: string;
  description?: string;
  cta?: LandingCta;
  secondaryCta?: LandingCta;
  showcase?: LandingShowcase[];
  features?: LandingFeature[];
};

type ProjectManifest = {
  projects: Array<{ id: string; name?: string }>;
};

type ShowcaseState = "idle" | "loading" | "ready" | "error";

const appBaseUrl = new URL(".", window.location.href);

function setText(selector: string, value?: string) {
  if (!value) return;
  const nodes = document.querySelectorAll<HTMLElement>(selector);
  nodes.forEach((node) => {
    node.textContent = value;
  });
}

function setLink(selector: string, cta?: LandingCta) {
  if (!cta) return;
  const nodes = document.querySelectorAll<HTMLAnchorElement>(selector);
  nodes.forEach((node) => {
    node.textContent = cta.label;
    node.href = new URL(cta.href, appBaseUrl).toString();
  });
}

async function loadJson<T>(url: URL): Promise<T> {
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch "${url}": ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

function createDefaultCamera(): CameraUniforms {
  const radius = 3;
  const theta = Math.PI * 0.25;
  const phi = Math.PI * 0.15;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const position: [number, number, number] = [
    radius * cosPhi * sinTheta,
    radius * sinPhi,
    radius * cosPhi * cosTheta,
  ];
  return {
    position,
    target: [0, 0, 0],
    up: [0, 1, 0],
    fov: Math.PI / 3,
  };
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) {
    return false;
  }
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return true;
}

class ShowcaseRenderer {
  private entry: LandingShowcase;
  private project: { id: string; name?: string };
  private media: HTMLDivElement;
  private status: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private state: ShowcaseState = "idle";
  private initPromise: Promise<void> | null = null;
  private runner: GraphRunner | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private baseTimeSec = 0;
  private frameStartMs = 0;
  private rafId = 0;
  private running = false;
  private playOnReady = false;
  private camera = createDefaultCamera();

  constructor(
    entry: LandingShowcase,
    project: { id: string; name?: string },
    media: HTMLDivElement,
    status: HTMLDivElement,
    canvas: HTMLCanvasElement
  ) {
    this.entry = entry;
    this.project = project;
    this.media = media;
    this.status = status;
    this.canvas = canvas;
  }

  get element() {
    return this.media;
  }

  init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.load();
    return this.initPromise;
  }

  start() {
    if (this.state === "ready") {
      this.playOnReady = false;
      this.beginLoop();
      return;
    }
    if (this.state === "error") return;
    this.playOnReady = true;
    this.init().catch(() => undefined);
  }

  stop() {
    this.playOnReady = false;
    if (!this.running) return;
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.renderStill();
  }

  renderStill() {
    if (this.state !== "ready") return;
    this.renderAt(this.baseTimeSec);
  }

  private setState(state: ShowcaseState, message?: string) {
    this.state = state;
    this.media.dataset.state = state;
    if (message) {
      this.status.textContent = message;
    }
  }

  private async load() {
    try {
      this.setState("loading", "Rendering preview");
      this.gl = this.canvas.getContext("webgl2", { antialias: true });
      if (!this.gl) {
        throw new Error("WebGL2 is not supported.");
      }
      const projectUrl = new URL(`projects/${this.project.id}/project.json`, appBaseUrl).toString();
      const project = await loadProject(projectUrl);
      const assets = await loadProjectAssets(this.gl, project);
      const graph = buildGraphFromProject(project, "main");
      const graphOffset = graph.timeOffset ?? 0;
      const previewTime = this.entry.previewTime ?? graphOffset;
      this.baseTimeSec = previewTime - graphOffset;
      this.runner = new GraphRunner(this.gl, graph, assets);
      const ready = await this.renderFirstFrame();
      if (!ready) {
        this.setState("error", "Preview unavailable");
        return;
      }
      this.setState("ready");
      if (this.playOnReady) {
        this.beginLoop();
      }
    } catch (error) {
      console.error(error);
      this.setState("error", "Preview unavailable");
    }
  }

  private beginLoop() {
    if (this.running) return;
    this.running = true;
    this.frameStartMs = performance.now();
    const tick = () => {
      if (!this.running) return;
      const now = performance.now();
      const elapsed = (now - this.frameStartMs) / 1000;
      this.renderAt(this.baseTimeSec + elapsed);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private renderAt(timeSec: number) {
    if (!this.runner || !this.gl) return;
    const sizeOk = resizeCanvasToDisplaySize(this.canvas);
    if (!sizeOk) return false;
    this.runner.setCamera(this.camera);
    this.runner.render(timeSec, this.canvas.width, this.canvas.height);
    return true;
  }

  private renderFirstFrame() {
    return new Promise<boolean>((resolve) => {
      let attempts = 6;
      const attempt = () => {
        if (this.renderAt(this.baseTimeSec)) {
          resolve(true);
          return;
        }
        attempts -= 1;
        if (attempts <= 0) {
          resolve(false);
          return;
        }
        requestAnimationFrame(attempt);
      };
      requestAnimationFrame(attempt);
    });
  }
}

function buildFeatureCard(feature: LandingFeature, delayMs: number) {
  const card = document.createElement("div");
  card.className = "feature-card reveal";
  card.style.setProperty("--delay", `${delayMs}ms`);
  const title = document.createElement("h3");
  title.textContent = feature.title;
  const body = document.createElement("p");
  body.textContent = feature.body;
  card.append(title, body);
  return card;
}

function buildShowcaseCard(entry: LandingShowcase, project: { id: string; name?: string }, delayMs: number) {
  const card = document.createElement("a");
  card.className = "showcase-card reveal";
  card.style.setProperty("--delay", `${delayMs}ms`);

  const appUrl = new URL("app.html", appBaseUrl);
  appUrl.searchParams.set("project", entry.id);
  card.href = entry.href ? new URL(entry.href, appBaseUrl).toString() : appUrl.toString();

  const media = document.createElement("div");
  media.className = "showcase-media";
  media.dataset.state = "idle";

  const canvas = document.createElement("canvas");
  canvas.className = "showcase-canvas";
  canvas.setAttribute("aria-label", entry.title ?? project?.name ?? entry.id);
  canvas.setAttribute("role", "img");

  const status = document.createElement("div");
  status.className = "thumb-status";
  status.textContent = "Rendering preview";

  media.append(canvas, status);

  const body = document.createElement("div");
  body.className = "showcase-body";
  const title = document.createElement("h3");
  title.textContent = entry.title ?? project?.name ?? entry.id;
  const desc = document.createElement("p");
  desc.textContent = entry.description ?? "View the project in the lab.";
  const meta = document.createElement("span");
  meta.className = "showcase-meta";
  meta.textContent = project?.id ?? entry.id;

  body.append(title, desc, meta);
  card.append(media, body);

  const renderer = new ShowcaseRenderer(entry, project, media, status, canvas);
  card.addEventListener("mouseenter", () => renderer.start());
  card.addEventListener("mouseleave", () => renderer.stop());
  card.addEventListener("focus", () => renderer.start());
  card.addEventListener("blur", () => renderer.stop());

  return { card, renderer };
}

async function initLanding() {
  try {
    const [config, manifest] = await Promise.all([
      loadJson<LandingConfig>(new URL("landing.json", appBaseUrl)),
      loadJson<ProjectManifest>(new URL("projects/index.json", appBaseUrl)),
    ]);

    if (config.title) {
      document.title = config.title;
    }
    setText("[data-brand]", config.brand);
    setText("[data-eyebrow]", config.eyebrow);
    setText("[data-tagline]", config.tagline);
    setText("[data-description]", config.description);
    setLink("[data-cta]", config.cta);
    setLink("[data-cta-hero]", config.cta);
    setLink("[data-cta-secondary]", config.secondaryCta);

    const count = document.querySelector<HTMLElement>("[data-project-count]");
    if (count) {
      count.textContent = String(manifest.projects.length);
    }

    const renderers: ShowcaseRenderer[] = [];
    const rendererMap = new Map<Element, ShowcaseRenderer>();
    const showcaseGrid = document.getElementById("showcase-grid");
    if (showcaseGrid && config.showcase?.length) {
      showcaseGrid.textContent = "";
      const projectMap = new Map(manifest.projects.map((project) => [project.id, project]));
      let index = 0;
      for (const entry of config.showcase) {
        const project = projectMap.get(entry.id);
        if (!project) {
          console.warn(`Showcase id "${entry.id}" is not in projects/index.json.`);
          continue;
        }
        const { card, renderer } = buildShowcaseCard(entry, project, index * 80);
        showcaseGrid.appendChild(card);
        renderers.push(renderer);
        rendererMap.set(renderer.element, renderer);
        index += 1;
      }
    }

    if (renderers.length > 0) {
      const preloadVisible = () => {
        const margin = 200;
        const viewport = window.innerHeight;
        for (const renderer of renderers) {
          const rect = renderer.element.getBoundingClientRect();
          if (rect.bottom >= -margin && rect.top <= viewport + margin) {
            renderer.init().catch(() => undefined);
          }
        }
      };
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const renderer = rendererMap.get(entry.target);
              if (renderer) {
                renderer.init().catch(() => undefined);
              }
              observer.unobserve(entry.target);
            }
          },
          { rootMargin: "200px" }
        );
        for (const renderer of renderers) {
          observer.observe(renderer.element);
        }
        requestAnimationFrame(preloadVisible);
      } else {
        for (const renderer of renderers) {
          renderer.init().catch(() => undefined);
        }
      }
      window.addEventListener("resize", () => {
        for (const renderer of renderers) {
          renderer.renderStill();
        }
      });
    }

    const featureGrid = document.getElementById("feature-grid");
    if (featureGrid && config.features?.length) {
      featureGrid.textContent = "";
      let index = 0;
      for (const feature of config.features) {
        featureGrid.appendChild(buildFeatureCard(feature, index * 80));
        index += 1;
      }
    }
  } catch (error) {
    console.error(error);
    const showcaseGrid = document.getElementById("showcase-grid");
    if (showcaseGrid) {
      showcaseGrid.textContent = "Unable to load showcase data.";
    }
  } finally {
    document.body.classList.add("loaded");
  }
}

initLanding();
