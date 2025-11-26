/**
 * Shared utility functions for language and file icons
 */

import { languages } from "@shared/schema";

interface IconInfo {
  icon: string;
  color: string;
}

/**
 * Get the icon and color for a programming language
 */
export function getLanguageIcon(language: string): IconInfo {
  const lang = languages.find(l => l.id === language);
  if (lang) {
    return { icon: lang.icon, color: lang.iconColor };
  }

  // Fallback for unknown languages
  switch (language) {
    case "javascript":
      return { icon: "ri-javascript-line", color: "text-yellow-400" };
    case "python":
      return { icon: "ri-python-line", color: "text-blue-400" };
    case "java":
      return { icon: "ri-code-s-slash-line", color: "text-orange-400" };
    case "cpp":
      return { icon: "ri-code-s-slash-line", color: "text-blue-500" };
    case "ruby":
      return { icon: "ri-ruby-line", color: "text-red-500" };
    default:
      return { icon: "ri-code-line", color: "text-muted-foreground" };
  }
}

/**
 * Get the display name for a programming language
 */
export function getLanguageName(language: string): string {
  const lang = languages.find(l => l.id === language);
  if (lang) {
    return lang.name;
  }

  // Fallback for unknown languages
  switch (language) {
    case "javascript":
      return "JavaScript";
    case "python":
      return "Python";
    case "java":
      return "Java";
    case "cpp":
      return "C++";
    case "ruby":
      return "Ruby";
    case "typescript":
      return "TypeScript";
    case "go":
      return "Go";
    case "rust":
      return "Rust";
    default:
      return language.charAt(0).toUpperCase() + language.slice(1);
  }
}

/**
 * Get the icon and color for a file based on its extension
 */
export function getFileIcon(fileName: string): IconInfo {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "js":
    case "jsx":
      return { icon: "ri-javascript-line", color: "text-yellow-400" };
    case "ts":
    case "tsx":
      return { icon: "ri-javascript-line", color: "text-blue-400" };
    case "py":
      return { icon: "ri-python-line", color: "text-blue-400" };
    case "java":
      return { icon: "ri-code-s-slash-line", color: "text-orange-400" };
    case "cpp":
    case "c":
    case "h":
    case "hpp":
      return { icon: "ri-code-s-slash-line", color: "text-blue-500" };
    case "rb":
      return { icon: "ri-ruby-line", color: "text-red-500" };
    case "html":
      return { icon: "ri-html5-line", color: "text-orange-400" };
    case "css":
    case "scss":
    case "sass":
      return { icon: "ri-file-list-line", color: "text-blue-400" };
    case "json":
      return { icon: "ri-brackets-line", color: "text-yellow-300" };
    case "md":
    case "markdown":
      return { icon: "ri-markdown-line", color: "text-blue-300" };
    case "yaml":
    case "yml":
      return { icon: "ri-file-text-line", color: "text-purple-400" };
    case "xml":
      return { icon: "ri-file-code-line", color: "text-orange-300" };
    case "svg":
      return { icon: "ri-image-line", color: "text-green-400" };
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return { icon: "ri-image-line", color: "text-pink-400" };
    case "sh":
    case "bash":
    case "zsh":
      return { icon: "ri-terminal-line", color: "text-green-400" };
    case "go":
      return { icon: "ri-code-s-slash-line", color: "text-cyan-400" };
    case "rs":
      return { icon: "ri-code-s-slash-line", color: "text-orange-500" };
    case "php":
      return { icon: "ri-code-s-slash-line", color: "text-purple-400" };
    case "sql":
      return { icon: "ri-database-line", color: "text-blue-400" };
    default:
      return { icon: "ri-file-code-line", color: "text-muted-foreground" };
  }
}

/**
 * Get Monaco editor language ID from file extension
 */
export function getMonacoLanguage(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "py":
      return "python";
    case "java":
      return "java";
    case "cpp":
    case "c":
    case "h":
    case "hpp":
      return "cpp";
    case "rb":
      return "ruby";
    case "html":
      return "html";
    case "css":
      return "css";
    case "scss":
      return "scss";
    case "json":
      return "json";
    case "md":
    case "markdown":
      return "markdown";
    case "yaml":
    case "yml":
      return "yaml";
    case "xml":
      return "xml";
    case "sh":
    case "bash":
    case "zsh":
      return "shell";
    case "go":
      return "go";
    case "rs":
      return "rust";
    case "php":
      return "php";
    case "sql":
      return "sql";
    default:
      return "plaintext";
  }
}

/**
 * Generate a consistent color for a username (for collaborative cursors)
 */
export function generateUserColor(username: string): string {
  const colors = [
    "#4F46E5", // Indigo
    "#10B981", // Green
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#F97316", // Orange
    "#14B8A6", // Teal
    "#6366F1", // Violet
  ];

  const hash = Array.from(username).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );

  return colors[hash % colors.length];
}
