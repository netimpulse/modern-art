import type { APIRequestContext } from "@playwright/test";
import { withTheme } from "./fixtures";

/**
 * Demo content created by scripts/seed-dev-store.mjs (all handles prefixed "ma-").
 * The generic auto-discovery in global-setup would pick unrelated products of the
 * shared dev store, so the theme specs use these fixed handles instead.
 */
export const MA = {
  collection: "ma-kunstwerke",
  products: {
    unique: "ma-farbraum-i",
    uniqueSold: "ma-lautes-blau",
    edition: "ma-neon-garten",
    editionLarge: "ma-formenspiel-no-7",
    editionSoldOut: "ma-blauer-faden",
    priceOnRequest: "ma-grosses-rauschen",
    noDimensions: "ma-kleine-skizze",
    largest: "ma-grosses-rauschen",
    smallest: "ma-blauer-faden",
  },
  paths: {
    home: "/",
    shop: "/collections/ma-kunstwerke",
    exhibitions: "/pages/ma-ausstellungen",
    showroom: "/pages/ma-showroom",
    about: "/pages/ma-ueber-mich",
    cart: "/cart",
    search: "/search?q=farbe",
    notFound: "/pages/ma-gibt-es-nicht",
  },
};

export function productPath(handle: string): string {
  return `/products/${handle}`;
}

/** First variant ID of a product, read from the storefront product JSON. */
export async function variantId(request: APIRequestContext, handle: string): Promise<number> {
  const res = await request.get(withTheme(`/products/${handle}.js`));
  if (!res.ok()) throw new Error(`product ${handle}: HTTP ${res.status()}`);
  const data = await res.json();
  return data.variants[0].id;
}
