# CLAUDE.md — Sjoerd-app

## Wat dit is

PWA (puur HTML/CSS/JS, geen backend) om de score bij te houden van het kaartspel Sjoerd. Live op https://thijsbol2004.github.io/Sjoerd-app/, repo [thijsbol2004/Sjoerd-app](https://github.com/thijsbol2004/Sjoerd-app) (openbaar — nodig voor gratis GitHub Pages).

## Architectuur

- `index.html`, `style.css`, `app.js` — de app zelf
- `manifest.json`, `service-worker.js`, `icons/` — PWA-installatie + offline-ondersteuning
- Spelersinvoer, huidig potje en "vorige spelers" blijven lokaal (`localStorage`). Geen eigen backend/server.
- **Supabase** (gratis project, project-ref `fdomjtpirohnzggxtbne`) voor het delen van uitslagen tussen telefoons: alleen actief als je bij "Nieuw spel" kiest voor "Speel in een groep". De `supabase-js`-library wordt via een CDN-`<script>`-tag geladen (`index.html`); URL + anon key staan als constanten bovenin `app.js` (de anon key is bewust publiek, beveiliging loopt via RLS-policies op de tabellen, zie hieronder).
  - Tabel `groepen` (code PK, naam, aangemaakt_op), tabel `potjes` (groepcode FK, datum, winnaar, spelers jsonb, `eindstand` jsonb, `aantal_rondes` int) en tabel `lopende_potjes` (groepcode PK+FK, ronde, scorehouder, spelers jsonb, `doel_punten` int, bijgewerkt_op) — aangemaakt via directe Postgres-connectie.
  - `potjes.eindstand` is `[{naam, totaal, nulRondes}]` en is **nullable**: potjes van vóór september 2026 hebben dit niet. De statistieken vangen dat af met een `–` en een uitlegregel — hou die terugval in stand.
  - RLS staat aan op alle drie de tabellen. `groepen` en `potjes` staan publiek select+insert toe (géén update/delete — een `delete` vanuit de app faalt daardoor stil, zonder error). `lopende_potjes` staat ook update+delete toe, want een lopend spel moet bijgewerkt en afgesloten kunnen worden.
  - Bij "Speel eenmalig" gebeurt er niets met Supabase — exact hetzelfde gedrag als vóór de groepsfunctie.
- De puntengrens waarbij het spel stopt is per spel in te stellen op het setup-scherm (`doelPunten`, standaard 100, laatst gebruikte waarde onthouden in `localStorage`). De grens gaat mee naar `lopende_potjes.doel_punten`, zodat een overname op een andere telefoon tot dezelfde grens speelt; die kolom is nullable en valt terug op 100.
- Tijdens een spel kun je via "Spel stoppen" kiezen tussen **vervroegd eindigen** (de stand van nu telt, winnaar + verliezer in beeld, potje wordt opgeslagen) en **afkappen** (alles weg, niets opgeslagen, lopend spel uit de groep verwijderd). Afkappen vraagt eerst om bevestiging. Vervroegd eindigen kan niet in ronde 1, want dan is er nog niets gespeeld.
- De app rekent de sjoerd-regels (straf/laagste/gelijkspel) NIET zelf uit — de scorehouder (degene die ronde 1 verliest) vult per ronde het al-berekende eindresultaat per speler in. De volledige regels staan uitgeschreven in de Uitleg-tab in `index.html`.

## Groepen- en statistieken-flow

- Nieuw spel → keuze "Speel eenmalig" / "Speel in een groep"
- Bij een groep: kiezen uit lokaal bekende groepen (`localStorage` sleutel `sjoerdMijnGroepen`), of "Groep toevoegen" (nieuwe code laten genereren, of een code van een vriend invoeren — zelfde scherm, twee subtabjes)
- Eerste keer ooit een groep gebruikt: vraagt eenmalig "Wat is jouw naam?" (`localStorage` sleutel `sjoerdMijnNaam`), voor de persoonlijke statistieken
- Tijdens een groepsspel wordt de stand na elke wijziging (start, ronde verwerken, ronde ongedaan, speler inkopen) naar `lopende_potjes` geschreven. Kies je die groep op een andere telefoon, dan verschijnt eerst het scherm "Er loopt een spel" met de keuze om het over te nemen of een nieuw spel te starten. Zo kan het spel verder als de telefoon van de scorehouder leeg raakt.
- Bij spel-einde: als een groep actief is, wordt een rij weggeschreven naar `potjes` (inclusief eindstand en aantal rondes) en wordt de rij in `lopende_potjes` verwijderd
- Statistieken-tab: de keuzelijst bovenaan (elke groep + "Alle groepen samen") bepaalt **alles** wat eronder staat — ranglijst, jouw onderlinge resultaten en de laatste potjes. Losse rondescores worden nog steeds niet gedeeld, zoals afgesproken.

## Bekende valkuilen

1. **GitHub Pages deployment duurt 1-3 minuten en is asynchroon.** Snel achter elkaar pushen annuleert een lopende deployment — de site blijft dan op een oudere versie hangen zonder duidelijke foutmelding. Check na een push: `gh run list --repo thijsbol2004/Sjoerd-app` en wacht tot de laatste run "completed / success" is voordat je test of opnieuw pusht.
2. **Service worker: network-first, niet cache-first.** Eerdere versie gebruikte cache-first, waardoor telefoons na een update op de oude versie bleven hangen (de service worker zelf veranderde niet, dus de browser detecteerde geen update). Nu haalt de fetch-handler altijd eerst het netwerk op en valt alleen zonder verbinding terug op de cache.
3. **`[hidden]`-attribuut kan overschreven worden** door een class die zelf `display` zet (zoals `.knop`). Daarom staat er een globale `[hidden] { display: none !important; }`-regel in `style.css` — laat die staan bij nieuwe componenten.
4. **`spelers` staat in zitvolgorde, niet op stand.** De deler/beginner-rotatie rekent met die volgorde. Het scorebord toont een gesorteerde kópie; sorteer nooit de array zelf, anders klopt "wie deelt / wie begint" niet meer.
5. **Elke ronde moet minstens één speler op 0 hebben.** De app weigert een ronde zonder 0. Zonder die eis lopen de 0-punten-tellers uit de pas met het aantal gespeelde rondes — precies de reden dat de statistieken eerder niet klopten.

## Bewust nog niet gebouwd

- Live meekijken tijdens een potje (alle telefoons zien de stand realtime bijwerken). Overnemen gaat bewust handmatig; er vult altijd maar één telefoon in.
- Uitgebreidere head-to-head-weergave (bijv. een matrix tussen álle spelers onderling) — nu alleen jouw eigen onderlinge resultaten.

## Werkwijze

Volg verder de globale afspraken uit `~/.claude/CLAUDE.md` (Nederlands, commentaar in code, altijd melden welk bestand aangemaakt wordt, nooit stilzwijgend herschrijven, etc.).
