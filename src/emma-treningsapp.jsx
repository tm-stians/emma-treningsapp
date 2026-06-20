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

// ── DESIGN TOKENS ────────────────────────────────────────────
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

// ── PROGRAM DATA ──────────────────────────────────────────────
const WEEKS = [
  { week: 1, label: "Oppstart", location: "🏠 Hjemme", type: "full", desc: "Teknikk over vekt — bli kjent med bevegelsene" },
  { week: 2, label: "Istria I", location: "🌊 Istria", type: "full", desc: "Øk belastning. Ankel daglig. Plyometri intro." },
  { week: 3, label: "Istria II", location: "🌊 Istria", type: "full", desc: "Tyngre styrke. Øk drop jump-volum." },
  { week: 4, label: "Reiseuke", location: "🚗 På veien", type: "travel", desc: "Kun kroppsvekt. Hotellrom/uteområde." },
  { week: 5, label: "Gjenoppstart", location: "🏠 Hjemme", type: "full", desc: "Tilbake til vekter. Lett første uke." },
  { week: 6, label: "Toppbelastning I", location: "🏠 Hjemme", type: "full", desc: "Hardeste styrkeuke. Maks isometrisk fokus." },
  { week: 7, label: "Toppbelastning II", location: "🏠 Hjemme", type: "full", desc: "Høyest plyometrivolum. Reaktiv enkeltbens." },
  { week: 8, label: "Bro I", location: "🏀 Sesong", type: "bridge", desc: "Reduser 10%. Introduser ballarbeid." },
  { week: 9, label: "Bro II", location: "🏀 Sesong", type: "bridge", desc: "Basketball prioritert. Styrke vedlikehold." },
  { week: 10, label: "Retest", location: "📊 Trimmen", type: "retest", desc: "VALD ForceDecks — sammenlign med juni 2026." },
];

const SESSION_MAP = {
  full:   { 1: ["styrke-a","plyo","ankel"], 3: ["styrke-b","ankel"], 5: ["styrke-a","plyo","ankel"] },
  travel: { 1: ["reise"], 3: ["reise"], 5: ["reise"] },
  bridge: { 1: ["bro-styrke","ankel"], 3: ["bro-styrke"], 5: ["plyo","ankel"] },
  retest: { 1: ["retest"] },
};

const SESSION_META = {
  "styrke-a":  { name: "Styrke A",        type: "styrke"  },
  "styrke-b":  { name: "Styrke B",        type: "styrke"  },
  "plyo":      { name: "Plyometri",       type: "reaktiv" },
  "ankel":     { name: "Ankelprotokoll",  type: "ankel"   },
  "reise":     { name: "Kroppsvekt",      type: "travel"  },
  "bro-styrke":{ name: "Styrke (lett)",   type: "bridge"  },
  "retest":    { name: "VALD Retest",     type: "retest"  },
};

