/** Code languages bundled for syntax highlighting. Keep in sync with lib/highlight.ts. */
export const SUPPORTED_LANGUAGES = [
  "bash",
  "css",
  "go",
  "html",
  "javascript",
  "json",
  "jsx",
  "python",
  "rust",
  "sql",
  "tsx",
  "typescript",
  "yaml",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
