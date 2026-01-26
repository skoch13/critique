// Cloudflare Worker for hosting HTML diff previews at critique.work.
// Handles upload, storage (KV), and responsive serving of desktop/mobile HTML versions.
// Endpoints: POST /upload, GET /v/:id (view), GET /raw/:id (debug).

import { Hono } from "hono"
import { cors } from "hono/cors"
import { stream } from "hono/streaming"
import type { KVNamespace } from "@cloudflare/workers-types"

type Bindings = {
  CRITIQUE_KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for all routes
app.use("*", cors())

// Redirect to GitHub repo
app.get("/", (c) => {
  return c.redirect("https://github.com/remorses/critique")
})

// Detect if request is from a mobile device
function isMobileDevice(c: { req: { header: (name: string) => string | undefined } }): boolean {
  // Check CF-Device-Type header (Cloudflare provides this on Enterprise/APO)
  const cfDeviceType = c.req.header("CF-Device-Type")
  if (cfDeviceType === "mobile" || cfDeviceType === "tablet") {
    return true
  }
  if (cfDeviceType === "desktop") {
    return false
  }

  // Check Sec-CH-UA-Mobile header (Chromium browsers only)
  const secChUaMobile = c.req.header("Sec-CH-UA-Mobile")
  if (secChUaMobile === "?1") {
    return true
  }
  if (secChUaMobile === "?0") {
    return false
  }

  // Fallback to User-Agent parsing with comprehensive regex
  const userAgent = c.req.header("User-Agent") || ""

  // Comprehensive mobile detection regex (case-insensitive)
  const mobileRegex = /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|Silk|NetFront|Opera M(obi|ini)|Windows Phone|webOS|Fennec|Minimo|UCBrowser|UCWEB|SonyEricsson|Symbian|Nintendo|PSP|PlayStation|MIDP|CLDC|AvantGo|Maemo|PalmOS|PalmSource|DoCoMo|UP\.Browser|Blazer|Xiino|OneBrowser/i

  return mobileRegex.test(userAgent)
}

// Inject OG image meta tags into HTML
function injectOgTags(html: string, ogImageUrl: string, title: string): string {
  const ogTags = `
<meta property="og:title" content="${title}">
<meta property="og:type" content="website">
<meta property="og:image" content="${ogImageUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:image" content="${ogImageUrl}">`

  // Insert after <meta name="viewport"...> or before </head>
  if (html.includes('name="viewport"')) {
    return html.replace(
      /(<meta[^>]*name="viewport"[^>]*>)/i,
      `$1${ogTags}`
    )
  }
  return html.replace("</head>", `${ogTags}\n</head>`)
}

// Extract title from HTML
function extractTitle(html: string): string {
  const match = html.match(/<title>([^<]*)<\/title>/i)
  return match?.[1] ?? "Critique Diff"
}

// Upload HTML content
// POST /upload with JSON body { html: string, htmlMobile?: string, ogImage?: string (base64) }
// Returns { id: string, url: string, ogImageUrl?: string }
app.post("/upload", async (c) => {
  try {
    const body = await c.req.json<{ html: string; htmlMobile?: string; ogImage?: string }>()

    if (!body.html || typeof body.html !== "string") {
      return c.json({ error: "Missing or invalid 'html' field" }, 400)
    }

    // Generate hash of the desktop HTML content as the key (enables caching/deduplication)
    const encoder = new TextEncoder()
    const data = encoder.encode(body.html)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")

    // Use first 32 chars of hash as ID (128 bits, secure against guessing)
    const id = hashHex.slice(0, 32)

    const url = new URL(c.req.url)
    let ogImageUrl: string | undefined

    // Store OG image if provided
    if (body.ogImage && typeof body.ogImage === "string") {
      // Decode base64 to binary
      const binaryString = atob(body.ogImage)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Store as binary in KV
      await c.env.CRITIQUE_KV.put(`og-${id}`, bytes.buffer, {
        expirationTtl: 60 * 60 * 24 * 7, // 7 days
      })

      ogImageUrl = `${url.origin}/og/${id}.png`
    }

    // Inject OG tags into HTML if we have an OG image
    let htmlDesktop = body.html
    let htmlMobile = body.htmlMobile

    if (ogImageUrl) {
      const title = extractTitle(body.html)
      htmlDesktop = injectOgTags(htmlDesktop, ogImageUrl, title)
      htmlMobile = htmlMobile ? injectOgTags(htmlMobile, ogImageUrl, title) : htmlMobile
    }

    // Store desktop version in KV with 7 day expiration
    await c.env.CRITIQUE_KV.put(id, htmlDesktop, {
      expirationTtl: 60 * 60 * 24 * 7, // 7 days
    })

    // Store mobile version if provided
    if (htmlMobile && typeof htmlMobile === "string") {
      await c.env.CRITIQUE_KV.put(`${id}-mobile`, htmlMobile, {
        expirationTtl: 60 * 60 * 24 * 7, // 7 days
      })
    }

    const viewUrl = `${url.origin}/v/${id}`

    return c.json({ id, url: viewUrl, ogImageUrl })
  } catch (error) {
    return c.json({ error: "Failed to process upload" }, 500)
  }
})

// View HTML content with streaming
// GET /v/:id (short) or /view/:id (legacy)
// Query params: ?v=desktop or ?v=mobile to select version
// Server redirects mobile devices to ?v=mobile, client JS also handles redirect
async function handleView(c: any) {
  const id = c.req.param("id")

  if (!id || !/^[a-f0-9]{16,32}$/.test(id)) {
    return c.text("Invalid ID", 400)
  }

  // Check for version query param
  const version = c.req.query("v")

  // If no version specified and mobile device detected, redirect to ?v=mobile
  // This is a fallback - client JS also handles this redirect
  if (!version && isMobileDevice(c)) {
    const url = new URL(c.req.url)
    url.searchParams.set("v", "mobile")
    return c.redirect(url.toString(), 302)
  }

  // Serve the appropriate version based on query param
  const isMobile = version === "mobile"
  let html: string | null = null

  if (isMobile) {
    // Try mobile version first, fall back to desktop
    html = await c.env.CRITIQUE_KV.get(`${id}-mobile`)
    if (!html) {
      html = await c.env.CRITIQUE_KV.get(id)
    }
  } else {
    html = await c.env.CRITIQUE_KV.get(id)
  }

  if (!html) {
    return c.text("Not found", 404)
  }

  // Stream the HTML content for faster initial load
  return stream(c, async (s) => {
    c.header("Content-Type", "text/html; charset=utf-8")
    // Cache is now safe - URL determines content, no Vary needed
    c.header("Cache-Control", "public, max-age=86400")

    // Stream in chunks for better performance
    const chunkSize = 16 * 1024 // 16KB chunks
    let offset = 0

    while (offset < html.length) {
      const chunk = html.slice(offset, offset + chunkSize)
      await s.write(chunk)
      offset += chunkSize
    }
  })
}

app.get("/v/:id", handleView)
app.get("/view/:id", handleView)

// Serve OG image
// GET /og/:id.png
app.get("/og/:id.png", async (c) => {
  const idWithExt = c.req.param("id.png")
  const id = idWithExt?.replace(".png", "")

  if (!id || !/^[a-f0-9]{16,32}$/.test(id)) {
    return c.text("Invalid ID", 400)
  }

  const imageData = await c.env.CRITIQUE_KV.get(`og-${id}`, { type: "arrayBuffer" })

  if (!imageData) {
    return c.text("Not found", 404)
  }

  return c.body(imageData, 200, {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=604800", // 7 days
  })
})

// Get raw HTML content (for debugging/API access)
// GET /raw/:id
app.get("/raw/:id", async (c) => {
  const id = c.req.param("id")

  if (!id || !/^[a-f0-9]{16,32}$/.test(id)) {
    return c.json({ error: "Invalid ID" }, 400)
  }

  const html = await c.env.CRITIQUE_KV.get(id)

  if (!html) {
    return c.json({ error: "Not found" }, 404)
  }

  return c.text(html, 200, {
    "Content-Type": "text/html; charset=utf-8",
  })
})

// Check if content exists
// HEAD /v/:id or /view/:id
async function handleHead(c: any) {
  const id = c.req.param("id")

  if (!id || !/^[a-f0-9]{16,32}$/.test(id)) {
    return c.body(null, 400)
  }

  const html = await c.env.CRITIQUE_KV.get(id)

  if (!html) {
    return c.body(null, 404)
  }

  c.header("Content-Length", String(html.length))
  return c.body(null, 200)
}

app.on("HEAD", "/v/:id", handleHead)
app.on("HEAD", "/view/:id", handleHead)

export default app
