import { CodeEditor } from "./code-editor";
import type { UiBadge } from "../ui/components/ui-badge";
import type { UiButton } from "../ui/components/ui-button";
import type { UiSelect, UiSelectOption } from "../ui/components/ui-select";

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
  onProjectChange: (projectId: string) => void;
};

export class EditorShell {
  private root: HTMLElement;
  private shell: HTMLDivElement;
  private callbacks: EditorShellCallbacks;
  private projectSelect: UiSelect;
  private projectBadge: UiBadge;
  private fileList: HTMLDivElement;
  private tabBar: HTMLDivElement;
  private editor: CodeEditor;
  private status: HTMLDivElement;
  private sidebar: HTMLDivElement;
  private body: HTMLDivElement;
  private sidebarStorageKey = "sgl:editorSidebar";
  private sidebarOpenKey = "sgl:editorSidebarOpen";
  private saveButton: UiButton;
  private closeButton: UiButton;
  private filesToggleButton: UiButton;
  private files: string[] = [];
  private tabs: string[] = [];
  private activeFile: string | null = null;
  private dirtyFiles = new Set<string>();
  private sidebarOpen = true;
  private mobileQuery: MediaQueryList;
  private handleMobileQuery: (event: MediaQueryListEvent) => void;

  constructor(root: HTMLElement, callbacks: EditorShellCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
    this.root.innerHTML = "";

    const shell = document.createElement("div");
    shell.className = "editor-shell";
    this.shell = shell;

    const header = document.createElement("div");
    header.className = "editor-header";
    const headerRow = document.createElement("div");
    headerRow.className = "editor-header-row";
    const projectRow = document.createElement("div");
    projectRow.className = "editor-project-row";
    const projectLabel = document.createElement("span");
    projectLabel.textContent = "Project:";
    projectLabel.style.color = "var(--ui-muted)";
    this.projectSelect = document.createElement("ui-select");
    this.projectSelect.addEventListener("change", () => {
      this.callbacks.onProjectChange(this.projectSelect.value);
    });
    this.projectBadge = document.createElement("ui-badge");
    projectRow.append(projectLabel, this.projectSelect, this.projectBadge);
    const headerActions = document.createElement("div");
    headerActions.className = "editor-header-actions";
    this.saveButton = document.createElement("ui-button");
    this.saveButton.type = "button";
    this.saveButton.label = "Save";
    this.saveButton.variant = "primary";
    this.saveButton.size = "sm";
    this.saveButton.addEventListener("click", () => {
      this.callbacks.onSave();
    });
    this.closeButton = document.createElement("ui-button");
    this.closeButton.type = "button";
    this.closeButton.label = "Close";
    this.closeButton.variant = "ghost";
    this.closeButton.size = "sm";
    this.closeButton.title = "Close editor";
    this.closeButton.addEventListener("click", () => {
      this.callbacks.onClose();
    });
    this.filesToggleButton = document.createElement("ui-button");
    this.filesToggleButton.type = "button";
    this.filesToggleButton.label = "Files";
    this.filesToggleButton.variant = "ghost";
    this.filesToggleButton.size = "sm";
    this.filesToggleButton.className = "editor-files-toggle";
    this.filesToggleButton.addEventListener("click", () => {
      this.toggleSidebar();
    });
    headerActions.append(this.filesToggleButton, this.saveButton, this.closeButton);
    headerRow.append(projectRow, headerActions);
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
    this.tabBar.className = "ui-tabbar";
    this.tabBar.setAttribute("role", "tablist");
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

    this.mobileQuery = window.matchMedia("(max-width: 900px)");
    this.handleMobileQuery = (event) => {
      this.syncSidebarToViewport(event.matches);
    };
    this.mobileQuery.addEventListener("change", this.handleMobileQuery);
    this.syncSidebarToViewport(this.mobileQuery.matches);
  }

  setProjectInfo(info: EditorProjectInfo) {
    this.projectBadge.label = info.origin;
  }

  setProjectList(entries: EditorProjectInfo[], currentId: string) {
    const sorted = entries.slice().sort((a, b) => {
      const nameOrder = a.name.localeCompare(b.name);
      if (nameOrder !== 0) return nameOrder;
      if (a.origin === b.origin) return 0;
      return a.origin === "local" ? -1 : 1;
    });
    const options: UiSelectOption[] = sorted.map((entry) => ({
      value: entry.id,
      label: this.formatProjectLabel(entry),
    }));
    this.projectSelect.options = options;
    this.projectSelect.value = currentId;
  }

  setProjectSelectEnabled(enabled: boolean) {
    this.projectSelect.disabled = !enabled;
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
    this.mobileQuery.removeEventListener("change", this.handleMobileQuery);
    this.root.innerHTML = "";
  }

  private renderFiles() {
    this.fileList.innerHTML = "";
    for (const path of this.files) {
      const button = document.createElement("ui-button");
      button.type = "button";
      button.variant = "list";
      button.active = path === this.activeFile;
      const dirty = this.dirtyFiles.has(path);
      button.label = dirty ? `${path} *` : path;
      button.title = path;
      button.addEventListener("click", () => {
        this.callbacks.onSelectFile(path);
        if (this.isMobile()) {
          this.setSidebarOpen(false);
        }
      });
      this.fileList.appendChild(button);
    }
  }

  private renderTabs() {
    this.tabBar.innerHTML = "";
    for (const path of this.tabs) {
      const tab = document.createElement("ui-button");
      tab.type = "button";
      tab.variant = "tab";
      tab.active = path === this.activeFile;
      const dirty = this.dirtyFiles.has(path);
      tab.label = dirty ? `${this.tabLabel(path)} *` : this.tabLabel(path);
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

  private isMobile() {
    return this.mobileQuery.matches;
  }

  private syncSidebarToViewport(isMobile: boolean) {
    if (isMobile) {
      const stored = this.loadStoredSidebarOpen();
      this.setSidebarOpen(stored ?? false, false);
    } else {
      this.setSidebarOpen(true, false);
    }
  }

  private toggleSidebar() {
    this.setSidebarOpen(!this.sidebarOpen);
  }

  private setSidebarOpen(open: boolean, persist = true) {
    this.sidebarOpen = open;
    this.shell.dataset.sidebar = open ? "open" : "closed";
    this.filesToggleButton.active = open;
    if (persist && this.isMobile()) {
      this.saveStoredSidebarOpen(open);
    }
  }

  private loadStoredSidebarOpen() {
    try {
      const raw = window.localStorage.getItem(this.sidebarOpenKey);
      if (!raw) return null;
      return raw === "true";
    } catch {
      return null;
    }
  }

  private saveStoredSidebarOpen(open: boolean) {
    try {
      window.localStorage.setItem(this.sidebarOpenKey, String(open));
    } catch {
      return;
    }
  }

  private formatProjectLabel(info: EditorProjectInfo) {
    if (info.origin === "local") {
      return info.baseId
        ? `${info.name} (local, base: ${info.baseId})`
        : `${info.name} (local)`;
    }
    return `${info.name} (public)`;
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
