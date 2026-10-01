# CLAUDE.md – Shopify Theme

> Diese Datei wird bei jeder Claude-Code-Session automatisch geladen.
> Sie ist das Gedächtnis des Projekts: Architektur, Konventionen und vor allem
> der Abhängigkeits-Log, damit Claude beim Bauen eines Teils weiß, was später
> daran hängt.

---

## ⚠️ MEMORY-PFLEGE – IMMER BEFOLGEN

Diese Regel hat hohe Priorität. Befolge sie bei JEDER Code-Änderung.

**Nach jedem implementierten oder geänderten Feature gilt:**

1. Prüfe, ob das Feature mit anderen Theme-Teilen zusammenhängt
   (Kundenkonto, Metafields, Header, Cart, Checkout, Routes, globale JS/CSS).
2. Falls ja: trage es SOFORT unter `## Architektur & Abhängigkeiten` ein –
   bevor du die Aufgabe als erledigt meldest.
3. Aktualisiere bestehende Einträge, wenn sich eine Abhängigkeit ändert.
   Lösche nichts, was noch im Code aktiv ist.
4. Pro Eintrag dokumentierst du AUSFÜHRLICH:
   - **Feature** – Name
   - **Dateien** – betroffene Sections/Snippets/Assets (mit Pfad)
   - **Hängt an** – Objekte, Metafields, Routes, globale Funktionen
   - **Wird genutzt von** – welche anderen Teile darauf zugreifen (müssen)
   - **Offen / To-do** – noch fehlende Anbindungen oder Risiken
   - **Stand** – Datum der letzten Änderung
5. Wenn etwas eine spätere Anbindung erfordert, die noch nicht existiert,
   notiere sie unter `## Offene Abhängigkeiten (To-do)`, damit sie nicht
   vergessen wird.

Bei Unsicherheit, ob etwas eingetragen werden soll: lieber eintragen.

---

## Projekt-Überblick

- **Plattform:** Shopify (Online Store 2.0 / Liquid)
- **Theme-Basis:** Shopify Skeleton, umgebaut zum Custom-Theme „Modern Art" (v1.0.0)
- **Zweck / Shop:** Shop einer Künstlerin/eines Künstlers für moderne Kunst: Ausstellungs-Ankündigungen,
  Verkauf von Originalen/Editionen, virtueller CSS-3D-Showroom. Design „White Cube trifft Fluid":
  ruhige Galerie-Basis, „funky" nur über Akzente (Blobs, atmende Typo, Bauhaus-Formen, Cursor).
- **Sprachen:** EN (`*.default.json`) + DE (`de.json`, `de.schema.json`) – jeder Key in beiden.

## Konventionen

- CSS wird pro Section gescoped (keine globalen Klassen-Kollisionen).
- Keine Inline-Styles.
- Snippets für wiederverwendbare Bausteine, Sections für Seitenblöcke.
- Kundengebundene Daten laufen über `customer.metafields` (Namespace unten notieren).
- Dynamische Werte (Farben, Werkgrößen) nur per `{% style %}` mit `#shopify-section-…`/Element-ID-Selektoren
  oder Custom Properties – nie `style=""` im Markup. Statisches CSS in `assets/*.css` bzw. `{% stylesheet %}` (ohne Liquid).
- Farben nur über Tokens (`--color-*`) aus den Color-Schemes; Akzent 2/3 (Koralle/Senf) nie als Textfarbe.
- Jede Animation muss bei `prefers-reduced-motion` und bei `body.motion-off` (Setting) aus sein.
- JS nur als kleine Custom Elements/IIFEs in `assets/`, mit `defer`, Progressive Enhancement (Grundfunktion ohne JS).
- Liquid/JS/CSS nie per Bash-Heredoc schreiben (`!`-Falle, siehe shopify-liquid-Skill).
- QA-Gate pro Änderung: `shopify theme check` (0 Errors) → `npm run qa:translations` → Push ins QA-Theme
  (`npm run theme:push:dev`) → `npm run qa:http`. Browser-Specs (`npm run qa:browser`) lokal/CI vor dem Merge.

