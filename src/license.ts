// License key storage in ~/.critique/license.json.

import fs from "fs"
import { join } from "path"
import { homedir } from "os"

const LICENSE_DIR = join(homedir(), ".critique")
const LICENSE_FILE = join(LICENSE_DIR, "license.json")

export interface StoredLicense {
  key: string
}

export function loadStoredLicenseKey(): string | null {
  try {
    const data = fs.readFileSync(LICENSE_FILE, "utf-8")
    const parsed = JSON.parse(data) as StoredLicense
    return typeof parsed.key === "string" && parsed.key.trim() ? parsed.key.trim() : null
  } catch {
    return null
  }
}

export function saveStoredLicenseKey(key: string): void {
  const trimmed = key.trim()
  if (!trimmed) return

  try {
    if (!fs.existsSync(LICENSE_DIR)) {
      fs.mkdirSync(LICENSE_DIR, { recursive: true })
    }
    const payload: StoredLicense = { key: trimmed }
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(payload, null, 2))
  } catch {
    // Ignore write errors
  }
}
