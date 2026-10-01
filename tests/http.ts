import { expect, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";
import { withTheme } from "./fixtures";

/**
 * Helpers for @http specs.
 *
 * The HTML is fetched by Playwright's request context (Node networking, logged
 * in via global-setup) and then only *parsed* by the browser: every network
 * request from the page is aborted. This lets the specs use locators on the
 * server-rendered markup in environments where the browser itself cannot reach
 * the store.
 *
 * Shopify protects storefronts against bursts (HTTP 429 "Verifying your
 * connection"). The helpers therefore stay polite: storefront GETs are spaced
 * out, each page is fetched only once per worker and 429s back off. Run @http
 * specs with a single worker (npm run qa:http).
 */
const MIN_INTERVAL_MS = Number(process.env.QA_HTTP_INTERVAL_MS || 2500);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let lastRequestAt = 0;
const htmlCache = new Map<string, string>();

async function pace() {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

export async function getWithRetry(request: APIRequestContext, url: string, attempts = 4): Promise<APIResponse> {
  await pace();
  let res = await request.get(url);
  for (let i = 1; i < attempts && res.status() === 429; i++) {
    const retryAfter = Number(res.headers()["retry-after"]) || 0;
    await sleep(Math.max(retryAfter * 1000, 5000 * 2 ** (i - 1)));
    await pace();
    res = await request.get(url);
  }
  return res;
}

export function isPasswordPage(html: string): boolean {
  return /<form[^>]+action="\/password"/.test(html);
}

/** Storefront password login on an existing request context (keeps its cookies). */
export async function passwordLogin(request: APIRequestContext): Promise<void> {
  const password = process.env.SHOPIFY_STOREFRONT_PASSWORD;
  if (!password) return;
  const page = await getWithRetry(request, "/password");
  const html = await page.text();
  if (!isPasswordPage(html)) return;
  const token = html.match(/name="authenticity_token" value="([^"]+)"/)?.[1];
  await pace();
  await request.post("/password", {
    form: { form_type: "storefront_password", utf8: "✓", password, ...(token ? { authenticity_token: token } : {}) },
    maxRedirects: 0,
  });
}

export async function fetchHtml(request: APIRequestContext, path: string, expectedStatus = 200): Promise<string> {
  const key = `${expectedStatus} ${path}`;
  const cached = htmlCache.get(key);
  if (cached) return cached;

  let res = await getWithRetry(request, withTheme(path));
  let html = await res.text();
  if (isPasswordPage(html)) {
    // The storefront session can expire during a run: log in again once.
    await passwordLogin(request);
    res = await getWithRetry(request, withTheme(path));
    html = await res.text();
  }
  expect(res.status(), `${path} → HTTP ${res.status()}`).toBe(expectedStatus);
  expect(isPasswordPage(html), `${path} returned the storefront password page`).toBe(false);
  expect(html, `${path} contains a Liquid error`).not.toMatch(/Liquid (syntax )?error/i);
  htmlCache.set(key, html);
  return html;
}

export async function loadHtml(page: Page, request: APIRequestContext, path: string, expectedStatus = 200): Promise<string> {
  const html = await fetchHtml(request, path, expectedStatus);
  await page.route("**/*", (route) => route.abort());
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  return html;
}
