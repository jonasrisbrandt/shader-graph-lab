import { EditorShell } from "../editor-ui/editor-shell";
import { ProjectStore, stripLocalPrefix } from "./project-store";
import { withCacheBust } from "../utils/cache-bust";
import {
  buildEntryTree,
  type EditorFileEntry,
  type EditorFileSection,
  type EditorTreeEntry,
} from "./file-tree";

type EditorSessionOptions = {
  root: HTMLElement;
  projectId: string;
  store: ProjectStore;
  onSaveProject?: (projectId: string) => void;
  onClose?: () => void;
  onProjectChange?: (projectId: string) => void;
};

export class EditorSession {
  private store: ProjectStore;
  private projectId: string;
  private shell: EditorShell;
  private onSaveProject?: (projectId: string) => void;
  private onClose?: () => void;
  private onProjectChange?: (projectId: string) => void;
  private keyHandler: (event: KeyboardEvent) => void;
  private files: string[] = [];
  private tabs: string[] = [];
  private activeFile: string | null = null;
  private fileContents = new Map<string, string>();
  private fileEntries = new Map<string, EditorFileEntry>();
  private fileSections: EditorFileSection[] = [];
  private componentIncludes = new Map<string, ComponentInclude>();
  private dirtyFiles = new Set<string>();
  private projectsBaseUrl = new URL("projects/", new URL(".", window.location.href));

