// ===== Sjoerd scorebord — spellogica =====

// --- Status van de app (in het geheugen, niet opgeslagen tussen ronden) ---
let setupNamen = [];      // namen die op het setup-scherm staan, in zitvolgorde
let groepNamen = [];      // iedereen die ooit in de actieve groep meespeelde, om uit te kiezen
let spelers = [];         // [{ naam, totaal, aantalKeerNul }] tijdens een lopend spel
let ronde = 1;
let scorehouder = null;   // naam van de speler die verloor in ronde 1
let rondeSnapshots = [];  // kopieën van de status vóór elke ronde, voor "ongedaan maken"
let doelPunten = 100;     // bij hoeveel punten het spel stopt; per spel in te stellen

const STANDAARD_DOELPUNTEN = 100;
const LAATSTE_SPELERS_KEY = "sjoerdLaatsteSpelers"; // onthoudt de spelerslijst van het vorige spel
const LAATSTE_DOELPUNTEN_KEY = "sjoerdLaatsteDoelpunten"; // onthoudt de grens van het vorige spel
const MIJN_NAAM_KEY = "sjoerdMijnNaam";             // eigen naam, voor persoonlijke statistieken
const MIJN_GROEPEN_KEY = "sjoerdMijnGroepen";       // groepen die op dit toestel gebruikt zijn: [{code, naam}]

// --- Supabase: gedeelde opslag van groepen en potjes-uitslagen ---
// De "anon key" is een publieke sleutel, bedoeld om in client-code te staan.
// Beveiliging loopt via database-regels (RLS), niet via het geheimhouden hiervan.
const SUPABASE_URL = "https://fdomjtpirohnzggxtbne.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkb21qdHBpcm9obnpnZ3h0Ym5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDMzOTksImV4cCI6MjEwNTU3OTM5OX0.IQCeIYEU1kEM8RQ2Avjr8HosygN_m27nBnPrlzTyymc";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Groepsstatus (in het geheugen tijdens deze sessie) ---
let groepActief = null; // { code, naam } of null als "eenmalig" gekozen is

// --- DOM-elementen ---
const el = (id) => document.getElementById(id);

const tabKnoppen = document.querySelectorAll(".tab-knop");
const tabInhouden = document.querySelectorAll(".tab-inhoud");

const schermModus = el("scherm-modus");
const schermGroep = el("scherm-groep");
const schermMijnNaam = el("scherm-mijn-naam");
const schermSetup = el("scherm-setup");
const schermSpel = el("scherm-spel");
const schermGameover = el("scherm-gameover");

const knopModusEenmalig = el("knop-modus-eenmalig");
const knopModusGroep = el("knop-modus-groep");

const groepenlijstEl = el("groepenlijst");
const groepLeegTekst = el("groep-leeg-tekst");
const knopGroepToevoegenTonen = el("knop-groep-toevoegen-tonen");
const groepToevoegenFormulier = el("groep-toevoegen-formulier");
const knopSubtabNieuw = el("knop-subtab-nieuw");
const knopSubtabCode = el("knop-subtab-code");
const nieuweGroepInvoer = el("nieuwe-groep-invoer");
const codeInvoer = el("code-invoer");
const invoerGroepnaam = el("invoer-groepnaam");
const invoerGroepcode = el("invoer-groepcode");
const knopGroepAanmaken = el("knop-groep-aanmaken");
const knopGroepJoinen = el("knop-groep-joinen");
const groepFoutmelding = el("groep-foutmelding");
const knopGroepTerug = el("knop-groep-terug");

const invoerMijnNaam = el("invoer-mijn-naam");
const knopMijnNaamOpslaan = el("knop-mijn-naam-opslaan");
const mijnNaamFoutmelding = el("mijn-naam-foutmelding");

const actieveGroepInfo = el("actieve-groep-info");

const schermLopendSpel = el("scherm-lopend-spel");
const lopendSpelInfo = el("lopend-spel-info");
const lopendSpelBody = el("lopend-spel-body");
const knopLopendDoorgaan = el("knop-lopend-doorgaan");
const knopLopendNieuw = el("knop-lopend-nieuw");

const statsLadenTekst = el("stats-laden-tekst");
const statsFoutTekst = el("stats-fout-tekst");
const statsGeenGroepen = el("stats-geen-groepen");
const statsInhoud = el("stats-inhoud");
const selectStatsGroep = el("select-stats-groep");
const statsScopeTekst = el("stats-scope-tekst");
const statsRanglijstKop = el("stats-ranglijst-kop");
const statsRanglijstBody = el("stats-ranglijst-body");
const statsOudePotjesUitleg = el("stats-oude-potjes-uitleg");
const statsPersoonlijkKop = el("stats-persoonlijk-kop");
const statsPersoonlijkBody = el("stats-persoonlijk-body");
const statsRecentBody = el("stats-recent-body");

const spelerslijstEl = el("spelerslijst");
const formSpelerToevoegen = el("form-speler-toevoegen");
const invoerSpelernaam = el("invoer-spelernaam");
const groepNamenBlok = el("groep-namen-blok");
const groepNamenKeuze = el("groep-namen-keuze");
const setupUitleg = el("setup-uitleg");
const volgordeUitleg = el("volgorde-uitleg");
const knopStartSpel = el("knop-start-spel");
const knopVorigeSpelers = el("knop-vorige-spelers");
const knopSetupTerug = el("knop-setup-terug");
const invoerDoelpunten = el("invoer-doelpunten");
const setupFoutmelding = el("setup-foutmelding");

const scorebordBody = el("scorebord-body");
const doelInfo = el("doel-info");
const delerInfo = el("deler-info");
const scorehouderInfo = el("scorehouder-info");
const syncInfo = el("sync-info");

