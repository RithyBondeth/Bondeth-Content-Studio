import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import css from "shiki/langs/css.mjs";
import go from "shiki/langs/go.mjs";
import html from "shiki/langs/html.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import jsx from "shiki/langs/jsx.mjs";
import python from "shiki/langs/python.mjs";
import rust from "shiki/langs/rust.mjs";
import sql from "shiki/langs/sql.mjs";
import tsx from "shiki/langs/tsx.mjs";
import typescript from "shiki/langs/typescript.mjs";
import yaml from "shiki/langs/yaml.mjs";
import githubDarkDefault from "shiki/themes/github-dark-default.mjs";
import { theme } from "../theme/tokens";

// Only these languages are bundled. To support another one, import it above and add it here.
const languages = {
  bash,
  css,
  go,
  html,
  javascript,
  json,
  jsx,
  python,
  rust,
  sql,
  tsx,
  typescript,
  yaml,
};

export type SupportedLanguage = keyof typeof languages;

/** A highlighted piece of a line. Plain JSON so it can travel through composition props. */
export type CodeToken = {
  content: string;
  color?: string;
  /** Bit flags from Shiki: 1 = italic, 2 = bold, 4 = underline. */
  fontStyle?: number;
};

export type HighlightedLine = CodeToken[];

let highlighterPromise: Promise<HighlighterCore> | null = null;

const getHighlighter = () => {
  highlighterPromise ??= createHighlighterCore({
    themes: [githubDarkDefault],
    langs: Object.values(languages),
    // The JavaScript engine avoids loading WebAssembly in the browser bundle.
    engine: createJavaScriptRegexEngine(),
  });
  return highlighterPromise;
};

/** Strips the leading newline and trailing whitespace that template literals tend to add. */
export const normalizeCode = (code: string) =>
  code.replace(/^\r?\n/, "").replace(/\s+$/, "");

export const highlightCode = async (
  code: string,
  lang: SupportedLanguage,
): Promise<HighlightedLine[]> => {
  const highlighter = await getHighlighter();
  const { tokens } = highlighter.codeToTokens(normalizeCode(code), {
    lang,
    theme: theme.codeTheme,
  });

  return tokens.map((line) =>
    line.map((token) => ({
      content: token.content,
      color: token.color,
      fontStyle: token.fontStyle,
    })),
  );
};
