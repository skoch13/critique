import { ptyToHtml, type TerminalData } from "opentui-ansi-vt"

export interface AnsiToHtmlOptions {
  cols?: number
  rows?: number
  /** Background color for the container */
  backgroundColor?: string
  /** Font family for the output */
  fontFamily?: string
  /** Font size for the output */
  fontSize?: string
}

/**
 * Converts ANSI terminal output to styled HTML.
 * Re-exports ptyToHtml from opentui-ansi-vt.
 */
export function ansiToHtml(input: string | Buffer, options: AnsiToHtmlOptions = {}): string {
  const { cols = 500, rows = 256 } = options
  return ptyToHtml(input, { cols, rows })
}

/**
 * Generates a complete HTML document from ANSI input.
 * Includes proper styling for terminal output display.
 */
export function ansiToHtmlDocument(input: string | Buffer, options: AnsiToHtmlOptions = {}): string {
  const {
    backgroundColor = "#0f0f0f",
    fontFamily = "Monaco, Menlo, 'Ubuntu Mono', Consolas, monospace",
    fontSize = "14px",
  } = options

  const content = ansiToHtml(input, options)

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Critique Diff</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  height: 100%;
  background-color: ${backgroundColor};
  color: #c5c8c6;
  font-family: ${fontFamily};
  font-size: ${fontSize};
  line-height: 1.4;
}
#content {
  padding: 16px;
  overflow-x: auto;
}
</style>
</head>
<body>
<div id="content">
${content}
</div>
</body>
</html>`
}

export type { TerminalData }
