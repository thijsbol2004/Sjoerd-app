// ===== Sjoerd scorebord — spellogica =====

// --- Status van de app (in het geheugen, niet opgeslagen tussen ronden) ---
let setupNamen = [];      // namen die op het setup-scherm staan
let spelers = [];         // [{ naam, totaal, aantalKeerNul }] tijdens een lopend spel
let ronde = 1;
let scorehouder = null;   // naam van de speler die verloor in ronde 1
let rondeSnapshots = [];  // kopieën van de status vóór elke ronde, voor "ongedaan maken"

const LAATSTE_SPELERS_KEY = "sjoerdLaatsteSpelers"; // onthoudt de spelerslijst van het vorige spel
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

const statsLadenTekst = el("stats-laden-tekst");
const statsFoutTekst = el("stats-fout-tekst");
const statsGeenGroepen = el("stats-geen-groepen");
const statsInhoud = el("stats-inhoud");
const selectStatsGroep = el("select-stats-groep");
const statsGroepBody = el("stats-groep-body");
const statsPersoonlijkBody = el("stats-persoonlijk-body");

const spelerslijstEl = el("spelerslijst");
const formSpelerToevoegen = el("form-speler-toevoegen");
const invoerSpelernaam = el("invoer-spelernaam");
const knopStartSpel = el("knop-start-spel");
const knopVorigeSpelers = el("knop-vorige-spelers");
const setupFoutmelding = el("setup-foutmelding");

const scorebordBody = el("scorebord-body");
const delerInfo = el("deler-info");
const scorehouderInfo = el("scorehouder-info");

const rondeTitel = el("ronde-titel");
const puntenInvoerLijst = el("punten-invoer-lijst");
const rondeFoutmelding = el("ronde-foutmelding");
const knopRondeVerwerken = el("knop-ronde-verwerken");
const knopRondeOngedaan = el("knop-ronde-ongedaan");

const winnaarTekst = el("winnaar-tekst");
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

