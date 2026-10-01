#!/usr/bin/env node
/**
 * Seeds the shared dev store with demo content for the modern-art theme.
 *
 * Idempotent: every object is looked up by handle (prefix `ma-`) and only
 * created or updated when needed. Never touches content without that prefix.
 *
 * Requires env vars (never commit their values):
 *   SHOPIFY_STORE_URL   e.g. https://example.myshopify.com
 *   SHOPIFY_ADMIN_TOKEN Admin API access token
 * Optional:
 *   SEED_IMAGE_DIR      folder with <slug>.jpg demo images (skips upload if missing)
 *
 * Usage: node scripts/seed-dev-store.mjs
 */
import fs from "node:fs";
import path from "node:path";

const API_VERSION = "2026-07";
const PREFIX = "ma-";
const TAG = "modern-art-demo";

const store = (process.env.SHOPIFY_STORE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const token = process.env.SHOPIFY_ADMIN_TOKEN;
if (!store || !token) {
  console.error("SHOPIFY_STORE_URL and SHOPIFY_ADMIN_TOKEN must be set.");
  process.exit(1);
}
const imageDir = process.env.SEED_IMAGE_DIR || "";

async function gql(query, variables = {}) {
  const res = await fetch(`https://${store}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

function userErrors(payload, label) {
  const errs = payload?.userErrors || [];
  if (errs.length) throw new Error(`${label}: ${JSON.stringify(errs)}`);
}

async function publish(id, publicationId, label) {
  const res = await gql(
    `mutation($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { field message } } }`,
    { id, input: [{ publicationId }] }
  );
  userErrors(res.publishablePublish, `publish ${label}`);
}

/* ---------- Metafield definitions (namespace art) ---------- */

const DEFINITIONS = [
  { key: "year", name: "Jahr", type: "number_integer" },
  { key: "medium", name: "Technik", type: "single_line_text_field" },
  { key: "width_cm", name: "Breite (cm)", type: "number_decimal" },
  { key: "height_cm", name: "Höhe (cm)", type: "number_decimal" },
  { key: "depth_cm", name: "Tiefe (cm)", type: "number_decimal" },
  { key: "edition_size", name: "Auflage (leer/1 = Unikat)", type: "number_integer" },
  { key: "price_on_request", name: "Preis auf Anfrage", type: "boolean" },
  { key: "shipping_note", name: "Versandhinweis", type: "single_line_text_field" },
];

async function ensureDefinitions() {
  const data = await gql(`{ metafieldDefinitions(ownerType: PRODUCT, namespace: "art", first: 50) { nodes { key } } }`);
  const existing = new Set(data.metafieldDefinitions.nodes.map((n) => n.key));
  for (const def of DEFINITIONS) {
    if (existing.has(def.key)) continue;
    const res = await gql(
      `mutation($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) { createdDefinition { id } userErrors { field message code } }
      }`,
      {
        definition: {
          name: def.name,
          namespace: "art",
          key: def.key,
          type: def.type,
          ownerType: "PRODUCT",
          access: { storefront: "PUBLIC_READ" },
        },
      }
    );
    userErrors(res.metafieldDefinitionCreate, `definition ${def.key}`);
    console.log(`definition art.${def.key} created`);
  }
}

/* ---------- Demo artworks ---------- */

const ARTWORKS = [
  { slug: "farbraum-i", title: "Farbraum I", price: "2400.00", year: 2025, medium: "Acryl auf Leinwand", w: 100, h: 120, d: 3, qty: 1,
    text: "Drei Farbflächen ringen um den Vordergrund. Ein pinker Schwung hält sie gerade noch zusammen." },
  { slug: "lautes-blau", title: "Lautes Blau", price: "1850.00", year: 2024, medium: "Öl auf Leinwand", w: 80, h: 80, d: 2, qty: 0,
    text: "Konzentrische Blautöne, die man fast hören kann. Bereits in einer Privatsammlung." },
  { slug: "kreisverkehr", title: "Kreisverkehr", price: "690.00", year: 2026, medium: "Mischtechnik auf Papier", w: 50, h: 70, qty: 1,
    text: "Sechs Kreise auf dem Weg nach unten – eine Studie über Bewegung und Gleichgewicht." },
  { slug: "neon-garten", title: "Neon Garten", price: "280.00", year: 2025, medium: "Siebdruck, 5 Farben", w: 50, h: 70, qty: 7, edition: 10,
    text: "Ein nächtlicher Garten in Leuchtfarben. Handgedruckt, signiert und nummeriert." },
  { slug: "gelbe-pause", title: "Gelbe Pause", price: "1200.00", year: 2023, medium: "Acryl auf Holz", w: 60, h: 90, d: 4, qty: 1,
    text: "Ein schwarzer Balken, ein weißes Fenster, ein roter Punkt – und sehr viel Gelb." },
  { slug: "formenspiel-no-7", title: "Formenspiel No. 7", price: "140.00", year: 2026, medium: "Giclée-Druck auf Büttenpapier", w: 40, h: 50, qty: 18, edition: 25,
    text: "Dreieck, Kreis und Quadrat verhandeln ihren Platz. Edition von 25, signiert." },
  { slug: "grosses-rauschen", title: "Großes Rauschen", price: "9800.00", year: 2026, medium: "Acryl und Sprühfarbe auf Leinwand", w: 160, h: 200, d: 4, qty: 1, onRequest: true,
    shipping: "Versand in Holzkiste, Lieferung nach Absprache",
    text: "Das größte Werk der Serie: hunderte Linien, die zusammen ein Rauschen ergeben." },
  { slug: "mitternachtszitrone", title: "Mitternachtszitrone", price: "1650.00", year: 2025, medium: "Öl auf Leinwand", w: 70, h: 100, d: 2, qty: 1,
    text: "Eine Zitrone als Mond über violettem Horizont. Sauer macht lustig." },
];

async function getLocationAndPublication() {
  const data = await gql(`{ locations(first: 1) { nodes { id } } publications(first: 20) { nodes { id name } } }`);
  const locationId = data.locations.nodes[0]?.id;
  const publicationId = data.publications.nodes.find((p) => p.name === "Online Store")?.id;
  if (!locationId || !publicationId) throw new Error("location or Online Store publication not found");
  return { locationId, publicationId };
}

async function uploadImage(slug) {
  if (!imageDir) return null;
  const file = path.join(imageDir, `${slug}.jpg`);
  if (!fs.existsSync(file)) return null;
  const buf = fs.readFileSync(file);
  const res = await gql(
    `mutation($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } }
    }`,
    { input: [{ filename: `${PREFIX}${slug}.jpg`, mimeType: "image/jpeg", httpMethod: "POST", resource: "IMAGE", fileSize: String(buf.length) }] }
  );
  userErrors(res.stagedUploadsCreate, "stagedUploadsCreate");
  const target = res.stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([buf], { type: "image/jpeg" }), `${PREFIX}${slug}.jpg`);
  const up = await fetch(target.url, { method: "POST", body: form });
  if (!up.ok) throw new Error(`upload ${slug} failed: HTTP ${up.status}`);
  return target.resourceUrl;
}

function metafieldsFor(a) {
  const mf = [
    { namespace: "art", key: "year", type: "number_integer", value: String(a.year) },
    { namespace: "art", key: "medium", type: "single_line_text_field", value: a.medium },
    { namespace: "art", key: "width_cm", type: "number_decimal", value: String(a.w) },
    { namespace: "art", key: "height_cm", type: "number_decimal", value: String(a.h) },
  ];
  if (a.d) mf.push({ namespace: "art", key: "depth_cm", type: "number_decimal", value: String(a.d) });
  if (a.edition) mf.push({ namespace: "art", key: "edition_size", type: "number_integer", value: String(a.edition) });
  if (a.onRequest) mf.push({ namespace: "art", key: "price_on_request", type: "boolean", value: "true" });
  if (a.shipping) mf.push({ namespace: "art", key: "shipping_note", type: "single_line_text_field", value: a.shipping });
  return mf;
}

async function ensureProduct(a, { locationId, publicationId }) {
  const handle = `${PREFIX}${a.slug}`;
  const found = await gql(`query($h: String!) { productByIdentifier(identifier: { handle: $h }) { id } }`, { h: handle });
  if (found.productByIdentifier) {
    // Create-only: re-runs never overwrite edits made in the admin.
    await publish(found.productByIdentifier.id, publicationId, `product ${handle}`);
    console.log(`product ${handle} exists`);
    return found.productByIdentifier.id;
  }

  const input = {
    title: a.title,
    handle,
    descriptionHtml: `<p>${a.text}</p>`,
    productType: "Kunstwerk",
    vendor: "Studio Demo",
    tags: [TAG, a.edition ? "Edition" : "Unikat"],
    status: "ACTIVE",
    metafields: metafieldsFor(a),
    productOptions: [{ name: "Title", values: [{ name: "Default Title" }] }],
    variants: [
      {
        optionValues: [{ optionName: "Title", name: "Default Title" }],
        price: a.price,
        inventoryPolicy: "DENY",
        inventoryItem: { tracked: true, requiresShipping: true },
        inventoryQuantities: [{ locationId, name: "available", quantity: a.qty }],
      },
    ],
  };

  const src = await uploadImage(a.slug);
  if (src) input.files = [{ originalSource: src, contentType: "IMAGE", alt: `${a.title}, ${a.medium}, ${a.year}` }];

  const res = await gql(
    `mutation($input: ProductSetInput!) {
      productSet(input: $input, synchronous: true) { product { id handle } userErrors { field message code } }
    }`,
    { input }
  );
  userErrors(res.productSet, `productSet ${handle}`);
  const id = res.productSet.product.id;
  await publish(id, publicationId, `product ${handle}`);
  console.log(`product ${handle} created`);
  return id;
}

/* ---------- Collection ---------- */

async function ensureCollection(productIds, { publicationId }) {
  const handle = `${PREFIX}kunstwerke`;
  const found = await gql(`query($h: String!) { collectionByIdentifier(identifier: { handle: $h }) { id } }`, { h: handle });
  let id = found.collectionByIdentifier?.id;
  if (!id) {
    const res = await gql(
      `mutation($input: CollectionInput!) { collectionCreate(input: $input) { collection { id } userErrors { field message } } }`,
      { input: { title: "Kunstwerke", handle, descriptionHtml: "<p>Originale, Unikate und limitierte Editionen.</p>", sortOrder: "MANUAL" } }
    );
    userErrors(res.collectionCreate, "collectionCreate");
    id = res.collectionCreate.collection.id;
    console.log(`collection ${handle} created`);
  }
  const members = await gql(`query($id: ID!) { collection(id: $id) { products(first: 100) { nodes { id } } } }`, { id });
  const have = new Set(members.collection.products.nodes.map((n) => n.id));
  const missing = productIds.filter((p) => !have.has(p));
  if (missing.length) {
    const res = await gql(
      `mutation($id: ID!, $productIds: [ID!]!) { collectionAddProducts(id: $id, productIds: $productIds) { userErrors { field message } } }`,
      { id, productIds: missing }
    );
    userErrors(res.collectionAddProducts, "collectionAddProducts");
  }
  await publish(id, publicationId, "collection");
  return id;
}

/* ---------- Pages ---------- */

const PAGES = [
  { handle: `${PREFIX}ausstellungen`, title: "Ausstellungen", templateSuffix: "exhibitions", body: "" },
  { handle: `${PREFIX}showroom`, title: "Virtueller Showroom", templateSuffix: "showroom", body: "" },
  {
    handle: `${PREFIX}ueber-mich`,
    title: "Über mich",
    templateSuffix: null,
    body: "<p>Ich male laut. Farbe ist für mich kein Dekor, sondern Haltung – jedes Bild beginnt mit einer Fläche, die stört, und endet, wenn alles im Gleichgewicht wackelt.</p><p>Studio in Berlin-Wedding. Ausstellungen in Berlin, Leipzig und Wien.</p>",
  },
];

async function ensurePages() {
  const ids = {};
  for (const p of PAGES) {
    const found = await gql(`query($q: String!) { pages(first: 1, query: $q) { nodes { id handle } } }`, { q: `handle:${p.handle}` });
    const existing = found.pages.nodes.find((n) => n.handle === p.handle);
    if (existing) {
      ids[p.handle] = existing.id;
      continue;
    }
    const res = await gql(
      `mutation($page: PageCreateInput!) { pageCreate(page: $page) { page { id } userErrors { field message code } } }`,
      { page: { title: p.title, handle: p.handle, body: p.body, templateSuffix: p.templateSuffix, isPublished: true } }
    );
    userErrors(res.pageCreate, `pageCreate ${p.handle}`);
    ids[p.handle] = res.pageCreate.page.id;
    console.log(`page ${p.handle} created`);
  }
  return ids;
}

/* ---------- Menu ---------- */

async function ensureMenu(collectionId, pageIds) {
  const handle = `${PREFIX}hauptmenue`;
  const found = await gql(`{ menus(first: 50) { nodes { id handle } } }`);
  if (found.menus.nodes.some((m) => m.handle === handle)) return;
  const items = [
    { title: "Ausstellungen", type: "PAGE", resourceId: pageIds[`${PREFIX}ausstellungen`] },
    { title: "Shop", type: "COLLECTION", resourceId: collectionId },
    { title: "Showroom", type: "PAGE", resourceId: pageIds[`${PREFIX}showroom`] },
    { title: "Über mich", type: "PAGE", resourceId: pageIds[`${PREFIX}ueber-mich`] },
  ];
  const res = await gql(
    `mutation($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
      menuCreate(title: $title, handle: $handle, items: $items) { menu { id } userErrors { field message } }
    }`,
    { title: "Modern Art Hauptmenü", handle, items }
  );
  userErrors(res.menuCreate, "menuCreate");
  console.log(`menu ${handle} created`);
}

/* ---------- Run ---------- */

const ctx = await getLocationAndPublication();
await ensureDefinitions();
const productIds = [];
for (const a of ARTWORKS) productIds.push(await ensureProduct(a, ctx));
const collectionId = await ensureCollection(productIds, ctx);
const pageIds = await ensurePages();
await ensureMenu(collectionId, pageIds);
console.log("seed complete");
