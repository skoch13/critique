// Tests for DiffView theme reactivity when switching themes at runtime.

import * as React from "react"
import { afterEach, describe, expect, it } from "bun:test"
import { testRender } from "@opentuah/react/test-utils"
import { getDataPaths } from "@opentuah/core"
import { DiffView } from "./diff-view.tsx"
import { useAppStore } from "../store.ts"

// Suppress EventTarget memory leak warning from opentui DataPathsManager —
// each DiffView registers a paths:changed listener during tree-sitter init
getDataPaths().setMaxListeners(50)

const sampleDiff = `diff --git a/a.txt b/a.txt
index 1111111..2222222 100644
--- a/a.txt
+++ b/a.txt
@@ -1,2 +1,2 @@
-old
+new
 keep
`

function ThemeToggleHarness() {
  const themeName = useAppStore((s) => s.themeName)

  return (
    <DiffView
      diff={sampleDiff}
      view="unified"
      filetype="txt"
      themeName={themeName}
    />
  )
}

function extractDiffBackgroundSample(frame: any) {
  return {
    removedLineNumberBg: Array.from(frame.lines[0]!.spans[0]!.bg.buffer),
    removedContentBg: Array.from(frame.lines[0]!.spans[4]!.bg.buffer),
    contextBg: Array.from(frame.lines[2]!.spans[0]!.bg.buffer),
  }
}

// Suppress React act() warnings for opentui component tests.
// opentui's internal rendering triggers state updates outside act() boundaries,
// which is expected behavior for TUI component testing.
// testRender sets IS_REACT_ACT_ENVIRONMENT=true, so we must disable it after.
async function setupTest(jsx: React.ReactElement, opts: { width: number; height: number }) {
  const setup = await testRender(jsx, opts)
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false
  return setup
}

describe("DiffView", () => {
  let testSetup: Awaited<ReturnType<typeof testRender>>

  afterEach(() => {
    if (testSetup) {
      testSetup.renderer.destroy()
    }
    useAppStore.setState({ themeName: "github" })
  })

  it("updates diff background colors after theme switch", async () => {
    useAppStore.setState({ themeName: "github" })

    testSetup = await setupTest(<ThemeToggleHarness />, {
      width: 80,
      height: 8,
    })

    await testSetup.renderOnce()

    const before = extractDiffBackgroundSample(testSetup.captureSpans())
    expect(before).toMatchInlineSnapshot(`
      {
        "contextBg": [
          0,
          0,
          0,
          1,
        ],
        "removedContentBg": [
          0.07764706015586853,
          0.04313725605607033,
          0.04313725605607033,
          1,
        ],
        "removedLineNumberBg": [
          0.10980392247438431,
          0.05098039284348488,
          0.054901961237192154,
          1,
        ],
      }
    `)

    useAppStore.setState({ themeName: "tokyonight" })
    await new Promise((r) => setTimeout(r, 10))
    await testSetup.renderOnce()

    const after = extractDiffBackgroundSample(testSetup.captureSpans())
    expect(after).toMatchInlineSnapshot(`
      {
        "contextBg": [
          0.11764705926179886,
          0.125490203499794,
          0.1882352977991104,
          1,
        ],
        "removedContentBg": [
          0.23725490272045135,
          0.14666667580604553,
          0.18980392813682556,
          1,
        ],
        "removedLineNumberBg": [
          0.1764705926179886,
          0.12156862765550613,
          0.14901961386203766,
          1,
        ],
      }
    `)

    expect(after).not.toEqual(before)
  })
})