const knopSpelerInkopen = el("knop-speler-inkopen");
const inkopenFormulier = el("inkopen-formulier");
const invoerInkoperNaam = el("invoer-inkoper-naam");
const invoerInkoopPunten = el("invoer-inkoop-punten");
const inkopenFoutmelding = el("inkopen-foutmelding");
const knopInkopenBevestigen = el("knop-inkopen-bevestigen");
const knopInkopenAnnuleren = el("knop-inkopen-annuleren");

const rondeTitel = el("ronde-titel");
const puntenInvoerLijst = el("punten-invoer-lijst");
const rondeFoutmelding = el("ronde-foutmelding");
const knopRondeVerwerken = el("knop-ronde-verwerken");
const knopRondeOngedaan = el("knop-ronde-ongedaan");

const knopSpelStoppen = el("knop-spel-stoppen");
const stoppenFormulier = el("stoppen-formulier");
const knopVervroegdEindigen = el("knop-vervroegd-eindigen");
const knopAfkappen = el("knop-afkappen");
const afkappenBevestiging = el("afkappen-bevestiging");
const knopAfkappenBevestigen = el("knop-afkappen-bevestigen");
const knopStoppenAnnuleren = el("knop-stoppen-annuleren");

const winnaarTekst = el("winnaar-tekst");
const verliezerTekst = el("verliezer-tekst");
const rondesGespeeldTekst = el("rondes-gespeeld-tekst");
const eindstandBody = el("eindstand-body");
const knopNieuwSpel = el("knop-nieuw-spel");

// ===== Tabs (Scorebord / Statistieken / Uitleg) =====
tabKnoppen.forEach((knop) => {
  knop.addEventListener("click", () => {
    tabKnoppen.forEach((k) => k.classList.remove("actief"));
    tabInhouden.forEach((t) => t.classList.remove("actief"));
    knop.classList.add("actief");
    el(`tab-${knop.dataset.tab}`).classList.add("actief");

    if (knop.dataset.tab === "stats") {
      laadStatistieken();
    }
  });
});

// ===== Hulpfuncties: eigen naam en groepen (localStorage) =====
function haalMijnNaamOp() {
  return localStorage.getItem(MIJN_NAAM_KEY) || null;
}

function haalMijnGroepenOp() {
  return JSON.parse(localStorage.getItem(MIJN_GROEPEN_KEY) || "[]");
}

function voegMijnGroepToe(groep) {
  const groepen = haalMijnGroepenOp();
  if (!groepen.some((g) => g.code === groep.code)) {
    groepen.push(groep);
    localStorage.setItem(MIJN_GROEPEN_KEY, JSON.stringify(groepen));
  }
}

function genereerGroepscode() {
  // Geen verwarrende tekens (0/O, 1/I/L)
  const tekens = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += tekens[Math.floor(Math.random() * tekens.length)];
  }
  return code;
}

// ===== Scherm 0a: eenmalig of in een groep =====
knopModusEenmalig.addEventListener("click", () => {
  groepActief = null;
  // Schoon beginnen: anders blijven de namen van een vorige groep staan
  setupNamen = [];
  groepNamen = [];
  renderGroepNamenKeuze();
  renderSpelerslijst();

  schermModus.hidden = true;
  actieveGroepInfo.hidden = true;
  schermSetup.hidden = false;
});

knopModusGroep.addEventListener("click", () => {
  schermModus.hidden = true;
  schermGroep.hidden = false;
  renderGroepenlijst();
});

// ===== Scherm 0b: groep kiezen/aanmaken/joinen =====
function renderGroepenlijst() {
  const groepen = haalMijnGroepenOp();
  groepenlijstEl.innerHTML = "";
  groepLeegTekst.hidden = groepen.length > 0;

  groepen.forEach((groep) => {
    const li = document.createElement("li");
    const knop = document.createElement("button");
    knop.type = "button";
    knop.className = "knop knop-tekst";
    knop.textContent = groep.naam ? `${groep.naam} (${groep.code})` : groep.code;
    knop.addEventListener("click", () => kiesGroep(groep));
    li.appendChild(knop);
    groepenlijstEl.appendChild(li);
  });
}

function kiesGroep(groep) {
  groepActief = groep;
  groepFoutmelding.hidden = true;
  groepToevoegenFormulier.hidden = true;
  schermGroep.hidden = true;

  if (!haalMijnNaamOp()) {
    schermMijnNaam.hidden = false;
  } else {
    gaNaarSetup();
  }
}

async function gaNaarSetup() {
  schermMijnNaam.hidden = true;
  actieveGroepInfo.hidden = !groepActief;
  actieveGroepInfo.textContent = groepActief
    ? `Groep: ${groepActief.naam ? `${groepActief.naam} (${groepActief.code})` : groepActief.code}`
    : "";

  // Loopt er in deze groep nog een spel? Dan eerst de keuze geven om het over te
  // nemen — zo kan een andere telefoon verder met dezelfde stand en namen.
  if (groepActief) {
    const lopend = await haalLopendSpelOp(groepActief.code);
    if (lopend) {
      toonLopendSpelScherm(lopend);
      return;
    }
    await laadGroepNamen(groepActief.code);
  }

  schermSetup.hidden = false;
}

