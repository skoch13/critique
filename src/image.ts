// Terminal output to image conversion using takumi.
// Converts ANSI terminal output to images, splitting into multiple pages if needed.
// Exports renderTerminalToImages() for library and CLI use.

import { tmpdir } from "os"
import { join } from "path"
import fs from "fs"
import { ptyToJson, StyleFlags, type TerminalLine, type TerminalSpan } from "ghostty-opentui"
import { getResolvedTheme, rgbaToHex } from "./themes.ts"

export interface RenderToImagesOptions {
  /** Terminal columns for parsing (default: 120) */
  cols?: number
  /** Terminal rows for parsing (default: 10000, effectively unlimited) */
  rows?: number
  /** Theme name for colors */
  themeName?: string
  /** Image width in pixels (default: 1200) */
  imageWidth?: number
  /** Font size in pixels (default: 14) */
  fontSize?: number
  /** Line height multiplier (default: 1.7) */
  lineHeight?: number
  /** Maximum lines per image before splitting (default: 70) */
  maxLinesPerImage?: number
  /** Output format: webp, png, or jpeg (default: webp) */
  format?: "webp" | "png" | "jpeg"
  /** Quality for lossy formats 0-100 (default: 85) */
  quality?: number
}

export interface RenderResult {
  /** Array of image buffers */
  images: Buffer[]
  /** Paths where images were saved */
  paths: string[]
  /** Total number of lines in the output */
  totalLines: number
  /** Number of images generated */
  imageCount: number
}

/**
 * Convert terminal spans to takumi text nodes.
 * Following shiki-image pattern: only display: inline and color styles.
 */
function spanToNode(
  span: TerminalSpan,
  text: typeof import("@takumi-rs/helpers").text
) {
  const style: Record<string, string | number> = {
    display: "inline",
  }

  if (span.fg) {
    style.color = span.fg
  }
  if (span.bg) {
    style.backgroundColor = span.bg
  }
  if (span.flags & StyleFlags.BOLD) {
    style.fontWeight = "bold"
  }
  if (span.flags & StyleFlags.ITALIC) {
    style.fontStyle = "italic"
  }
  if (span.flags & StyleFlags.FAINT) {
    style.opacity = 0.5
  }

  return text(span.text, style as any)
}

/**
 * Convert a terminal line to a takumi container node.
 * All lines treated the same - render spans with background.
 * Uses negative margin to eliminate gaps (takumi doesn't respect container height for backgrounds).
 */
function lineToNode(
  line: TerminalLine,
  container: typeof import("@takumi-rs/helpers").container,
  text: typeof import("@takumi-rs/helpers").text,
  backgroundColor: string,
  lineHeight: number,
  fontSize: number
) {
  const lineHeightPx = Math.round(fontSize * lineHeight)
  
  // Calculate negative margin to eliminate gaps between lines
  // The gap is proportional to the extra space from line-height (lineHeight - 1) * fontSize
  // We use ~50% of that as overlap to close the gaps
  const gapOverlap = Math.round((lineHeight - 1) * fontSize * 0.5)

  // Get text children from spans, or use a visible character if empty
  let textChildren = line.spans.map((span) => spanToNode(span, text))
  if (textChildren.length === 0) {
    textChildren = [text("X", { color: backgroundColor })]
  }

  return container({
    style: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      height: lineHeightPx,
      marginBottom: -gapOverlap,
      backgroundColor,
    },
    children: textChildren,
  })
}

/**
 * Check if a line is empty (no spans or only whitespace)
 */
function isLineEmpty(line: TerminalLine): boolean {
  if (line.spans.length === 0) return true
  return line.spans.every((span) => span.text.trim() === "")
}

/**
 * Trim empty lines from the end of the lines array
 */
function trimEmptyLines(lines: TerminalLine[]): TerminalLine[] {
  let result = [...lines]
  while (result.length > 0 && isLineEmpty(result[result.length - 1]!)) {
    result = result.slice(0, -1)
  }
  return result
}

/**
 * Render terminal output to images.
 * This is the main export for library use.
 *
 * @param ansiOutput - Raw ANSI terminal output string or Buffer
 * @param options - Rendering options
 * @returns Promise with image buffers and saved file paths
 */
