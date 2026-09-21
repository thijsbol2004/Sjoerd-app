# CLAUDE.md — Sjoerd-app

## Wat dit is

PWA (puur HTML/CSS/JS, geen backend) om de score bij te houden van het kaartspel Sjoerd. Live op https://thijsbol2004.github.io/Sjoerd-app/, repo [thijsbol2004/Sjoerd-app](https://github.com/thijsbol2004/Sjoerd-app) (openbaar — nodig voor gratis GitHub Pages).

## Architectuur

- `index.html`, `style.css`, `app.js` — de app zelf
- `manifest.json`, `service-worker.js`, `icons/` — PWA-installatie + offline-ondersteuning
- Spelersinvoer, huidig potje en "vorige spelers" blijven lokaal (`localStorage`). Geen eigen backend/server.
- **Supabase** (gratis project, project-ref `fdomjtpirohnzggxtbne`) voor het delen van uitslagen tussen telefoons: alleen actief als je bij "Nieuw spel" kiest voor "Speel in een groep". De `supabase-js`-library wordt via een CDN-`<script>`-tag geladen (`index.html`); URL + anon key staan als constanten bovenin `app.js` (de anon key is bewust publiek, beveiliging loopt via RLS-policies op de tabellen, zie hieronder).
  - Tabel `groepen` (code PK, naam, aangemaakt_op) en tabel `potjes` (groepcode FK, datum, winnaar, spelers jsonb) — aangemaakt via directe Postgres-connectie, zie de SQL in de gespreksgeschiedenis als je het schema ooit opnieuw moet aanmaken.
  - RLS staat aan op beide tabellen met policies die publieke select+insert toestaan (geen auth/login in de app).
  - Bij "Speel eenmalig" gebeurt er niets met Supabase — exact hetzelfde gedrag als vóór de groepsfunctie.
- De app rekent de sjoerd-regels (straf/laagste/gelijkspel) NIET zelf uit — de scorehouder (degene die ronde 1 verliest) vult per ronde het al-berekende eindresultaat per speler in. De volledige regels staan uitgeschreven in de Uitleg-tab in `index.html`.

## Groepen- en statistieken-flow

- Nieuw spel → keuze "Speel eenmalig" / "Speel in een groep"
- Bij een groep: kiezen uit lokaal bekende groepen (`localStorage` sleutel `sjoerdMijnGroepen`), of "Groep toevoegen" (nieuwe code laten genereren, of een code van een vriend invoeren — zelfde scherm, twee subtabjes)
- Eerste keer ooit een groep gebruikt: vraagt eenmalig "Wat is jouw naam?" (`localStorage` sleutel `sjoerdMijnNaam`), voor de persoonlijke statistieken
- Bij spel-einde: als een groep actief is, wordt naast de lokale opslag ook een rij weggeschreven naar de `potjes`-tabel in Supabase
- Statistieken-tab: per groep een overwinningen-overzicht, en een persoonlijk "tegen wie speel/win je vaak"-overzicht over alle gejoinde groepen heen (afgeleid uit winnaar + spelerslijst per potje — er worden geen losse rondescores gedeeld, zoals afgesproken)

## Bekende valkuilen

1. **GitHub Pages deployment duurt 1-3 minuten en is asynchroon.** Snel achter elkaar pushen annuleert een lopende deployment — de site blijft dan op een oudere versie hangen zonder duidelijke foutmelding. Check na een push: `gh run list --repo thijsbol2004/Sjoerd-app` en wacht tot de laatste run "completed / success" is voordat je test of opnieuw pusht.
2. **Service worker: network-first, niet cache-first.** Eerdere versie gebruikte cache-first, waardoor telefoons na een update op de oude versie bleven hangen (de service worker zelf veranderde niet, dus de browser detecteerde geen update). Nu haalt de fetch-handler altijd eerst het netwerk op en valt alleen zonder verbinding terug op de cache.
3. **`[hidden]`-attribuut kan overschreven worden** door een class die zelf `display` zet (zoals `.knop`). Daarom staat er een globale `[hidden] { display: none !important; }`-regel in `style.css` — laat die staan bij nieuwe componenten.

## Bewust nog niet gebouwd

- Live-sync tijdens een lopend potje (bewust afgewezen door Thijs — alleen het eindresultaat wordt gedeeld, niet elke ronde).
- Uitgebreidere head-to-head-weergave (bijv. een matrix tussen alle spelers) — nu alleen "tegen wie speel/win je" als lijst.

## Werkwijze

Volg verder de globale afspraken uit `~/.claude/CLAUDE.md` (Nederlands, commentaar in code, altijd melden welk bestand aangemaakt wordt, nooit stilzwijgend herschrijven, etc.).