  constructor(options: EditorSessionOptions) {
    this.store = options.store;
    this.projectId = options.projectId;
    this.onSaveProject = options.onSaveProject;
    this.onClose = options.onClose;
    this.onProjectChange = options.onProjectChange;
    this.keyHandler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        this.saveActiveFile().catch(() => {
          return;
        });
      }
    };
    this.shell = new EditorShell(options.root, {
      onSelectFile: (path) => this.openFile(path),
      onSelectTab: (path) => this.openFile(path),
      onContentChange: (path, content) => this.updateContent(path, content),
      onSave: () => this.saveActiveFile(),
      onClose: () => this.onClose?.(),
      onProjectChange: (projectId) => this.onProjectChange?.(projectId),
      onImportComponent: (componentName) => {
        this.importComponent(componentName).catch(() => {
          return;
        });
      },
    });
  }

  async init() {
    window.addEventListener("keydown", this.keyHandler);
    await this.refreshProjects();
    await this.loadProject();
  }

  private pickDefaultFile(files: string[]) {
    if (files.includes("project.json")) return "project.json";
    return files[0] ?? null;
  }

  private async openFile(path: string) {
    const entry = this.fileEntries.get(path);
    if (!entry) {
      return;
    }
    if (!this.tabs.includes(path)) {
      this.tabs.push(path);
    }
    this.activeFile = path;
    this.shell.setFileTree(this.fileSections, this.activeFile, this.dirtyFiles);
    this.shell.setTabs(this.tabs, this.activeFile, this.dirtyFiles);

    const cached = this.fileContents.get(path);
    if (cached !== undefined) {
      this.shell.setActiveFile(entry, cached);
      return;
    }

    this.shell.setLoading(entry);
    const content = await this.readEntryText(entry);
    this.fileContents.set(path, content);
    if (this.activeFile === path) {
      this.shell.setActiveFile(entry, content);
    }
  }

  private async refreshProjects() {
    const projects = await this.store.listProjects();
    this.shell.setProjectList(projects, this.projectId);
    this.shell.setProjectSelectEnabled(true);
  }

  private async loadProject() {
    const info = await this.store.getProject(this.projectId);
    if (info) {
      this.shell.setProjectInfo(info);
    } else {
      this.shell.setProjectInfo({
        id: this.projectId,
        name: this.projectId,
        origin: "public",
      });
    }
    this.files = await this.store.listFiles(this.projectId);
    this.tabs = [];
    this.activeFile = null;
    this.fileContents.clear();
    this.fileEntries.clear();
    this.fileSections = [];
    this.componentIncludes.clear();
    this.dirtyFiles.clear();
    await this.refreshFileTree();
    this.shell.setFileTree(this.fileSections, this.activeFile, this.dirtyFiles);
    this.shell.setTabs(this.tabs, this.activeFile, this.dirtyFiles);
    const defaultFile = this.pickDefaultFile(this.files);
    if (defaultFile) {
      await this.openFile(defaultFile);
    } else {
      this.shell.setMessage("No files found in project.");
    }
  }

  private updateContent(path: string, content: string) {
    const entry = this.fileEntries.get(path);
    if (!entry || entry.readOnly) return;
    this.fileContents.set(path, content);
    if (!this.dirtyFiles.has(path)) {
      this.dirtyFiles.add(path);
      this.shell.setDirtyFiles(this.dirtyFiles);
    }
  }

  private async saveActiveFile() {
    if (!this.activeFile || !this.dirtyFiles.has(this.activeFile)) {
      return;
    }
    const entry = this.fileEntries.get(this.activeFile);
    if (!entry || entry.readOnly || !entry.projectPath) {
      return;
    }
    const content = this.fileContents.get(this.activeFile);
    if (content === undefined) {
      return;
    }
    const nextProjectId = await this.store.writeText(this.projectId, entry.projectPath, content);
    if (nextProjectId !== this.projectId) {
      this.projectId = nextProjectId;
      const info = await this.store.getProject(this.projectId);
      if (info) {
        this.shell.setProjectInfo(info);
      }
      const url = new URL(window.location.href);
      url.searchParams.set("project", this.projectId);
      window.history.replaceState({}, "", url);
      await this.refreshProjects();
    }
    this.dirtyFiles.delete(this.activeFile);
    this.shell.setDirtyFiles(this.dirtyFiles);
    this.onSaveProject?.(this.projectId);
  }

  async switchProject(projectId: string) {
    if (projectId === this.projectId) return;
    this.projectId = projectId;
    await this.refreshProjects();
    await this.loadProject();
  }

  dispose() {
    window.removeEventListener("keydown", this.keyHandler);
    this.shell.dispose();
  }

  private async refreshFileTree() {
    const projectEntries = this.files.map((path) => this.getProjectEntry(path));
    const projectNodes = buildEntryTree(
      projectEntries.map((entry) => ({ entry, path: entry.projectPath ?? entry.displayPath })),
      "project"
    );
    const includes = await this.scanComponentIncludes();
    const includeNodes = includes.map((component) => {
      const treeEntries: EditorTreeEntry[] = component.files.map((file) => ({
        entry: file.entry,
        path: file.relativePath,
      }));
      return {
        id: `include:${component.name}`,
        label: component.name,
        kind: "folder" as const,
        children: buildEntryTree(treeEntries, `include:${component.name}`),
      };
    });
    const sections: EditorFileSection[] = [{ id: "project", label: "Project", nodes: projectNodes }];
    if (includeNodes.length > 0) {
      sections.push({ id: "includes", label: "Shared", nodes: includeNodes });
    }
    this.fileSections = sections;
  }

  private getProjectEntry(path: string): EditorFileEntry {
    const existing = this.fileEntries.get(path);
    if (existing) return existing;
    const entry: EditorFileEntry = {
      id: path,
      label: this.basename(path),
      displayPath: path,
      origin: "project",
      readOnly: false,
      projectPath: path,
    };
    this.fileEntries.set(entry.id, entry);
    return entry;
  }

  private getExternalEntry(url: string, displayPath: string, componentName: string): EditorFileEntry {
    const id = `external:${componentName}:${url}`;
    const existing = this.fileEntries.get(id);
    if (existing) return existing;
    const entry: EditorFileEntry = {
      id,
      label: this.basename(displayPath),
      displayPath,
      origin: "external",
      readOnly: true,
      url,
      component: { name: componentName, external: true },
    };
    this.fileEntries.set(entry.id, entry);
    return entry;
  }

  private basename(path: string) {
    const parts = path.split("/");
    return parts[parts.length - 1] || path;
  }

  private getProjectRelativePath(url: string) {
    const projectRoot = this.getProjectRootUrl();
    const resolved = new URL(url, window.location.href);
    if (!resolved.pathname.startsWith(projectRoot.pathname)) {
      return null;
    }
    return resolved.pathname.slice(projectRoot.pathname.length);
  }

  private getProjectRootUrl() {
    const baseId = stripLocalPrefix(this.projectId);
    return new URL(`${baseId}/`, this.projectsBaseUrl);
  }

  private getProjectJsonUrl() {
    const baseId = stripLocalPrefix(this.projectId);
    return new URL(`${baseId}/project.json`, this.projectsBaseUrl);
  }

  private createTextResolver() {
    const projectRoot = this.getProjectRootUrl();
    return async (url: string) => {
      const resolved = new URL(url, window.location.href);
      if (resolved.pathname.startsWith(projectRoot.pathname)) {
        const relativePath = resolved.pathname.slice(projectRoot.pathname.length);
        return this.store.readText(this.projectId, relativePath);
      }
      const response = await fetch(withCacheBust(resolved.toString()));
      if (!response.ok) {
        throw new Error(`Failed to fetch "${resolved.toString()}": ${response.status} ${response.statusText}`);
      }
      return response.text();
    };
  }

  private async readEntryText(entry: EditorFileEntry) {
    if (entry.origin === "project" && entry.projectPath) {
      return this.store.readText(this.projectId, entry.projectPath);
    }
    if (entry.url) {
      const resolver = this.createTextResolver();
      return resolver(entry.url);
    }
    throw new Error(`Missing source for entry "${entry.id}".`);
  }

  private async scanComponentIncludes(): Promise<ComponentInclude[]> {
    const resolver = this.createTextResolver();
    let projectText: string;
    try {
      projectText = await resolver(this.getProjectJsonUrl().toString());
    } catch {
      return [];
    }
    let projectData: ProjectData;
    try {
      projectData = JSON.parse(projectText) as ProjectData;
    } catch {
      return [];
    }

    const components = projectData.components;
    if (!components || typeof components !== "object") {
      return [];
    }
    const includes: ComponentInclude[] = [];
    for (const [name, source] of Object.entries(components)) {
      if (!source || typeof source !== "object") continue;
      const includePath = (source as IncludeRef).$include;
      if (typeof includePath !== "string") continue;
      const componentUrl = new URL(includePath, this.getProjectJsonUrl()).toString();
      const componentRoot = new URL(".", componentUrl);
      let componentText = "";
      try {
        componentText = await resolver(componentUrl);
      } catch {
        componentText = "";
      }
      let componentData: ComponentData | null = null;
      try {
        componentData = JSON.parse(componentText) as ComponentData;
      } catch {
        componentData = null;
      }
      const files: ComponentIncludeFile[] = [];
      const componentEntry = this.makeEntryForUrl(componentUrl, name, "component.json");
      files.push({
        kind: "component",
        url: componentUrl,
        relativePath: "component.json",
        entry: componentEntry,
      });
      const shaderMap = componentData?.shaders ?? {};
      if (shaderMap && typeof shaderMap === "object") {
        const seen = new Set<string>();
        for (const shaderSource of Object.values(shaderMap)) {
          if (!shaderSource || typeof shaderSource !== "object") continue;
          const shaderInclude = (shaderSource as IncludeRef).$include;
          if (typeof shaderInclude !== "string") continue;
          const shaderUrl = new URL(shaderInclude, componentRoot).toString();
          if (seen.has(shaderUrl)) continue;
          seen.add(shaderUrl);
          const relativePath = this.relativePath(componentRoot.toString(), shaderUrl);
          const entry = this.makeEntryForUrl(shaderUrl, name, relativePath);
          files.push({
            kind: "shader",
            url: shaderUrl,
            relativePath,
            entry,
          });
        }
      }
      const isExternal = !this.getProjectRelativePath(componentUrl);
      if (isExternal) {
        includes.push({
          name,
          sourceUrl: componentUrl,
          external: true,
          files,
        });
      }
    }
    this.componentIncludes.clear();
    for (const include of includes) {
      this.componentIncludes.set(include.name, include);
    }
    return includes;
  }

  private makeEntryForUrl(url: string, componentName: string, displayPath: string): EditorFileEntry {
    const projectRelative = this.getProjectRelativePath(url);
    if (projectRelative) {
      return this.getProjectEntry(projectRelative);
    }
    return this.getExternalEntry(url, `${componentName}/${displayPath}`, componentName);
  }

  private relativePath(fromUrl: string, toUrl: string) {
    const from = new URL(fromUrl, window.location.href);
    const to = new URL(toUrl, window.location.href);
    if (from.origin !== to.origin) {
      return to.toString();
    }
    const fromParts = from.pathname.split("/");
    fromParts.pop();
    const toParts = to.pathname.split("/");
    let index = 0;
    while (index < fromParts.length && index < toParts.length && fromParts[index] === toParts[index]) {
      index++;
    }
    const upCount = fromParts.length - index;
    const relParts = [];
    for (let i = 0; i < upCount; i++) {
      relParts.push("..");
    }
    relParts.push(...toParts.slice(index));
    const rel = relParts.join("/");
    return rel || ".";
  }

  private async importComponent(componentName: string) {
    const component = this.componentIncludes.get(componentName);
    if (!component || !component.external) {
      return;
    }
    const resolver = this.createTextResolver();
    const targetRoot = `components/${componentName}`;
    const projectUrl = this.getProjectJsonUrl();
    const projectText = await resolver(projectUrl.toString());
    const projectData = JSON.parse(projectText) as ProjectData;
    if (!projectData.components || typeof projectData.components !== "object") {
      return;
    }
    projectData.components[componentName] = { $include: `./${targetRoot}/component.json` };
    const updatedProjectText = `${JSON.stringify(projectData, null, 2)}\n`;
    const nextProjectId = await this.store.writeText(this.projectId, "project.json", updatedProjectText);
    if (nextProjectId !== this.projectId) {
      this.projectId = nextProjectId;
      const info = await this.store.getProject(this.projectId);
      if (info) {
        this.shell.setProjectInfo(info);
      }
      await this.refreshProjects();
    }
    for (const file of component.files) {
      const content = await resolver(file.url);
      const targetPath = `${targetRoot}/${file.relativePath}`;
      const newFileUrl = new URL(targetPath, this.getProjectRootUrl()).toString();
      const nextContent =
        file.kind === "shader" ? this.rewriteShaderIncludes(content, file.url, newFileUrl) : content;
      await this.store.writeText(this.projectId, targetPath, nextContent);
    }
    await this.loadProject();
    const entry = this.fileEntries.get(`${targetRoot}/component.json`);
    if (entry) {
      await this.openFile(entry.id);
    }
  }

  private rewriteShaderIncludes(source: string, originalUrl: string, newUrl: string) {
    const includePattern = /^[ \t]*#include\s+"([^"]+)"\s*$/gm;
    return source.replace(includePattern, (match, includePath: string) => {
      const resolved = new URL(includePath, originalUrl).toString();
      const relative = this.relativePath(newUrl, resolved);
      return match.replace(includePath, relative);
    });
  }
}

type IncludeRef = { $include?: string };

type ProjectData = {
  components?: Record<string, IncludeRef | Record<string, unknown>>;
};

type ComponentData = {
  shaders?: Record<string, IncludeRef | Record<string, unknown>>;
};

type ComponentIncludeFile = {
  kind: "component" | "shader";
  url: string;
  relativePath: string;
  entry: EditorFileEntry;
};

type ComponentInclude = {
  name: string;
  sourceUrl: string;
  external: boolean;
  files: ComponentIncludeFile[];
};
