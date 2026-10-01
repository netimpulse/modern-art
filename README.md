# Modern Art – Shopify-Theme

Theme für den Verkauf moderner Kunst: **Ausstellungen** (Ankündigungen + Archiv), **Shop** (Originale,
Editionen, „Verkauft“, „Preis auf Anfrage“) und ein **virtueller CSS-3D-Showroom**. Design „White Cube trifft
Fluid“: ruhige Galerie, funky Akzente (Blobs, atmende Schrift, Bauhaus-Formen). Basis: Shopify Skeleton.
Architektur und Abhängigkeiten stehen in `CLAUDE.md`.

## Livegang – Checkliste

1. **Metafeld-Definitionen** für Kunstwerke anlegen (Namespace `art`, mit Storefront-Zugriff):
   `year`, `medium`, `width_cm`, `height_cm`, `depth_cm`, `edition_size`, `price_on_request`, `shipping_note`.
   Entweder im Admin (Einstellungen → Benutzerdefinierte Daten → Produkte) oder per
   `node scripts/seed-dev-store.mjs --definitions-only` (legt nur die Definitionen an, keine Demo-Inhalte;
   braucht `SHOPIFY_STORE_URL` und `SHOPIFY_ADMIN_TOKEN` des Shops).
2. **Werke pflegen:** je Werk ein Produkt mit einer Variante. Unikate: Bestand 1 erfassen und „Nicht verkaufen,
   wenn ausverkauft“. Editionen: `edition_size` = Auflage, Bestand = noch verfügbare Exemplare.
   „Preis auf Anfrage“: trotzdem einen realistischen Preis hinterlegen (nie 0/1).
3. **Seiten anlegen:** „Ausstellungen“ (Vorlage `page.exhibitions`), „Showroom“ (`page.showroom`),
   „Über mich“ (`page.about`); Impressum als Seite und unter Theme-Einstellungen → Social Media & Rechtliches wählen.
4. **Im Theme-Editor wählen:** Menüs in Kopf- und Fußzeile, Kollektion im Showroom und bei „Ausgewählte Werke“,
   Werk im Hero, Seiten in den Teasern (die Vorlagen zeigen auf Demo-Handles `ma-…` des Dev-Stores).
   Ausstellungen als Blöcke eintragen (Datum im Format JJJJ-MM-TT); Hero-Termine und Laufband separat pflegen.
5. **Filter:** in der App „Search & Discovery“ Verfügbarkeit, Preis, Technik (`art.medium`), Jahr (`art.year`) aktivieren.
6. **Preis-Hinweis** unter Theme-Einstellungen → Shop wählen (inkl. MwSt. oder § 19 UStG – mit der Steuerberatung klären).
7. **Newsletter** (Fußzeile) erst nach Double-Opt-in und Datenschutzhinweis einschalten.

## QA

```bash
npm run theme:check            # Theme Check
npm run qa:translations        # alle Übersetzungsschlüssel in EN + DE vorhanden
npm run theme:push:dev         # ins unveröffentlichte QA-Theme
npm run qa:http                # serverseitige Checks (laufen auch in der Cloud-Sandbox)
npm run qa:http:cart           # Warenkorb-Mutation, separat und zuletzt (Shopify-Bot-Schutz)
npm run qa:browser             # Verhalten im echten Browser – lokal/CI, vor dem Merge Pflicht
npm run seed:dev               # Demo-Daten im Dev-Store (Präfix ma-), --remove räumt auf
```

---

# Shopify Theme Template (Basis)

Template-Repo fuer neue Shopify-Themes mit integriertem Visual-QA-Workflow
(Shopify CLI + Playwright). Ein Repo = ein Theme = ein Shop.

## Was hier drin ist

- `package.json` – Dependencies & npm-Scripts
- `playwright.config.ts` – Test-Runner Konfiguration mit hardcoded Preview-URL
- `tests/_base.spec.ts` – Generische Visual-Tests, die fuer jeden Block laufen
- `templates/page.qa-block-test.json` – QA-Page Inhalt (wird von Claude pro Block ueberschrieben)
- `shopify.theme.toml` – Shopify CLI Config mit Dev-/Prod-Environments
- `.gitignore`, `.env.example` – Standard-Boilerplate
- `ignore`-Block in `shopify.theme.toml` – verhindert, dass QA-Dateien beim Production-Push landen

Skeleton-Theme-Dateien (sections, snippets, layout, assets) werden ueber den
`/neuer-shop` Skill oder per Hand ergaenzt.

## Erstes Setup eines neuen Repos

1. Repo aus diesem Template anlegen (GitHub: "Use this template")
2. Skeleton-Theme reinkopieren bzw. mergen
3. Dependencies installieren:
   ```bash
   npm install
   npx playwright install chromium
   ```
4. Shopify CLI authentifizieren (Token aus Theme Access App):
   ```bash
   export SHOPIFY_CLI_THEME_TOKEN=shptka_xxx
   ```
5. Erstes Push als unpublished Theme:
   ```bash
   npm run theme:push:dev
   ```
   Theme-ID aus der CLI-Ausgabe merken.
6. Theme-ID einsetzen in:
   - `shopify.theme.toml` -> `theme = "..."`
   - `playwright.config.ts` -> `preview_theme_id=...` (Platzhalter `__THEME_ID__` ersetzen)

## Im Dev-Store einmalig pro Theme

Damit Playwright eine echte URL ansprechen kann, muss die QA-Page existieren:

1. Online Store -> Pages -> "QA Block Test" anlegen
2. Theme-Template auf `qa-block-test` setzen (rechte Seitenleiste)
3. Page veroeffentlichen

## QA-Workflow pro Block

```bash
# 1) Code-Aenderung commiten
# 2) Theme pushen (aktualisiert das Dev-Theme im Store)
shopify theme push -e development

# 3) Komplett-Check
npm run qa:full
```

`qa:full` laeuft `theme check` + Playwright Tests.

## Production-Push

In `shopify.theme.toml` den Production-Block ausfuellen, dann:

```bash
shopify theme push -e production
```

Der `ignore`-Block sorgt dafuer, dass weder QA-Templates noch Tests ins
Production-Theme uebertragen werden.
