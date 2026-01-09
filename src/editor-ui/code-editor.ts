import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { json } from "@codemirror/lang-json";
import { cpp } from "@codemirror/lang-cpp";
import { EditorView, highlightActiveLineGutter, lineNumbers, placeholder } from "@codemirror/view";

const languageCompartment = new Compartment();
const editableCompartment = new Compartment();
const placeholderCompartment = new Compartment();

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "#0b0d12",
    color: "#e6e6e6",
  },
  ".cm-content": {
    fontFamily: 'Consolas, Menlo, Monaco, "Courier New", monospace',
    fontSize: "12px",
    lineHeight: "1.5",
  },
  ".cm-gutters": {
    backgroundColor: "#0f1219",
    color: "rgba(255, 255, 255, 0.45)",
    border: "none",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 6px",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  ".cm-cursor": {
    borderLeftColor: "#f5a97f",
  },
  ".cm-placeholder": {
    color: "rgba(255, 255, 255, 0.35)",
  },
});

type CodeEditorOptions = {
  container: HTMLElement;
  onChange?: (value: string) => void;
};

export class CodeEditor {
  private view: EditorView;
  private onChange?: (value: string) => void;
  private suppressChange = false;

  constructor(options: CodeEditorOptions) {
    this.onChange = options.onChange;
    const state = EditorState.create({
      doc: "",
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        editorTheme,
        languageCompartment.of([]),
        editableCompartment.of(EditorView.editable.of(false)),
        placeholderCompartment.of(placeholder("Select a file to view.")),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || this.suppressChange) return;
          this.onChange?.(update.state.doc.toString());
        }),
      ],
    });
    this.view = new EditorView({
      state,
      parent: options.container,
    });
  }

  destroy() {
    this.view.destroy();
  }

  setContent(text: string) {
    this.suppressChange = true;
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: text },
    });
    this.suppressChange = false;
  }

  setReadOnly(readOnly: boolean) {
    this.view.dispatch({
      effects: editableCompartment.reconfigure(EditorView.editable.of(!readOnly)),
    });
  }

  setPlaceholder(text: string) {
    this.view.dispatch({
      effects: placeholderCompartment.reconfigure(placeholder(text)),
    });
  }

  setLanguageForPath(path: string | null) {
    if (!path) {
      this.view.dispatch({ effects: languageCompartment.reconfigure([]) });
      return;
    }
    const lower = path.toLowerCase();
    let extension: Extension = [];
    if (lower.endsWith(".json")) {
      extension = json();
    } else if (lower.endsWith(".glsl") || lower.endsWith(".frag") || lower.endsWith(".vert")) {
      extension = cpp();
    } else {
      extension = [];
    }
    this.view.dispatch({ effects: languageCompartment.reconfigure(extension) });
  }
}
