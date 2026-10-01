import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { withTheme } from "./fixtures";

/**
 * Helpers for @http specs.
 *
 * The HTML is fetched by Playwright's request context (Node networking, logged
 * in via global-setup) and then only *parsed* by the browser: JavaScript is off
 * for these pages and every network request from the page is aborted. This lets
 * the specs use locators on the server-rendered markup in environments where
 * the browser itself cannot reach the store.
 */
export async function fetchHtml(request: APIRequestContext, path: string, expectedStatus = 200): Promise<string> {
  const res = await request.get(withTheme(path));
  expect(res.status(), `${path} → HTTP ${res.status()}`).toBe(expectedStatus);
  const html = await res.text();
  expect(html, `${path} contains a Liquid error`).not.toMatch(/Liquid (syntax )?error/i);
  return html;
}

export async function loadHtml(page: Page, request: APIRequestContext, path: string, expectedStatus = 200): Promise<string> {
  const html = await fetchHtml(request, path, expectedStatus);
  await page.route("**/*", (route) => route.abort());
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  return html;
}
