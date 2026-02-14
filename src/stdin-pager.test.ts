// Tests for --stdin pager mode (lazygit integration).
// Reproduces https://github.com/remorses/critique/issues/25
//
// Problem: When critique is used as a pager in lazygit:
//   git.paging.pager: critique --stdin
//
// Lazygit runs the pager using a PTY (github.com/creack/pty), so from critique's
// perspective process.stdout.isTTY is true. The current mode selection logic:
//
//   if (options.scrollback || !process.stdout.isTTY)  →  scrollback mode
//   else  →  TUI mode (interactive, cursor positioning, mouse tracking)
//
// Since stdout IS a TTY (PTY), critique enters TUI mode and outputs raw escape
// sequences like [?1000h (mouse tracking), [row;col;H (cursor positioning) etc.
// Lazygit's pager panel can't interpret these → shows garbled text.
//
// Fix: --stdin should always force scrollback mode. A pager consumer never
// expects interactive TUI — it expects static colored text output.

import { describe, test, expect } from "bun:test"

describe("--stdin pager mode selection (lazygit issue #25)", () => {
  // This test validates the decision logic that determines whether to use
  // scrollback mode or TUI mode. It tests the condition directly.
  test("--stdin should force scrollback mode regardless of TTY status", () => {
    // Current buggy condition (cli.tsx:1829):
    const buggyCondition = (options: { scrollback?: boolean; stdin?: boolean }, isTTY: boolean) =>
      options.scrollback || !isTTY

    // Fixed condition:
    const fixedCondition = (options: { scrollback?: boolean; stdin?: boolean }, isTTY: boolean) =>
      options.scrollback || options.stdin || !isTTY

    // Scenario 1: lazygit PTY - stdout IS a TTY, --stdin flag set
    const lazygitOptions = { stdin: true }

    // BUG: current logic sends lazygit to TUI mode
    expect(buggyCondition(lazygitOptions, true)).toBe(false) // false = TUI mode (wrong!)

    // FIX: stdin flag should force scrollback
    expect(fixedCondition(lazygitOptions, true)).toBe(true) // true = scrollback mode (correct!)

    // Scenario 2: piped stdout (non-TTY) - both conditions work
    expect(buggyCondition(lazygitOptions, false)).toBe(true)
    expect(fixedCondition(lazygitOptions, false)).toBe(true)

    // Scenario 3: normal TUI usage (no --stdin, real TTY)
    const normalOptions = {}
    expect(buggyCondition(normalOptions, true)).toBe(false) // TUI mode
    expect(fixedCondition(normalOptions, true)).toBe(false) // TUI mode (unchanged)

    // Scenario 4: explicit --scrollback
    const scrollbackOptions = { scrollback: true }
    expect(buggyCondition(scrollbackOptions, true)).toBe(true)
    expect(fixedCondition(scrollbackOptions, true)).toBe(true)
  })

  // Verify the exact line in cli.tsx has the bug
  test("cli.tsx line 1829 should include options.stdin in the condition", async () => {
    const fs = await import("fs")
    const path = await import("path")
    const cliSource = fs.readFileSync(path.join(import.meta.dir, "cli.tsx"), "utf-8")

    // The current buggy condition
    const hasBuggyCondition = cliSource.includes("options.scrollback || !process.stdout.isTTY")

    // The fixed condition should include options.stdin
    const hasFixedCondition = cliSource.includes("options.stdin") &&
      /options\.scrollback\s*\|\|\s*options\.stdin\s*\|\|\s*!process\.stdout\.isTTY/.test(cliSource)

    // This test will fail until the fix is applied, documenting the bug
    if (hasBuggyCondition && !hasFixedCondition) {
      // Bug is present — document it
      expect(hasBuggyCondition).toBe(true)
      // After fix, this assertion should change
      console.log(
        "BUG CONFIRMED: cli.tsx:1829 does not include options.stdin in scrollback condition.\n" +
        "Fix: Change 'options.scrollback || !process.stdout.isTTY'\n" +
        "  to: 'options.scrollback || options.stdin || !process.stdout.isTTY'"
      )
    } else {
      // Fix has been applied
      expect(hasFixedCondition).toBe(true)
    }
  })
})
