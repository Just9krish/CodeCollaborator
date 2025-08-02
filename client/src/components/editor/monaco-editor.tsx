import { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import { Loader2 } from "lucide-react";
import { wsManager, type CursorPosition } from "@/lib/websocket";

// Load the Monaco Editor assets dynamically
const loadMonacoScripts = async () => {
  await import("monaco-editor/esm/vs/editor/editor.all.js");
  await import("monaco-editor/esm/vs/language/typescript/ts.worker");
  await import("monaco-editor/esm/vs/language/json/json.worker");
  await import("monaco-editor/esm/vs/language/css/css.worker");
  await import("monaco-editor/esm/vs/language/html/html.worker");
  await import(
    "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution"
  );
  await import(
    "monaco-editor/esm/vs/basic-languages/python/python.contribution"
  );
  await import("monaco-editor/esm/vs/basic-languages/java/java.contribution");
  await import("monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution");
  await import("monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution");
};

type MonacoEditorProps = {
  value: string;
  language: string;
  fileId: number;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  participants?: Array<{
    id: number;
    userId: number;
    username: string;
    cursor: CursorPosition | null;
    color: string;
  }>;
};

// Map language IDs to Monaco language IDs
const languageMap: Record<string, string> = {
  javascript: "javascript",
  python: "python",
  java: "java",
  cpp: "cpp",
  ruby: "ruby",
};

// Generate a color based on username
const generateUserColor = (username: string) => {
  const colors = [
    "#4F46E5", // Indigo
    "#10B981", // Green
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
  ];

  const hash = Array.from(username).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );

  return colors[hash % colors.length];
};

export function MonacoEditor({
  value,
  language,
  fileId,
  readOnly = false,
  onChange,
  participants = [],
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Monaco editor
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await loadMonacoScripts();

        if (!mounted || !containerRef.current) return;

        const monacoLanguage = languageMap[language] || "javascript";

        // Create the editor
        const editor = monaco.editor.create(containerRef.current, {
          value,
          language: monacoLanguage,
          theme: "vs-dark",
          automaticLayout: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: "'Fira Code', monospace",
          lineNumbers: "on",
          readOnly,
          smoothScrolling: true,
          wordWrap: "on",
          padding: { top: 10 },
        });

        editorRef.current = editor;
        setIsLoading(false);

        // Handle content changes
        editor.onDidChangeModelContent(() => {
          if (onChange && !readOnly) {
            onChange(editor.getValue());
          }
        });

        // Handle cursor position changes
        editor.onDidChangeCursorPosition(e => {
          if (!readOnly) {
            const cursor: CursorPosition = {
              line: e.position.lineNumber,
              column: e.position.column,
              fileId,
            };
            wsManager.updateCursor(cursor);
          }
        });

        // Cleanup
        return () => {
          editor.dispose();
        };
      } catch (error) {
        console.error("Failed to initialize Monaco Editor:", error);
        setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Update editor value when prop changes
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (value !== currentValue) {
        editorRef.current.setValue(value);
      }
    }
  }, [value]);

  // Update editor language when prop changes
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        const monacoLanguage = languageMap[language] || "javascript";
        monaco.editor.setModelLanguage(model, monacoLanguage);
      }
    }
  }, [language]);

  // Update cursor decorations when participants change
  useEffect(() => {
    if (!editorRef.current) return;

    // Clear previous decorations
    if (decorationsRef.current.length > 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        []
      );
    }

    // Add cursor decorations for each participant
    const decorations = participants
      .filter(participant => participant.cursor?.fileId === fileId)
      .map(participant => {
        const { cursor, username, color } = participant;
        if (!cursor) return null;

        return {
          range: new monaco.Range(
            cursor.line,
            cursor.column,
            cursor.line,
            cursor.column + 1
          ),
          options: {
            className: `cursor-${username}`,
            hoverMessage: { value: username },
            beforeContentClassName: "relative",
            minimap: {
              color: color || generateUserColor(username),
              position: 1,
            },
            overviewRuler: {
              color: color || generateUserColor(username),
              position: 1,
            },
            glyphMarginClassName: "flex items-center justify-center",
            glyphMarginHoverMessage: { value: username },
            isWholeLine: false,
            inlineClassName: `relative border-l-2 border-${
              color || generateUserColor(username)
            }`,
          },
        };
      })
      .filter(Boolean) as monaco.editor.IModelDeltaDecoration[];

    // Apply the decorations
    if (decorations.length > 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        [],
        decorations
      );
    }
  }, [participants, fileId]);

  return (
    <div className="h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={containerRef} className="h-full" />

      {/* Visual cursor indicators for participants */}
      {participants
        .filter(
          participant =>
            participant.cursor?.fileId === fileId && editorRef.current
        )
        .map(participant => (
          <div
            key={participant.id}
            className="absolute pointer-events-none z-20"
            style={{
              left: "0", // Will be positioned by CSS
              top: "0", // Will be positioned by CSS
              opacity: editorRef.current ? 1 : 0,
            }}
          >
            {/* This is for visual reference - actual cursor positions are handled by Monaco decorations */}
          </div>
        ))}
    </div>
  );
}
