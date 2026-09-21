// ===== Sjoerd scorebord — spellogica =====

// --- Status van de app (in het geheugen, niet opgeslagen tussen ronden) ---
let setupNamen = [];      // namen die op het setup-scherm staan
let spelers = [];         // [{ naam, totaal }] tijdens een lopend spel
let ronde = 1;
let scorehouder = null;   // naam van de speler die verloor in ronde 1
let rondeSnapshots = [];  // kopieën van de status vóór elke ronde, voor "ongedaan maken"

// --- DOM-elementen ---
const el = (id) => document.getElementById(id);

const tabKnoppen = document.querySelectorAll(".tab-knop");
const tabInhouden = document.querySelectorAll(".tab-inhoud");

const schermSetup = el("scherm-setup");
const schermSpel = el("scherm-spel");
const schermGameover = el("scherm-gameover");

const spelerslijstEl = el("spelerslijst");
const formSpelerToevoegen = el("form-speler-toevoegen");
const invoerSpelernaam = el("invoer-spelernaam");
const knopStartSpel = el("knop-start-spel");
const setupFoutmelding = el("setup-foutmelding");

const scorebordBody = el("scorebord-body");
const delerInfo = el("deler-info");
const scorehouderInfo = el("scorehouder-info");

const rondeTitel = el("ronde-titel");
const selectSjoerd = el("select-sjoerd");
const puntenInvoerLijst = el("punten-invoer-lijst");
const rondeFoutmelding = el("ronde-foutmelding");
const knopRondeVerwerken = el("knop-ronde-verwerken");
const knopRondeOngedaan = el("knop-ronde-ongedaan");

const winnaarTekst = el("winnaar-tekst");
const eindstandBody = el("eindstand-body");
const knopNieuwSpel = el("knop-nieuw-spel");

// ===== Tabs (Scorebord / Uitleg) =====
tabKnoppen.forEach((knop) => {
  knop.addEventListener("click", () => {
    tabKnoppen.forEach((k) => k.classList.remove("actief"));
    tabInhouden.forEach((t) => t.classList.remove("actief"));
    knop.classList.add("actief");
    el(`tab-${knop.dataset.tab}`).classList.add("actief");
  });
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
}

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
  spelers = setupNamen.map((naam) => ({ naam, totaal: 0 }));
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

  selectSjoerd.innerHTML = "";
  spelers.forEach((speler) => {
    const optie = document.createElement("option");
    optie.value = speler.naam;
    optie.textContent = speler.naam;
    selectSjoerd.appendChild(optie);
  });

  puntenInvoerLijst.innerHTML = "";
  spelers.forEach((speler) => {
    const rij = document.createElement("div");
    rij.className = "punten-invoer-rij";
    rij.innerHTML = `
      <span>${speler.naam}</span>
      <input type="number" min="0" step="1" class="punten-invoer" data-naam="${speler.naam}" placeholder="punten">
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
knopRondeVerwerken.addEventListener("click", () => {
  rondeFoutmelding.hidden = true;

  const sjoerdNaam = selectSjoerd.value;
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

  const zeggerPunten = puntenPerSpeler[sjoerdNaam];
  if (zeggerPunten > 7) {
    rondeFoutmelding.textContent = `"Sjoerd" roepen mag alleen met 7 punten of minder in je hand.`;
    rondeFoutmelding.hidden = false;
    return;
  }

  maakSnapshot();

  const minAll = Math.min(...Object.values(puntenPerSpeler));
  const isEersteRonde = ronde === 1;
  let hoogsteRondeScore = -Infinity;
  let verliezerRonde1 = null;

  spelers.forEach((speler) => {
    const punten = puntenPerSpeler[speler.naam];
    let rondeScore;

    if (speler.naam === sjoerdNaam) {
      // Zegger krijgt 0 punten als hij (gelijk aan) de laagste is, anders straf
      rondeScore = punten === minAll ? 0 : punten + 15;
    } else {
      // Alleen bij een sjoerd-straf krijgt de écht laagste speler 0 punten
      rondeScore = zeggerPunten > minAll && punten === minAll ? 0 : punten;
    }

    speler.totaal += rondeScore;

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
    tr.innerHTML = `<td>${speler.naam}</td><td>${speler.totaal}</td>`;
    eindstandBody.appendChild(tr);
  });

  opslaanGeschiedenis(winnaar.naam, spelers.map((s) => s.naam));
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
  schermGameover.hidden = true;
  schermSetup.hidden = false;
  renderSpelerslijst(); // namen van vorig spel blijven staan, handig voor een volgende ronde
});

// ===== Start =====
renderSpelerslijst();

// Service worker registreren zodat de app offline werkt en installeerbaar is
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}
