// Syntax highlighting themes for critique
// Source: https://github.com/sst/opencode/tree/main/packages/opencode/src/cli/cmd/tui/context/theme

import { parseColor, RGBA } from "@opentui/core";

import aura from "./themes/aura.json";
import ayu from "./themes/ayu.json";
import catppuccin from "./themes/catppuccin.json";
import catppuccinFrappe from "./themes/catppuccin-frappe.json";
import catppuccinMacchiato from "./themes/catppuccin-macchiato.json";
import cobalt2 from "./themes/cobalt2.json";
import cursor from "./themes/cursor.json";
import dracula from "./themes/dracula.json";
import everforest from "./themes/everforest.json";
import flexoki from "./themes/flexoki.json";
import github from "./themes/github.json";
import gruvbox from "./themes/gruvbox.json";
import kanagawa from "./themes/kanagawa.json";
import lucentOrng from "./themes/lucent-orng.json";
import material from "./themes/material.json";
import matrix from "./themes/matrix.json";
import mercury from "./themes/mercury.json";
import monokai from "./themes/monokai.json";
import nightowl from "./themes/nightowl.json";
import nord from "./themes/nord.json";
import oneDark from "./themes/one-dark.json";
import opencode from "./themes/opencode.json";
import orng from "./themes/orng.json";
import palenight from "./themes/palenight.json";
import rosepine from "./themes/rosepine.json";
import solarized from "./themes/solarized.json";
import synthwave84 from "./themes/synthwave84.json";
import tokyonight from "./themes/tokyonight.json";
import vercel from "./themes/vercel.json";
import vesper from "./themes/vesper.json";
import zenburn from "./themes/zenburn.json";

type HexColor = `#${string}`;
type RefName = string;
type Variant = {
  dark: HexColor | RefName;
  light: HexColor | RefName;
};
type ColorValue = HexColor | RefName | Variant;

interface ThemeJson {
  $schema?: string;
  defs?: Record<string, HexColor | RefName>;
  theme: Record<string, ColorValue>;
}

export interface ResolvedTheme {
  // Syntax colors
  syntaxComment: RGBA;
  syntaxKeyword: RGBA;
  syntaxFunction: RGBA;
  syntaxVariable: RGBA;
  syntaxString: RGBA;
  syntaxNumber: RGBA;
  syntaxType: RGBA;
  syntaxOperator: RGBA;
  syntaxPunctuation: RGBA;
  // Text colors
  text: RGBA;
  textMuted: RGBA;
  // Diff colors
  diffAddedBg: RGBA;
  diffRemovedBg: RGBA;
  diffContextBg: RGBA;
  diffAddedLineNumberBg: RGBA;
  diffRemovedLineNumberBg: RGBA;
  diffLineNumber: RGBA;
  // Background
  background: RGBA;
  backgroundPanel: RGBA;
}

export interface SyntaxThemeStyle {
  fg: RGBA;
  bold?: boolean;
  italic?: boolean;
}

export interface SyntaxTheme {
  keyword: SyntaxThemeStyle;
  "keyword.import": SyntaxThemeStyle;
  string: SyntaxThemeStyle;
  comment: SyntaxThemeStyle;
  number: SyntaxThemeStyle;
  boolean: SyntaxThemeStyle;
  constant: SyntaxThemeStyle;
  function: SyntaxThemeStyle;
  "function.call": SyntaxThemeStyle;
  constructor: SyntaxThemeStyle;
  type: SyntaxThemeStyle;
  operator: SyntaxThemeStyle;
  variable: SyntaxThemeStyle;
  property: SyntaxThemeStyle;
  bracket: SyntaxThemeStyle;
  punctuation: SyntaxThemeStyle;
  default: SyntaxThemeStyle;
}

const DEFAULT_THEMES: Record<string, ThemeJson> = {
  aura,
  ayu,
  catppuccin,
  "catppuccin-frappe": catppuccinFrappe,
  "catppuccin-macchiato": catppuccinMacchiato,
  cobalt2,
  cursor,
  dracula,
  everforest,
  flexoki,
  github,
  gruvbox,
  kanagawa,
  "lucent-orng": lucentOrng,
  material,
  matrix,
  mercury,
  monokai,
  nightowl,
  nord,
  "one-dark": oneDark,
  opencode,
  orng,
  palenight,
  rosepine,
  solarized,
  synthwave84,
  tokyonight,
  vercel,
  vesper,
  zenburn,
};

