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
  // UI colors
  primary: RGBA;
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
  [key: string]: SyntaxThemeStyle;
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

function resolveTheme(
  themeJson: ThemeJson,
  mode: "dark" | "light",
): ResolvedTheme {
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

  const t = themeJson.theme;
  const fallbackGray: ColorValue = "#808080";
  const fallbackBg: ColorValue = "#1e1e1e";
  const fallbackText: ColorValue = "#d4d4d4";

  return {
    primary: resolveColor(t.primary ?? t.syntaxFunction ?? fallbackGray),
    syntaxComment: resolveColor(t.syntaxComment ?? fallbackGray),
    syntaxKeyword: resolveColor(t.syntaxKeyword ?? fallbackGray),
    syntaxFunction: resolveColor(t.syntaxFunction ?? fallbackGray),
    syntaxVariable: resolveColor(t.syntaxVariable ?? fallbackGray),
    syntaxString: resolveColor(t.syntaxString ?? fallbackGray),
    syntaxNumber: resolveColor(t.syntaxNumber ?? fallbackGray),
    syntaxType: resolveColor(t.syntaxType ?? fallbackGray),
    syntaxOperator: resolveColor(t.syntaxOperator ?? fallbackGray),
    syntaxPunctuation: resolveColor(t.syntaxPunctuation ?? fallbackGray),
    text: resolveColor(t.text ?? fallbackText),
    textMuted: resolveColor(t.textMuted ?? fallbackGray),
    diffAddedBg: resolveColor(t.diffAddedBg ?? "#1e3a1e"),
    diffRemovedBg: resolveColor(t.diffRemovedBg ?? "#3a1e1e"),
    diffContextBg: resolveColor(t.diffContextBg ?? fallbackBg),
    diffAddedLineNumberBg: resolveColor(t.diffAddedLineNumberBg ?? "#1e3a1e"),
    diffRemovedLineNumberBg: resolveColor(
      t.diffRemovedLineNumberBg ?? "#3a1e1e",
    ),
    diffLineNumber: resolveColor(t.diffLineNumber ?? fallbackGray),
    background: resolveColor(t.background ?? fallbackBg),
    backgroundPanel: resolveColor(t.backgroundPanel ?? fallbackBg),
  };
}

export function getResolvedTheme(
  name: string,
  mode: "dark" | "light" = "dark",
): ResolvedTheme {
  const themeJson = DEFAULT_THEMES[name] ?? DEFAULT_THEMES.github!;
  return resolveTheme(themeJson, mode);
}

export function getSyntaxTheme(
  name: string,
  mode: "dark" | "light" = "dark",
): SyntaxTheme {
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

// Helper to convert RGBA to hex string
export function rgbaToHex(rgba: RGBA): string {
  const r = Math.round(rgba.r * 255)
    .toString(16)
    .padStart(2, "0");
  const g = Math.round(rgba.g * 255)
    .toString(16)
    .padStart(2, "0");
  const b = Math.round(rgba.b * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
}