// ===== Namen van een groep ophalen om uit te kiezen =====
// De namen komen uit de potjes van díe groep, dus ook spelers die op de telefoon
// van een vriend zijn ingevoerd staan erbij.
async function laadGroepNamen(groepcode) {
  setupFoutmelding.hidden = true;
  groepNamen = [];
  setupNamen = [];

  const { data, error } = await supabaseClient
    .from("potjes")
    .select("spelers, datum")
    .eq("groepcode", groepcode)
    .order("datum", { ascending: false });

  if (error) {
    setupFoutmelding.textContent = "Kon de namen van deze groep niet ophalen. Vul ze handmatig in.";
    setupFoutmelding.hidden = false;
  } else if (data) {
    data.forEach((potje) => {
      (potje.spelers || []).forEach((naam) => {
        if (!groepNamen.includes(naam)) groepNamen.push(naam);
      });
    });
    // Voorselectie: de opstelling van het laatste potje in deze groep
    if (data.length > 0) setupNamen = [...(data[0].spelers || [])];
  }

  renderGroepNamenKeuze();
  renderSpelerslijst();
}

function renderGroepNamenKeuze() {
  groepNamenBlok.hidden = groepNamen.length === 0;
  setupUitleg.textContent = groepNamen.length === 0
    ? "Voer de namen van de spelers in (minimaal 2)."
    : "Speelt er iemand mee die er nog niet bij staat? Voeg die hieronder toe.";

  groepNamenKeuze.innerHTML = "";
  groepNamen.forEach((naam) => {
    const label = document.createElement("label");
    label.className = "naam-keuze";

    const vinkje = document.createElement("input");
    vinkje.type = "checkbox";
    vinkje.dataset.naam = naam;
    vinkje.checked = setupNamen.includes(naam);
    vinkje.addEventListener("change", () => {
      if (vinkje.checked) {
        if (!setupNamen.includes(naam)) setupNamen.push(naam);
      } else {
        setupNamen = setupNamen.filter((n) => n !== naam);
      }
      renderSpelerslijst();
    });

    label.appendChild(vinkje);
    label.appendChild(document.createTextNode(naam));
    groepNamenKeuze.appendChild(label);
  });
}

function syncNaamKeuzevinkjes() {
  groepNamenKeuze.querySelectorAll("input[type=checkbox]").forEach((vinkje) => {
    vinkje.checked = setupNamen.includes(vinkje.dataset.naam);
  });
}

knopGroepToevoegenTonen.addEventListener("click", () => {
  groepToevoegenFormulier.hidden = false;
});

knopSubtabNieuw.addEventListener("click", () => {
  knopSubtabNieuw.classList.add("actief");
  knopSubtabCode.classList.remove("actief");
  nieuweGroepInvoer.hidden = false;
  codeInvoer.hidden = true;
});

knopSubtabCode.addEventListener("click", () => {
  knopSubtabCode.classList.add("actief");
  knopSubtabNieuw.classList.remove("actief");
  codeInvoer.hidden = false;
  nieuweGroepInvoer.hidden = true;
});

knopGroepAanmaken.addEventListener("click", async () => {
  groepFoutmelding.hidden = true;
  const naam = invoerGroepnaam.value.trim() || null;
  const code = genereerGroepscode();

  const { error } = await supabaseClient.from("groepen").insert({ code, naam });
  if (error) {
    groepFoutmelding.textContent = "Kon geen groep aanmaken. Controleer je internetverbinding en probeer opnieuw.";
    groepFoutmelding.hidden = false;
    return;
  }

  voegMijnGroepToe({ code, naam });
  invoerGroepnaam.value = "";
  kiesGroep({ code, naam });
});

knopGroepJoinen.addEventListener("click", async () => {
  groepFoutmelding.hidden = true;
  const code = invoerGroepcode.value.trim().toUpperCase();
  if (!code) return;

  const { data, error } = await supabaseClient.from("groepen").select("code, naam").eq("code", code).maybeSingle();
  if (error) {
    groepFoutmelding.textContent = "Kon niet zoeken. Controleer je internetverbinding en probeer opnieuw.";
    groepFoutmelding.hidden = false;
    return;
  }
  if (!data) {
    groepFoutmelding.textContent = "Geen groep gevonden met deze code. Klopt de code?";
    groepFoutmelding.hidden = false;
    return;
  }

  voegMijnGroepToe(data);
  invoerGroepcode.value = "";
  kiesGroep(data);
});

knopGroepTerug.addEventListener("click", () => {
  groepFoutmelding.hidden = true;
  groepToevoegenFormulier.hidden = true;
  schermGroep.hidden = true;
  schermModus.hidden = false;
});

// ===== Scherm 0c: eigen naam instellen =====
knopMijnNaamOpslaan.addEventListener("click", () => {
  const naam = invoerMijnNaam.value.trim();
  mijnNaamFoutmelding.hidden = true;

  if (!naam) {
    mijnNaamFoutmelding.textContent = "Vul je naam in.";
    mijnNaamFoutmelding.hidden = false;
    return;
  }

  localStorage.setItem(MIJN_NAAM_KEY, naam);
  invoerMijnNaam.value = "";
  gaNaarSetup();
});

// ===== Scherm 0d: lopend spel in de groep overnemen =====
async function haalLopendSpelOp(groepcode) {
  const { data, error } = await supabaseClient
    .from("lopende_potjes")
    .select("ronde, scorehouder, spelers, doel_punten, bijgewerkt_op")
    .eq("groepcode", groepcode)
    .maybeSingle();

  if (error) return null;
  return data;
}

function tijdGeleden(isoTekst) {
  const minuten = Math.round((Date.now() - new Date(isoTekst).getTime()) / 60000);
  if (minuten < 1) return "net";
  if (minuten < 60) return `${minuten} ${minuten === 1 ? "minuut" : "minuten"} geleden`;
  const uren = Math.round(minuten / 60);
  if (uren < 24) return `${uren} ${uren === 1 ? "uur" : "uur"} geleden`;
  const dagen = Math.round(uren / 24);
  return `${dagen} ${dagen === 1 ? "dag" : "dagen"} geleden`;
}