function resolveTheme(themeJson: ThemeJson, mode: "dark" | "light"): ResolvedTheme {
  const defs = themeJson.defs ?? {};

  function resolveColor(c: ColorValue): RGBA {
    if (typeof c === "string") {
      if (c === "transparent" || c === "none") return RGBA.fromInts(0, 0, 0, 0);
      if (c.startsWith("#")) return parseColor(c);
      // Reference to defs
      if (defs[c] != null) {
        return resolveColor(defs[c] as ColorValue);
      }
      // Reference to another theme property
      if (themeJson.theme[c] !== undefined) {
        return resolveColor(themeJson.theme[c] as ColorValue);
      }
      // Fallback
      return RGBA.fromInts(128, 128, 128, 255);
    }
    // Variant with dark/light
    return resolveColor(c[mode]);
  }

  return {
    syntaxComment: resolveColor(themeJson.theme.syntaxComment),
    syntaxKeyword: resolveColor(themeJson.theme.syntaxKeyword),
    syntaxFunction: resolveColor(themeJson.theme.syntaxFunction),
    syntaxVariable: resolveColor(themeJson.theme.syntaxVariable),
    syntaxString: resolveColor(themeJson.theme.syntaxString),
    syntaxNumber: resolveColor(themeJson.theme.syntaxNumber),
    syntaxType: resolveColor(themeJson.theme.syntaxType),
    syntaxOperator: resolveColor(themeJson.theme.syntaxOperator),
    syntaxPunctuation: resolveColor(themeJson.theme.syntaxPunctuation),
    text: resolveColor(themeJson.theme.text),
    textMuted: resolveColor(themeJson.theme.textMuted),
    diffAddedBg: resolveColor(themeJson.theme.diffAddedBg),
    diffRemovedBg: resolveColor(themeJson.theme.diffRemovedBg),
    diffContextBg: resolveColor(themeJson.theme.diffContextBg),
    diffAddedLineNumberBg: resolveColor(themeJson.theme.diffAddedLineNumberBg),
    diffRemovedLineNumberBg: resolveColor(themeJson.theme.diffRemovedLineNumberBg),
    diffLineNumber: resolveColor(themeJson.theme.diffLineNumber),
    background: resolveColor(themeJson.theme.background),
    backgroundPanel: resolveColor(themeJson.theme.backgroundPanel),
  };
}

export function getResolvedTheme(name: string, mode: "dark" | "light" = "dark"): ResolvedTheme {
  const themeJson = DEFAULT_THEMES[name] ?? DEFAULT_THEMES.github;
  return resolveTheme(themeJson, mode);
}

export function getSyntaxTheme(name: string, mode: "dark" | "light" = "dark"): SyntaxTheme {
  const resolved = getResolvedTheme(name, mode);

  return {
    keyword: { fg: resolved.syntaxKeyword, bold: true },
    "keyword.import": { fg: resolved.syntaxKeyword, bold: true },
    string: { fg: resolved.syntaxString },
    comment: { fg: resolved.syntaxComment, italic: true },
    number: { fg: resolved.syntaxNumber },
    boolean: { fg: resolved.syntaxNumber },
    constant: { fg: resolved.syntaxNumber },
    function: { fg: resolved.syntaxFunction },
    "function.call": { fg: resolved.syntaxFunction },
    constructor: { fg: resolved.syntaxType },
    type: { fg: resolved.syntaxType },
    operator: { fg: resolved.syntaxOperator },
    variable: { fg: resolved.syntaxVariable },
    property: { fg: resolved.syntaxVariable },
    bracket: { fg: resolved.syntaxPunctuation },
    punctuation: { fg: resolved.syntaxPunctuation },
    default: { fg: resolved.text },
  };
}

export const themeNames = Object.keys(DEFAULT_THEMES).sort();

export const defaultThemeName = "github";
