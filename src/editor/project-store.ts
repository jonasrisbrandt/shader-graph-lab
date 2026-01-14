import { withCacheBust } from "../utils/cache-bust";

export type ProjectOrigin = "public" | "local";

export type ProjectInfo = {
  id: string;
  name: string;
  origin: ProjectOrigin;
  baseId?: string;
  createdAt?: number;
  updatedAt?: number;
};

export type ProjectCreate = {
  id: string;
  name: string;
  baseId?: string;
};

export type ProjectFileInput = {
  path: string;
  content: string;
};

export type PublicProjectManifest = {
  projects: Array<{
    id: string;
    name?: string;
    files: string[];
  }>;
};

export const LOCAL_PREFIX = "local:";

export function isLocalProjectId(projectId: string) {
  return projectId.startsWith(LOCAL_PREFIX);
}

export function toLocalProjectId(projectId: string) {
  return isLocalProjectId(projectId) ? projectId : `${LOCAL_PREFIX}${projectId}`;
}

export function stripLocalPrefix(projectId: string) {
  return isLocalProjectId(projectId) ? projectId.slice(LOCAL_PREFIX.length) : projectId;
}

function getAppBaseUrl() {
  return new URL(".", window.location.href);
}

export interface ProjectStore {
  listProjects(): Promise<ProjectInfo[]>;
  getProject(projectId: string): Promise<ProjectInfo | null>;
  listFiles(projectId: string): Promise<string[]>;
  readText(projectId: string, path: string): Promise<string>;
  writeText(projectId: string, path: string, text: string): Promise<string>;
  deleteFile(projectId: string, path: string): Promise<void>;
  createProject(project: ProjectCreate, files: ProjectFileInput[]): Promise<string>;
  forkFromPublic(baseId: string): Promise<string>;
  deleteProject(projectId: string): Promise<void>;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

type ProjectRecord = {
  id: string;
  name: string;
  origin: "local";
  baseId?: string;
  createdAt: number;
  updatedAt: number;
};

type FileRecord = {
  projectId: string;
  path: string;
  content: string;
  updatedAt: number;
};

export class PublicProjectStore implements ProjectStore {
  private manifestUrl: string;
  private baseUrl: string;
  private manifest: PublicProjectManifest | null = null;

  constructor(options?: { manifestUrl?: string; baseUrl?: string }) {
    const appBase = getAppBaseUrl();
    this.manifestUrl = options?.manifestUrl ?? new URL("projects/index.json", appBase).toString();
    this.baseUrl = options?.baseUrl ?? new URL("projects", appBase).toString();
  }

  async listProjects() {
    const manifest = await this.loadManifest();
    return manifest.projects.map((project) => ({
      id: project.id,
      name: project.name ?? project.id,
      origin: "public" as const,
    }));
  }

  async getProject(projectId: string) {
    const manifest = await this.loadManifest();
    const entry = manifest.projects.find((project) => project.id === projectId);
    if (!entry) return null;
    return {
      id: entry.id,
      name: entry.name ?? entry.id,
      origin: "public" as const,
    };
  }

  async listFiles(projectId: string) {
    const manifest = await this.loadManifest();
    const entry = manifest.projects.find((project) => project.id === projectId);
    if (!entry) {
      throw new Error(`Unknown public project "${projectId}".`);
    }
    return entry.files.slice();
  }

