import { request, FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Globaler Setup-Schritt vor allen Playwright-Tests.
 *
 * 1) Loggt sich falls noetig durch den Storefront-Passwortschutz ein – per
 *    HTTP-Request statt Browser, damit es auch dort funktioniert, wo nur die
 *    @http-Specs laufen (z. B. Cloud-Sandbox ohne Browser-Zertifikatsvertrauen)
 * 2) Ermittelt automatisch das erste Produkt und die erste Collection
 *    aus dem Shop via /products.json und /collections.json
 * 3) Speichert die Werte in playwright/.auth/discovered.json,
 *    von wo tests/fixtures.ts sie zur Laufzeit liest
 * 4) Persistiert die Storefront-Session als storageState (Browser-Specs nutzen sie)
 */
export const STORE_BASE = "https://dev-store-4ogqgshg.myshopify.com";

export async function storefrontLogin(baseURL: string = STORE_BASE) {
  const context = await request.newContext({ baseURL });
  const password = process.env.SHOPIFY_STOREFRONT_PASSWORD;
  if (!password) return context;

  try {
    const res = await context.get("/password");
    const html = await res.text();
    const token = html.match(/name="authenticity_token" value="([^"]+)"/)?.[1];
    if (/<form[^>]+action="\/password"/.test(html)) {
      await context.post("/password", {
        form: {
          form_type: "storefront_password",
          utf8: "✓",
          password,
          ...(token ? { authenticity_token: token } : {}),
        },
        maxRedirects: 0,
      });
    }
    const check = await context.get("/");
    if (/<form[^>]+action="\/password"/.test(await check.text())) {
      console.warn("Storefront-Login fehlgeschlagen (Status " + check.status() + ") – Specs loggen sich bei Bedarf neu ein.");
    }
  } catch (e) {
    console.warn("Storefront-Login uebersprungen:", (e as Error).message);
  }
  return context;
}

export default async function globalSetup(_config: FullConfig) {
  const authDir = path.resolve("playwright/.auth");
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const context = await storefrontLogin();

  // Auto-Discovery: erstes Produkt und erste Collection
  const discovered: {
    productHandle: string | null;
    collectionHandle: string | null;
    firstVariantId: number | null;
  } = {
    productHandle: null,
    collectionHandle: null,
    firstVariantId: null,
  };

  try {
    const res = await context.get("/products.json?limit=1");
    if (res.ok()) {
      const data = await res.json();
      const first = data.products?.[0];
      if (first) {
        discovered.productHandle = first.handle;
        discovered.firstVariantId = first.variants?.[0]?.id ?? null;
      }
    }
  } catch (e) {
    console.warn("Produkt-Discovery uebersprungen:", (e as Error).message);
  }

  try {
    const res = await context.get("/collections.json?limit=1");
    if (res.ok()) {
      const data = await res.json();
      const first = data.collections?.[0];
      if (first) {
        discovered.collectionHandle = first.handle;
      }
    }
  } catch (e) {
    console.warn("Collection-Discovery uebersprungen:", (e as Error).message);
  }

  fs.writeFileSync(path.join(authDir, "discovered.json"), JSON.stringify(discovered, null, 2));
  console.log("Discovered fixtures:", JSON.stringify(discovered));

  await context.storageState({ path: path.join(authDir, "storefront.json") });
  await context.dispose();
}