function toonLopendSpelScherm(lopend) {
  lopendSpelInfo.textContent =
    `In deze groep loopt een spel bij ronde ${lopend.ronde}, tot ${lopend.doel_punten || STANDAARD_DOELPUNTEN} punten — ` +
    `laatst bijgewerkt ${tijdGeleden(lopend.bijgewerkt_op)}.`;

  lopendSpelBody.innerHTML = "";
  [...lopend.spelers]
    .sort((a, b) => a.totaal - b.totaal)
    .forEach((speler, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="kolom-positie">${index + 1}</td><td>${speler.naam}</td><td>${speler.totaal}</td>`;
      lopendSpelBody.appendChild(tr);
    });

  knopLopendDoorgaan.onclick = () => neemLopendSpelOver(lopend);
  schermLopendSpel.hidden = false;
}

function neemLopendSpelOver(lopend) {
  spelers = lopend.spelers.map((s) => ({
    naam: s.naam,
    totaal: s.totaal,
    aantalKeerNul: s.aantalKeerNul || 0,
  }));
  ronde = lopend.ronde;
  scorehouder = lopend.scorehouder;
  doelPunten = lopend.doel_punten || STANDAARD_DOELPUNTEN; // ouder spel zonder grens: terug naar 100
  rondeSnapshots = []; // de rondes van de andere telefoon kunnen we niet ongedaan maken

  // Namen ook lokaal onthouden, zodat "vorige spelers ophalen" hier straks werkt
  localStorage.setItem(LAATSTE_SPELERS_KEY, JSON.stringify(spelers.map((s) => s.naam)));

  schermLopendSpel.hidden = true;
  schermGameover.hidden = true;
  inkopenFormulier.hidden = true;
  stoppenFormulier.hidden = true;
  schermSpel.hidden = false;

  renderScorebord();
  renderRondeFormulier();
}

knopLopendNieuw.addEventListener("click", async () => {
  schermLopendSpel.hidden = true;
  if (groepActief) await laadGroepNamen(groepActief.code);
  schermSetup.hidden = false;
});

// ===== Lopend spel delen met de groep (Supabase) =====
// Alleen actief als er een groep gekozen is; bij "Speel eenmalig" gebeurt er niets.
async function syncLopendSpel() {
  if (!groepActief) return;

  const { error } = await supabaseClient.from("lopende_potjes").upsert({
    groepcode: groepActief.code,
    ronde,
    scorehouder,
    spelers,
    doel_punten: doelPunten,
    bijgewerkt_op: new Date().toISOString(),
  });

  syncInfo.textContent = error
    ? "Stand nog niet gedeeld met de groep — controleer je internet."
    : "Stand gedeeld met de groep.";
  syncInfo.classList.toggle("sync-info-fout", Boolean(error));
  syncInfo.hidden = false;
}

async function verwijderLopendSpel(groepcode) {
  await supabaseClient.from("lopende_potjes").delete().eq("groepcode", groepcode);
}

// ===== Setup-scherm: spelers toevoegen/verwijderen =====
function renderSpelerslijst() {
  spelerslijstEl.innerHTML = "";
  setupNamen.forEach((naam, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${index + 1}. ${naam}</span>`;

    const knoppen = document.createElement("span");
    knoppen.className = "speler-knoppen";

    // Pijltjes: de volgorde van deze lijst is de zitvolgorde aan tafel
    const omhoog = maakLijstKnop("▲", `${naam} naar boven`, index === 0, () => {
      [setupNamen[index - 1], setupNamen[index]] = [setupNamen[index], setupNamen[index - 1]];
      renderSpelerslijst();
    });
    const omlaag = maakLijstKnop("▼", `${naam} naar beneden`, index === setupNamen.length - 1, () => {
      [setupNamen[index + 1], setupNamen[index]] = [setupNamen[index], setupNamen[index + 1]];
      renderSpelerslijst();
    });
    const verwijder = maakLijstKnop("✕", `Verwijder ${naam}`, false, () => {
      setupNamen.splice(index, 1);
      renderSpelerslijst();
    });
    verwijder.classList.add("knop-verwijder");

    knoppen.append(omhoog, omlaag, verwijder);
    li.appendChild(knoppen);
    spelerslijstEl.appendChild(li);
  });

  knopStartSpel.disabled = setupNamen.length < 2;
  volgordeUitleg.hidden = setupNamen.length < 2;
  syncNaamKeuzevinkjes();

  // "Vorige spelers ophalen" hoort alleen bij een spel zonder groep. In een groep
  // kies je uit de namen van díe groep, anders krijg je spelers uit een andere groep.
  const laatsteSpelers = JSON.parse(localStorage.getItem(LAATSTE_SPELERS_KEY) || "[]");
  knopVorigeSpelers.hidden = Boolean(groepActief) || setupNamen.length > 0 || laatsteSpelers.length === 0;
}

function maakLijstKnop(tekst, label, uitgeschakeld, bijKlik) {
  const knop = document.createElement("button");
  knop.type = "button";
  knop.textContent = tekst;
  knop.setAttribute("aria-label", label);
  knop.disabled = uitgeschakeld;
  knop.addEventListener("click", bijKlik);
  return knop;
}

knopSetupTerug.addEventListener("click", () => {
  groepActief = null;
  setupNamen = [];
  groepNamen = [];
  setupFoutmelding.hidden = true;
  renderGroepNamenKeuze();
  renderSpelerslijst();

  schermSetup.hidden = true;
  actieveGroepInfo.hidden = true;
  schermModus.hidden = false;
});

knopVorigeSpelers.addEventListener("click", () => {
  setupNamen = JSON.parse(localStorage.getItem(LAATSTE_SPELERS_KEY) || "[]");
  renderSpelerslijst();
});

