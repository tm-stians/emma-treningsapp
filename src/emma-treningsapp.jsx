import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://okqygpxumkkolpyrlvdj.supabase.co";
const SUPABASE_ANON = "sb_publishable_Z9W1fldGlGrNFABLNa_oxg_fsN7PC7J";
const CORRECT_PIN = "5726";
const USER_ID = "emma";

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_ANON,
      "Authorization": `Bearer ${SUPABASE_ANON}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
      ...(options.headers || {}),
    },
  });
  if (res.status === 204 || res.status === 201) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const C = {
  bg: "#0F1117", card: "#1A1D27", card2: "#22263A", border: "#2E3347",
  text: "#F0F2FF", muted: "#6B7280",
  styrke: "#58A6FF", styrkeBg: "#0A1929",
  ankel: "#34D399", ankelBg: "#052E16",
  reaktiv: "#C084FC", reaktivBg: "#1A0533",
  travel: "#FBBF24", travelBg: "#1C1400",
  bridge: "#FB923C", bridgeBg: "#1C0A00",
  retest: "#60A5FA", done: "#22C55E",
};

const typeStyle = {
  styrke: { color: C.styrke, bg: C.styrkeBg },
  ankel: { color: C.ankel, bg: C.ankelBg },
  reaktiv: { color: C.reaktiv, bg: C.reaktivBg },
  travel: { color: C.travel, bg: C.travelBg },
  bridge: { color: C.bridge, bg: C.bridgeBg },
  rest: { color: C.muted, bg: C.card2 },
  retest: { color: C.retest, bg: C.styrkeBg },
};

// ── 10-UKERS PERIODISERING — NYBEGYNNER-TILPASSET ──────────────────────────
// Fase 1 (uke 1–2): Teknikk. 2 styrkeøkter/uke. 3–4 øvelser. Ankel 3x/uke. Ingen plyo.
// Fase 2 (uke 3–4): Introduksjon. 2 styrkeøkter + 1 lett plyo. Ankel 4x/uke.
// Fase 3 (uke 5–7): Toppbelastning. 3 styrkeøkter. Full plyo. Ankel daglig.
// Uke 4: Reise — kroppsvekt
// Fase 4 (uke 8–9): Bro til sesong
// Uke 10: Retest

const WEEKS = [
  { week: 1, label: "Teknikk I", location: "🏠 Hjemme", type: "intro1", desc: "Lær bevegelsene. 2 styrkeøkter + lett plyo. Ankelhopp og myke landinger." },
  { week: 2, label: "Teknikk II", location: "🌊 Istria", type: "intro1", desc: "Istria — mer vekt på styrke. Mer volum på plyo. Intro til pogo." },
  { week: 3, label: "Oppbygging I", location: "🌊 Istria", type: "intro2", desc: "Istria — plyo 3x/uke nå. Reaktivhopp intro. Ankel økes til 4x/uke." },
  { week: 4, label: "Reiseuke", location: "🚗 På veien", type: "travel", desc: "Ingen fasiliteter. Kun kroppsvekt på hotellrom/uteområde." },
  { week: 5, label: "Oppbygging II", location: "🏠 Hjemme", type: "intro2", desc: "Hjemme igjen. Gjenstart på uke 3-nivå — ikke rush opp." },
  { week: 6, label: "Toppbelastning I", location: "🏠 Hjemme", type: "full", desc: "3 styrkeøkter. Full plyo. Ankel daglig. Her gir vi alt." },
  { week: 7, label: "Toppbelastning II", location: "🏠 Hjemme", type: "full", desc: "Hardeste uke. Øk vekt fra uke 6. Push deg!" },
  { week: 8, label: "Toppbelastning III", location: "🏠 Hjemme", type: "full", desc: "Siste tunge uke før bro. Hold trykket oppe." },
  { week: 9, label: "Bro til sesong", location: "🏀 Sesongstart", type: "bridge", desc: "Reduser volum 20%. Basketball inn igjen. Kroppen skal være frisk." },
  { week: 10, label: "Retest", location: "📊 Trimmen", type: "retest", desc: "VALD ForceDecks — sammenlign med juni 2026." },
];

// ── UKESSTRUKTUR ──────────────────────────────────────────────
// intro1: 2 styrkeøkter (man/fre), ankel man/ons/fre — ingen plyo
// intro2: 2 styrkeøkter (man/fre) + 1 plyo (ons), ankel man/ons/fre/lor
// full:   3 styrkeøkter (man/ons/fre) + plyo (man/fre) + ankel daglig
// travel, bridge, retest: som før

const SESSION_MAP = {
  intro1: {
    1: ["styrke-a", "plyo-intro", "ankel-lett"],
    3: ["ankel-lett"],
    5: ["styrke-b", "plyo-intro", "ankel-lett"],
  },
  intro2: {
    1: ["styrke-a", "plyo-intro", "ankel-lett"],
    3: ["plyo-intro", "ankel-lett"],
    5: ["styrke-b", "plyo-intro", "ankel-lett"],
    6: ["ankel-lett"],
  },
  full: {
    1: ["styrke-a", "plyo", "ankel"],
    3: ["styrke-b", "ankel"],
    5: ["styrke-a", "plyo", "ankel"],
    6: ["ankel"],
    7: ["ankel"],
  },
  travel: {
    1: ["reise"], 3: ["reise"], 5: ["reise"],
  },
  bridge: {
    1: ["bro-styrke", "ankel-lett"],
    3: ["bro-styrke"],
    5: ["plyo-intro", "ankel-lett"],
  },
  retest: { 1: ["retest"] },
};

const SESSION_META = {
  "styrke-a":    { name: "Styrke A",          type: "styrke"  },
  "styrke-b":    { name: "Styrke B",          type: "styrke"  },
  "plyo":        { name: "Plyometri",         type: "reaktiv" },
  "plyo-intro":  { name: "Plyometri (intro)", type: "reaktiv" },
  "ankel":       { name: "Ankelprotokoll",    type: "ankel"   },
  "ankel-lett":  { name: "Ankel (lett)",      type: "ankel"   },
  "reise":       { name: "Kroppsvekt",        type: "travel"  },
  "bro-styrke":  { name: "Styrke (lett)",     type: "bridge"  },
  "retest":      { name: "VALD Retest",       type: "retest"  },
};

// ── ØVELSESBIBLIOTEK ──────────────────────────────────────────
const EXERCISES = {

  // ── STYRKE A ──────────────────────────────────────────────
  "styrke-a": {
    // Fase 1 (uke 1–2): 4 øvelser, teknikk
    fase1: [
      {
        id:"goblet", name:"Goblet knebøy",
        sets:"3×8", load:"8–12 kg", weight:"8–12 kg",
        group:"1A", supersetNote:"Supersett med 1B — gjør 1A, hvil 60 sek, gjør 1B, hvil 60 sek, gjenta",
        note:"Teknikk-fokus. Ryggen rett, brystet oppe.",
        desc:"Hold en kettlebell eller manuell inntil brystet. Stå skulderbredde og senk deg ned til lårene er parallelle. Fokus på rett rygg og at knærne følger tærne.",
        video:"https://youtu.be/9coUk68haz0"
      },
      {
        id:"calf-r", name:"Enkeltbens hælhev — høyre",
        sets:"3×12", load:"Kroppsvekt", weight:null,
        group:"1B", supersetNote:"Supersett med 1A",
        note:"3 sek ned, opp raskt. Høyre er svakere.",
        desc:"Stå på høyre fot på kanten av en trappetrinn. Senk hælen sakte i 3 sekunder, deretter opp så raskt som mulig. Hold balansen lett mot veggen.",
        video:"https://youtu.be/gwLzBJYoWlI"
      },
      {
        id:"rdl", name:"Romanian deadlift",
        sets:"3×8", load:"15–20 kg", weight:"15–20 kg",
        group:"2A", supersetNote:"Supersett med 2B — gjør 2A, hvil 60 sek, gjør 2B, hvil 60 sek, gjenta",
        note:"3 sek ned. Hoften bakover, ikke ned.",
        desc:"Hold stang eller manualene foran låra. Heng fremover fra hofta med lett bøy i knærne og kjenn strekkingen i bakside lår. Stanga nær kroppen hele veien ned og opp.",
        video:"https://youtu.be/tat438g2B90"
      },
      {
        id:"hipth", name:"Hip thrust",
        sets:"3×10", load:"20–30 kg", weight:"20–30 kg",
        group:"2B", supersetNote:"Supersett med 2A",
        note:"Klem setemusklene hardt i topp.",
        desc:"Legg skuldrene mot en benk med stang over hofta. Press hofta rett opp til kroppen er flat som et bord. Hold 1 sekund i topp og klem setemusklene aktivt.",
        video:"https://youtu.be/xDmFkJxPzeM"
      },
    ],
    // Fase 2 (uke 3, 5): 5 øvelser, litt mer krevende
    fase2: [
      {
        id:"goblet2", name:"Goblet knebøy",
        sets:"3×10", load:"12–16 kg", weight:"12–16 kg",
        group:"1A", supersetNote:"Supersett med 1B — gjør 1A, hvil 60 sek, gjør 1B, hvil 60 sek, gjenta",
        note:"Dypere nå — jobb mot full dybde.",
        desc:"Samme teknikk som uke 1–2, men mer vekt og dypere. Målet er at lårene går under parallell. Hold ryggen nøytral hele veien.",
        video:"https://youtu.be/9coUk68haz0"
      },
      {
        id:"calf-r2", name:"Enkeltbens hælhev m/vekt — høyre",
        sets:"3×12", load:"5–8 kg i hånd", weight:"5–8 kg",
        group:"1B", supersetNote:"Supersett med 1A",
        note:"Høyre: med vekt. Venstre: kroppsvekt.",
        desc:"Hold en lett manuell i høyre hånd for ekstra motstand. Høyre ankel er 24% svakere — vi bruker mer belastning på denne siden for å utjevne.",
        video:"https://youtu.be/gwLzBJYoWlI"
      },
      {
        id:"rdl2", name:"Romanian deadlift",
        sets:"3×10", load:"25–35 kg", weight:"25–35 kg",
        group:"2A", supersetNote:"Supersett med 2B — gjør 2A, hvil 60 sek, gjør 2B, hvil 60 sek, gjenta",
        note:"Hamstring skal brenne — det er riktig.",
        desc:"Mer belastning enn uke 1–2. Stanga nær kroppen, hoften bakover. Kjenn tydelig strekk i bakside lår nederst i bevegelsen.",
        video:"https://youtu.be/tat438g2B90"
      },
      {
        id:"hipth2", name:"Hip thrust",
        sets:"4×10", load:"40–55 kg", weight:"40–55 kg",
        group:"2B", supersetNote:"Supersett med 2A",
        note:"Tyngre nå. Klem 2 sek i topp.",
        desc:"Økt belastning og ett ekstra sett. Hold 2 sekunder i topp med aktiv klemming av setemusklene. Dette er en av de viktigste øvelsene for basketball.",
        video:"https://youtu.be/xDmFkJxPzeM"
      },
      {
        id:"stepup", name:"Step-up m/vekt — høyre først",
        sets:"3×8 per bein", load:"6–10 kg per hånd", weight:"6–10 kg/hånd",
        group:null,
        note:"Én og én — full hvil mellom sett.",
        desc:"Hold manualene langs siden. Sett høyre fot opp på benken og press deg opp kun med høyre bein. Ikke dytt fra med bakfoten. Kontroller nedgangen.",
        video:"https://youtu.be/5zJHHLsE8Ok"
      },
    ],
    // Fase 3 (uke 6–7): 5 øvelser, fullt volum
    fase3: [
      {
        id:"trapbar", name:"Trapbar markløft",
        sets:"4×5", load:"40–55 kg (RPE 8)", weight:"40–55 kg",
        group:null, solo:true,
        note:"Én og én — 2–3 min hvil mellom sett. Aldri i supersett.",
        desc:"Stå inni trapbaren med føttene under hofta. Press gulvet ned og løft ved å strekke hofta og knærne samtidig. Ryggen nøytral og brystet fremover. Øk vekten litt hver uke.",
        video:"https://youtu.be/sqjgTMkHRyM"
      },
      {
        id:"rdl3", name:"Romanian deadlift",
        sets:"4×6", load:"35–50 kg", weight:"35–50 kg",
        group:"1A", supersetNote:"Supersett med 1B — gjør 1A, hvil 60 sek, gjør 1B, hvil 60 sek, gjenta",
        note:"Tyngst du kan med god teknikk.",
        desc:"Full hamstring-fokus med tyngre belastning. Stanga nær kroppen, hoften bakover. Ikke gå tyngre hvis ryggen runder.",
        video:"https://youtu.be/tat438g2B90"
      },
      {
        id:"hipth3", name:"Hip thrust m/pause",
        sets:"4×8", load:"55–70 kg", weight:"55–70 kg",
        group:"1B", supersetNote:"Supersett med 1A",
        note:"2 sek pause i topp. Gluteus maks.",
        desc:"Tyngst vi har gjort hittil. Hold 2 sekunder i topp med maks klemming. Dette er den øvelsen som mest direkte bygger setemusklene for basketball.",
        video:"https://youtu.be/xDmFkJxPzeM"
      },
      {
        id:"imtp", name:"Isometrisk midthogg (IMTP)",
        sets:"3×3 × 5 sek", load:"Maks innsats", weight:null,
        group:null, solo:true,
        note:"Én og én — 2–3 min hvil. Maks innsats krever full restitusjon.",
        desc:"Still stangen fast i et stativ i midthogg-posisjon (mot knærne). Trekk oppover med absolutt maks kraft i 5 sekunder. Dette etterligner VALD-testen og bygger direkte maks-styrke.",
        video:"https://youtu.be/quDsJFbsOwE"
      },
      {
        id:"calf-r3", name:"Enkeltbens hælhev m/vekt — høyre",
        sets:"4×12", load:"8–12 kg", weight:"8–12 kg",
        group:null,
        note:"Høyre tungt. Venstre vedlikehold (3×10, lett) etterpå.",
        desc:"Tyngste ankelbelastning i programmet. Høyre side er fortsatt prioritert. Gjør også 3×10 venstre med 2–5 kg etterpå som vedlikehold.",
        video:"https://youtu.be/gwLzBJYoWlI"
      },
    ],
  },

  // ── STYRKE B ──────────────────────────────────────────────
  "styrke-b": {
    fase1: [
      {
        id:"splitt", name:"Splittknebøy",
        sets:"3×8 per bein", load:"Kroppsvekt", weight:null,
        group:"1A", supersetNote:"Supersett med 1B — gjør 1A, hvil 60 sek, gjør 1B, hvil 60 sek, gjenta",
        note:"Start uten vekt — lær balansen først.",
        desc:"Ta et langt skritt frem. Senk bakkneet mot gulvet til begge kne er 90 grader. Press opp med fremre bein. Ingen vekter de første ukene — fokus på balanse og posisjon.",
        video:"https://youtu.be/uYumuL_G_V0"
      },
      {
        id:"balance1", name:"Balansestående — høyre bein",
        sets:"3×20 sek", load:"Øyne åpne", weight:null,
        group:"1B", supersetNote:"Supersett med 1A",
        note:"Start med øyne åpne. Lukk dem når det føles stabilt.",
        desc:"Stå på høyre fot med lett bøy i kneet. Hold hoften stabil. Begynn med åpne øyne og lutt dem etterhvert. Trener ankelstabilitet og kroppssans.",
        video:"https://youtu.be/6lCMIBqnXmk"
      },
      {
        id:"bench1", name:"Pushup",
        sets:"3×8", load:"Kroppsvekt", weight:null,
        group:"2A", supersetNote:"Supersett med 2B — gjør 2A, hvil 60 sek, gjør 2B, hvil 60 sek, gjenta",
        note:"Rett linje fra hæl til hode hele veien.",
        desc:"Hender litt bredere enn skulderbredde. Senk brystet mot gulvet med kontroll og press opp. Kjernen er stram — ingen sagning i midten. Start på knærne hvis dette er for tungt.",
        video:"https://youtu.be/SCVCLChPQFY"
      },
      {
        id:"plank1", name:"Planke",
        sets:"3×20 sek", load:"Kroppsvekt", weight:null,
        group:"2B", supersetNote:"Supersett med 2A",
        note:"Rett linje — ikke la hoften synke.",
        desc:"Hold plankeposisjon på underarmer og tær. Stram magen og setemusklene. Rett linje fra hæl til hode. 20 sekunder er nok i starten — øk gradvis.",
        video:"https://youtu.be/pSHjTRCQxIw"
      },
    ],
    fase2: [
      {
        id:"bulg1", name:"Bulgarsk splittknebøy",
        sets:"3×8 per bein", load:"6–10 kg per hånd", weight:"6–10 kg/hånd",
        group:"1A", supersetNote:"Supersett med 1B — gjør 1A, hvil 60 sek, gjør 1B, hvil 60 sek, gjenta",
        note:"Bakfoten på benk. Start høyre.",
        desc:"Legg bakfoten på en benk, fremfoten langt fremme. Hold lette manualene langs siden. Senk bakkneet mot gulvet. Mer krevende enn vanlig splittknebøy — ta det lett med vekten første gang.",
        video:"https://youtu.be/2C-uNgKwPLE"
      },
      {
        id:"balance2", name:"Balansestående — høyre bein",
        sets:"3×30 sek", load:"Øyne lukket", weight:null,
        group:"1B", supersetNote:"Supersett med 1A",
        note:"Nå lukker vi øynene.",
        desc:"Øyne lukket på høyre bein. Mye vanskeligere enn uke 1–2. Prøv å holde hoften stabil uten å synke til siden. Bruk en vegg nær deg de første gangene.",
        video:"https://youtu.be/6lCMIBqnXmk"
      },
      {
        id:"bench2", name:"Benkpress / pushup m/vekt",
        sets:"3×10", load:"25–35 kg", weight:"25–35 kg",
        group:"2A", supersetNote:"Supersett med 2B — gjør 2A, hvil 60 sek, gjør 2B, hvil 60 sek, gjenta",
        note:"Skulderblader sammentrukket.",
        desc:"Legg deg på benken. Hold stangen over brystet med litt bredere enn skulderbredde grep. Press opp mens skulderbladene er trukket sammen og ryggen er flat.",
        video:"https://youtu.be/SCVCLChPQFY"
      },
      {
        id:"plank2", name:"Planke + sidesteg m/band",
        sets:"3×20 sek + 12 rep", load:"Lett motstandsband", weight:null,
        group:"2B", supersetNote:"Supersett med 2A",
        note:"Kjernen stram under begge deler.",
        desc:"Hold planke i 20 sekunder. Deretter: band rundt anklene, ta 12 steg sidelengs med kontrollerte hofter. Trener kjernen og hofteabduktorene.",
        video:"https://youtu.be/pSHjTRCQxIw"
      },
      {
        id:"lat-ank", name:"Lateral ankelstabilitet m/band",
        sets:"3×12", load:"Lett motstandsband", weight:null,
        group:null,
        note:"Én og én — avslutt med dette.",
        desc:"Band rundt ankelen. Stå på ett bein og press foten ut mot siden mot bandets motstand. Disse musklene holder ankelen stabil ved landing og retningsskift i basketball.",
        video:"https://youtu.be/PG-TvRNxATs"
      },
    ],
    fase3: [
      {
        id:"nordic", name:"Nordic Hamstring curl",
        sets:"3×4", load:"Kroppsvekt", weight:null,
        group:null, solo:true,
        note:"Én og én — full hvil. Høy nevral krevning.",
        desc:"Kneel med føttene festet (partner eller under benk). Senk kroppen fremover så sakte du klarer. Brems med bakside lår — ikke armene. Skyv opp med hendene. Viktigste skadeforebyggende øvelse for bakside lår.",
        video:"https://youtu.be/d8AAPcAzCnY"
      },
      {
        id:"bulg2", name:"Bulgarsk splittknebøy",
        sets:"4×8 per bein", load:"10–16 kg per hånd", weight:"10–16 kg/hånd",
        group:"1A", supersetNote:"Supersett med 1B — gjør 1A, hvil 60 sek, gjør 1B, hvil 60 sek, gjenta",
        note:"Tyngst hittil. Start høyre alltid.",
        desc:"Mer vekt enn uke 3–5. Hold manualene langs siden. Fokus på at fremre kne ikke kollapser innover. Dette er en av de beste basketballspesifikke øvelsene.",
        video:"https://youtu.be/2C-uNgKwPLE"
      },
      {
        id:"balance3", name:"Balansestående — høyre bein",
        sets:"3×30 sek", load:"Øyne lukket / ustabilt underlag", weight:null,
        group:"1B", supersetNote:"Supersett med 1A",
        note:"Bruk balansebrett hvis tilgjengelig.",
        desc:"Øyne lukket på høyre bein, gjerne på et ustabilt underlag (balansebrett, sammenrullet håndkle). Maksimal utfordring for ankelstabilitet.",
        video:"https://youtu.be/6lCMIBqnXmk"
      },
      {
        id:"bench3", name:"Benkpress",
        sets:"3×8", load:"30–40 kg", weight:"30–40 kg",
        group:"2A", supersetNote:"Supersett med 2B — gjør 2A, hvil 60 sek, gjør 2B, hvil 60 sek, gjenta",
        note:"Kontrollert ned, eksplosivt opp.",
        desc:"Full benkpress med stang. Senk kontrollert til brystet og press eksplosivt opp. Skulderblader sammentrukket og ryggen flat mot benken.",
        video:"https://youtu.be/SCVCLChPQFY"
      },
      {
        id:"plank3", name:"Planke + sidesteg m/band",
        sets:"3×30 sek + 15 rep", load:"Middels motstandsband", weight:null,
        group:"2B", supersetNote:"Supersett med 2A",
        note:"Lenger planke og mer motstand nå.",
        desc:"30 sekunder planke + 15 sidelengs steg med sterkere band. Hold hoftene stabile og unngå at de synker under planken.",
        video:"https://youtu.be/pSHjTRCQxIw"
      },
    ],
  },

  // ── ANKEL LETT (uke 1–3, 5, 8–9) ──────────────────────────
  "ankel-lett": {
    fase1: [
      {
        id:"al-cr", name:"Enkeltbens hælhev — høyre",
        sets:"3×12", load:"Kroppsvekt", weight:null,
        note:"3 sek ned, opp raskt.",
        desc:"Stå på høyre fot på kanten av et trinn. Senk hælen i 3 sekunder og opp raskt. Høyre er svakere — alltid høyre først og mer volum enn venstre.",
        video:"https://youtu.be/gwLzBJYoWlI"
      },
      {
        id:"al-cl", name:"Enkeltbens hælhev — venstre",
        sets:"2×10", load:"Kroppsvekt", weight:null,
        note:"Vedlikehold — ikke øk.",
        desc:"Samme bevegelse på venstre fot men lavere dose. Vi vil at høyre skal ta igjen venstre i løpet av programmet.",
        video:"https://youtu.be/gwLzBJYoWlI"
      },
      {
        id:"al-bal", name:"Balansestående — høyre",
        sets:"3×20 sek", load:"Øyne åpne", weight:null,
        note:"Stabil hofte — ikke la den synke.",
        desc:"Stå på høyre fot med lett bøy i kneet. Start med åpne øyne. Hold hoften stabil. Trener propriosepsjon og ankelstabilitet.",
        video:"https://youtu.be/6lCMIBqnXmk"
      },
    ],
  },

  // ── ANKEL FULL (uke 6–7) ───────────────────────────────────
  "ankel": {
    fase1: [
      {
        id:"a-cr", name:"Enkeltbens hælhev m/vekt — høyre",
        sets:"4×12", load:"8–12 kg i hånd", weight:"8–12 kg",
        note:"Tung høyre. Venstre: 3×10 uten vekt.",
        desc:"Hold en manuell i høyre hånd. Full bevegelsesutslag fra senket til strekt. Høyre ankel jobber nå med ekstern belastning for å utjevne asymmetrien fra 24% mot 12%.",
        video:"https://youtu.be/gwLzBJYoWlI"
      },
      {
        id:"a-hop", name:"Ankelhopp — høyre bein",
        sets:"3×10", load:"Kroppsvekt", weight:null,
        note:"Kort kontakt — reaktivt.",
        desc:"Raske, stive ankelhopp på høyre bein. Minimal bøy i kne og hofte — all kraft fra ankelen. Myk landing og umiddelbart opp igjen.",
        video:"https://youtu.be/Yd9VXHRe5Dw"
      },
      {
        id:"a-lat", name:"Lateral ankelstabilitet m/band",
        sets:"3×15", load:"Motstandsband", weight:null,
        note:"Peroneus — holder ankelen stabil.",
        desc:"Band rundt ankelen. Stå på ett bein og press foten lateralt mot bandets motstand. Disse musklene er kritiske for å unngå ankelskader i basketball.",
        video:"https://youtu.be/PG-TvRNxATs"
      },
      {
        id:"a-dorsal", name:"Isometrisk dorsalfleksjon m/band",
        sets:"3×30 sek", load:"Motstandsband", weight:null,
        note:"Forsiden av leggen — viktig for landing.",
        desc:"Sitt med band rundt tåballene. Press foten oppover mot bandets motstand i 30 sekunder. Trener tibialis anterior — stabiliserer ankelen ved landing.",
        video:"https://youtu.be/lLxGDvHg3EE"
      },
    ],
  },

  // ── PLYOMETRI INTRO ───────────────────────────────────────
  // fase1 = uke 1 (ankelhopp + myk landing)
  // fase2 = uke 2 (+ pogo)
  // fase3 = uke 3+5 (+ lateral reaktiv)
  "plyo-intro": {
    fase1: [
      {
        id:"pi-ankbi", name:"Ankelhopp bilateral",
        sets:"3×10", load:"Kroppsvekt", weight:null,
        note:"«Varm potet» — kort kontakttid.",
        desc:"Stå med føtter i hoftebredde og hopp raskt opp og ned. Nesten ingen bøy i kne og hofte — all kraft fra anklene. Tenk at gulvet er varmt. Du har gjort dette fra basketball, bare mer bevisst nå.",
        video:"https://youtu.be/Yd9VXHRe5Dw"
      },
      {
        id:"pi-softland", name:"Myk landing fra boks — ett bein",
        sets:"3×5 per bein", load:"20 cm boks", weight:null,
        note:"Frys 2 sek i landing — kne stabilt.",
        desc:"Stå på en lav boks og hopp ned på ett bein. Land mykt med lett bøy i kneet og hold stillingen i 2 sekunder. Viktig: kneet skal ikke kollapse innover. Lær kroppen å lande trygt.",
        video:"https://youtu.be/5kDPCRqMqzw"
      },
    ],
    fase2: [
      {
        id:"pi-ankbi2", name:"Ankelhopp bilateral",
        sets:"3×12", load:"Kroppsvekt", weight:null,
        note:"Raskere enn uke 1 — kortere kontakt.",
        desc:"Samme som uke 1 men med mer fart og flere reps. Fokus på å minimere kontakttiden ytterligere. Du skal begynne å kjenne ankelstyrkingen fra forrige uke.",
        video:"https://youtu.be/Yd9VXHRe5Dw"
      },
      {
        id:"pi-softland2", name:"Myk landing fra boks — ett bein",
        sets:"3×5 per bein", load:"20–25 cm boks", weight:null,
        note:"Litt høyere boks denne uka.",
        desc:"Samme øvelse som uke 1, men fra litt høyere boks. Mer kraft å absorbere — kne stabilt og hofte ikke synke til siden.",
        video:"https://youtu.be/5kDPCRqMqzw"
      },
      {
        id:"pi-pogo", name:"Pogo hopp fremover",
        sets:"2×10m", load:"Kroppsvekt", weight:null,
        note:"Stiff ankler, dekk 10 meter.",
        desc:"Ny øvelse denne uka. Beveg deg fremover med raske, fjærende ankelhopp. Hold bena nesten strake — all kraft fra anklene. Dekk 10 meter per sett.",
        video:"https://youtu.be/etLFCXAkHM4"
      },
    ],
    fase3: [
      {
        id:"pi-ankbi3", name:"Ankelhopp bilateral",
        sets:"3×12", load:"Kroppsvekt", weight:null,
        note:"Maks fart nå.",
        desc:"Korteste mulige kontakttid. Du har nå tre uker med ankelhopp — det skal kjennes lettere og raskere enn uke 1.",
        video:"https://youtu.be/Yd9VXHRe5Dw"
      },
      {
        id:"pi-ankr", name:"Enkeltbens ankelhopp — høyre",
        sets:"3×8", load:"Kroppsvekt", weight:null,
        note:"Ny: ett bein. Start høyre.",
        desc:"Samme som bilateral versjon men på ett bein. Mer krevende for balansen. Start med høyre. Bruk en vegg nær deg om nødvendig.",
        video:"https://youtu.be/Yd9VXHRe5Dw"
      },
      {
        id:"pi-softland3", name:"Myk landing fra boks — ett bein",
        sets:"3×5 per bein", load:"25–30 cm boks", weight:null,
        note:"Høyeste boks hittil.",
        desc:"Enda høyere boks. Mer kraft inn i ankelen og kneet. Hold stillingen 2 sek. Nå begynner dette å ligne basketball-bevegelser.",
        video:"https://youtu.be/5kDPCRqMqzw"
      },
      {
        id:"pi-pogo2", name:"Pogo hopp fremover",
        sets:"3×12m", load:"Kroppsvekt", weight:null,
        note:"3 sett nå, 12 meter.",
        desc:"Et sett mer og litt lengre enn uke 2. Oppretthold stiff ankler og kortest mulig kontakttid. Dette forbereder drop jumps i uke 6.",
        video:"https://youtu.be/etLFCXAkHM4"
      },
      {
        id:"pi-latreact", name:"Lateral reaktivhopp",
        sets:"2×5 per side", load:"Liten hindring", weight:null,
        note:"Ny: retningsskift-intro.",
        desc:"Hopp sidelengs over en linje eller kjegle på ett bein. Land og spreng tilbake. Begynn forsiktig — dette er en ny bevegelse. Etterligner retningsskift i basketball.",
        video:"https://youtu.be/w7Ixg8gXPyw"
      },
    ],
  },

  // ── PLYOMETRI FULL (uke 6–7) ───────────────────────────────
  "plyo": {
    fase1: [
      {
        id:"p-ankbi", name:"Ankelhopp bilateral",
        sets:"3×12", load:"Kroppsvekt", weight:null,
        note:"Raskere og flere reps enn intro-uker.",
        desc:"Kort kontakttid, stive ankler. Nå 12 reps per sett. Samme prinsipp som uke 3–5 men mer volum og raskere tempo.",
        video:"https://youtu.be/Yd9VXHRe5Dw"
      },
      {
        id:"p-djbi", name:"Drop jump bilateral",
        sets:"3×5", load:"30 cm boks", weight:null,
        note:"Fall ned — ikke hopp. Spreng opp umiddelbart.",
        desc:"Stå på kanten av boksen og la deg falle ned. Land på begge bein og spreng øyeblikkelig opp igjen. Minst mulig tid på bakken. Dette etterligner VALD drop jump-testen.",
        video:"https://youtu.be/1CuFu0YYVMI"
      },
      {
        id:"p-djr", name:"Drop jump — høyre bein",
        sets:"3×5", load:"20 cm boks", weight:null,
        note:"RSI høyre side — primærmålet.",
        desc:"Drop jump på høyre bein fra lavere boks. Fokus på minimal kontakttid og maksimal høyde. Dette er den spesifikke øvelsen for å løfte SL Hop RSI fra 5. persentil.",
        video:"https://youtu.be/1CuFu0YYVMI"
      },
      {
        id:"p-latreact", name:"Lateral reaktivhopp ett bein",
        sets:"3×5 per side", load:"Liten hindring", weight:null,
        note:"Retningsskift — basketballspesifikt.",
        desc:"Hopp sidelengs over en kjegle eller linje på ett bein. Land og spreng umiddelbart tilbake. Etterligner retningsskiftene i basketball og trener reaktiv lateralbevegelse.",
        video:"https://youtu.be/w7Ixg8gXPyw"
      },
      {
        id:"p-pogo", name:"Pogo hopp fremover",
        sets:"3×15m", load:"Kroppsvekt", weight:null,
        note:"Maks fart og stiff ankler.",
        desc:"Fjærende ankelhopp fremover, 15 meter per sett. Nå med mer fart og lengde enn intro. Hold ankler stive og bena nesten strake.",
        video:"https://youtu.be/etLFCXAkHM4"
      },
    ],
  },

  // ── REISE (uke 4) ──────────────────────────────────────────
  "reise": {
    fase1: [
      {
        id:"re-bsq", name:"Bulgarsk splittknebøy",
        sets:"3×10 per bein", load:"Kroppsvekt", weight:null,
        note:"Stol eller seng som støtte for bakfoten.",
        desc:"Legg bakfoten på stolen eller sengen. Senk bakkneet mot gulvet og press opp med fremre bein. Ingen vekter — kroppsvekt på ett bein er mer enn nok.",
        video:"https://youtu.be/2C-uNgKwPLE"
      },
      {
        id:"re-cr", name:"Enkeltbens hælhev — høyre",
        sets:"3×15", load:"Kroppsvekt", weight:null,
        note:"Trapp, fortauskant eller tykk bok.",
        desc:"Bruk hva du finner — trapp, bordkant, en bok. Stå på høyre fot og gjennomfør hælhev med fullt bevegelsesspenn. Ankeltreningen stopper ikke på reise.",
        video:"https://youtu.be/gwLzBJYoWlI"
      },
      {
        id:"re-cl", name:"Enkeltbens hælhev — venstre",
        sets:"2×10", load:"Kroppsvekt", weight:null,
        note:"Vedlikehold.",
        desc:"Lavere dose på venstre side. Vedlikehold under reiseuka.",
        video:"https://youtu.be/gwLzBJYoWlI"
      },
      {
        id:"re-glute", name:"Enkeltbens glute bridge",
        sets:"3×12 per bein", load:"Kroppsvekt", weight:null,
        note:"1 sek pause i topp.",
        desc:"Legg deg på ryggen med én fot flat i gulvet. Press hofta opp på ett bein og hold 1 sekund i topp. Trener setemusklene uten utstyr — gjøres på hotellrommet.",
        video:"https://youtu.be/wPM8icPu6H8"
      },
      {
        id:"re-ank", name:"Ankelhopp bilateral",
        sets:"3×10", load:"Kroppsvekt", weight:null,
        note:"Utendørs på flatt underlag.",
        desc:"Raske ankelhopp på begge bein. Gjøres utendørs — parkeringsplass, strand, fortau. Vedlikeholder reaktiviteten under reiseuka.",
        video:"https://youtu.be/Yd9VXHRe5Dw"
      },
      {
        id:"re-nord", name:"Nordic curl m/partner",
        sets:"3×4", load:"Kroppsvekt", weight:null,
        note:"Partner holder, eller fest under seng.",
        desc:"Be noen holde ankelen din, eller fest under sengen. Senk overkroppen fremover så sakte som mulig. Skyv opp med hendene. Viktig skadeforebygging — gjøres selv på reise.",
        video:"https://youtu.be/d8AAPcAzCnY"
      },
      {
        id:"re-bal", name:"Balansestående høyre",
        sets:"3×30 sek", load:"Øyne lukket", weight:null,
        note:"Hotellrommet — ingen utstyr.",
        desc:"Stå på høyre fot med øyne lukket i 30 sekunder. Gjøres overalt uten utstyr. Opprettholder ankelstabilitet under reiseuka.",
        video:"https://youtu.be/6lCMIBqnXmk"
      },
    ],
  },

  // ── BRO STYRKE (uke 8–9) ──────────────────────────────────
  "bro-styrke": {
    fase1: [
      {
        id:"bro-sq", name:"Knebøy / goblet knebøy",
        sets:"3×6", load:"70% av uke 7-vekt", weight:"ca. 35–45 kg",
        note:"Vedlikehold — ikke øk vekten.",
        desc:"Redusert volum og intensitet. Målet er å vedlikeholde nervesystemet og styrken inn mot basketsesongen, ikke å bygge mer.",
        video:"https://youtu.be/9coUk68haz0"
      },
      {
        id:"bro-rdl", name:"Romanian deadlift",
        sets:"3×6", load:"70% av uke 7-vekt", weight:"ca. 25–35 kg",
        note:"Teknikk-fokus.",
        desc:"Lett og kontrollert. Gode repetisjoner er viktigere enn tung vekt i broperioden.",
        video:"https://youtu.be/tat438g2B90"
      },
      {
        id:"bro-calf", name:"Enkeltbens hælhev — høyre",
        sets:"3×12", load:"5–8 kg", weight:"5–8 kg",
        note:"Fortsett ankelprogresjon.",
        desc:"Oppretthold ankeltreningen inn mot sesongen. Lett vekt men samme bevisste teknikk. Ikke mist fremgangen fra sommeren.",
        video:"https://youtu.be/gwLzBJYoWlI"
      },
      {
        id:"bro-drop", name:"Drop jump bilateral",
        sets:"2×4", load:"30 cm boks", weight:null,
        note:"Frisk og uthvilt — ikke etter tung styrke.",
        desc:"Gjøres separat fra styrkeøkten eller på starten. Vedlikeholder reaktiviteten. Rask kontakttid og eksplosivt opp.",
        video:"https://youtu.be/1CuFu0YYVMI"
      },
    ],
  },

  // ── RETEST (uke 10) ───────────────────────────────────────
  "retest": {
    fase1: [
      {
        id:"rt-cmj", name:"Countermovement Jump (CMJ)",
        sets:"3 forsøk", load:"Maks", weight:null,
        note:"Mål: 38+ cm (fra 35,2 cm)",
        desc:"Stå på platene, armene langs siden. Bøy raskt ned og spreng opp med armsvingen. Samme protokoll som i juni for sammenlignbare resultater.",
        video:"https://youtu.be/lk_Hm6ByXBA"
      },
      {
        id:"rt-abal", name:"Abalakov Jump",
        sets:"3 forsøk", load:"Maks", weight:null,
        note:"Mål: 41+ cm (fra 38,4 cm)",
        desc:"CMJ med full armsvingen. Bruk armene aktivt for å maksimere høyden.",
        video:"https://youtu.be/lk_Hm6ByXBA"
      },
      {
        id:"rt-slj", name:"Single Leg Jump",
        sets:"3 forsøk per bein", load:"Maks", weight:null,
        note:"Mål: asymmetri under 5%",
        desc:"Hopp på ett bein. Test begge sider. Asymmetrien var 0,6% i juni — beholde eller forbedre.",
        video:"https://youtu.be/lk_Hm6ByXBA"
      },
      {
        id:"rt-dj", name:"Drop Jump",
        sets:"3 forsøk", load:"Maks reaktivitet", weight:null,
        note:"Mål: 38+ cm (fra 35,5 cm)",
        desc:"Fall fra boksen og spreng opp. Minst mulig kontakttid. Var 96. persentil — opprettholde eller forbedre.",
        video:"https://youtu.be/1CuFu0YYVMI"
      },
      {
        id:"rt-imtp", name:"Isometric Mid-Thigh Pull",
        sets:"3 forsøk × 5 sek", load:"Absolutt maks", weight:null,
        note:"Mål: 26+ N/kg (fra 22,26 N/kg) ← PRIMÆRMÅL",
        desc:"Trekk stangen oppover med maks kraft i 5 sekunder. Dette er det primære målet for sommerprogrammet. Var 24. persentil — mål er 50. persentil.",
        video:"https://youtu.be/quDsJFbsOwE"
      },
      {
        id:"rt-ank", name:"Ankle Plantar Flexion",
        sets:"3 forsøk per bein", load:"Maks", weight:null,
        note:"Mål: asymmetri under 12% (fra 24%) ← PRIMÆRMÅL",
        desc:"Test begge ankler. Asymmetrien var 24% i juni. Etter 10 uker med fokusert ankeltrening bør høyre ha tatt igjen venstre.",
        video:"https://youtu.be/gwLzBJYoWlI"
      },
      {
        id:"rt-rsi", name:"Single Leg Hop RSI",
        sets:"3 forsøk per bein", load:"Maks reaktivitet", weight:null,
        note:"Mål: RSI over 0,60 (fra 0,47/0,48) ← PRIMÆRMÅL",
        desc:"Kontinuerlige hopp på ett bein. Forholdet flygetid/kontakttid. Var 5. persentil — etter plyometri og ankeltrening bør dette ha økt markant.",
        video:"https://youtu.be/Yd9VXHRe5Dw"
      },
    ],
  },
};

// ── HJELPEFUNKSJONER ──────────────────────────────────────────
function getPhase(week, sessionId) {
  if (sessionId === "styrke-a" || sessionId === "styrke-b") {
    if (week <= 2) return "fase1";
    if (week <= 5) return "fase2";
    return "fase3";
  }
  if (sessionId === "plyo-intro") {
    if (week <= 1) return "fase1";   // uke 1: ankelhopp + myk landing
    if (week <= 2) return "fase2";   // uke 2: + pogo
    return "fase3";                   // uke 3+5: + reaktivhopp
  }
  return "fase1";
}

function getWeekColor(type) {
  if (type === "travel") return C.travel;
  if (type === "bridge") return C.bridge;
  if (type === "retest") return C.retest;
  if (type === "intro1") return "#3B82F6"; // lysere blå for nybegynner
  if (type === "intro2") return "#6366F1"; // indigo for oppbygging
  return C.styrke;
}

const DAY_NAMES = ["","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag","Søndag"];

// ── SUPERSET BADGE COLORS ────────────────────────────────────
const SUPERSET_COLORS = {
  "1A": { color: "#F97316", bg: "#1C0A00" },
  "1B": { color: "#F97316", bg: "#1C0A00" },
  "2A": { color: "#A78BFA", bg: "#1A0533" },
  "2B": { color: "#A78BFA", bg: "#1A0533" },
};

// ── EXERCISE CARD ─────────────────────────────────────────────
function ExerciseCard({ ex, done, onToggle, isLastInGroup, isFirstInGroup }) {
  const [open, setOpen] = useState(false);
  const sc = ex.group ? SUPERSET_COLORS[ex.group] : null;
  const isSolo = ex.solo || (!ex.group);

  return (
    <div style={{ position: "relative", marginBottom: isLastInGroup ? 16 : 0 }}>
      {/* Supersett connector line */}
      {ex.group && !isLastInGroup && (
        <div style={{
          position: "absolute", left: 19, top: "100%", width: 2, height: 10,
          background: sc?.color, zIndex: 2, opacity: 0.5,
        }} />
      )}
      <div style={{
        background: done ? `${C.done}12` : C.card2,
        border: `1px solid ${done ? C.done + "60" : sc ? sc.color + "50" : C.border}`,
        borderRadius: 12, marginBottom: isLastInGroup ? 0 : 2, overflow: "hidden",
      }}>
        {/* Supersett label bar */}
        {ex.group && isFirstInGroup && (
          <div style={{ background: sc?.bg, borderBottom: `1px solid ${sc?.color}30`, padding: "4px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: sc?.color, letterSpacing: "0.1em" }}>
              SUPERSETT {ex.group.replace("A","").replace("B","")}
            </span>
            <span style={{ fontSize: 10, color: sc?.color, opacity: 0.7 }}>
              Gjør A → hvil 60 sek → gjør B → hvil 60 sek → gjenta
            </span>
          </div>
        )}
        {ex.group && !isFirstInGroup && (
          <div style={{ background: sc?.bg, borderBottom: `1px solid ${sc?.color}30`, padding: "3px 14px" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: sc?.color, opacity: 0.8 }}>
              {ex.group} — par med øvelsen over
            </span>
          </div>
        )}
        {isSolo && ex.solo && (
          <div style={{ background: "#0A1929", borderBottom: `1px solid ${C.styrke}20`, padding: "3px 14px" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.styrke, opacity: 0.8 }}>
              ÉN OG ÉN — full hvil mellom sett
            </span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer" }}
          onClick={() => setOpen(!open)}>
          <button onClick={e => { e.stopPropagation(); onToggle(); }}
            style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
              border: `2px solid ${done ? C.done : sc ? sc.color : C.border}`,
              background: done ? C.done : "transparent",
              color: "#000", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            {done ? "✓" : ""}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: done ? C.muted : C.text, textDecoration: done ? "line-through" : "none", lineHeight: 1.3 }}>
              {ex.group && <span style={{ color: sc?.color, fontWeight: 800, marginRight: 4 }}>{ex.group}</span>}
              {ex.name}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: C.styrke, fontWeight: 700 }}>{ex.sets}</span>
              {ex.weight && (
                <span style={{ fontSize: 11, background: `${C.travel}20`, color: C.travel, padding: "1px 7px", borderRadius: 99, fontWeight: 600 }}>
                  ⚖️ {ex.weight}
                </span>
              )}
            </div>
          </div>
          <span style={{ color: C.muted, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
        </div>
        {open && (
          <div style={{ padding: "0 14px 14px 56px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {ex.desc && (
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, background: `${C.styrke}08`, borderRadius: 8, padding: "8px 10px", borderLeft: `3px solid ${C.styrke}40` }}>
                  {ex.desc}
                </div>
              )}
              <div style={{ fontSize: 12, color: C.muted }}>
                <span style={{ color: C.text, fontWeight: 600 }}>Belastning: </span>{ex.load}
              </div>
              {ex.note && <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>💡 {ex.note}</div>}
              <a href={ex.video} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1a0000", border: "1px solid #ff000040", color: "#ff4444", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, textDecoration: "none", marginTop: 4, width: "fit-content" }}>
                ▶ Se instruksjonsvideo
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SESSION BLOCK ─────────────────────────────────────────────
function SessionBlock({ sessionId, weekNum, completions, onToggle }) {
  const meta = SESSION_META[sessionId];
  const phase = getPhase(weekNum, sessionId);
  const exList = EXERCISES[sessionId]?.[phase] || EXERCISES[sessionId]?.["fase1"] || [];
  const ts = typeStyle[meta.type] || typeStyle.rest;
  const doneCount = exList.filter(ex => completions[`${weekNum}|${sessionId}|${ex.id}`]).length;
  const allDone = doneCount === exList.length && exList.length > 0;

  return (
    <div style={{ background: C.card, border: `1px solid ${allDone ? C.done + "60" : C.border}`, borderRadius: 16, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ts.color, flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: ts.color }}>{meta.name}</span>
          {(sessionId === "styrke-a" || sessionId === "styrke-b") && (
            <span style={{ background: `${ts.color}20`, color: ts.color, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>
              {phase.replace("fase", "Fase ")}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: allDone ? C.done : C.muted, fontWeight: 600 }}>
          {doneCount}/{exList.length}
        </div>
      </div>
      {exList.map((ex, i) => {
        const prevGroup = i > 0 ? exList[i-1].group : null;
        const nextGroup = i < exList.length - 1 ? exList[i+1].group : null;
        const isFirstInGroup = ex.group && ex.group !== prevGroup;
        const isLastInGroup = !ex.group || ex.group !== nextGroup;
        return (
          <ExerciseCard
            key={ex.id} ex={ex}
            done={!!completions[`${weekNum}|${sessionId}|${ex.id}`]}
            onToggle={() => onToggle(weekNum, sessionId, ex.id)}
            isFirstInGroup={isFirstInGroup}
            isLastInGroup={isLastInGroup}
          />
        );
      })}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("emma_auth") === "ok");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [activeWeek, setActiveWeek] = useState(1);
  const [completions, setCompletions] = useState({});
  const [view, setView] = useState("today");
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

  useEffect(() => {
    if (!authed) return;
    sbFetch(`completions?user_id=eq.${USER_ID}&select=exercise_key,week_number`)
      .then(data => {
        if (!data) return;
        const full = {};
        data.forEach(c => { full[`${c.week_number}|${c.exercise_key}`] = true; });
        setCompletions(full);
      });
  }, [authed]);

  const handlePin = () => {
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem("emma_auth", "ok");
      setAuthed(true);
    } else {
      setPinError(true);
      setPin("");
      setTimeout(() => setPinError(false), 1000);
    }
  };

  const handleToggle = useCallback(async (weekNum, sessionId, exId) => {
    const key = `${weekNum}|${sessionId}|${exId}`;
    const dbKey = `${sessionId}|${exId}`;
    const newVal = !completions[key];
    setSaving(true);
    setCompletions(prev => ({ ...prev, [key]: newVal }));
    if (newVal) {
      await sbFetch("completions", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: USER_ID, exercise_key: dbKey, week_number: weekNum }),
      });
    } else {
      await sbFetch(`completions?user_id=eq.${USER_ID}&exercise_key=eq.${encodeURIComponent(dbKey)}&week_number=eq.${weekNum}`, { method: "DELETE" });
    }
    setSaving(false);
  }, [completions]);

  const getWeekProgress = (weekNum) => {
    const w = WEEKS.find(w => w.week === weekNum);
    const smap = SESSION_MAP[w?.type || "full"] || {};
    let total = 0, done = 0;
    Object.values(smap).flat().forEach(sid => {
      const phase = getPhase(weekNum, sid);
      const exs = EXERCISES[sid]?.[phase] || EXERCISES[sid]?.["fase1"] || [];
      total += exs.length;
      done += exs.filter(ex => completions[`${weekNum}|${sid}|${ex.id}`]).length;
    });
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  // ── PIN SCREEN ──
  if (!authed) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.card, border: `1px solid ${pinError ? "#ef4444" : C.border}`, borderRadius: 24, padding: 36, maxWidth: 320, width: "100%", textAlign: "center", transition: "border-color 0.2s" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏀</div>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, color: C.text }}>Emma Schea</h1>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 28 }}>Sommerprogram 2026</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
          {pin.split("").concat(Array(4 - pin.length).fill("")).map((d, i) => (
            <div key={i} style={{ height: 48, background: C.card2, border: `2px solid ${d ? C.styrke : C.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: C.styrke }}>
              {d ? "●" : ""}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {["1","2","3","4","5","6","7","8","9","⌫","0","OK"].map(btn => (
            <button key={btn} onClick={() => {
              if (btn === "⌫") setPin(p => p.slice(0,-1));
              else if (btn === "OK") handlePin();
              else if (pin.length < 4) setPin(p => p + btn);
            }}
            style={{
              height: 56, background: btn === "OK" ? C.styrke : C.card2,
              border: `1px solid ${btn === "OK" ? C.styrke : C.border}`,
              color: btn === "OK" ? "#000" : C.text,
              borderRadius: 12, fontSize: btn === "OK" ? 13 : 20,
              fontWeight: 700, cursor: "pointer",
            }}>{btn}</button>
          ))}
        </div>
        {pinError && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 12, fontWeight: 600 }}>Feil PIN — prøv igjen</div>}
      </div>
    </div>
  );

  // ── MAIN ──
  const weekData = WEEKS.find(w => w.week === activeWeek);
  const weekType = weekData?.type || "full";
  const weekColor = getWeekColor(weekType);
  const smap = SESSION_MAP[weekType] || {};
  const todaySessions = smap[dayOfWeek] || [];
  const prog = getWeekProgress(activeWeek);

  const phaseLabel = weekType === "intro1" ? "🌱 Teknikkfase" :
                     weekType === "intro2" ? "📈 Oppbygging" :
                     weekType === "full" ? "💪 Toppbelastning" :
                     weekType === "travel" ? "🚗 Reise" :
                     weekType === "bridge" ? "🏀 Bro til sesong" : "📊 Retest";

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter','Helvetica Neue',sans-serif", color: C.text, maxWidth: 480, margin: "0 auto" }}>

      {/* HEADER */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 14px 0", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}>🏀 Emma Schea</div>
            <div style={{ fontSize: 10, color: C.muted }}>Sommerprogram 2026{saving ? " · Lagrer..." : ""}</div>
          </div>
          <button onClick={() => { sessionStorage.removeItem("emma_auth"); setAuthed(false); }}
            style={{ background: C.card2, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
            Lås
          </button>
        </div>

        {/* Week pills */}
        <div style={{ display: "flex", overflowX: "auto", gap: 5, paddingBottom: 10, scrollbarWidth: "none" }}>
          {WEEKS.map(w => {
            const p = getWeekProgress(w.week);
            const wc = getWeekColor(w.type);
            const active = activeWeek === w.week;
            return (
              <button key={w.week} onClick={() => setActiveWeek(w.week)} style={{
                flexShrink: 0, background: active ? wc : C.card2,
                border: `1px solid ${active ? wc : C.border}`,
                color: active ? (wc === C.travel ? "#000" : "#fff") : C.muted,
                borderRadius: 10, padding: "5px 9px", fontSize: 11,
                fontWeight: active ? 700 : 400, cursor: "pointer", textAlign: "center", minWidth: 48,
              }}>
                <div style={{ fontWeight: 700 }}>{w.week}</div>
                {p.total > 0 && <div style={{ fontSize: 9, opacity: 0.8 }}>{p.pct}%</div>}
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderTop: `1px solid ${C.border}`, marginTop: -1 }}>
          {[["today","I dag"],["week","Uke"],["overview","Fremgang"]].map(([v,label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              flex: 1, background: "none", border: "none",
              borderBottom: view === v ? `2px solid ${weekColor}` : "2px solid transparent",
              color: view === v ? weekColor : C.muted,
              padding: "9px 4px", fontSize: 12, fontWeight: view === v ? 700 : 400,
              cursor: "pointer", marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 14 }}>

        {/* Week card */}
        <div style={{ background: `${weekColor}10`, border: `1px solid ${weekColor}30`, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: weekColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {weekData?.location} · {phaseLabel}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>Uke {activeWeek} — {weekData?.label}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{weekData?.desc}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: weekColor }}>{prog.pct}%</div>
              <div style={{ fontSize: 10, color: C.muted }}>{prog.done}/{prog.total}</div>
            </div>
          </div>
          <div style={{ marginTop: 10, height: 4, background: C.border, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${prog.pct}%`, background: weekColor, borderRadius: 99, transition: "width 0.5s" }} />
          </div>
        </div>

        {/* TODAY */}
        {view === "today" && (
          todaySessions.length === 0 ? (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>😴</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Hviledag!</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Aktiv hvile er lov — gåtur, svømming, sykling.</div>
            </div>
          ) : (
            todaySessions.map(sid => (
              <SessionBlock key={sid} sessionId={sid} weekNum={activeWeek} completions={completions} onToggle={handleToggle} />
            ))
          )
        )}

        {/* WEEK */}
        {view === "week" && (
          [1,2,3,4,5,6,7].map(day => {
            const daySessions = smap[day] || [];
            const isToday = day === dayOfWeek;
            if (!daySessions.length && !isToday) return null;
            return (
              <div key={day} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? weekColor : C.muted }}>{DAY_NAMES[day]}</span>
                  {isToday && <span style={{ background: `${weekColor}20`, color: weekColor, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>I dag</span>}
                </div>
                {daySessions.length === 0 ? (
                  <div style={{ background: C.card2, borderRadius: 10, padding: "9px 14px", fontSize: 12, color: C.muted }}>Hvile / aktiv hvile</div>
                ) : (
                  daySessions.map(sid => (
                    <SessionBlock key={sid} sessionId={sid} weekNum={activeWeek} completions={completions} onToggle={handleToggle} />
                  ))
                )}
              </div>
            );
          })
        )}

        {/* OVERVIEW */}
        {view === "overview" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>10 uker</div>

            {/* Phase legend */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {[
                { label: "🌱 Teknikk", color: "#3B82F6" },
                { label: "📈 Oppbygging", color: "#6366F1" },
                { label: "💪 Toppbelastning", color: C.styrke },
                { label: "🚗 Reise", color: C.travel },
                { label: "🏀 Bro", color: C.bridge },
              ].map(p => (
                <span key={p.label} style={{ fontSize: 10, background: `${p.color}20`, color: p.color, padding: "3px 8px", borderRadius: 99, fontWeight: 600 }}>{p.label}</span>
              ))}
            </div>

            {WEEKS.map(w => {
              const p = getWeekProgress(w.week);
              const wc = getWeekColor(w.type);
              const isActive = w.week === activeWeek;
              return (
                <button key={w.week} onClick={() => { setActiveWeek(w.week); setView("week"); }}
                  style={{ width: "100%", background: isActive ? `${wc}15` : C.card, border: `1px solid ${isActive ? wc : C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: wc, minWidth: 26 }}>{w.week}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{w.label}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{w.location}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: p.pct === 100 ? C.done : p.pct > 0 ? wc : C.muted }}>{p.pct}%</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{p.done}/{p.total}</div>
                  </div>
                </button>
              );
            })}

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Målsettinger retest</div>
              {[
                { l:"CMJ", fra:"35,2 cm", mål:"38+ cm", c:C.styrke },
                { l:"IMTP ★", fra:"22,26 N/kg", mål:"26+ N/kg", c:"#F87171" },
                { l:"Ankel-asymmetri ★", fra:"24%", mål:"<12%", c:C.ankel },
                { l:"SL Hop RSI ★", fra:"0,47", mål:"0,60+", c:C.reaktiv },
                { l:"Drop Jump", fra:"35,5 cm", mål:"38+ cm", c:C.reaktiv },
              ].map((t,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:12, color:C.text }}>{t.l}</span>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:11, color:C.muted }}>{t.fra}</span>
                    <span style={{ fontSize:10, color:C.muted }}>→</span>
                    <span style={{ fontSize:13, fontWeight:800, color:t.c }}>{t.mål}</span>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>★ = primærmål for sommerprogrammet</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
