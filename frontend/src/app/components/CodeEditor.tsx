import Editor, { type OnMount } from "@monaco-editor/react";
import { Range } from "monaco-editor";
import type * as Monaco from "monaco-editor";
import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { useCallback, useEffect, useRef } from "react";
import {
  EditorSettings,
  DEFAULT_EDITOR_SETTINGS,
  EDITOR_THEMES,
} from "./EditorDashboard";

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  onRemoteChange?: (value: string) => void;
  settings?: EditorSettings;
  readOnly?: boolean;
  collabText?: Y.Text | null;
  collabAwareness?: Awareness | null;
  collabReady?: boolean;
}

const REMOTE_CURSOR_CLASS = "codeit-remote-cursor";
const REMOTE_LABEL_CLASS = "codeit-remote-cursor-label";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function ensureRemoteCursorStyles() {
  if (document.getElementById("codeit-remote-cursor-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "codeit-remote-cursor-styles";

  style.textContent = `
    .${REMOTE_CURSOR_CLASS} {
      margin: 0;
      padding: 0;
      width: 0;
    }

    .${REMOTE_LABEL_CLASS} {
      display: inline-block;
      background: var(--codeit-cursor-color);
      color: white;
      border-left: 2px solid var(--codeit-cursor-color);
      border-radius: 3px;
      margin: 0;
      padding: 1px 4px;
      font-size: 10px;
      line-height: 14px;
      font-weight: 600;
      white-space: nowrap;
      opacity: 0.95;
    }
  `;

  document.head.appendChild(style);
}

function setCssColor(className: string, color: string) {
  const existing = document.getElementById(className);
  existing?.remove();

  const style = document.createElement("style");
  style.id = className;
  style.textContent = `.${className} { --codeit-cursor-color: ${color}; }`;

  document.head.appendChild(style);
}

export default function CodeEditor({
  value,
  language,
  onChange,
  onRemoteChange = onChange,
  settings = DEFAULT_EDITOR_SETTINGS,
  readOnly = false,
  collabText = null,
  collabAwareness = null,
  collabReady = false,
}: CodeEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<Monaco.editor.ITextModel | null>(null);

  const remoteApplyingRef = useRef(false);

  const collabTextRef = useRef<Y.Text | null>(null);
  const collabAwarenessRef = useRef<Awareness | null>(null);

  const decorationIdsRef = useRef<string[]>([]);

  const awarenessListenerRef = useRef<(() => void) | null>(null);

  const textObserverRef = useRef<
    ((event: Y.YTextEvent, transaction: Y.Transaction) => void) | null
  >(null);

  const monacoTheme =
    EDITOR_THEMES[settings.theme]?.monacoTheme ?? "vs-dark";

  const updateRemoteCursors = useCallback(() => {
    const editor = editorRef.current;
    const model = modelRef.current;
    const awareness = collabAwarenessRef.current;
    const text = collabTextRef.current;

    if (!editor || !model || !awareness || !text || !text.doc) {
      return;
    }

    ensureRemoteCursorStyles();

    const ownClientId = text.doc.clientID;
    const decorations: Monaco.editor.IModelDeltaDecoration[] = [];

    for (const [clientId, rawState] of awareness.getStates()) {
      if (
        clientId === ownClientId ||
        !rawState ||
        typeof rawState !== "object"
      ) {
        continue;
      }

      const state = rawState as {
        userId?: string;
        name?: string;
        color?: string;
        cursor?: {
          anchor?: string;
          head?: string;
        };
        user?: {
          userId?: string;
          name?: string;
          color?: string;
        };
      };

      const user = state.user ?? {
        userId: state.userId,
        name: state.name,
        color: state.color,
      };

      const cursor = state.cursor;

      if (!user.name || !user.color || !cursor?.anchor || !cursor.head) {
        continue;
      }

      try {
        const anchor =
          Y.createAbsolutePositionFromRelativePosition(
            Y.decodeRelativePosition(
              base64ToBytes(cursor.anchor),
            ),
            text.doc,
          );

        const head =
          Y.createAbsolutePositionFromRelativePosition(
            Y.decodeRelativePosition(
              base64ToBytes(cursor.head),
            ),
            text.doc,
          );

        if (!anchor || !head) {
          continue;
        }

        if (anchor.type !== text || head.type !== text) {
          continue;
        }

        const maxOffset = model.getValueLength();

        const anchorIndex = Math.max(
          0,
          Math.min(anchor.index, maxOffset),
        );

        const headIndex = Math.max(
          0,
          Math.min(head.index, maxOffset),
        );

        const anchorPosition = model.getPositionAt(anchorIndex);
        const headPosition = model.getPositionAt(headIndex);

        const start =
          headIndex <= anchorIndex
            ? headPosition
            : anchorPosition;

        const end =
          headIndex <= anchorIndex
            ? anchorPosition
            : headPosition;

        const className = `codeit-remote-cursor-${clientId}`;

        setCssColor(className, user.color);

        /*
         * One Monaco decoration:
         *
         *     |username
         *
         * The collapsed range is the actual remote cursor position.
         * The label is attached directly to that same position.
         *
         * The vertical line is part of the label, not a separate
         * cursor decoration, so there is no visual gap between
         * cursor and username.
         */
        const cursorRange = new Range(
          headPosition.lineNumber,
          headPosition.column,
          headPosition.lineNumber,
          headPosition.column,
        );

        decorations.push({
          range: cursorRange,
          options: {
            className: `${REMOTE_CURSOR_CLASS} ${className}`,
            showIfCollapsed: true,

            after: {
              content: user.name,
              inlineClassName: `${REMOTE_LABEL_CLASS} ${className}`,
            },

            hoverMessage: {
              value: `${user.name} is editing`,
            },

            zIndex: 100,
          },
        });

        /*
         * Keep the remote selection separate.
         */
        if (
          start.lineNumber !== end.lineNumber ||
          start.column !== end.column
        ) {
          decorations.push({
            range: {
              startLineNumber: start.lineNumber,
              startColumn: start.column,
              endLineNumber: end.lineNumber,
              endColumn: end.column,
            },
            options: {
              className: className,
              zIndex: 90,
            },
          });
        }
      } catch {
        /*
         * Ignore stale Yjs awareness positions while the document
         * is being updated.
         */
      }
    }

    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      decorations,
    );
  }, []);

  const publishLocalCursor = useCallback(() => {
    const editor = editorRef.current;
    const awareness = collabAwarenessRef.current;
    const text = collabTextRef.current;
    const model = modelRef.current;

    if (!editor || !awareness || !text || !text.doc || !model) {
      return;
    }

    const position = editor.getPosition();
    const selection = editor.getSelection();

    if (!position || !selection) {
      return;
    }

    const anchorOffset = model.getOffsetAt(
      selection.getStartPosition(),
    );

    const headOffset = model.getOffsetAt(position);

    const anchor =
      Y.createRelativePositionFromTypeIndex(
        text,
        anchorOffset,
      );

    const head =
      Y.createRelativePositionFromTypeIndex(
        text,
        headOffset,
      );

    awareness.setLocalStateField("cursor", {
      anchor: bytesToBase64(
        Y.encodeRelativePosition(anchor),
      ),
      head: bytesToBase64(
        Y.encodeRelativePosition(head),
      ),
    });
  }, []);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    modelRef.current = editor.getModel();

    ensureRemoteCursorStyles();
  }, []);

  /*
   * Yjs -> Monaco
   */
  useEffect(() => {
    const editor = editorRef.current;
    const model = modelRef.current;

    if (!editor || !model) {
      return;
    }

    if (!collabText || !collabReady) {
      return;
    }

    collabTextRef.current = collabText;
    collabAwarenessRef.current = collabAwareness;

    remoteApplyingRef.current = true;

    if (model.getValue() !== collabText.toString()) {
      model.setValue(collabText.toString());
    }

    remoteApplyingRef.current = false;

    const observer = (
      event: Y.YTextEvent,
      transaction: Y.Transaction,
    ) => {
      if (
        remoteApplyingRef.current ||
        transaction.origin === "monaco"
      ) {
        return;
      }

      const edits: Monaco.editor.IIdentifiedSingleEditOperation[] = [];

      let offset = 0;

      const delta = event.delta;

      for (let index = 0; index < delta.length; index += 1) {
        const op = delta[index];

        if (typeof op.retain === "number") {
          offset += op.retain;
          continue;
        }

        if (typeof op.delete === "number") {
          const start = model.getPositionAt(offset);
          const end = model.getPositionAt(
            offset + op.delete,
          );

          const next = delta[index + 1];

          if (
            next &&
            typeof next.insert === "string"
          ) {
            edits.push({
              range: {
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
              },
              text: next.insert,
            });

            index += 1;
          } else {
            edits.push({
              range: {
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
              },
              text: "",
            });
          }

          offset += op.delete;
          continue;
        }

        if (typeof op.insert === "string") {
          const position = model.getPositionAt(offset);

          edits.push({
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            text: op.insert,
          });
        }
      }

      if (!edits.length) {
        return;
      }

      remoteApplyingRef.current = true;

      model.applyEdits(edits);

      remoteApplyingRef.current = false;

      onRemoteChange(model.getValue());

      updateRemoteCursors();
    };

    collabText.observe(observer);
    textObserverRef.current = observer;

    publishLocalCursor();

    return () => {
      collabText.unobserve(observer);

      if (textObserverRef.current === observer) {
        textObserverRef.current = null;
      }
    };
  }, [
    collabText,
    collabReady,
    collabAwareness,
    onRemoteChange,
    publishLocalCursor,
    updateRemoteCursors,
  ]);

  /*
   * Monaco -> Yjs
   */
  useEffect(() => {
    const editor = editorRef.current;
    const model = modelRef.current;

    if (!editor || !model) {
      return;
    }

    const disposable = editor.onDidChangeModelContent(
      (event) => {
        if (remoteApplyingRef.current) {
          return;
        }

        const text = collabTextRef.current;

        if (text && collabReady) {
          const changes = [...event.changes].sort(
            (a, b) => b.rangeOffset - a.rangeOffset,
          );

          text.doc?.transact(() => {
            for (const change of changes) {
              if (change.rangeLength > 0) {
                text.delete(
                  change.rangeOffset,
                  change.rangeLength,
                );
              }

              if (change.text) {
                text.insert(
                  change.rangeOffset,
                  change.text,
                );
              }
            }
          }, "monaco");

          publishLocalCursor();

          onChange(model.getValue());

          return;
        }

        if (!readOnly) {
          onChange(model.getValue());
        }
      },
    );

    const cursorDisposable =
      editor.onDidChangeCursorPosition(() => {
        publishLocalCursor();
      });

    const selectionDisposable =
      editor.onDidChangeCursorSelection(() => {
        publishLocalCursor();
      });

    return () => {
      disposable.dispose();
      cursorDisposable.dispose();
      selectionDisposable.dispose();
    };
  }, [
    collabReady,
    onChange,
    publishLocalCursor,
    readOnly,
  ]);

  /*
   * Awareness -> remote cursor/label updates.
   */
  useEffect(() => {
    const awareness = collabAwareness;

    if (!awareness) {
      return;
    }

    collabAwarenessRef.current = awareness;

    const listener = () => {
      updateRemoteCursors();
    };

    awareness.on("change", listener);
    awareness.on("update", listener);

    awarenessListenerRef.current = listener;

    updateRemoteCursors();

    return () => {
      awareness.off("change", listener);
      awareness.off("update", listener);

      if (awarenessListenerRef.current === listener) {
        awarenessListenerRef.current = null;
      }
    };
  }, [
    collabAwareness,
    updateRemoteCursors,
  ]);

  /*
   * Cleanup.
   */
  useEffect(() => {
    return () => {
      decorationIdsRef.current = [];

      editorRef.current = null;
      modelRef.current = null;
    };
  }, []);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme={monacoTheme}
        defaultValue={value}
        onMount={handleMount}
        options={{
          readOnly,
          fontSize: settings.fontSize,
          lineHeight: Math.round(
            settings.fontSize * settings.lineHeight,
          ),
          minimap: {
            enabled: settings.minimap,
            scale: settings.minimapScale,
          },
          wordWrap: settings.wordWrap ? "on" : "off",
          lineNumbers: settings.lineNumbers ? "on" : "off",
          renderLineHighlight: settings.highlightActiveLine
            ? "line"
            : "none",
          tabSize: settings.tabSize,
          cursorStyle:
            settings.cursorStyle === "line"
              ? "line"
              : settings.cursorStyle === "block"
                ? "block"
                : "underline",
          renderWhitespace: settings.renderWhitespace,
          scrollBeyondLastLine:
            settings.scrollBeyondLastLine,
          automaticLayout: true,
          folding: true,
          bracketPairColorization: {
            enabled: settings.bracketColorization,
          },
          guides: {
            bracketPairs: settings.bracketColorization,
            indentation: true,
          },
          glyphMargin: false,
          overviewRulerBorder: false,
          contextmenu: true,
          smoothScrolling: true,
          mouseWheelZoom: true,
          padding: {
            top: 12,
            bottom: 12,
          },
        }}
      />
    </div>
  );
}