const EXERCISES = {
  "styrke-a": {
    fase1: [
      { id:"goblet",   name:"Goblet knebøy",              sets:"3×10",        load:"Moderat (RPE 6)",   note:"Dyp posisjon, knær over tær",             video:"https://youtu.be/MxsFDhcyFyE" },
      { id:"rdl",      name:"Romanian deadlift",          sets:"3×10",        load:"Lett-moderat",      note:"3 sek eksentrisk ned",                    video:"https://youtu.be/JCXUYuzwNrM" },
      { id:"hipth",    name:"Hip thrust",                 sets:"3×12",        load:"Moderat",           note:"1 sek pause i topp",                      video:"https://youtu.be/xDmFkJxPzeM" },
      { id:"stepup",   name:"Step-up m/vekt — høyre først",sets:"3×8/bein",  load:"Lett",              note:"Alltid start høyre (svak side)",           video:"https://youtu.be/5zJHHLsE8Ok" },
      { id:"calf-r",   name:"Enkeltbens hælhev — høyre",  sets:"3×15",        load:"Kroppsvekt",        note:"3 sek ned, rask opp",                     video:"https://youtu.be/gwLzBJYoWlI" },
    ],
    fase2: [
      { id:"trapbar",  name:"Trapbar markløft",            sets:"4×5",         load:"75–80% 1RM (RPE 8)",note:"Prioritert — øk vekt ukentlig",           video:"https://youtu.be/sqjgTMkHRyM" },
      { id:"rdl2",     name:"Romanian deadlift",           sets:"4×6",         load:"Tungt",             note:"Hamstring dominant",                      video:"https://youtu.be/JCXUYuzwNrM" },
      { id:"imtp",     name:"Isometrisk midthogg (IMTP)",  sets:"3×3 × 5 sek",load:"Maks innsats",      note:"Etterligner IMTP-testen direkte",          video:"https://youtu.be/quDsJFbsOwE" },
      { id:"calf-r2",  name:"Hælhev m/vekt — høyre",       sets:"4×12",        load:"5–10 kg",           note:"Høyre: tung. Venstre: lett",              video:"https://youtu.be/gwLzBJYoWlI" },
      { id:"calf-l",   name:"Hælhev — venstre",            sets:"3×10",        load:"2–5 kg",            note:"Vedlikehold",                             video:"https://youtu.be/gwLzBJYoWlI" },
    ],
  },
  "styrke-b": {
    fase1: [
      { id:"front",    name:"Frontknebøy / splittknebøy",  sets:"3×8",         load:"Moderat (RPE 6–7)", note:"Gradvis øk dybde",                        video:"https://youtu.be/uYumuL_G_V0" },
      { id:"nordic",   name:"Nordic Hamstring curl",       sets:"3×5",         load:"Kroppsvekt",        note:"Kun eksentrisk fase",                     video:"https://youtu.be/d8AAPcAzCnY" },
      { id:"bench",    name:"Benkpress / pushup",          sets:"3×10",        load:"Moderat",           note:"Skulder-stabilitet",                      video:"https://youtu.be/SCVCLChPQFY" },
      { id:"plank",    name:"Planke + sidesteg m/band",    sets:"3×20 sek+15", load:"Lett",              note:"Kjerneaktivering",                        video:"https://youtu.be/pSHjTRCQxIw" },
      { id:"balance",  name:"Balansestående — høyre bein", sets:"3×30 sek",    load:"Øyne lukket",       note:"Propriosepsjon",                          video:"https://youtu.be/6lCMIBqnXmk" },
    ],
    fase2: [
      { id:"bulg",     name:"Bulgarsk splittknebøy",       sets:"4×8/bein",    load:"Moderat-tungt",     note:"Start høyre bein alltid",                 video:"https://youtu.be/2C-uNgKwPLE" },
      { id:"nordic2",  name:"Nordic Hamstring curl",       sets:"3×6",         load:"Kroppsvekt",        note:"Full eksentrisk",                         video:"https://youtu.be/d8AAPcAzCnY" },
      { id:"front2",   name:"Fremre knebøy",               sets:"3×6",         load:"65–70% 1RM",        note:"Oppretthold teknikk",                     video:"https://youtu.be/uYumuL_G_V0" },
      { id:"hipth2",   name:"Hip thrust m/pause",          sets:"3×8",         load:"Tungt",             note:"Gluteus maks aktivering",                 video:"https://youtu.be/xDmFkJxPzeM" },
      { id:"latband",  name:"Lateral ankelstab. m/band",   sets:"3×15",        load:"Motstandsband",     note:"Peroneus — høyre side",                   video:"https://youtu.be/PG-TvRNxATs" },
    ],
  },
  "ankel": {
    fase1: [
      { id:"ank-r1",   name:"Hælhev — høyre",              sets:"3×15",        load:"Kroppsvekt",        note:"3 sek ned, rask opp",                     video:"https://youtu.be/gwLzBJYoWlI" },
      { id:"ank-l1",   name:"Hælhev — venstre",            sets:"3×10",        load:"Kroppsvekt",        note:"Vedlikehold, ikke øk",                    video:"https://youtu.be/gwLzBJYoWlI" },
      { id:"dorsal",   name:"Isometrisk dorsalfleksjon",    sets:"3×30 sek",    load:"Motstandsband",     note:"Dorsal styrke + stabilitet",              video:"https://youtu.be/lLxGDvHg3EE" },
      { id:"bal-r",    name:"Balansestående — høyre",       sets:"3×30 sek",    load:"Øyne lukket",       note:"Propriosepsjon",                          video:"https://youtu.be/6lCMIBqnXmk" },
    ],
    fase2: [
      { id:"ank-r2",   name:"Hælhev m/vekt — høyre",       sets:"4×12",        load:"5–10 kg i hånd",    note:"Høyre: tung. Venstre: lettest",           video:"https://youtu.be/gwLzBJYoWlI" },
      { id:"ank-l2",   name:"Hælhev — venstre",            sets:"3×10",        load:"2–5 kg",            note:"Vedlikehold",                             video:"https://youtu.be/gwLzBJYoWlI" },
      { id:"ank-hop",  name:"Ankelhopp — høyre bein",      sets:"3×10",        load:"Lav høyde",         note:"Myk landing, reaktivt",                   video:"https://youtu.be/Yd9VXHRe5Dw" },
      { id:"lat-ank",  name:"Lateral ankelstab. m/band",   sets:"3×15",        load:"Motstandsband",     note:"Peroneus-aktivering",                     video:"https://youtu.be/PG-TvRNxATs" },
    ],
    fase3: [
      { id:"loaded",   name:"Kalvhev loaded drop — høyre", sets:"4×10",        load:"15–20 kg, full ROM",note:"Eksentrisk belastning sentralt",           video:"https://youtu.be/gwLzBJYoWlI" },
      { id:"boxland",  name:"Enkeltbens box jump landing",  sets:"3×5",         load:"Lav boks",          note:"Myk, stabil landing høyre",               video:"https://youtu.be/5kDPCRqMqzw" },
      { id:"lathop",   name:"Lateral hopp over linje H=R", sets:"3×8/side",    load:"Kroppsvekt",        note:"Mål: samme RSI begge sider",              video:"https://youtu.be/w7Ixg8gXPyw" },
    ],
  },
  "plyo": {
    fase1: [
      { id:"ankbi",    name:"Ankelhopp bilateral",          sets:"3×10",        load:"Kroppsvekt",        note:"«Varm potet» — kort kontakttid",          video:"https://youtu.be/Yd9VXHRe5Dw" },
      { id:"ankr",     name:"Enkeltbens ankelhopp — høyre", sets:"3×8",         load:"Kroppsvekt",        note:"Etter bilateral mestring",                video:"https://youtu.be/Yd9VXHRe5Dw" },
      { id:"pogo",     name:"Pogo hopp fremover",           sets:"3×10m",       load:"Kroppsvekt",        note:"Stiff ankler, høyt hoftedrag",            video:"https://youtu.be/etLFCXAkHM4" },
      { id:"softland", name:"Myk enkeltbens landing",       sets:"3×5/bein",    load:"20–30 cm boks",     note:"Kontrollert absorbsjon",                  video:"https://youtu.be/5kDPCRqMqzw" },
    ],
    fase2: [
      { id:"djbi",     name:"Drop jump bilateral",          sets:"4×5",         load:"30 cm boks",        note:"Mål: kontakttid <250ms",                  video:"https://youtu.be/1CuFu0YYVMI" },
      { id:"djr",      name:"Drop jump — høyre bein",       sets:"3×5",         load:"20 cm boks",        note:"Bygg RSI høyre side",                     video:"https://youtu.be/1CuFu0YYVMI" },
      { id:"djl",      name:"Drop jump — venstre bein",     sets:"3×5",         load:"20 cm boks",        note:"Vedlikehold",                             video:"https://youtu.be/1CuFu0YYVMI" },
      { id:"latreact", name:"Lateral enkeltbens reaktivhopp",sets:"3×6/side",  load:"Liten hindring",    note:"Retningsskift-overføring",                video:"https://youtu.be/w7Ixg8gXPyw" },
      { id:"bound",    name:"Flygende trinn (bounding)",    sets:"3×20m",       load:"Kroppsvekt",        note:"Maks horisontal impuls",                  video:"https://youtu.be/bN5fvkqFSR0" },
    ],
  },
  "reise": {
    fase1: [
      { id:"re-bsq",   name:"Bulgarsk splittknebøy",        sets:"3×10/bein",   load:"Kroppsvekt",        note:"Stol / seng som støtte",                  video:"https://youtu.be/2C-uNgKwPLE" },
      { id:"re-cr",    name:"Hælhev — høyre",               sets:"3×15",        load:"Kroppsvekt",        note:"Trapp eller fortauskant",                 video:"https://youtu.be/gwLzBJYoWlI" },
      { id:"re-cl",    name:"Hælhev — venstre",             sets:"3×10",        load:"Kroppsvekt",        note:"Vedlikehold",                             video:"https://youtu.be/gwLzBJYoWlI" },
      { id:"re-glute", name:"Glute bridge enkeltbein",      sets:"3×12/bein",   load:"Kroppsvekt",        note:"1 sek pause i topp",                      video:"https://youtu.be/wPM8icPu6H8" },
      { id:"re-ank",   name:"Ankelhopp",                    sets:"3×10",        load:"Kroppsvekt",        note:"Utendørs / på stedet",                    video:"https://youtu.be/Yd9VXHRe5Dw" },
      { id:"re-nord",  name:"Nordic curl m/partner / dør",  sets:"3×5",         load:"Kroppsvekt",        note:"Fest føtter under seng",                  video:"https://youtu.be/d8AAPcAzCnY" },
      { id:"re-bal",   name:"Balansestående høyre",         sets:"3×30 sek",    load:"Øyne lukket",       note:"Hotellrom — ingen utstyr",                video:"https://youtu.be/6lCMIBqnXmk" },
    ],
  },
  "bro-styrke": {
    fase1: [
      { id:"bro-sq",   name:"Knebøy",                      sets:"3×5",         load:"70% av uke 7-vekt", note:"Vedlikehold — ikke øk",                   video:"https://youtu.be/MxsFDhcyFyE" },
      { id:"bro-rdl",  name:"Romanian deadlift",           sets:"3×6",         load:"Moderat",           note:"Teknikk-fokus",                           video:"https://youtu.be/JCXUYuzwNrM" },
      { id:"bro-calf", name:"Hælhev — høyre",              sets:"3×12",        load:"Lett vekt",         note:"Fortsett ankelprogresjon",                video:"https://youtu.be/gwLzBJYoWlI" },
      { id:"bro-nord", name:"Nordic Hamstring curl",       sets:"2×5",         load:"Kroppsvekt",        note:"Vedlikehold",                             video:"https://youtu.be/d8AAPcAzCnY" },
      { id:"bro-drop", name:"Drop jump bilateral",         sets:"2×5",         load:"30 cm",             note:"Skarp og rask — ikke sliten",             video:"https://youtu.be/1CuFu0YYVMI" },
    ],
  },
  "retest": {
    fase1: [
      { id:"rt-cmj",   name:"Countermovement Jump (CMJ)",  sets:"3 forsøk",    load:"Maks",              note:"Mål: 38+ cm (fra 35,2)",                  video:"https://youtu.be/lk_Hm6ByXBA" },
      { id:"rt-abal",  name:"Abalakov Jump",               sets:"3 forsøk",    load:"Maks",              note:"Mål: 41+ cm (fra 38,4)",                  video:"https://youtu.be/lk_Hm6ByXBA" },
      { id:"rt-slj",   name:"Single Leg Jump",             sets:"3/bein",      load:"Maks",              note:"Mål: asymmetri <5%",                      video:"https://youtu.be/lk_Hm6ByXBA" },
      { id:"rt-dj",    name:"Drop Jump",                   sets:"3 forsøk",    load:"Maks",              note:"Mål: 38+ cm (fra 35,5)",                  video:"https://youtu.be/1CuFu0YYVMI" },
      { id:"rt-imtp",  name:"Isometric Mid-Thigh Pull",    sets:"3 × 5 sek",   load:"Maks innsats",      note:"Mål: 26+ N/kg (fra 22,26)",               video:"https://youtu.be/quDsJFbsOwE" },
      { id:"rt-ank",   name:"Ankle Plantar Flexion",       sets:"3/bein",      load:"Maks",              note:"Mål: asymmetri <12% (fra 24%)",           video:"https://youtu.be/gwLzBJYoWlI" },
      { id:"rt-rsi",   name:"Single Leg Hop RSI",          sets:"3/bein",      load:"Maks",              note:"Mål: RSI >0,60 (fra 0,47/0,48)",          video:"https://youtu.be/Yd9VXHRe5Dw" },
    ],
  },
};