  async readText(projectId: string, path: string) {
    const url = `${this.baseUrl}/${projectId}/${path}`;
    const response = await fetch(withCacheBust(url));
    if (!response.ok) {
      throw new Error(`Failed to fetch "${url}": ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  async writeText(_projectId: string, _path: string, _text: string) {
    throw new Error("PublicProjectStore is read-only.");
  }

  async deleteFile(_projectId: string, _path: string) {
    throw new Error("PublicProjectStore is read-only.");
  }

  async createProject(_project: ProjectCreate, _files: ProjectFileInput[]) {
    throw new Error("PublicProjectStore is read-only.");
  }

  async forkFromPublic(_baseId: string) {
    throw new Error("PublicProjectStore is read-only.");
  }

  async deleteProject(_projectId: string) {
    throw new Error("PublicProjectStore is read-only.");
  }

  private async loadManifest() {
    if (this.manifest) return this.manifest;
    const response = await fetch(withCacheBust(this.manifestUrl));
    if (!response.ok) {
      throw new Error(`Failed to fetch "${this.manifestUrl}": ${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as PublicProjectManifest;
    if (!data || !Array.isArray(data.projects)) {
      throw new Error("Invalid public project manifest.");
    }
    this.manifest = data;
    return data;
  }
}

export class IdbProjectStore implements ProjectStore {
  private dbName: string;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(dbName = "shader-graph-lab") {
    this.dbName = dbName;
  }

  async listProjects() {
    const db = await this.getDb();
    const tx = db.transaction(["projects"], "readonly");
    const store = tx.objectStore("projects");
    const records = (await requestToPromise(store.getAll())) as ProjectRecord[];
    await transactionDone(tx);
    return records.map((record) => ({
      id: record.id,
      name: record.name,
      origin: "local" as const,
      baseId: record.baseId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }

  async getProject(projectId: string) {
    const db = await this.getDb();
    const tx = db.transaction(["projects"], "readonly");
    const store = tx.objectStore("projects");
    const record = (await requestToPromise(store.get(projectId))) as ProjectRecord | undefined;
    await transactionDone(tx);
    if (!record) return null;
    return {
      id: record.id,
      name: record.name,
      origin: "local" as const,
      baseId: record.baseId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async listFiles(projectId: string) {
    const db = await this.getDb();
    const tx = db.transaction(["files"], "readonly");
    const store = tx.objectStore("files");
    const index = store.index("by-project");
    const records = (await requestToPromise(index.getAll(IDBKeyRange.only(projectId)))) as FileRecord[];
    await transactionDone(tx);
    return records.map((record) => record.path).sort();
  }

  async readText(projectId: string, path: string) {
    const db = await this.getDb();
    const tx = db.transaction(["files"], "readonly");
    const store = tx.objectStore("files");
    const record = (await requestToPromise(store.get([projectId, path]))) as FileRecord | undefined;
    await transactionDone(tx);
    if (!record) {
      throw new Error(`Missing file "${path}" in project "${projectId}".`);
    }
    return record.content;
  }

  async writeText(projectId: string, path: string, text: string) {
    const db = await this.getDb();
    const tx = db.transaction(["projects", "files"], "readwrite");
    const projectStore = tx.objectStore("projects");
    const fileStore = tx.objectStore("files");
    const project = (await requestToPromise(projectStore.get(projectId))) as ProjectRecord | undefined;
    if (!project) {
      tx.abort();
      throw new Error(`Unknown local project "${projectId}".`);
    }
    const now = Date.now();
    project.updatedAt = now;
    projectStore.put(project);
    fileStore.put({ projectId, path, content: text, updatedAt: now });
    await transactionDone(tx);
    return projectId;
  }

  async deleteFile(projectId: string, path: string) {
    const db = await this.getDb();
    const tx = db.transaction(["projects", "files"], "readwrite");
    const projectStore = tx.objectStore("projects");
    const fileStore = tx.objectStore("files");
    const project = (await requestToPromise(projectStore.get(projectId))) as ProjectRecord | undefined;
    if (!project) {
      tx.abort();
      throw new Error(`Unknown local project "${projectId}".`);
    }
    const now = Date.now();
    project.updatedAt = now;
    projectStore.put(project);
    fileStore.delete([projectId, path]);
    await transactionDone(tx);
  }

  async createProject(project: ProjectCreate, files: ProjectFileInput[]) {
    if (!isLocalProjectId(project.id)) {
      throw new Error(`Local project ids must start with "${LOCAL_PREFIX}".`);
    }
    const db = await this.getDb();
    const existing = await this.getProject(project.id);
    if (existing) {
      throw new Error(`Project "${project.id}" already exists.`);
    }
    const now = Date.now();
    const record: ProjectRecord = {
      id: project.id,
      name: project.name,
      origin: "local",
      baseId: project.baseId,
      createdAt: now,
      updatedAt: now,
    };
    const tx = db.transaction(["projects", "files"], "readwrite");
    const projectStore = tx.objectStore("projects");
    const fileStore = tx.objectStore("files");
    projectStore.add(record);
    for (const file of files) {
      fileStore.put({ projectId: project.id, path: file.path, content: file.content, updatedAt: now });
    }
    await transactionDone(tx);
    return project.id;
  }

  async forkFromPublic(_baseId: string) {
    throw new Error("IdbProjectStore does not read public projects.");
  }

  async deleteProject(projectId: string) {
    const db = await this.getDb();
    const tx = db.transaction(["projects", "files"], "readwrite");
    const projectStore = tx.objectStore("projects");
    const fileStore = tx.objectStore("files");
    const index = fileStore.index("by-project");
    const keys = (await requestToPromise(index.getAllKeys(IDBKeyRange.only(projectId)))) as IDBValidKey[];
    for (const key of keys) {
      fileStore.delete(key);
    }
    projectStore.delete(projectId);
    await transactionDone(tx);
  }

  private getDb() {
    if (this.dbPromise) return this.dbPromise;
    if (!("indexedDB" in window)) {
      return Promise.reject(new Error("IndexedDB is not available."));
    }
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("projects")) {
          db.createObjectStore("projects", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("files")) {
          const store = db.createObjectStore("files", { keyPath: ["projectId", "path"] });
          store.createIndex("by-project", "projectId", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
    });
    return this.dbPromise;
  }
}

export class CompositeProjectStore implements ProjectStore {
  private publicStore: PublicProjectStore;
  private localStore: IdbProjectStore;

  constructor(publicStore: PublicProjectStore, localStore: IdbProjectStore) {
    this.publicStore = publicStore;
    this.localStore = localStore;
  }

  async listProjects() {
    const [publicProjects, localProjects] = await Promise.all([
      this.publicStore.listProjects(),
      this.localStore.listProjects(),
    ]);
    return [...localProjects, ...publicProjects];
  }

  async getProject(projectId: string) {
    if (isLocalProjectId(projectId)) {
      return this.localStore.getProject(projectId);
    }
    return this.publicStore.getProject(projectId);
  }

  async listFiles(projectId: string) {
    if (isLocalProjectId(projectId)) {
      return this.localStore.listFiles(projectId);
    }
    return this.publicStore.listFiles(projectId);
  }

  async readText(projectId: string, path: string) {
    if (isLocalProjectId(projectId)) {
      return this.localStore.readText(projectId, path);
    }
    return this.publicStore.readText(projectId, path);
  }

  async writeText(projectId: string, path: string, text: string) {
    if (isLocalProjectId(projectId)) {
      return this.localStore.writeText(projectId, path, text);
    }
    const localId = toLocalProjectId(projectId);
    const existing = await this.localStore.getProject(localId);
    if (!existing) {
      await this.forkFromPublic(projectId);
    }
    return this.localStore.writeText(localId, path, text);
  }

  async deleteFile(projectId: string, path: string) {
    if (isLocalProjectId(projectId)) {
      return this.localStore.deleteFile(projectId, path);
    }
    const localId = toLocalProjectId(projectId);
    const existing = await this.localStore.getProject(localId);
    if (!existing) {
      await this.forkFromPublic(projectId);
    }
    return this.localStore.deleteFile(localId, path);
  }

  async createProject(project: ProjectCreate, files: ProjectFileInput[]) {
    return this.localStore.createProject(project, files);
  }

  async forkFromPublic(baseId: string) {
    const localId = toLocalProjectId(baseId);
    const existing = await this.localStore.getProject(localId);
    if (existing) return localId;
    const info = await this.publicStore.getProject(baseId);
    if (!info) {
      throw new Error(`Unknown public project "${baseId}".`);
    }
    const filePaths = await this.publicStore.listFiles(baseId);
    const files = await Promise.all(
      filePaths.map(async (path) => ({
        path,
        content: await this.publicStore.readText(baseId, path),
      }))
    );
    await this.localStore.createProject(
      {
        id: localId,
        name: info.name,
        baseId,
      },
      files
    );
    return localId;
  }

  async deleteProject(projectId: string) {
    if (!isLocalProjectId(projectId)) {
      throw new Error("Cannot delete public projects.");
    }
    await this.localStore.deleteProject(projectId);
  }
}