formSpelerToevoegen.addEventListener("submit", (e) => {
  e.preventDefault();
  const naam = invoerSpelernaam.value.trim();
  setupFoutmelding.hidden = true;

  if (!naam) return;
  if (setupNamen.some((n) => n.toLowerCase() === naam.toLowerCase())) {
    setupFoutmelding.textContent = "Die naam staat al in de lijst.";
    setupFoutmelding.hidden = false;
    return;
  }

  setupNamen.push(naam);
  // Nieuwe naam ook meteen in het keuzelijstje van de groep zetten
  if (groepActief && !groepNamen.includes(naam)) {
    groepNamen.push(naam);
    renderGroepNamenKeuze();
  }

  invoerSpelernaam.value = "";
  invoerSpelernaam.focus();
  renderSpelerslijst();
});

knopStartSpel.addEventListener("click", () => {
  setupFoutmelding.hidden = true;

  const ingevuldDoel = Number(invoerDoelpunten.value.trim());
  if (!Number.isInteger(ingevuldDoel) || ingevuldDoel < 1) {
    setupFoutmelding.textContent = "Vul in tot hoeveel punten jullie spelen (een heel getal van 1 of hoger).";
    setupFoutmelding.hidden = false;
    return;
  }
  doelPunten = ingevuldDoel;

  localStorage.setItem(LAATSTE_SPELERS_KEY, JSON.stringify(setupNamen));
  localStorage.setItem(LAATSTE_DOELPUNTEN_KEY, String(doelPunten));

  spelers = setupNamen.map((naam) => ({ naam, totaal: 0, aantalKeerNul: 0 }));
  ronde = 1;
  scorehouder = null;
  rondeSnapshots = [];

  schermSetup.hidden = true;
  schermGameover.hidden = true;
  inkopenFormulier.hidden = true;
  stoppenFormulier.hidden = true;
  syncInfo.hidden = true;
  schermSpel.hidden = false;

  renderScorebord();
  renderRondeFormulier();
  syncLopendSpel();
});

