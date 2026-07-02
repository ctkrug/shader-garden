import { EditorState, Transaction } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import { cpp } from "@codemirror/lang-cpp";

export interface ShaderEditorHandlers {
  /** Fires only for user-driven edits (typing, paste, cut) — not for programmatic setSource() calls. */
  onChange: (source: string) => void;
}

const theme = EditorView.theme(
  {
    "&": {
      color: "var(--text)",
      backgroundColor: "transparent",
      height: "100%",
      fontSize: "13px",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)",
      lineHeight: "1.5",
    },
    ".cm-content": {
      caretColor: "var(--accent)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--surface-1)",
      color: "var(--text-muted)",
      border: "none",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--accent)",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(126, 227, 255, 0.25)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(126, 227, 255, 0.05)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(126, 227, 255, 0.08)",
    },
  },
  { dark: true },
);

/**
 * Wraps a CodeMirror 6 editor, themed to the blueprint palette, scoped to a
 * single fragment shader's source at a time. GLSL has no dedicated
 * CodeMirror language package, so `cpp()` (C/C++) provides syntax
 * highlighting — close enough for keywords, types, and preprocessor lines.
 */
export class ShaderEditor {
  private readonly view: EditorView;

  constructor(container: HTMLElement, initialSource: string, handlers: ShaderEditorHandlers) {
    this.view = new EditorView({
      state: EditorState.create({
        doc: initialSource,
        extensions: [
          basicSetup,
          cpp(),
          theme,
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            const isUserEdit = update.transactions.some(
              (tr) => tr.annotation(Transaction.userEvent) !== undefined,
            );
            if (isUserEdit) handlers.onChange(update.state.doc.toString());
          }),
        ],
      }),
      parent: container,
    });
  }

  /** Replaces the whole document — used when switching which fork is being edited. No-ops if already showing this source. */
  setSource(source: string): void {
    if (this.view.state.doc.toString() === source) return;
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: source },
    });
  }

  focus(): void {
    this.view.focus();
  }

  destroy(): void {
    this.view.destroy();
  }
}