---

## Architektur & Abhängigkeiten

> Der zentrale Abhängigkeits-Log. Hier trägt Claude laufend ein,
> welches Feature mit welchem zusammenhängt (siehe Memory-Pflege-Regel oben).

### Wishlist / Favoriten
- **Dateien:**
  - `snippets/wishlist-button.liquid` (Button auf der Produkt-Detailseite)
  - <!-- ggf. assets/wishlist.js, snippets/wishlist-counter.liquid -->
- **Hängt an:**
  - `customer` object (nur eingeloggte Kunden)
  - Metafield: `customer.metafields.custom.wishlist` <!-- Namespace/Key prüfen/ergänzen -->
- **Wird genutzt von:**
  - **Header** → Wishlist-Counter liest dasselbe Metafield
  - **Account-Seite** → zeigt gespeicherte Favoriten an
- **Offen / To-do:**
  - Header-Counter noch anbinden
  - Verhalten für nicht-eingeloggte Besucher klären (Login-Prompt vs. lokal)
- **Stand:** <!-- Datum -->

### Designsystem, globale Tokens & Layout
- **Dateien:**
  - `config/settings_schema.json` (Color-Scheme-Gruppe `color_schemes`, Schriften, Bewegung, Shop, Social/Rechtliches)
  - `config/settings_data.json` (scheme-1 hell, scheme-2 dunkel/Footer, scheme-3 Karte)
  - `snippets/css-variables.liquid` (Font-Faces, `:root`-Tokens, `.color-<scheme-id>`-Regeln)
  - `layout/theme.liquid` (Skip-Link, `<main id="MainContent">`, `body.motion-off`, Font-Preload, `cursor.js`)
  - `assets/base.css` (Buttons, Pills, Formulare, Blobs, Rotations-Badge, Cursor, Reveal, Reduced-Motion)
  - `assets/cursor.js` (Cursor-Begleiter; reagiert auf `[data-cursor-label]`)
  - `assets/syne-*.woff2`, `assets/dm-sans-*.woff2` + `licenses/OFL-*.txt` (selbst gehostete OFL-Schriften)
- **Hängt an:** Theme-Settings `use_bundled_fonts`, `type_heading_font`, `type_primary_font`, `color_schemes`,
  `enable_animations`, `enable_cursor_effect`, `max_page_width`, `min_page_margin`, `input_corner_radius`.
- **Wird genutzt von:** allen Sections/Snippets (Tokens `--color-*`, `--font-*`, `--radius-*`, `--ease`,
  `--space-section`, Klassen `.btn`, `.pill`, `.eyebrow`, `.section-title`, `.color-scheme`, `.media-mat`);
  `critical.css`, `blocks/group.liquid`, `blocks/text.liquid`, `sections/collections.liquid` nutzen
  `--color-background/--color-foreground/--page-*` (Namen deshalb nie umbenennen).
  Sections setzen `class="color-scheme color-{{ section.settings.color_scheme.id }}"`.
- **Offen / To-do:** –
- **Stand:** 2026-10-01