// ===== Scorebord weergeven =====
function renderScorebord() {
  doelInfo.textContent = `Spelen tot ${doelPunten} punten.`;
  scorebordBody.innerHTML = "";

  // Weergave op stand (laagste = beste). De array `spelers` zelf blijft in
  // zitvolgorde staan, want de deler/beginner-rotatie hieronder rekent daarmee.
  const opStand = [...spelers].sort((a, b) => a.totaal - b.totaal);
  opStand.forEach((speler, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="kolom-positie">${index + 1}</td><td>${speler.naam}</td><td>${speler.totaal}</td>`;
    scorebordBody.appendChild(tr);
  });

  // Deler/beginner-info: pas zinvol vanaf ronde 2 (in ronde 1 staat iedereen nog op 0)
  if (ronde > 1) {
    const hoogsteTotaal = Math.max(...spelers.map((s) => s.totaal));
    const delerIndex = spelers.findIndex((s) => s.totaal === hoogsteTotaal);
    const beginnerIndex = (delerIndex + 1) % spelers.length;
    delerInfo.textContent =
      `Deelt volgende ronde: ${spelers[delerIndex].naam} — ` +
      `${spelers[beginnerIndex].naam} begint.`;
  } else {
    delerInfo.textContent = "";
  }

  scorehouderInfo.textContent = scorehouder
    ? `Scorehouder (voert de punten in): ${scorehouder}`
    : "";
}

// ===== Ronde-invoerformulier opbouwen =====
function renderRondeFormulier() {
  rondeTitel.textContent = `Ronde ${ronde}`;
  rondeFoutmelding.hidden = true;

  puntenInvoerLijst.innerHTML = "";
  spelers.forEach((speler) => {
    const rij = document.createElement("div");
    rij.className = "punten-invoer-rij";
    rij.innerHTML = `
      <span>${speler.naam}</span>
      <input type="number" min="0" step="1" inputmode="numeric" autocomplete="off" class="punten-invoer" data-naam="${speler.naam}" placeholder="score" value="">
    `;
    puntenInvoerLijst.appendChild(rij);
  });

  // Extra zekerheid tegen browsers die oude waarden proberen te onthouden/suggereren
  document.querySelectorAll(".punten-invoer").forEach((veld) => { veld.value = ""; });

  knopRondeOngedaan.disabled = rondeSnapshots.length === 0;
}

// ===== Speler inkopen midden in het spel =====
knopSpelerInkopen.addEventListener("click", () => {
  inkopenFoutmelding.hidden = true;
  invoerInkoperNaam.value = "";
  // Voorstel: de hoogste stand van dit moment. De groep bepaalt het echte getal,
  // dus dit veld is gewoon overtypbaar.
  invoerInkoopPunten.value = Math.max(...spelers.map((s) => s.totaal));
  inkopenFormulier.hidden = false;
  invoerInkoperNaam.focus();
});

knopInkopenAnnuleren.addEventListener("click", () => {
  inkopenFormulier.hidden = true;
  inkopenFoutmelding.hidden = true;
});

knopInkopenBevestigen.addEventListener("click", () => {
  inkopenFoutmelding.hidden = true;

  const naam = invoerInkoperNaam.value.trim();
  const punten = Number(invoerInkoopPunten.value.trim());

  if (!naam) {
    toonInkopenFout("Vul een naam in.");
    return;
  }
  if (spelers.some((s) => s.naam.toLowerCase() === naam.toLowerCase())) {
    toonInkopenFout("Die naam doet al mee in dit spel.");
    return;
  }
  if (invoerInkoopPunten.value.trim() === "" || !Number.isInteger(punten) || punten < 0) {
    toonInkopenFout("Vul een heel getal van 0 of hoger in om op in te kopen.");
    return;
  }

  // Snapshot vóór de wijziging, zodat "vorige ronde ongedaan maken" ook het
  // inkopen terugdraait als er verkeerd is ingevuld.
  maakSnapshot();

  spelers.push({ naam, totaal: punten, aantalKeerNul: 0 });

  inkopenFormulier.hidden = true;
  invoerInkoperNaam.value = "";

  if (punten >= doelPunten) {
    toonSpelAfgelopen();
    return;
  }

  renderScorebord();
  renderRondeFormulier();
  syncLopendSpel();
});

function toonInkopenFout(tekst) {
  inkopenFoutmelding.textContent = tekst;
  inkopenFoutmelding.hidden = false;
}

// ===== Status opslaan vóór een ronde, voor "ongedaan maken" =====
function maakSnapshot() {
  rondeSnapshots.push({
    spelers: spelers.map((s) => ({ ...s })),
    ronde,
    scorehouder,
  });
}

knopRondeOngedaan.addEventListener("click", () => {
  const vorige = rondeSnapshots.pop();
  if (!vorige) return;
  spelers = vorige.spelers;
  ronde = vorige.ronde;
  scorehouder = vorige.scorehouder;
  renderScorebord();
  renderRondeFormulier();
  syncLopendSpel();
});

// ===== Een ronde verwerken =====
// De sjoerd-regels (0 punten, +15 straf, gelijkspel) worden aan tafel toegepast —
// hier wordt alleen het al-berekende resultaat per speler opgeteld bij zijn totaal.
knopRondeVerwerken.addEventListener("click", () => {
  rondeFoutmelding.hidden = true;

  const puntenVelden = document.querySelectorAll(".punten-invoer");
  const puntenPerSpeler = {};

  for (const veld of puntenVelden) {
    const waarde = veld.value.trim();
    if (waarde === "" || isNaN(waarde) || Number(waarde) < 0) {
      rondeFoutmelding.textContent = "Vul voor elke speler een geldig aantal punten in (0 of hoger).";
      rondeFoutmelding.hidden = false;
      return;
    }
    puntenPerSpeler[veld.dataset.naam] = Number(waarde);
  }

  // Elke ronde hoort minstens één speler op 0 te staan: degene die "Sjoerd" riep,
  // of de laagste als die er naast zat. Zonder deze eis lopen de 0-punten-tellers
  // uit de pas met het aantal gespeelde rondes.
  const iemandOpNul = Object.values(puntenPerSpeler).some((punten) => punten === 0);
  if (!iemandOpNul) {
    rondeFoutmelding.textContent =
      "Minstens één speler moet 0 punten hebben: degene die Sjoerd riep, of degene die écht het laagst zat. Zie de Uitleg-tab.";
    rondeFoutmelding.hidden = false;
    return;
  }

  maakSnapshot();

  const isEersteRonde = ronde === 1;
  let hoogsteRondeScore = -Infinity;
  let verliezerRonde1 = null;

  spelers.forEach((speler) => {
    const rondeScore = puntenPerSpeler[speler.naam];
    speler.totaal += rondeScore;

    if (rondeScore === 0) {
      speler.aantalKeerNul += 1;
    }

    if (isEersteRonde && rondeScore > hoogsteRondeScore) {
      hoogsteRondeScore = rondeScore;
      verliezerRonde1 = speler.naam;
    }
  });

  if (isEersteRonde) {
    scorehouder = verliezerRonde1;
  }

  ronde += 1;

  const speelKlaar = spelers.some((s) => s.totaal >= doelPunten);
  if (speelKlaar) {
    toonSpelAfgelopen();
  } else {
    renderScorebord();
    renderRondeFormulier();
    syncLopendSpel();
  }
});

// ===== Spel eerder stoppen: vervroegd eindigen of afkappen =====
knopSpelStoppen.addEventListener("click", () => {
  afkappenBevestiging.hidden = true;
  stoppenFormulier.hidden = false;
});

knopStoppenAnnuleren.addEventListener("click", () => {
  stoppenFormulier.hidden = true;
  afkappenBevestiging.hidden = true;
});

// Vervroegd eindigen: de stand van nu telt gewoon mee, inclusief statistieken
knopVervroegdEindigen.addEventListener("click", () => {
  if (ronde === 1) {
    rondeFoutmelding.textContent =
      "Er is nog geen enkele ronde gespeeld, dus er valt niets op te slaan. Gebruik \"Spel afkappen\" als je toch wilt stoppen.";
    rondeFoutmelding.hidden = false;
    return;
  }
  stoppenFormulier.hidden = true;
  toonSpelAfgelopen();
});

// Afkappen: potje verdwijnt volledig, dus eerst om bevestiging vragen
knopAfkappen.addEventListener("click", () => {
  afkappenBevestiging.hidden = false;
});

knopAfkappenBevestigen.addEventListener("click", () => {
  if (groepActief) verwijderLopendSpel(groepActief.code);

  spelers = [];
  ronde = 1;
  scorehouder = null;
  rondeSnapshots = [];
  groepActief = null;

  stoppenFormulier.hidden = true;
  afkappenBevestiging.hidden = true;
  inkopenFormulier.hidden = true;
  syncInfo.hidden = true;
  schermSpel.hidden = true;
  schermModus.hidden = false;
});

// ===== Spel afgelopen =====
function toonSpelAfgelopen() {
  const gesorteerd = [...spelers].sort((a, b) => a.totaal - b.totaal);
  const winnaar = gesorteerd[0];
  const gespeeldeRondes = ronde - 1;

  const verliezer = gesorteerd[gesorteerd.length - 1];

  schermSpel.hidden = true;
  schermGameover.hidden = false;
  inkopenFormulier.hidden = true;
  stoppenFormulier.hidden = true;

  winnaarTekst.textContent = `${winnaar.naam} wint met ${winnaar.totaal} punten!`;
  verliezerTekst.textContent = `Poedelprijs voor ${verliezer.naam} met ${verliezer.totaal} punten.`;
  verliezerTekst.hidden = spelers.length < 2;
  rondesGespeeldTekst.textContent = `Rondes gespeeld: ${gespeeldeRondes}`;

  eindstandBody.innerHTML = "";
  gesorteerd.forEach((speler) => {
    const tr = document.createElement("tr");
    if (speler.naam === winnaar.naam) tr.classList.add("rij-winnaar");
    if (spelers.length > 1 && speler.naam === verliezer.naam) tr.classList.add("rij-verliezer");
    tr.innerHTML = `<td>${speler.naam}</td><td>${speler.totaal}</td><td>${speler.aantalKeerNul}</td>`;
    eindstandBody.appendChild(tr);
  });

  opslaanGeschiedenis(winnaar.naam, spelers.map((s) => s.naam));

  if (groepActief) {
    const eindstand = spelers.map((s) => ({
      naam: s.naam,
      totaal: s.totaal,
      nulRondes: s.aantalKeerNul,
    }));
    opslaanPotjeInGroep(groepActief.code, winnaar.naam, eindstand, gespeeldeRondes);
  }
}

// ===== Potje-uitslag wegschrijven naar de groep (Supabase) =====
async function opslaanPotjeInGroep(groepcode, winnaarNaam, eindstand, gespeeldeRondes) {
  const { error } = await supabaseClient.from("potjes").insert({
    groepcode,
    winnaar: winnaarNaam,
    spelers: eindstand.map((rij) => rij.naam),
    eindstand,
    aantal_rondes: gespeeldeRondes,
  });

  if (error) {
    winnaarTekst.textContent += " (let op: kon niet naar de groep worden gesynchroniseerd — controleer je internet)";
    return;
  }

  // Het potje is afgerond, dus er loopt geen spel meer in deze groep
  verwijderLopendSpel(groepcode);
}

// ===== Geschiedenis (alleen winnaars, voor latere head-to-head-functie) =====
function opslaanGeschiedenis(winnaarNaam, alleSpelers) {
  const geschiedenis = JSON.parse(localStorage.getItem("sjoerdGeschiedenis") || "[]");
  geschiedenis.push({
    datum: new Date().toISOString(),
    winnaar: winnaarNaam,
    spelers: alleSpelers,
  });
  localStorage.setItem("sjoerdGeschiedenis", JSON.stringify(geschiedenis));
}

knopNieuwSpel.addEventListener("click", () => {
  groepActief = null;
  schermGameover.hidden = true;
  schermLopendSpel.hidden = true;
  syncInfo.hidden = true;
  schermModus.hidden = false;
  renderSpelerslijst(); // namen van vorig spel blijven staan, handig voor een volgende ronde
});

// ===== Statistieken-tab =====
// Alle potjes van alle groepen die op deze telefoon bekend zijn, één keer opgehaald.
// De keuzelijst bovenaan de tab bepaalt daarna wat er van getoond wordt.
let statsPotjes = [];

async function laadStatistieken() {
  statsFoutTekst.hidden = true;
  const mijnGroepen = haalMijnGroepenOp();

  if (mijnGroepen.length === 0) {
    statsGeenGroepen.hidden = false;
    statsInhoud.hidden = true;
    return;
  }

  statsGeenGroepen.hidden = true;
  statsInhoud.hidden = true;
  statsLadenTekst.hidden = false;

  const { data, error } = await supabaseClient
    .from("potjes")
    .select("groepcode, winnaar, spelers, eindstand, aantal_rondes, datum")
    .in("groepcode", mijnGroepen.map((g) => g.code));

  statsLadenTekst.hidden = true;

  if (error) {
    statsFoutTekst.textContent = "Kon statistieken niet ophalen. Controleer je internetverbinding.";
    statsFoutTekst.hidden = false;
    return;
  }

  statsPotjes = data || [];
  statsInhoud.hidden = false;

  const vorigeKeuze = selectStatsGroep.value;
  selectStatsGroep.innerHTML = "";
  mijnGroepen.forEach((groep) => {
    const optie = document.createElement("option");
    optie.value = groep.code;
    optie.textContent = groep.naam ? `${groep.naam} (${groep.code})` : groep.code;
    optie.dataset.kortenaam = groep.naam || groep.code; // zonder code, voor de kopjes
    selectStatsGroep.appendChild(optie);
  });
  if (mijnGroepen.length > 1) {
    const optieAlle = document.createElement("option");
    optieAlle.value = "alle";
    optieAlle.textContent = "Alle groepen samen";
    selectStatsGroep.appendChild(optieAlle);
  }
  // Keuze van de vorige keer vasthouden als die er nog is
  if ([...selectStatsGroep.options].some((o) => o.value === vorigeKeuze)) {
    selectStatsGroep.value = vorigeKeuze;
  }

  selectStatsGroep.onchange = renderStatistieken;
  renderStatistieken();
}

function renderStatistieken() {
  const keuze = selectStatsGroep.value;
  const potjes = keuze === "alle" ? statsPotjes : statsPotjes.filter((p) => p.groepcode === keuze);
  const scopeNaam = keuze === "alle" ? "al je groepen" : selectStatsGroep.selectedOptions[0].dataset.kortenaam;

  const scopeZin = keuze === "alle" ? "over al je groepen" : `in ${scopeNaam}`;
  statsScopeTekst.textContent = potjes.length === 1
    ? `1 potje gespeeld ${scopeZin}`
    : `${potjes.length} potjes gespeeld ${scopeZin}`;

  statsRanglijstKop.textContent = `Ranglijst — ${scopeNaam}`;
  statsPersoonlijkKop.textContent = `Jouw onderlinge resultaten — ${scopeNaam}`;

  renderRanglijst(potjes);
  renderOnderlingeResultaten(potjes);
  renderLaatstePotjes(potjes);
}

function renderRanglijst(potjes) {
  const perSpeler = {};

  potjes.forEach((potje) => {
    (potje.spelers || []).forEach((naam) => {
      if (!perSpeler[naam]) {
        perSpeler[naam] = { potjes: 0, gewonnen: 0, somEindscore: 0, metEindstand: 0, nulRondes: 0 };
      }
      perSpeler[naam].potjes += 1;
      if (potje.winnaar === naam) perSpeler[naam].gewonnen += 1;
    });

    // Eindstand is er alleen bij potjes van na deze uitbreiding
    (potje.eindstand || []).forEach((rij) => {
      const cijfers = perSpeler[rij.naam];
      if (!cijfers) return;
      cijfers.somEindscore += rij.totaal;
      cijfers.metEindstand += 1;
      cijfers.nulRondes += rij.nulRondes || 0;
    });
  });

  const rijen = Object.entries(perSpeler).sort((a, b) => {
    if (b[1].gewonnen !== a[1].gewonnen) return b[1].gewonnen - a[1].gewonnen;
    return b[1].gewonnen / b[1].potjes - a[1].gewonnen / a[1].potjes;
  });

  statsRanglijstBody.innerHTML = "";
  if (rijen.length === 0) {
    statsRanglijstBody.innerHTML = "<tr><td colspan='7'>Nog geen potjes gespeeld.</td></tr>";
    statsOudePotjesUitleg.hidden = true;
    return;
  }

  rijen.forEach(([naam, cijfers], index) => {
    const winPercentage = Math.round((cijfers.gewonnen / cijfers.potjes) * 100);
    const gemEindscore = cijfers.metEindstand > 0
      ? Math.round(cijfers.somEindscore / cijfers.metEindstand)
      : "–";
    const nulRondes = cijfers.metEindstand > 0 ? cijfers.nulRondes : "–";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="kolom-positie">${index + 1}</td>
      <td>${naam}</td>
      <td class="kolom-getal">${cijfers.potjes}</td>
      <td class="kolom-getal">${cijfers.gewonnen}</td>
      <td class="kolom-getal">${winPercentage}%</td>
      <td class="kolom-getal">${gemEindscore}</td>
      <td class="kolom-getal">${nulRondes}</td>
    `;
    statsRanglijstBody.appendChild(tr);
  });

  const aantalZonderEindstand = potjes.filter((p) => !p.eindstand).length;
  statsOudePotjesUitleg.textContent = aantalZonderEindstand === 1
    ? "Van 1 ouder potje is alleen de winnaar bewaard, dus dat potje telt niet mee voor de gemiddelde eindscore en de 0-rondes."
    : `Van ${aantalZonderEindstand} oudere potjes is alleen de winnaar bewaard, dus die tellen niet mee voor de gemiddelde eindscore en de 0-rondes.`;
  statsOudePotjesUitleg.hidden = aantalZonderEindstand === 0;
}

