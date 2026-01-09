import { CodeEditor } from "./code-editor";

export type EditorProjectInfo = {
  id: string;
  name: string;
  origin: "public" | "local";
  baseId?: string;
};

type EditorShellCallbacks = {
  onSelectFile: (path: string) => void;
  onSelectTab: (path: string) => void;
  onContentChange: (path: string, content: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export class EditorShell {
  private root: HTMLElement;
  private callbacks: EditorShellCallbacks;
  private headerTitle: HTMLDivElement;
  private headerMeta: HTMLDivElement;
  private fileList: HTMLDivElement;
  private tabBar: HTMLDivElement;
  private editor: CodeEditor;
  private status: HTMLDivElement;
  private sidebar: HTMLDivElement;
  private body: HTMLDivElement;
  private sidebarStorageKey = "sgl:editorSidebar";
  private saveButton: HTMLButtonElement;
  private closeButton: HTMLButtonElement;
  private files: string[] = [];
  private tabs: string[] = [];
  private activeFile: string | null = null;
  private dirtyFiles = new Set<string>();

  constructor(root: HTMLElement, callbacks: EditorShellCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
    this.root.innerHTML = "";

    const shell = document.createElement("div");
    shell.className = "editor-shell";

    const header = document.createElement("div");
    header.className = "editor-header";
    this.headerTitle = document.createElement("div");
    this.headerTitle.className = "editor-header-title";
    this.headerMeta = document.createElement("div");
    this.headerMeta.className = "editor-header-meta";
    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.alignItems = "center";
    headerRow.style.justifyContent = "space-between";
    headerRow.style.gap = "12px";
    const headerText = document.createElement("div");
    headerText.style.display = "flex";
    headerText.style.flexDirection = "column";
    headerText.style.gap = "4px";
    headerText.append(this.headerTitle, this.headerMeta);
    const headerActions = document.createElement("div");
    headerActions.style.display = "flex";
    headerActions.style.gap = "8px";
    this.saveButton = document.createElement("button");
    this.saveButton.type = "button";
    this.saveButton.textContent = "Save";
    this.saveButton.className = "editor-tab";
    this.saveButton.addEventListener("click", () => {
      this.callbacks.onSave();
    });
    this.closeButton = document.createElement("button");
    this.closeButton.type = "button";
    this.closeButton.textContent = "Close";
    this.closeButton.className = "editor-tab";
    this.closeButton.title = "Close editor";
    this.closeButton.addEventListener("click", () => {
      this.callbacks.onClose();
    });
    headerActions.append(this.saveButton, this.closeButton);
    headerRow.append(headerText, headerActions);
    header.append(headerRow);

    const body = document.createElement("div");
    body.className = "editor-body";
    this.body = body;

    const sidebar = document.createElement("div");
    sidebar.className = "editor-sidebar";
    this.sidebar = sidebar;
    const filesTitle = document.createElement("div");
    filesTitle.className = "editor-section-title";
    filesTitle.textContent = "Files";
    this.fileList = document.createElement("div");
    this.fileList.className = "editor-files";
    sidebar.append(filesTitle, this.fileList);

    const resizer = document.createElement("div");
    resizer.className = "editor-resizer";

    const main = document.createElement("div");
    main.className = "editor-main";
    this.tabBar = document.createElement("div");
    this.tabBar.className = "editor-tabs";
    const editorWrap = document.createElement("div");
    editorWrap.className = "editor-editor";
    this.editor = new CodeEditor({
      container: editorWrap,
      onChange: (value) => {
        if (!this.activeFile) return;
        this.callbacks.onContentChange(this.activeFile, value);
      },
    });
    main.append(this.tabBar, editorWrap);

    body.append(sidebar, resizer, main);

    this.status = document.createElement("div");
    this.status.className = "editor-status";

    shell.append(header, body, this.status);
    this.root.appendChild(shell);

    this.setupSidebarResizer(resizer);
    this.updateSaveButton();
  }

  setProjectInfo(info: EditorProjectInfo) {
    this.headerTitle.textContent = info.name;
    const meta = info.origin === "local" && info.baseId
      ? `local (base: ${info.baseId})`
      : info.origin;
    this.headerMeta.textContent = `${info.id} | ${meta}`;
  }

  setFiles(files: string[], activeFile: string | null, dirtyFiles: Set<string>) {
    this.files = files.slice();
    this.activeFile = activeFile;
    this.dirtyFiles = new Set(dirtyFiles);
    this.renderFiles();
  }

  setTabs(tabs: string[], activeFile: string | null, dirtyFiles: Set<string>) {
    this.tabs = tabs.slice();
    this.activeFile = activeFile;
    this.dirtyFiles = new Set(dirtyFiles);
    this.renderTabs();
  }

  setActiveFile(path: string | null, content: string) {
    this.activeFile = path;
    if (!path) {
      this.editor.setReadOnly(true);
      this.editor.setContent("");
      this.editor.setPlaceholder("Select a file to view.");
      this.editor.setLanguageForPath(null);
      this.status.textContent = "No file selected.";
      this.updateSaveButton();
      return;
    }
    this.editor.setReadOnly(false);
    this.editor.setLanguageForPath(path);
    this.editor.setContent(content);
    this.editor.setPlaceholder("");
    this.status.textContent = this.formatStatus(path);
    this.updateSaveButton();
  }

  setLoading(path: string) {
    this.activeFile = path;
    this.editor.setReadOnly(true);
    this.editor.setContent("");
    this.editor.setPlaceholder("Loading...");
    this.status.textContent = `Loading ${path}...`;
  }

  setDirtyFiles(dirtyFiles: Set<string>) {
    this.dirtyFiles = new Set(dirtyFiles);
    this.renderFiles();
    this.renderTabs();
    this.updateSaveButton();
    if (this.activeFile) {
      this.status.textContent = this.formatStatus(this.activeFile);
    }
  }

  setMessage(message: string) {
    this.editor.setReadOnly(true);
    this.editor.setContent("");
    this.editor.setPlaceholder(message);
    this.status.textContent = message;
  }

  dispose() {
    this.editor.destroy();
    this.root.innerHTML = "";
  }

  private renderFiles() {
    this.fileList.innerHTML = "";
    for (const path of this.files) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "editor-file";
      if (path === this.activeFile) {
        button.classList.add("is-active");
      }
      const dirty = this.dirtyFiles.has(path);
      button.textContent = dirty ? `${path} *` : path;
      button.title = path;
      button.addEventListener("click", () => {
        this.callbacks.onSelectFile(path);
      });
      this.fileList.appendChild(button);
    }
  }

  private renderTabs() {
    this.tabBar.innerHTML = "";
    for (const path of this.tabs) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "editor-tab";
      if (path === this.activeFile) {
        tab.classList.add("is-active");
      }
      const dirty = this.dirtyFiles.has(path);
      tab.textContent = dirty ? `${this.tabLabel(path)} *` : this.tabLabel(path);
      tab.title = path;
      tab.addEventListener("click", () => {
        this.callbacks.onSelectTab(path);
      });
      this.tabBar.appendChild(tab);
    }
    if (this.tabs.length === 0) {
      const empty = document.createElement("div");
      empty.className = "editor-header-meta";
      empty.textContent = "No files open.";
      this.tabBar.appendChild(empty);
    }
  }

  private tabLabel(path: string) {
    const parts = path.split("/");
    return parts[parts.length - 1] || path;
  }

  private formatStatus(path: string) {
    const dirty = this.dirtyFiles.has(path) ? " (modified)" : "";
    return `${path}${dirty}`;
  }

  private updateSaveButton() {
    const enabled = this.activeFile !== null && this.dirtyFiles.has(this.activeFile);
    this.saveButton.disabled = !enabled;
    this.saveButton.title = enabled ? "Save (Ctrl/Cmd+S)" : "No changes";
  }

  private setupSidebarResizer(resizer: HTMLDivElement) {
    let isDragging = false;
    let activePointerId: number | null = null;
    const minWidth = 140;
    const minMain = 220;

    const applyWidth = (nextWidth: number) => {
      const bodyRect = this.body.getBoundingClientRect();
      const maxWidth = Math.max(minWidth, bodyRect.width - minMain);
      const clamped = Math.min(Math.max(nextWidth, minWidth), maxWidth);
      this.sidebar.style.width = `${Math.round(clamped)}px`;
      this.sidebar.style.flex = `0 0 ${Math.round(clamped)}px`;
      return clamped;
    };

    const loadStoredWidth = () => {
      try {
        const raw = window.localStorage.getItem(this.sidebarStorageKey);
        if (!raw) return;
        const value = Number.parseFloat(raw);
        if (!Number.isFinite(value)) return;
        applyWidth(value);
      } catch {
        return;
      }
    };

    const saveStoredWidth = (value: number) => {
      try {
        window.localStorage.setItem(this.sidebarStorageKey, String(Math.round(value)));
      } catch {
        return;
      }
    };

    loadStoredWidth();

    const onPointerMove = (event: PointerEvent) => {
      if (!isDragging) return;
      const bodyRect = this.body.getBoundingClientRect();
      const next = applyWidth(event.clientX - bodyRect.left);
      saveStoredWidth(next);
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove("is-resizing");
      if (activePointerId !== null) {
        resizer.releasePointerCapture?.(activePointerId);
      }
      activePointerId = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    resizer.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      isDragging = true;
      document.body.classList.add("is-resizing");
      activePointerId = event.pointerId;
      resizer.setPointerCapture?.(event.pointerId);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    });
  }
}
