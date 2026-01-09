import { EditorShell } from "../editor-ui/editor-shell";
import { ProjectStore } from "./project-store";

type EditorSessionOptions = {
  root: HTMLElement;
  projectId: string;
  store: ProjectStore;
  onSaveProject?: (projectId: string) => void;
};

export class EditorSession {
  private store: ProjectStore;
  private projectId: string;
  private shell: EditorShell;
  private onSaveProject?: (projectId: string) => void;
  private keyHandler: (event: KeyboardEvent) => void;
  private files: string[] = [];
  private tabs: string[] = [];
  private activeFile: string | null = null;
  private fileContents = new Map<string, string>();
  private dirtyFiles = new Set<string>();

  constructor(options: EditorSessionOptions) {
    this.store = options.store;
    this.projectId = options.projectId;
    this.onSaveProject = options.onSaveProject;
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
    });
  }

  async init() {
    window.addEventListener("keydown", this.keyHandler);
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
    this.shell.setFiles(this.files, this.activeFile, this.dirtyFiles);
    const defaultFile = this.pickDefaultFile(this.files);
    if (defaultFile) {
      await this.openFile(defaultFile);
    } else {
      this.shell.setMessage("No files found in project.");
    }
  }

  private pickDefaultFile(files: string[]) {
    if (files.includes("project.json")) return "project.json";
    return files[0] ?? null;
  }

  private async openFile(path: string) {
    if (!this.tabs.includes(path)) {
      this.tabs.push(path);
    }
    this.activeFile = path;
    this.shell.setTabs(this.tabs, this.activeFile, this.dirtyFiles);
    this.shell.setFiles(this.files, this.activeFile, this.dirtyFiles);

    const cached = this.fileContents.get(path);
    if (cached !== undefined) {
      this.shell.setActiveFile(path, cached);
      return;
    }

    this.shell.setLoading(path);
    const content = await this.store.readText(this.projectId, path);
    this.fileContents.set(path, content);
    if (this.activeFile === path) {
      this.shell.setActiveFile(path, content);
    }
  }

  private updateContent(path: string, content: string) {
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
    const content = this.fileContents.get(this.activeFile);
    if (content === undefined) {
      return;
    }
    const nextProjectId = await this.store.writeText(this.projectId, this.activeFile, content);
    if (nextProjectId !== this.projectId) {
      this.projectId = nextProjectId;
      const info = await this.store.getProject(this.projectId);
      if (info) {
        this.shell.setProjectInfo(info);
      }
      const url = new URL(window.location.href);
      url.searchParams.set("project", this.projectId);
      window.history.replaceState({}, "", url);
    }
    this.dirtyFiles.delete(this.activeFile);
    this.shell.setDirtyFiles(this.dirtyFiles);
    this.onSaveProject?.(this.projectId);
  }
}
