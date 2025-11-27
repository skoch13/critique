#!/usr/bin/env node
/**
 * Captures real opentui output for use in the web preview
 * Run: node --experimental-strip-types scripts/capture-example.ts
 * Or: npx tsx scripts/capture-example.ts
 */
import pty from "node-pty";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLS = 240;
const ROWS = 50;

// Create a sample diff
const oldContent = `import { foo } from "./api";

export function Example() {
  const [value, setValue] = useState(0);
  return <div>{value}</div>;
}`;

const newContent = `import { foo, bar } from "./api";
import { useCallback } from "react";

export function Example() {
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(() => {
    setLoading(true);
    bar().then(setValue).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div onClick={handleClick}>
      {value}
    </div>
  );
}`;

// Write temp files
const tmpDir = "/tmp";
const oldFile = path.join(tmpDir, "capture-old.tsx");
const newFile = path.join(tmpDir, "capture-new.tsx");
const diffFile = path.join(tmpDir, "capture.diff");

fs.writeFileSync(oldFile, oldContent);
fs.writeFileSync(newFile, newContent);

// Generate diff
const { execSync } = await import("child_process");
try {
  execSync(`diff -u "${oldFile}" "${newFile}" > "${diffFile}"`, { stdio: "pipe" });
} catch {
  // diff returns non-zero when files differ, that's expected
}

console.log("Capturing opentui output...");

let output = "";

const ptyProcess = pty.spawn("bun", [
  path.join(__dirname, "../src/cli.tsx"),
  "web-render",
  diffFile,
  "--width", String(COLS),
  "--height", String(ROWS),
], {
  name: "xterm-256color",
  cols: COLS,
  rows: ROWS,
  cwd: process.cwd(),
  env: { ...process.env, TERM: "xterm-256color" },
});

ptyProcess.onData((data) => {
  output += data;
});

ptyProcess.onExit(() => {
  // Clean up temp files
  fs.unlinkSync(oldFile);
  fs.unlinkSync(newFile);
  fs.unlinkSync(diffFile);

  // Save output
  const outputFile = path.join(__dirname, "../web/example.ansi");
  fs.writeFileSync(outputFile, output);

  console.log(`Saved ${output.length} bytes to web/example.ansi`);
  process.exit(0);
});