function renderOnderlingeResultaten(potjes) {
  const mijnNaam = haalMijnNaamOp();
  statsPersoonlijkBody.innerHTML = "";

  if (!mijnNaam) {
    statsPersoonlijkBody.innerHTML = "<tr><td colspan='5'>Nog geen eigen naam ingesteld.</td></tr>";
    return;
  }

  const tegenstanders = {};
  potjes
    .filter((potje) => (potje.spelers || []).includes(mijnNaam))
    .forEach((potje) => {
      potje.spelers.forEach((naam) => {
        if (naam === mijnNaam) return;
        if (!tegenstanders[naam]) tegenstanders[naam] = { samen: 0, ikWon: 0, hijWon: 0 };
        tegenstanders[naam].samen += 1;
        if (potje.winnaar === mijnNaam) tegenstanders[naam].ikWon += 1;
        if (potje.winnaar === naam) tegenstanders[naam].hijWon += 1;
      });
    });

  const rijen = Object.entries(tegenstanders).sort((a, b) => b[1].samen - a[1].samen);

  if (rijen.length === 0) {
    statsPersoonlijkBody.innerHTML = `<tr><td colspan='5'>Nog geen potjes waarin "${mijnNaam}" meespeelde.</td></tr>`;
    return;
  }

  rijen.forEach(([naam, cijfers]) => {
    const winPercentage = Math.round((cijfers.ikWon / cijfers.samen) * 100);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${naam}</td>
      <td class="kolom-getal">${cijfers.samen}</td>
      <td class="kolom-getal">${cijfers.ikWon}</td>
      <td class="kolom-getal">${cijfers.hijWon}</td>
      <td class="kolom-getal">${winPercentage}%</td>
    `;
    statsPersoonlijkBody.appendChild(tr);
  });
}

function renderLaatstePotjes(potjes) {
  statsRecentBody.innerHTML = "";

  if (potjes.length === 0) {
    statsRecentBody.innerHTML = "<tr><td colspan='3'>Nog geen potjes gespeeld.</td></tr>";
    return;
  }

  [...potjes]
    .sort((a, b) => new Date(b.datum) - new Date(a.datum))
    .slice(0, 10)
    .forEach((potje) => {
      const datum = new Date(potje.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${datum}</td><td>${potje.winnaar}</td><td>${(potje.spelers || []).join(", ")}</td>`;
      statsRecentBody.appendChild(tr);
    });
}

// ===== Start =====
// Grens van het vorige spel voorstellen, zodat je die niet elke keer opnieuw instelt
invoerDoelpunten.value = localStorage.getItem(LAATSTE_DOELPUNTEN_KEY) || String(STANDAARD_DOELPUNTEN);
renderSpelerslijst();

// Service worker registreren zodat de app offline werkt en installeerbaar is
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}