function gaNaarSetup() {
  schermMijnNaam.hidden = true;
  actieveGroepInfo.hidden = !groepActief;
  actieveGroepInfo.textContent = groepActief
    ? `Groep: ${groepActief.naam ? `${groepActief.naam} (${groepActief.code})` : groepActief.code}`
    : "";
  schermSetup.hidden = false;
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

// ===== Setup-scherm: spelers toevoegen/verwijderen =====
function renderSpelerslijst() {
  spelerslijstEl.innerHTML = "";
  setupNamen.forEach((naam, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${naam}</span>`;
    const verwijderKnop = document.createElement("button");
    verwijderKnop.textContent = "✕";
    verwijderKnop.setAttribute("aria-label", `Verwijder ${naam}`);
    verwijderKnop.addEventListener("click", () => {
      setupNamen.splice(index, 1);
      renderSpelerslijst();
    });
    li.appendChild(verwijderKnop);
    spelerslijstEl.appendChild(li);
  });
  knopStartSpel.disabled = setupNamen.length < 2;

  // "Vorige spelers ophalen" alleen tonen als de lijst nu leeg is en er iets bewaard is
  const laatsteSpelers = JSON.parse(localStorage.getItem(LAATSTE_SPELERS_KEY) || "[]");
  knopVorigeSpelers.hidden = setupNamen.length > 0 || laatsteSpelers.length === 0;
}

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
  invoerSpelernaam.value = "";
  invoerSpelernaam.focus();
  renderSpelerslijst();
});

knopStartSpel.addEventListener("click", () => {
  localStorage.setItem(LAATSTE_SPELERS_KEY, JSON.stringify(setupNamen));

  spelers = setupNamen.map((naam) => ({ naam, totaal: 0, aantalKeerNul: 0 }));
  ronde = 1;
  scorehouder = null;
  rondeSnapshots = [];

  schermSetup.hidden = true;
  schermGameover.hidden = true;
  schermSpel.hidden = false;

  renderScorebord();
  renderRondeFormulier();
});

// ===== Scorebord weergeven =====
function renderScorebord() {
  scorebordBody.innerHTML = "";
  spelers.forEach((speler) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${speler.naam}</td><td>${speler.totaal}</td>`;
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
      <input type="number" min="0" step="1" class="punten-invoer" data-naam="${speler.naam}" placeholder="score">
    `;
    puntenInvoerLijst.appendChild(rij);
  });

  knopRondeOngedaan.disabled = rondeSnapshots.length === 0;
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

  const speelKlaar = spelers.some((s) => s.totaal >= 100);
  if (speelKlaar) {
    toonSpelAfgelopen();
  } else {
    renderScorebord();
    renderRondeFormulier();
  }
});

// ===== Spel afgelopen =====
function toonSpelAfgelopen() {
  const gesorteerd = [...spelers].sort((a, b) => a.totaal - b.totaal);
  const winnaar = gesorteerd[0];

  schermSpel.hidden = true;
  schermGameover.hidden = false;

  winnaarTekst.textContent = `${winnaar.naam} wint met ${winnaar.totaal} punten!`;

  eindstandBody.innerHTML = "";
  gesorteerd.forEach((speler) => {
    const tr = document.createElement("tr");
    if (speler.naam === winnaar.naam) tr.classList.add("rij-winnaar");
    tr.innerHTML = `<td>${speler.naam}</td><td>${speler.totaal}</td><td>${speler.aantalKeerNul}</td>`;
    eindstandBody.appendChild(tr);
  });

  opslaanGeschiedenis(winnaar.naam, spelers.map((s) => s.naam));

  if (groepActief) {
    opslaanPotjeInGroep(groepActief.code, winnaar.naam, spelers.map((s) => s.naam));
  }
}

// ===== Potje-uitslag wegschrijven naar de groep (Supabase) =====
async function opslaanPotjeInGroep(groepcode, winnaarNaam, alleSpelers) {
  const { error } = await supabaseClient.from("potjes").insert({
    groepcode,
    winnaar: winnaarNaam,
    spelers: alleSpelers,
  });
  if (error) {
    winnaarTekst.textContent += " (let op: kon niet naar de groep worden gesynchroniseerd — controleer je internet)";
  }
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
  schermModus.hidden = false;
  renderSpelerslijst(); // namen van vorig spel blijven staan, handig voor een volgende ronde
});

// ===== Statistieken-tab =====
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

  const codes = mijnGroepen.map((g) => g.code);
  const { data: potjes, error } = await supabaseClient
    .from("potjes")
    .select("groepcode, winnaar, spelers, datum")
    .in("groepcode", codes);

  statsLadenTekst.hidden = true;

  if (error) {
    statsFoutTekst.textContent = "Kon statistieken niet ophalen. Controleer je internetverbinding.";
    statsFoutTekst.hidden = false;
    return;
  }

  statsInhoud.hidden = false;

  selectStatsGroep.innerHTML = "";
  mijnGroepen.forEach((groep) => {
    const optie = document.createElement("option");
    optie.value = groep.code;
    optie.textContent = groep.naam ? `${groep.naam} (${groep.code})` : groep.code;
    selectStatsGroep.appendChild(optie);
  });

  selectStatsGroep.onchange = () => renderGroepStatistieken(potjes, selectStatsGroep.value);
  renderGroepStatistieken(potjes, selectStatsGroep.value);
  renderPersoonlijkeStatistieken(potjes);
}

function renderGroepStatistieken(potjes, groepcode) {
  const potjesInGroep = potjes.filter((p) => p.groepcode === groepcode);
  const overwinningen = {};
  potjesInGroep.forEach((p) => {
    overwinningen[p.winnaar] = (overwinningen[p.winnaar] || 0) + 1;
  });
  const gesorteerd = Object.entries(overwinningen).sort((a, b) => b[1] - a[1]);

  statsGroepBody.innerHTML = "";
  if (gesorteerd.length === 0) {
    statsGroepBody.innerHTML = "<tr><td colspan='2'>Nog geen potjes gespeeld in deze groep.</td></tr>";
    return;
  }
  gesorteerd.forEach(([naam, aantal]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${naam}</td><td>${aantal}</td>`;
    statsGroepBody.appendChild(tr);
  });
}

function renderPersoonlijkeStatistieken(potjes) {
  const mijnNaam = haalMijnNaamOp();
  statsPersoonlijkBody.innerHTML = "";

  if (!mijnNaam) {
    statsPersoonlijkBody.innerHTML = "<tr><td colspan='3'>Nog geen naam ingesteld.</td></tr>";
    return;
  }

  const mijnPotjes = potjes.filter((p) => p.spelers.includes(mijnNaam));
  const tegenstanders = {};

  mijnPotjes.forEach((p) => {
    const ikWon = p.winnaar === mijnNaam;
    p.spelers.forEach((speler) => {
      if (speler === mijnNaam) return;
      if (!tegenstanders[speler]) tegenstanders[speler] = { samen: 0, gewonnen: 0 };
      tegenstanders[speler].samen += 1;
      if (ikWon) tegenstanders[speler].gewonnen += 1;
    });
  });

  const gesorteerd = Object.entries(tegenstanders).sort((a, b) => b[1].samen - a[1].samen);

  if (gesorteerd.length === 0) {
    statsPersoonlijkBody.innerHTML = "<tr><td colspan='3'>Nog geen potjes gespeeld.</td></tr>";
    return;
  }
  gesorteerd.forEach(([naam, cijfers]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${naam}</td><td>${cijfers.samen}</td><td>${cijfers.gewonnen}</td>`;
    statsPersoonlijkBody.appendChild(tr);
  });
}

// ===== Start =====
renderSpelerslijst();

// Service worker registreren zodat de app offline werkt en installeerbaar is
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}