function getPhase(week, sessionId) {
  if (sessionId === "ankel") return week <= 2 ? "fase1" : week <= 6 ? "fase2" : "fase3";
  if (sessionId === "plyo") return (week <= 3 || week === 5) ? "fase1" : "fase2";
  if (sessionId === "styrke-a" || sessionId === "styrke-b") return (week <= 2 || week === 5) ? "fase1" : "fase2";
  return "fase1";
}

function getWeekColor(type) {
  if (type === "travel") return C.travel;
  if (type === "bridge") return C.bridge;
  if (type === "retest") return C.retest;
  return C.styrke;
}

const DAY_NAMES = ["","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag","Søndag"];

// ── COMPONENTS ────────────────────────────────────────────────

function ExerciseCard({ ex, done, onToggle }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: done ? `${C.done}12` : C.card2,
      border: `1px solid ${done ? C.done + "60" : C.border}`,
      borderRadius: 12, marginBottom: 8, overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer" }}
        onClick={() => setOpen(!open)}>
        <button onClick={e => { e.stopPropagation(); onToggle(); }}
          style={{
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
            border: `2px solid ${done ? C.done : C.border}`,
            background: done ? C.done : "transparent",
            color: "#000", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          {done ? "✓" : ""}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: done ? C.muted : C.text, textDecoration: done ? "line-through" : "none", lineHeight: 1.3 }}>
            {ex.name}
          </div>
          <div style={{ fontSize: 12, color: C.styrke, fontWeight: 700, marginTop: 2 }}>{ex.sets}</div>
        </div>
        <span style={{ color: C.muted, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px 56px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, color: C.muted }}>
              <span style={{ color: C.text, fontWeight: 600 }}>Belastning: </span>{ex.load}
            </div>
            <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>{ex.note}</div>
            <a href={ex.video} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1a0000", border: "1px solid #ff000040", color: "#ff4444", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, textDecoration: "none", marginTop: 4, width: "fit-content" }}>
              ▶ Instruksjonsvideo
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

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
          <span style={{ background: `${ts.color}20`, color: ts.color, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>
            {phase.replace("fase", "Fase ")}
          </span>
        </div>
        <div style={{ fontSize: 12, color: allDone ? C.done : C.muted, fontWeight: 600 }}>
          {doneCount}/{exList.length}
        </div>
      </div>
      {exList.map(ex => (
        <ExerciseCard
          key={ex.id} ex={ex}
          done={!!completions[`${weekNum}|${sessionId}|${ex.id}`]}
          onToggle={() => onToggle(weekNum, sessionId, ex.id)}
        />
      ))}
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
  const [loaded, setLoaded] = useState(false);

  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

  // Load completions from Supabase
  useEffect(() => {
    if (!authed) return;
    sbFetch(`completions?user_id=eq.${USER_ID}&select=exercise_key,week_number`)
      .then(data => {
        if (!data) return;
        const map = {};
        data.forEach(c => { map[`${c.week_number}|${c.exercise_key}`] = true; });
        // rebuild as week|sessionId|exId — stored as exercise_key = sessionId|exId
        const full = {};
        data.forEach(c => { full[`${c.week_number}|${c.exercise_key}`] = true; });
        setCompletions(full);
        setLoaded(true);
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
          {[["today",`I dag`],["week","Uke"],["overview","Fremgang"]].map(([v,label]) => (
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
              <div style={{ fontSize: 10, fontWeight: 700, color: weekColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>{weekData?.location}</div>
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
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Aktiv hvile er lov — sykkel, svømming, gåtur.</div>
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
                { l:"IMTP", fra:"22,26 N/kg", mål:"26+ N/kg", c:C.styrke },
                { l:"Ankel-asymmetri", fra:"24%", mål:"<12%", c:C.ankel },
                { l:"SL Hop RSI", fra:"0,47", mål:"0,60+", c:C.reaktiv },
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}