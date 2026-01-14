export type EditorFileOrigin = "project" | "external";

export type EditorFileEntry = {
  id: string;
  label: string;
  displayPath: string;
  origin: EditorFileOrigin;
  readOnly: boolean;
  projectPath?: string;
  url?: string;
  component?: { name: string; external: boolean };
};

export type EditorFileNode = {
  id: string;
  label: string;
  kind: "folder" | "file";
  entry?: EditorFileEntry;
  children?: EditorFileNode[];
};

export type EditorFileSection = {
  id: string;
  label: string;
  nodes: EditorFileNode[];
};

export type EditorTreeEntry = {
  entry: EditorFileEntry;
  path: string;
};

type TreeBranch = {
  node: EditorFileNode;
  children: Map<string, TreeBranch>;
};

function sortNodes(nodes: EditorFileNode[]) {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}

export function buildEntryTree(entries: EditorTreeEntry[], prefix: string): EditorFileNode[] {
  const rootChildren = new Map<string, TreeBranch>();

  for (const { entry, path } of entries) {
    const parts = path.split("/").filter(Boolean);
    let current = rootChildren;
    let currentPath = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let branch = current.get(part);
      if (!branch) {
        const node: EditorFileNode = {
          id: `${prefix}/${currentPath}`,
          label: part,
          kind: isFile ? "file" : "folder",
        };
        branch = { node, children: new Map() };
        current.set(part, branch);
      }
      if (isFile) {
        branch.node.kind = "file";
        branch.node.entry = entry;
      }
      current = branch.children;
    }
  }

  const toNodes = (children: Map<string, TreeBranch>): EditorFileNode[] => {
    const nodes = Array.from(children.values()).map((branch) => {
      if (branch.node.kind === "folder") {
        branch.node.children = toNodes(branch.children);
      }
      return branch.node;
    });
    sortNodes(nodes);
    return nodes;
  };

  return toNodes(rootChildren);
}
