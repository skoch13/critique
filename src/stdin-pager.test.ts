// Integration test for --stdin pager mode (lazygit integration).
// Reproduces https://github.com/remorses/critique/issues/25
//
// Uses tuistory to launch critique in a PTY (exactly like lazygit does),
// pipes a real diff via stdin, and verifies the output is plain scrollback
// text — not interactive TUI escape sequences.
//
// tuistory spawns a PTY where isTTY=true, which is exactly how lazygit
// runs its pager (via github.com/creack/pty). This makes the test
// realistic: it catches the original bug where --stdin + TTY incorrectly
// entered interactive TUI mode instead of scrollback mode.

import { describe, test, expect, afterAll, beforeAll } from "bun:test"
import { launchTerminal } from "tuistory"
import fs from "fs"
import path from "path"

const SAMPLE_DIFF = [
  "diff --git a/src/hello.ts b/src/hello.ts",
  "--- a/src/hello.ts",
  "+++ b/src/hello.ts",
  "@@ -1,3 +1,3 @@",
  " const greeting = 'hello'",
  "-console.log(greeting)",
  "+console.log(greeting + ' world')",
  " export default greeting",
].join("\n")

// Write diff to temp file so bash can cat it without escaping issues
const TEMP_DIFF_PATH = path.join(import.meta.dir, ".test-stdin-diff.tmp")

describe("--stdin pager mode (lazygit issue #25)", () => {
  beforeAll(() => {
    fs.writeFileSync(TEMP_DIFF_PATH, SAMPLE_DIFF)
  })

  afterAll(() => {
    try {
      fs.unlinkSync(TEMP_DIFF_PATH)
    } catch {}
  })

  // This is the real integration test: tuistory launches a PTY (isTTY=true),
  // exactly replicating how lazygit runs its pager. We pipe a diff into
  // `critique --stdin` and verify it renders as plain scrollback output.
  test("critique --stdin renders scrollback output in a PTY", async () => {
    const session = await launchTerminal({
      command: "bash",
      args: [
        "-c",
        `cat "${TEMP_DIFF_PATH}" | bun run src/cli.tsx --stdin`,
      ],
      cols: 100,
      rows: 30,
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TERM: "xterm-256color",
      },
    })

    // Wait for critique to process the diff and produce output
    const text = await session.waitForText("hello", { timeout: 15000 })

    // Get a trimmed snapshot for readable assertions
    const trimmed = await session.text({ trimEnd: true })

    // Snapshot the actual output so we can see what it looks like.
    // This is the output lazygit users see in their pager panel.
    expect(trimmed).toMatchInlineSnapshot(`
"
 a/src/hello.ts → b/src/hello.ts +1-1

 1   const greeting = 'hello'
 2 - console.log(greeting)
 2 + console.log(greeting + ' world')
 3   export default greeting"
`)

    // The output should contain actual diff content rendered as scrollback
    expect(text).toContain("hello")
    expect(text).toContain("greeting")
    expect(text).toContain("hello.ts")

    // The output should look like a normal diff, not a full-screen TUI app.
    // A TUI app would fill the entire 30-row terminal with borders, scrollbars,
    // file tree, etc. Scrollback mode outputs only the diff content and exits.
    const lines = text.split("\n").filter((l) => l.trim().length > 0)
    expect(lines.length).toBeLessThan(25)
    expect(lines.length).toBeGreaterThan(0)

    session.close()
  }, 30000)
})