export async function renderTerminalToImages(
  ansiOutput: string | Buffer,
  options: RenderToImagesOptions = {}
): Promise<RenderResult> {
  // Try to import takumi - it's an optional dependency
  let takumiCore: typeof import("@takumi-rs/core")
  let takumiHelpers: typeof import("@takumi-rs/helpers")

  try {
    takumiCore = await import("@takumi-rs/core")
    takumiHelpers = await import("@takumi-rs/helpers")
  } catch {
    throw new Error(
      "takumi is not installed. Install it with: bun add @takumi-rs/core @takumi-rs/helpers"
    )
  }

  const { Renderer } = takumiCore
  const { container, text } = takumiHelpers

  const {
    cols = 120,
    rows = 10000,
    themeName = "tokyonight",
    imageWidth = 1200,
    fontSize = 14,
    lineHeight = 1.9,
    maxLinesPerImage = 70,
    format = "webp",
    quality = 85,
  } = options

  // Parse ANSI to terminal data
  const data = ptyToJson(ansiOutput, { cols, rows })
  let lines = trimEmptyLines(data.lines)

  if (lines.length === 0) {
    throw new Error("No content to render")
  }

  // Get theme colors
  const theme = getResolvedTheme(themeName)
  const backgroundColor = rgbaToHex(theme.background)
  const textColor = rgbaToHex(theme.text)

  // Calculate dimensions
  const lineHeightPx = Math.round(fontSize * lineHeight)
  const paddingY = 24
  const paddingX = 32

  // Split lines into chunks
  const chunks: TerminalLine[][] = []
  for (let i = 0; i < lines.length; i += maxLinesPerImage) {
    chunks.push(lines.slice(i, i + maxLinesPerImage))
  }

  // Create renderer with bundled Geist font (included in takumi)
  const renderer = new Renderer()

  const images: Buffer[] = []
  const paths: string[] = []
  const timestamp = Date.now()

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex]!
    const imageHeight = chunk.length * lineHeightPx + paddingY * 2

    // Build the root container for this chunk
    // Explicit dimensions, lines stack with explicit heights
    const contentHeight = chunk.length * lineHeightPx
    
    const rootNode = container({
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 0,
        width: "100%",
        height: "100%",
        backgroundColor,
        color: textColor,
        fontFamily: "monospace",
        fontSize,
        whiteSpace: "pre",
        paddingTop: paddingY,
        paddingBottom: paddingY,
        paddingLeft: paddingX,
        paddingRight: paddingX,
      },
      children: chunk.map((line) => lineToNode(line, container, text, backgroundColor, lineHeight, fontSize)),
    })

    // Render to image
    const imageBuffer = await renderer.render(rootNode, {
      width: imageWidth,
      height: imageHeight,
      format,
      quality,
    })

    images.push(Buffer.from(imageBuffer))

    // Save to /tmp
    const filename = `critique-${timestamp}-${chunkIndex + 1}.${format}`
    const filepath = join(tmpdir(), filename)
    fs.writeFileSync(filepath, imageBuffer)
    paths.push(filepath)
  }

  return {
    images,
    paths,
    totalLines: lines.length,
    imageCount: chunks.length,
  }
}

/**
 * Capture PTY output and render to images.
 * Similar to captureToHtml but outputs images instead.
 */
export async function captureToImages(
  renderCommand: string[],
  options: RenderToImagesOptions & { themeName: string }
): Promise<RenderResult> {
  const decoder = new TextDecoder()
  let ansiOutput = ""

  const cols = options.cols ?? 120
  const rows = options.rows ?? 10000

  // Use Bun.Terminal for real PTY support
  const proc = Bun.spawn(["bun", ...renderCommand], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      TERM: "xterm-256color",
    },
    terminal: {
      cols,
      rows,
      data(terminal, data) {
        ansiOutput += decoder.decode(data, { stream: true })
      },
    },
  })

  await proc.exited

  // Close terminal and flush decoder
  proc.terminal?.close()
  ansiOutput += decoder.decode()

  if (!ansiOutput.trim()) {
    throw new Error("No output captured")
  }

  // Strip terminal cleanup sequences
  const clearIdx = ansiOutput.lastIndexOf("\x1b[H\x1b[J")
  if (clearIdx > 0) {
    ansiOutput = ansiOutput.slice(0, clearIdx)
  }

  return renderTerminalToImages(ansiOutput, options)
}