### QA-Infrastruktur & Demo-Daten (Dev-Store)
- **Dateien:** `scripts/seed-dev-store.mjs` (Demo-Werke/Kollektion/Seiten/Menüs, `--remove`),
  `scripts/check-translations.mjs`, `tests/global-setup.ts` (Passwort-Login per HTTP), `tests/http.ts`
  (`loadHtml`: Server-HTML laden, im Browser nur parsen), `tests/ma.ts` (feste Demo-Handles), `tests/*.spec.ts`
  (Tags `@http` = Gate in der Cloud-Sandbox, `@browser` = Verhalten, lokal/CI), `shopify.theme.toml` (QA-Theme
  „Modern Art QA" 164205035635, unveröffentlicht).
- **Hängt an:** Env `SHOPIFY_CLI_THEME_TOKEN`, `SHOPIFY_STOREFRONT_PASSWORD`, `SHOPIFY_STORE_URL`,
  `SHOPIFY_ADMIN_TOKEN`; Demo-Objekte mit Präfix `ma-` und Tag `modern-art-demo` im geteilten Dev-Store.
- **Wird genutzt von:** allen Specs; Demo-Seiten nutzen die Templates `page.exhibitions`, `page.showroom`, `page.about`.
- **Offen / To-do:** `package.json`-devDependencies sind kaputt (`@shopify/theme@^3.66.0` existiert nicht) –
  `npm install` scheitert; Playwright separat installieren oder Abhängigkeiten reparieren.
- **Stand:** 2026-10-01

### Header & Footer
- **Dateien:** `sections/header.liquid` + `assets/section-header.css`, `sections/footer.liquid` +
  `assets/section-footer.css`, `sections/header-group.json`, `sections/footer-group.json`
- **Hängt an:** Menüs per `link_list` (Dev-Store: `ma-hauptmenue`, `ma-footer`; Fallback `main-menu`/`footer`),
  `shop.policies`, Theme-Settings `imprint_page`, `social_*`, `cart.item_count`, `<shopify-account>`.
- **Wird genutzt von:** Warenkorb-Zähler `[data-cart-count]` + `[data-cart-count-label]` werden von
  `assets/art-buy-box.js` nach AJAX-Add aktualisiert (IDs sind in Section-Gruppen dynamisch → nur Data-Attribute nutzen).
  Mobile Navigation = `<details scroll-lock>` (Scroll-Sperre über `critical.css`).
- **Offen / To-do:** Im Live-Shop Menüs im Theme-Editor wählen (Header-Gruppe zeigt im Repo auf `ma-hauptmenue`).
  Newsletter ist standardmäßig aus – vor dem Einschalten Double-Opt-in + Datenschutzerklärung prüfen.
- **Stand:** 2026-10-01

### Kunstwerk-Bausteine & Kaufbox
- **Dateien:** `snippets/artwork-meta.liquid` (Jahr · Technik · Maße, `format: 'facts'` als `<dl>`),
  `snippets/artwork-card.liquid` + `assets/component-artwork.css`, `snippets/art-buy-box.liquid` +
  `assets/art-buy-box.js` (Custom Element `<art-buy-box>`) + `assets/component-buy-box.css`,
  `snippets/price-note.liquid` (Preis-Hinweis nach Theme-Setting `tax_note_mode`).
- **Hängt an:** Produkt-Metafelder `art.*` (siehe Tabelle unten), `product.available`,
  `variant.inventory_management/inventory_policy/inventory_quantity`, AJAX Cart API (`cart/add.js`, `cart.js`),
  `shop.shipping_policy`, Theme-Settings `tax_note_mode`, `shipping_note_fallback`.
- **Wird genutzt von:** `sections/product.liquid`, `sections/collection.liquid`, `sections/cart.liquid`,
  Showroom (Dialog nutzt `art-buy-box` mit `context: 'dialog'`), Startseite (Featured Works).
  Zustände `data-state`: `sold` (nicht verfügbar → bleibt sichtbar), `request` (`art.price_on_request` →
  kein Preis, Kontaktformular `#ArtInquiry` nur auf der Produktseite), `edition` (`art.edition_size` > 1,
  Mengenfeld, `max` nur bei Policy DENY), `unique` (Menge fix 1).
- **Offen / To-do:** Unikate brauchen erfassten Bestand 1 + „Nicht verkaufen, wenn ausverkauft" (DENY), sonst
  greift die 422-Prüfung nicht. „Preis auf Anfrage"-Werke sind technisch weiter kaufbar (z. B. per URL) →
  immer realistischen Preis pflegen, nie 0/1; der Warenkorb markiert solche Zeilen. Mehrere Varianten pro Werk
  werden nicht unterstützt (immer `selected_or_first_available_variant`).
- **Stand:** 2026-10-01

### Produktseite, Shop/Kollektion & Warenkorb
- **Dateien:** `sections/product.liquid` + `assets/section-product.css` (Größenvergleich per Radio-Buttons ohne JS,
  Blöcke `collapsible` + `@app`), `templates/product.json`; `sections/collection.liquid` +
  `assets/section-collection.css` + `assets/shop-filters.js`; `sections/collections.liquid`;
  `sections/cart.liquid` + `assets/section-cart.css`.
- **Hängt an:** `collection.filters` (Search & Discovery), `collection.sort_options`, `paginate`, `cart.items`,
  `art.edition_size` (Unikat ohne Mengenfeld), `art.price_on_request` (Warnhinweis), `routes.*`.
- **Wird genutzt von:** Header-Menü „Shop" → Kollektion; „Weitere Werke" nutzt `product.collections.first`.
- **Offen / To-do:** Filter Technik/Jahr in Search & Discovery freischalten (Metafelder `art.medium`, `art.year`).
- **Stand:** 2026-10-01

### Ausstellungen
- **Dateien:** `sections/exhibitions.liquid`, `snippets/exhibition-item.liquid`, `assets/section-exhibitions.css`,
  `templates/page.exhibitions.json` (Section-Key `main`, Demo-Einträge).
- **Hängt an:** Section-Blöcke `exhibition` (Datum als Text JJJJ-MM-TT, streng validiert; ungültig → „Termin folgt"),
  `'now' | date`, Locale-Datumsformate `exhibitions.date_format(_short)`; Seite mit Template-Suffix `exhibitions`.
- **Wird genutzt von:** Header-Menü; Startseiten-Laufband/Teaser zeigen Termine **nicht automatisch** – deren
  Texte werden separat in der Startseite gepflegt (Blöcke einer anderen Vorlage sind nicht lesbar).
- **Offen / To-do:** Einordnung „läuft/kommend/vergangen" kann durch Seiten-Caching kurz verzögert sein.
  Demo-Einträge im Template vor dem Livegang ersetzen.
- **Stand:** 2026-10-01

<!--
VORLAGE für neue Einträge – kopieren und ausfüllen:

### <Feature-Name>
- **Dateien:** <Pfade>
- **Hängt an:** <Objekte / Metafields / Routes / globale Funktionen>
- **Wird genutzt von:** <welche anderen Teile darauf zugreifen>
- **Offen / To-do:** <fehlende Anbindungen, Risiken>
- **Stand:** <Datum>
-->

---

## Offene Abhängigkeiten (To-do)

> Geplante Verbindungen, die noch nicht im Code existieren.
> Claude trägt hier ein, was später noch verdrahtet werden muss.

- [ ] Header: Wishlist-Counter an `customer.metafields.custom.wishlist` anbinden

---

## Metafields & Namespaces (Referenz)

| Namespace.Key | Typ | Verwendung |
|---|---|---|
| `custom.wishlist` | list / json | Gespeicherte Favoriten pro Kunde |
| `art.year` | number_integer | Entstehungsjahr (Werk-Meta, Filter) |
| `art.medium` | single_line_text_field | Technik, z. B. „Acryl auf Leinwand" (Werk-Meta, Filter) |
| `art.width_cm` / `art.height_cm` / `art.depth_cm` | number_decimal | Maße in cm (Meta H × B × T, Größenvergleich, Showroom-Skalierung) |
| `art.edition_size` | number_integer | Auflage; leer/1 = Unikat, > 1 = Edition (verfügbare Anzahl = Bestand) |
| `art.price_on_request` | boolean | Preis + Warenkorb ausblenden, Anfrageformular zeigen |
| `art.shipping_note` | single_line_text_field | Versandhinweis pro Werk (Fallback: Theme-Setting) |
| <!-- weitere --> | | |
