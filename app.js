// Terras Raras: Mining Tycoon v4.5
// Sistema com Redundância: Firebase Firestore + LocalStorage Fallback (Nunca reseta para nv 1)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXKVUV6DnlkWuozFp57rl6M1K-0iXHIjk",
  authDomain: "terras-rara-v1-pro.firebaseapp.com",
  projectId: "terras-rara-v1-pro",
  storageBucket: "terras-rara-v1-pro.firebasestorage.app",
  messagingSenderId: "737526391829",
  appId: "1:737526391829:web:493ee03146bbf97eaf5a1c",
  measurementId: "G-W2SZ7RWD4G"
};

let app = null;
let auth = null;
let db = null;
let firebaseInitialized = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseInitialized = true;
} catch (e) {
  console.warn("Firebase inicializado em modo offline/local:", e);
}

const MATERIALS = {
  ore: { name: "Minério bruto", icon: "🪨", price: 1200, unit: "un.", color: "ore" },
  concentrate: { name: "Concentrado mineral", icon: "⛰️", price: 42, unit: "un.", color: "concentrate" },
  mixed: { name: "Composto misto TR", icon: "🧪", price: 75, unit: "un.", color: "mixed" },
  oxide: { name: "Óxido de terras raras", icon: "🔮", price: 125, unit: "un.", color: "oxide" },
  metal: { name: "Metal de neodímio", icon: "🔩", price: 210, unit: "un.", color: "metal" },
  alloy: { name: "Liga NdFeB", icon: "🛡️", price: 330, unit: "un.", color: "alloy" },
  magnet: { name: "Ímã permanente NdFeB", icon: "🧲", price: 520, unit: "un.", color: "magnet" },
  motor: { name: "Motor elétrico TR", icon: "⚙️", price: 850, unit: "un.", color: "motor" },
  chip: { name: "Chip de alta precisão", icon: "💾", price: 1650, unit: "un.", color: "chip" },
  battery: { name: "Bateria estado sólido", icon: "🔋", price: 2800, unit: "un.", color: "battery" },
  quantum_core: { name: "Núcleo quântico", icon: "⚛️", price: 4500, unit: "un.", color: "quantum" },
  vovo_artifact: { name: "Nave VovôBrDias", icon: "🚀", price: 10000, unit: "un.", color: "artifact" }
};

function matBadge(id){
  const m = MATERIALS[id];
  if(!m) return "";
  return `<span class="mat-badge mat-${m.color}">${m.icon} ${m.name}</span>`;
}

const MISSIONS = [
  { title: "Extração mineral", sticker: "⛏️", desc: "Inicie a operação da jazida e garanta seu lote inicial de minério bruto.", goal: "ore", target: 50, reward: 1200, stage: "Fase 1: Lavra" },
  { title: "Britagem e moagem", sticker: "🏗️", desc: "Use o britador BM-1200 para quebrar as rochas e gerar concentrado mineral.", goal: "concentrate", target: 20, reward: 1500, stage: "Fase 1: Cominuição" },
  { title: "Beneficiamento mineral", sticker: "🧪", desc: "Concentre os minerais portadores de terras raras por separação física.", goal: "mixed", target: 12, reward: 1800, stage: "Fase 1: Concentração" },
  { title: "Processamento químico", sticker: "⚗️", desc: "Faça a lixiviação química para obter óxidos de terras raras.", goal: "oxide", target: 4, reward: 2200, stage: "Fase 1: Hidrometalurgia" },
  { title: "Separação dos elementos", sticker: "🔬", desc: "Avance no fracionamento e purificação dos óxidos.", goal: "oxide", target: 10, reward: 2600, stage: "Fase 1: Separação" },
  { title: "Produção de óxidos", sticker: "🔮", desc: "Amplie o estoque de óxidos puros de neodímio e praseodímio.", goal: "oxide", target: 20, reward: 3000, stage: "Fase 1: Óxidos" },
  { title: "Refino e metais", sticker: "🔥", desc: "Transforme óxidos purificados em metal de neodímio.", goal: "metal", target: 10, reward: 3500, stage: "Fase 1: Metalurgia" },
  { title: "Ligas metálicas NdFeB", sticker: "🛡️", desc: "Combine neodímio, ferro e boro para fundir ligas magnéticas.", goal: "alloy", target: 8, reward: 4200, stage: "Fase 1: Ligas" },
  { title: "Ímãs permanentes", sticker: "🧲", desc: "Sintetize superímãs permanentes de altíssima potência.", goal: "magnet", target: 5, reward: 5000, stage: "Fase 1: Ímãs" },
  { title: "Aplicação industrial", sticker: "⚙️", desc: "Monte motores elétricos de alto desempenho e conclua a Fase 1!", goal: "motor", target: 3, reward: 15000, stage: "Fase 1: Homenagem de Nível" },
  { title: "Microeletrônica avançada", sticker: "💾", desc: "Inicie a Fase 2 fabricando chips de alta precisão.", goal: "chip", target: 5, reward: 20000, stage: "Fase 2: Nanotecnologia" },
  { title: "Baterias de estado sólido", sticker: "🔋", desc: "Produza células de energia de altíssima densidade.", goal: "battery", target: 4, reward: 25000, stage: "Fase 2: Energia" },
  { title: "Propulsão magnética", sticker: "⚛️", desc: "Construa núcleos quânticos para propulsão espacial.", goal: "quantum_core", target: 3, reward: 35000, stage: "Fase 2: Propulsão" },
  { title: "Projeto Espacial Aurora", sticker: "🛸", desc: "Monte os primeiros módulos da Nave VovôBrDias.", goal: "vovo_artifact", target: 2, reward: 50000, stage: "Fase 2: Exploração" },
  { title: "Nanofabricação em massa", sticker: "🖥️", desc: "Escale a linha de microchips para abastecer o mercado global.", goal: "chip", target: 15, reward: 75000, stage: "Fase 2: Semicondutores" },
  { title: "Supercomputação quântica", sticker: "🌌", desc: "Expanda a produção de núcleos quânticos estelares.", goal: "quantum_core", target: 8, reward: 110000, stage: "Fase 2: Supercomputação" },
  { title: "Frota Estelar VovôBrDias", sticker: "🚀", desc: "Construa uma esquadra de naves espaciais de exploração.", goal: "vovo_artifact", target: 5, reward: 160000, stage: "Fase 2: Expansão Estelar" },
  { title: "Monopólio tecnológico", sticker: "👑", desc: "Domine o fornecimento global de chips avançados.", goal: "chip", target: 30, reward: 250000, stage: "Fase 2: Império Comercial" },
  { title: "O Legado do Diretor", sticker: "🌠", desc: "Consolide a frota definitiva em homenagem a VovôBrDias.", goal: "vovo_artifact", target: 10, reward: 400000, stage: "Fase 2: O Legado" },
  { title: "O Trono do Cosmos", sticker: "🏆", desc: "Coroe o império supremo nas estrelas!", goal: "vovo_artifact", target: 20, reward: 1000000, stage: "Fase 2: Eternidade" }
];

const PROCESSES = [
  { id: "crush", title: "Britador BM-1200 (Britagem)", icon: "🏗️", desc: "Tritura rochas brutas de minério liberando minerais valiosos.", input: "ore", qty: 10, output: "concentrate", out: 5, cost: 120, unlock: 0 },
  { id: "benefit", title: "Beneficiamento Magnético", icon: "🧲", desc: "Separa fisicamente os minerais portadores de terras raras.", input: "concentrate", qty: 5, output: "mixed", out: 3, cost: 180, unlock: 1 },
  { id: "chem", title: "Reator Hidrometalúrgico", icon: "⚗️", desc: "Dissolve o composto misto para extrair óxidos puros.", input: "mixed", qty: 4, output: "oxide", out: 2, cost: 260, unlock: 2 },
  { id: "separate", title: "Purificação por Solventes", icon: "🔬", desc: "Multiplica e refina óxidos de terras raras de alta pureza.", input: "oxide", qty: 3, output: "oxide", out: 5, cost: 380, unlock: 4 },
  { id: "metal", title: "Forno de Redução Metalúrgica", icon: "🔥", desc: "Converte óxido purificado em metal de neodímio sólido.", input: "oxide", qty: 3, output: "metal", out: 2, cost: 520, unlock: 5 },
  { id: "alloy", title: "Fundição de Liga NdFeB", icon: "🛡️", desc: "Funde neodímio, ferro e boro em superligas magnéticas.", input: "metal", qty: 3, output: "alloy", out: 2, cost: 700, unlock: 6 },
  { id: "magnet", title: "Sinterização de Ímãs", icon: "🧲", desc: "Compacta e magnetiza a liga formando ímãs permanentes.", input: "alloy", qty: 2, output: "magnet", out: 1, cost: 900, unlock: 7 },
  { id: "motor", title: "Montagem de Motores TR", icon: "⚙️", desc: "Integra superímãs em motores elétricos de alta potência.", input: "magnet", qty: 2, output: "motor", out: 1, cost: 1200, unlock: 8 },
  { id: "chip", title: "Fábrica de Chips (Fase 2)", icon: "💾", desc: "Grava circuitos nanométricos com terras raras.", input: "motor", qty: 1, extraInput: "oxide", extraQty: 2, output: "chip", out: 1, cost: 1800, unlock: 10 },
  { id: "battery", title: "Células de Estado Sólido", icon: "🔋", desc: "Produz baterias ultra-seguras de longa duração.", input: "alloy", qty: 2, extraInput: "oxide", extraQty: 2, output: "battery", out: 1, cost: 2500, unlock: 11 },
  { id: "quantum_core", title: "Reator de Núcleo Quântico", icon: "⚛️", desc: "Cria propulsores magnéticos para viagens espaciais.", input: "motor", qty: 2, extraInput: "chip", extraQty: 1, output: "quantum_core", out: 1, cost: 4000, unlock: 12 },
  { id: "vovo_artifact", title: "Estaleiro Nave VovôBrDias", icon: "🚀", desc: "Constrói o módulo espacial supremo do Diretor!", input: "quantum_core", qty: 1, extraInput: "battery", extraQty: 2, output: "vovo_artifact", out: 1, cost: 8000, unlock: 13, isFinalProject: true }
];

const UPGRADES = [
  { id: "crusher", name: "Britador de Mandíbulas Turbo", icon: "🏗️", desc: "Aumenta a velocidade de britagem e reduz custos.", cost: 1800, eff: 5 },
  { id: "mill", name: "Moinho de Bolas Pesado", icon: "⚙️", desc: "Pulveriza rochas com máxima eficiência.", cost: 2600, eff: 8 },
  { id: "separator", name: "Separador Magnético Laser", icon: "🧲", desc: "Aprimora a pureza da extração mineral.", cost: 4200, eff: 12 },
  { id: "lab", name: "Laboratório Quântico", icon: "🔬", desc: "Otimiza reações químicas e rendimento.", cost: 5500, eff: 10 },
  { id: "automation", name: "Robótica Industrial IA", icon: "🤖", desc: "Automatiza linhas e corta despesas operacionais.", cost: 8000, eff: 18 },
  { id: "plant", name: "Megacomplexo Refinador", icon: "🏭", desc: "Expande a capacidade máxima da fábrica.", cost: 12000, eff: 25 },
  { id: "space_hub", name: "Estação Orbital VovôBrDias", icon: "🛰️", desc: "Suporte espacial definitivo para a Fase 2.", cost: 25000, eff: 35 }
];

// Estoque inicial calibrado: 25.000 Minério Bruto + 250.000 Créditos
const DEFAULT_STATE = {
  coins: 250000,
  stock: { ore: 25000, concentrate: 0, mixed: 0, oxide: 0, metal: 0, alloy: 0, magnet: 0, motor: 0, chip: 0, battery: 0, quantum_core: 0, vovo_artifact: 0 },
  produced: { concentrate: 0, mixed: 0, oxide: 0, metal: 0, alloy: 0, magnet: 0, motor: 0, chip: 0, battery: 0, quantum_core: 0, vovo_artifact: 0 },
  completed: [],
  production: 0,
  upgrades: []
};

let state = structuredClone(DEFAULT_STATE);
let currentUserUid = null;
let unsubscribeSnapshot = null;
let saveDebounceTimer = null;
let isApplyingRemote = false;

let sfxEnabled = true;
let audioVoiceEnabled = true;
let lastSpokenText = "Bem-vindo Diretor! Seu progresso está salvo com segurança.";

const LOCAL_STORAGE_KEY = "terras_raras_save_v4_5";
const LEGACY_STORAGE_KEY = "terras_raras_save_v4_4";
let localRevision = 0;
let lastSyncedRevision = 0;
let pendingCloudWrites = 0;
let cloudWriteQueue = Promise.resolve();
let localSavedAt = 0;
let cloudReady = false;

const fmt = n => Number(n || 0).toLocaleString("pt-BR");
const $ = id => document.getElementById(id);

function setCloudStatus(text){
  const el = $("cloudSyncStatus");
  if(el) el.textContent = text;
}

function normalizeState(raw){
  const base = structuredClone(DEFAULT_STATE);
  if(!raw || typeof raw !== "object") return base;
  return {
    coins: typeof raw.coins === "number" ? raw.coins : base.coins,
    stock: { ...base.stock, ...(raw.stock || {}) },
    produced: { ...base.produced, ...(raw.produced || {}) },
    completed: Array.isArray(raw.completed) ? raw.completed : [],
    production: typeof raw.production === "number" ? raw.production : 0,
    upgrades: Array.isArray(raw.upgrades) ? raw.upgrades : []
  };
}

function loadFromLocalStorage(){
  try {
    let raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // v4.5 stores a versioned envelope; older versions stored the game state directly.
      if (parsed && parsed.gameState) {
        state = normalizeState(parsed.gameState);
        localSavedAt = Number(parsed.savedAt || 0);
      } else {
        state = normalizeState(parsed);
        localSavedAt = 0;
      }
      renderAll();
    }
  } catch(e) {
    console.error("Erro ao ler o salvamento local:", e);
    setCloudStatus("⚠️ Save local inválido");
  }
}

function saveToLocalStorage(){
  try {
    localSavedAt = Date.now();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      savedAt: localSavedAt,
      gameState: state
    }));
    return true;
  } catch(e) {
    console.error("Erro ao gravar localStorage:", e);
    setCloudStatus("⚠️ Armazenamento local cheio");
    return false;
  }
}

function applyRemoteSave(raw){
  const remoteState = raw && raw.gameState ? raw.gameState : raw;
  state = normalizeState(remoteState);
  localSavedAt = Number(raw?.clientUpdatedAt || Date.now());
  saveToLocalStorage();
  renderAll();
}

async function writeToFirebase(immediate = false){
  saveToLocalStorage();
  if (!currentUserUid || !db) {
    setCloudStatus("💾 Salvo neste dispositivo");
    return false;
  }

  const capturedRevision = localRevision;
  const payload = structuredClone(state);
  setCloudStatus("⏳ Preparando salvamento na nuvem...");

  const performWrite = async () => {
    pendingCloudWrites++;
    setCloudStatus("⏳ Enviando para a nuvem...");
    try {
      const saveRef = doc(db, "saves", currentUserUid);
      await setDoc(saveRef, {
        schemaVersion: 2,
        gameState: payload,
        clientUpdatedAt: Date.now(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      if (capturedRevision === localRevision) {
        lastSyncedRevision = capturedRevision;
        setCloudStatus("☁️ Progresso salvo na nuvem");
      } else {
        setCloudStatus("⏳ Há novas alterações para salvar...");
      }
      return true;
    } catch(err) {
      console.error("Falha ao salvar no Firestore:", err);
      setCloudStatus("⚠️ Falha na nuvem · cópia local mantida");
      return false;
    } finally {
      pendingCloudWrites = Math.max(0, pendingCloudWrites - 1);
    }
  };

  if (immediate) {
    clearTimeout(saveDebounceTimer);
    cloudWriteQueue = cloudWriteQueue.then(performWrite, performWrite);
    return cloudWriteQueue;
  }
  clearTimeout(saveDebounceTimer);
  return new Promise(resolve => {
    saveDebounceTimer = setTimeout(() => {
      cloudWriteQueue = cloudWriteQueue.then(performWrite, performWrite);
      cloudWriteQueue.then(resolve);
    }, 650);
  });
}

function save(immediate = false){
  renderAll();
  localRevision++;
  saveToLocalStorage();
  if (!isApplyingRemote && firebaseInitialized) writeToFirebase(immediate);
}

async function initFirebaseSync(){
  loadFromLocalStorage();

  if (!firebaseInitialized || !auth || !db) {
    setCloudStatus("💾 Modo local ativo");
    if ($("firebaseUidLabel")) $("firebaseUidLabel").textContent = "Save neste dispositivo";
    return;
  }

  setCloudStatus("⏳ Conectando ao Firebase...");
  try {
    // Firebase Auth mantém o mesmo UID anônimo neste navegador enquanto os dados do site forem preservados.
    const credential = await signInAnonymously(auth);
    currentUserUid = credential.user.uid;
    if ($("firebaseUidLabel")) $("firebaseUidLabel").textContent = `Conta anônima · ${currentUserUid.slice(0, 8)}…`;

    const saveRef = doc(db, "saves", currentUserUid);
    const snap = await getDoc(saveRef);
    if (snap.exists()) {
      const remote = snap.data();
      const remoteTime = Number(remote.clientUpdatedAt || 0);
      if (localSavedAt > remoteTime && localSavedAt > 0) {
        // A cópia local é mais recente: preserva-a e envia para a nuvem.
        await writeToFirebase(true);
      } else {
        isApplyingRemote = true;
        applyRemoteSave(remote);
        isApplyingRemote = false;
        localRevision = 0;
        lastSyncedRevision = 0;
        setCloudStatus("☁️ Save da nuvem carregado");
      }
    } else {
      // Primeira entrada: cria o documento sem apagar o progresso local existente.
      await writeToFirebase(true);
    }

    cloudReady = true;
    if (unsubscribeSnapshot) unsubscribeSnapshot();
    unsubscribeSnapshot = onSnapshot(saveRef, snapshot => {
      if (!snapshot.exists()) return;
      // Ignora ecos de gravações próprias e eventos enquanto há alterações locais pendentes.
      if (snapshot.metadata.hasPendingWrites || pendingCloudWrites > 0 || localRevision !== lastSyncedRevision) return;
      const remote = snapshot.data();
      const remoteState = remote.gameState || remote;
      isApplyingRemote = true;
      applyRemoteSave(remoteState === remote ? remote : { ...remote, gameState: remoteState });
      isApplyingRemote = false;
      setCloudStatus("☁️ Nuvem sincronizada");
    }, err => {
      console.error("Erro no listener do Firestore:", err);
      setCloudStatus("⚠️ Nuvem indisponível · save local ativo");
    });
  } catch(err) {
    console.error("Falha na autenticação/sincronização Firebase:", err);
    setCloudStatus("⚠️ Firebase indisponível · save local ativo");
    if ($("firebaseUidLabel")) $("firebaseUidLabel").textContent = "Save local de segurança";
  }
}

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;

function playSfx(type){
  if(!sfxEnabled || !AudioCtx) return;
  try{
    if(!actx) actx = new AudioCtx();
    if(actx.state === "suspended") actx.resume();
    const now = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);

    if(type === "click"){
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if(type === "crush"){
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(75, now + 0.18);
      osc.frequency.linearRampToValueAtTime(190, now + 0.32);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if(type === "coin"){
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.08);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if(type === "win"){
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = "triangle";
        o.connect(g);
        g.connect(actx.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.09);
        g.gain.setValueAtTime(0.15, now + idx * 0.09);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.28);
        o.start(now + idx * 0.09);
        o.stop(now + idx * 0.09 + 0.28);
      });
    }
  }catch(e){}
}

function spawnFloatingText(text, color = "#4ade80"){
  const layer = document.getElementById("fxLayer");
  if(!layer) return;
  const el = document.createElement("div");
  el.className = "fx-popup";
  el.textContent = text;
  el.style.color = color;
  el.style.left = (45 + (Math.random() * 20 - 10)) + "%";
  el.style.top = (45 + (Math.random() * 14 - 7)) + "%";
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1250);
}

function totalEfficiencyBonus(){
  return state.upgrades.reduce((acc, id) => acc + (UPGRADES.find(u => u.id === id)?.eff || 0), 0);
}

function effectiveCost(p){
  const bonus = totalEfficiencyBonus();
  const discountRate = Math.min(0.40, bonus * 0.005);
  return Math.max(10, Math.round(p.cost * (1 - discountRate)));
}

function speak(text){
  lastSpokenText = String(text || "").replace(/<[^>]*>/g, "");
  if(!audioVoiceEnabled || !lastSpokenText || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(lastSpokenText);
  u.lang = "pt-BR";
  u.rate = 1.0;
  window.speechSynthesis.speak(u);
}

function speakCurrentMission(){
  const i = activeMissionIndex();
  if(i < 0){
    speak("Parabéns Diretor! Todas as vinte missões foram concluídas!");
    return;
  }
  const m = MISSIONS[i];
  speak(`Missão ${i+1}: ${m.title}. ${m.desc}`);
}

function activeMissionIndex(){
  for(let i = 0; i < MISSIONS.length; i++){
    if(!state.completed.includes(i)) return i;
  }
  return -1;
}

function missionProgress(i){
  const m = MISSIONS[i];
  return Math.min(100, Math.floor((state.stock[m.goal] || 0) / m.target * 100));
}

function unlockedProcess(p){
  return state.completed.length >= p.unlock;
}

function toast(msg){
  const el = $("toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}

function showModal(title, text, symbol = "🎉", eyebrow = "CONQUISTA"){
  $("modalTitle").textContent = title;
  $("modalText").innerHTML = text;
  $("modalSymbol").textContent = symbol;
  $("modalEyebrow").textContent = eyebrow;
  $("modalBackdrop").classList.add("show");
}

function closeModal(){
  playSfx("click");
  $("modalBackdrop").classList.remove("show");
}

function changeView(name){
  playSfx("click");
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + name));
  document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  const labels = {
    dashboard: "Base Central",
    missions: "Quadro de Missões",
    production: "Fábrica & Brita",
    market: "Bolsa & Vendas",
    upgrades: "Hangar & Máquinas"
  };
  if($("pageTitle")) $("pageTitle").textContent = labels[name] || "Base Central";
  if($("sidebar")) $("sidebar").classList.remove("open");
  if($("sidebarBackdrop")) $("sidebarBackdrop").classList.remove("show");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderStock(){
  const list = $("stockList");
  if(!list) return;
  list.innerHTML = Object.entries(MATERIALS).map(([id, m]) => `
    <div class="stock-row">
      <span class="material-icon">${m.icon}</span>
      <div>${matBadge(id)}<small class="stock-sub">Valor: ${fmt(m.price)} CR/un.</small></div>
      <strong class="stock-qty">${fmt(state.stock[id])} ${m.unit}</strong>
    </div>
  `).join("");
}

function renderChain(){
  const strip = $("chainStrip");
  if(!strip) return;
  const displayMissions = MISSIONS.slice(0, 10);
  strip.innerHTML = displayMissions.map((m, i) => `
    <div class="chain-step ${state.completed.includes(i) ? "done" : i === activeMissionIndex() ? "" : "locked"}">
      <span class="step-no">${m.sticker} ETAPA ${String(i + 1).padStart(2, "0")}</span>
      <strong>${m.title}</strong>
      <div style="margin-top:8px">${matBadge(m.goal)}</div>
    </div>
  `).join("");
}

const STAGE_THEMES = [
  {
    name: "FASE 1 · BRITADOR BM-1200",
    svg: `<svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e3a5f"/><stop offset="100%" stop-color="#091321"/></linearGradient>
      </defs>
      <rect width="640" height="280" fill="url(#sky1)"/>
      <polygon points="80,280 210,95 340,280" fill="#132538" stroke="#f59e0b" stroke-width="2"/>
      <polygon points="260,280 390,115 520,280" fill="#0f1c2e" stroke="#22c55e" stroke-width="2"/>
      <rect x="290" y="135" width="170" height="85" rx="14" fill="#eab308" stroke="#040812" stroke-width="3"/>
      <rect x="310" y="110" width="90" height="35" rx="6" fill="#f59e0b" stroke="#040812" stroke-width="2"/>
      <line x1="450" y1="175" x2="545" y2="135" stroke="#94a3b8" stroke-width="10" stroke-linecap="round"/>
      <rect x="300" y="215" width="150" height="24" rx="12" fill="#1e293b" stroke="#22c55e" stroke-width="2"/>
      <circle cx="325" cy="227" r="7" fill="#22c55e"/>
      <circle cx="375" cy="227" r="7" fill="#22c55e"/>
      <circle cx="425" cy="227" r="7" fill="#22c55e"/>
      <circle cx="555" cy="155" r="6" fill="#94a3b8"><animate attributeName="cy" values="145;235" dur="1.1s" repeatCount="indefinite"/></circle>
      <circle cx="565" cy="175" r="5" fill="#cbd5e1"><animate attributeName="cy" values="145;235" dur="0.9s" repeatCount="indefinite"/></circle>
      <text x="410" y="264" text-anchor="middle" fill="#fbbf24" font-family="Chakra Petch,sans-serif" font-weight="700" font-size="13" letter-spacing="1.5">BRITADOR MÓVEL BM-1200 EM OPERAÇÃO</text>
    </svg>`
  },
  {
    name: "FASE 1 · REFINARIA QUÍMICA",
    svg: `<svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="280" fill="#091321"/>
      <rect x="250" y="65" width="120" height="155" rx="20" fill="#15273f" stroke="#a855f7" stroke-width="3"/>
      <circle cx="310" cy="140" r="32" fill="#a855f7" opacity="0.35"><animate attributeName="r" values="25;38;25" dur="2s" repeatCount="indefinite"/></circle>
      <path d="M370 110 H470 V190" fill="none" stroke="#06b6d4" stroke-width="6" stroke-linecap="round"/>
      <circle cx="470" cy="205" r="14" fill="#22c55e"/>
      <text x="360" y="255" text-anchor="middle" fill="#c084fc" font-family="Chakra Petch,sans-serif" font-weight="700" font-size="13" letter-spacing="1.5">REATOR HIDROMETALÚRGICO DE ÓXIDOS</text>
    </svg>`
  },
  {
    name: "FASE 2 · NANOFABRICAÇÃO & ESPAÇO",
    svg: `<svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="280" fill="#040812"/>
      <circle cx="480" cy="70" r="3" fill="#fff"/>
      <circle cx="240" cy="50" r="2" fill="#22c55e"/>
      <circle cx="550" cy="190" r="2.5" fill="#06b6d4"/>
      <rect x="260" y="75" width="220" height="120" rx="18" fill="#0f1c2e" stroke="#06b6d4" stroke-width="3"/>
      <circle cx="370" cy="135" r="28" fill="#22c55e" opacity="0.8"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" repeatCount="indefinite"/></circle>
      <text x="370" y="235" text-anchor="middle" fill="#06b6d4" font-family="Chakra Petch,sans-serif" font-weight="700" font-size="13" letter-spacing="1.5">FASE 2 · CHIPS QUÂNTICOS & FROTA ESTELAR</text>
    </svg>`
  }
];

function renderDashboard(){
  const idx = activeMissionIndex();
  if($("statCoins")) $("statCoins").innerHTML = `${fmt(state.coins)} <small>CR</small>`;
  if($("topCoins")) $("topCoins").textContent = fmt(state.coins);
  if($("statOre")) $("statOre").innerHTML = `${fmt(state.stock.ore)} <small>un.</small>`;
  if($("statProduction")) $("statProduction").innerHTML = `${fmt(state.production)} <small>un.</small>`;
  if($("statMissions")) $("statMissions").innerHTML = `${state.completed.length} <small>/ 20</small>`;
  if($("companyLevel")) $("companyLevel").textContent = state.completed.length >= 10 ? 2 : 1;
  if($("missionCount")) $("missionCount").textContent = idx < 0 ? "★" : idx + 1;
  if($("heroIndex")) $("heroIndex").innerHTML = `${idx < 0 ? "20" : String(idx + 1).padStart(2, "0")} <span>/ 20</span>`;

  const isPhase2 = state.completed.length >= 10;
  const theme = isPhase2 ? STAGE_THEMES[2] : (state.completed.length >= 3 ? STAGE_THEMES[1] : STAGE_THEMES[0]);
  if($("heroScene")) {
    const artIndex = idx < 0 ? 19 : idx;
    const col = artIndex % 4;
    const row = Math.floor(artIndex / 4);
    const x = (col / 3) * 100;
    const y = (row / 4) * 100;
    $("heroScene").innerHTML = `<div class="hero-mission-art" style="background-position:${x}% ${y}%"></div><span class="hero-stage-tag">${theme.name}</span>`;
  }

  if($("heroKicker")) $("heroKicker").textContent = isPhase2 ? "FASE 2 · NANOFABRICAÇÃO & ESPAÇO (11-20)" : "FASE 1 · MINERAÇÃO & BRITAGEM (1-10)";
  if($("heroTitle")) $("heroTitle").innerHTML = isPhase2 ? "Era dos Chips<br><em>& Estrelas!</em>" : "Britador BM-1200<br><em>em ação!</em>";

  if(idx < 0){
    if($("nextMissionEyebrow")) $("nextMissionEyebrow").textContent = "CAMPANHA ZERADA!";
    if($("nextMissionTitle")) $("nextMissionTitle").textContent = "🏆 O Trono do Cosmos é seu!";
    if($("nextMissionDesc")) $("nextMissionDesc").innerHTML = `Parabéns Diretor VovôBrDias! Todas as 20 missões foram conquistadas!`;
    if($("nextMissionBadge")) $("nextMissionBadge").textContent = "CONCLUÍDA";
    if($("missionProgressText")) $("missionProgressText").textContent = "100%";
    if($("missionProgressBar")) $("missionProgressBar").style.width = "100%";
    if($("nextMissionActionBtn")) $("nextMissionActionBtn").style.display = "none";
  } else {
    const m = MISSIONS[idx];
    const prog = missionProgress(idx);
    if($("nextMissionEyebrow")) $("nextMissionEyebrow").textContent = `${m.sticker} ${m.stage}`;
    if($("nextMissionTitle")) $("nextMissionTitle").textContent = `Missão ${String(idx + 1).padStart(2, "0")} · ${m.title}`;
    if($("nextMissionDesc")) $("nextMissionDesc").innerHTML = `${m.desc} Meta: <strong>${m.target} un.</strong> de ${matBadge(m.goal)}.`;
    if($("nextMissionBadge")) $("nextMissionBadge").textContent = prog >= 100 ? "🎉 PRONTA!" : "EM ANDAMENTO";
    if($("missionProgressText")) $("missionProgressText").textContent = prog + "%";
    if($("missionProgressBar")) $("missionProgressBar").style.width = prog + "%";
    if($("nextMissionActionBtn")) $("nextMissionActionBtn").style.display = "inline-flex";
  }

  renderStock();
  renderChain();
}

function renderMissions(){
  const pct = Math.round(state.completed.length / 20 * 100);
  if($("missionSummaryCount")) $("missionSummaryCount").textContent = `${state.completed.length}/20`;
  if($("allMissionProgress")) $("allMissionProgress").style.width = pct + "%";
  if($("allMissionPercent")) $("allMissionPercent").textContent = `${pct}% concluído`;

  const mList = $("missionList");
  if(!mList) return;
  mList.innerHTML = MISSIONS.map((m, i) => {
    const done = state.completed.includes(i);
    const unlocked = i === activeMissionIndex() || done;
    const progress = done ? 100 : unlocked ? missionProgress(i) : 0;
    const readyToClaim = unlocked && !done && (state.stock[m.goal] || 0) >= m.target;
    return `
      <article class="mission-card ${done ? "completed" : unlocked ? "unlocked" : "locked"}">
        <div class="mission-art" style="background-position:${((i % 4) / 3) * 100}% ${(Math.floor(i / 4) / 4) * 100}%" role="img" aria-label="Ilustração da missão ${i + 1}: ${m.title}"></div>
        <div class="mission-number">${done ? "✅" : m.sticker}</div>
        <div class="mission-info">
          <h3>Missão ${String(i + 1).padStart(2, "0")}: ${m.title}</h3>
          <p>${m.desc}</p>
          <div class="mission-reward">Meta: <strong>${m.target} un.</strong> de ${matBadge(m.goal)} · Prêmio: 🪙 <strong>+${fmt(m.reward)} CR</strong></div>
          <div class="progress-track" style="margin-top:10px;max-width:300px"><span style="width:${progress}%"></span></div>
        </div>
        <div class="mission-action">
          <small>${done ? "CONQUISTADA" : readyToClaim ? "🎁 PRONTA PARA RESGATE!" : unlocked ? `${progress}% completo` : "🔒 BLOQUEADA"}</small>
          ${unlocked && !done ? `<button class="btn ${readyToClaim ? "btn-light" : "btn-outline"} mission-claim-btn" data-mission="${i}" type="button">${readyToClaim ? "🎉 Resgatar Prêmio" : "Verificar"}</button>` : ""}
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".mission-claim-btn").forEach(btn => {
    btn.addEventListener("click", () => completeMission(Number(btn.dataset.mission)));
  });
}

function canRunTimes(p, times){
  const cost = effectiveCost(p) * times;
  const hasMain = (state.stock[p.input] || 0) >= p.qty * times;
  const hasExtra = !p.extraInput || (state.stock[p.extraInput] || 0) >= p.extraQty * times;
  return hasMain && hasExtra && state.coins >= cost;
}

function renderProcesses(){
  const grid = $("processGrid");
  if(!grid) return;
  grid.innerHTML = PROCESSES.map(p => {
    const open = unlockedProcess(p);
    const cost = effectiveCost(p);
    const can1 = open && canRunTimes(p, 1);
    const can5 = open && canRunTimes(p, 5);
    return `
      <article class="process-card ${p.isFinalProject ? "final-process-card" : ""}">
        <div class="process-top">
          <span class="process-icon sticker-float">${p.icon}</span>
          <span class="status-pill">${open ? "OPERACIONAL" : "🔒 BLOQUEADO"}</span>
        </div>
        <h3>${p.title}</h3>
        <p>${p.desc}</p>
        <div class="recipe">
          <strong>Consome:</strong> ${p.qty} ${matBadge(p.input)}${p.extraInput ? ` + ${p.extraQty} ${matBadge(p.extraInput)}` : ""}<br>
          <strong>Produz:</strong> ${p.out} ${matBadge(p.output)}<br>
          <strong>Estoque gerado:</strong> <span class="produced-count">${fmt(state.produced[p.output] || 0)} un.</span><br>
          <strong>Energia/Custo:</strong> 🪙 ${fmt(cost)} CR
        </div>
        <div class="process-btn-group">
          <button class="btn ${can1 ? "btn-light" : "btn-outline"} process-run-btn" data-process="${p.id}" data-times="1" type="button" ${can1 ? "" : "disabled"}>
            ${!open ? "🔒 Bloqueado" : !can1 ? "Faltam insumos" : `⚡ Acionar 1x (+${p.out})`}
          </button>
          <button class="btn ${can5 ? "btn-primary" : "btn-outline"} process-run-btn" data-process="${p.id}" data-times="5" type="button" ${can5 ? "" : "disabled"} title="Produzir 5 lotes de uma vez">
            ⚡ 5x
          </button>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".process-run-btn").forEach(btn => {
    btn.addEventListener("click", () => runProcess(btn.dataset.process, Number(btn.dataset.times || 1)));
  });

  const eff = 100 + totalEfficiencyBonus();
  if($("productionTotal")) $("productionTotal").textContent = `${fmt(state.production)} un.`;
  if($("equipmentTotal")) $("equipmentTotal").textContent = 1 + state.upgrades.length;
  if($("efficiencyValue")) $("efficiencyValue").textContent = `${eff}%`;
}

function renderMarket(){
  const marketGrid = $("marketGrid");
  if(!marketGrid) return;
  marketGrid.innerHTML = Object.entries(MATERIALS).map(([id, m]) => {
    const qtyAvailable = state.stock[id] || 0;
    const disabled = qtyAvailable <= 0;
    return `
      <article class="market-card ${id === "ore" || id === "chip" || id === "vovo_artifact" ? "chip-market-card" : ""}">
        <span class="material-icon sticker-float">${m.icon}</span>
        <div style="margin-top:10px">${matBadge(id)}</div>
        <p style="margin-top:8px">Em estoque: <strong>${fmt(qtyAvailable)} ${m.unit}</strong></p>
        <div class="market-price">🪙 ${fmt(m.price)} <small>CR / un.</small></div>
        <div class="sell-row">
          <input type="number" min="1" max="${Math.max(1, qtyAvailable)}" value="${qtyAvailable > 0 ? Math.min(5, qtyAvailable) : 0}" id="sell-${id}" ${disabled ? "disabled" : ""}>
          <button class="btn btn-light market-sell-btn" data-mat="${id}" type="button" ${disabled ? "disabled" : ""}>Vender</button>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".market-sell-btn").forEach(btn => {
    btn.addEventListener("click", () => sellMaterial(btn.dataset.mat));
  });
}

function renderUpgrades(){
  const upgradeGrid = $("upgradeGrid");
  if(!upgradeGrid) return;
  upgradeGrid.innerHTML = UPGRADES.map(u => {
    const owned = state.upgrades.includes(u.id);
    const canAfford = state.coins >= u.cost;
    return `
      <article class="upgrade-card">
        <span class="upgrade-icon sticker-float">${u.icon}</span>
        ${owned ? '<span class="owned">✅ INSTALADO</span>' : ""}
        <h3>${u.name}</h3>
        <p>${u.desc}</p>
        <div class="upgrade-cost">🪙 ${fmt(u.cost)} <small>CRÉDITOS</small></div>
        <div class="stat-foot positive">Bônus de Eficiência: +${u.eff}%</div>
        <button class="btn ${owned ? "btn-outline" : "btn-primary"} full upgrade-buy-btn" data-upgrade="${u.id}" type="button" style="margin-top:16px" ${owned || !canAfford ? "disabled" : ""}>
          ${owned ? "Equipamento Ativo" : !canAfford ? "Créditos Insuficientes" : "🛠️ Instalar Melhoria"}
        </button>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".upgrade-buy-btn").forEach(btn => {
    btn.addEventListener("click", () => buyUpgrade(btn.dataset.upgrade));
  });
}

function renderAll(){
  renderDashboard();
  renderMissions();
  renderProcesses();
  renderMarket();
  renderUpgrades();
}

function runProcess(id, times = 1){
  const p = PROCESSES.find(x => x.id === id);
  if(!p || !unlockedProcess(p)) return;
  if(!canRunTimes(p, times)){
    toast("⚠️ Insumos ou créditos insuficientes!");
    return;
  }
  const cost = effectiveCost(p) * times;
  state.stock[p.input] -= p.qty * times;
  if(p.extraInput) state.stock[p.extraInput] -= p.extraQty * times;
  const totalOut = p.out * times;
  state.stock[p.output] += totalOut;
  state.produced[p.output] = (state.produced[p.output] || 0) + totalOut;
  state.coins -= cost;
  state.production += totalOut;
  
  playSfx("crush");
  spawnFloatingText(`+${totalOut} ${MATERIALS[p.output].icon} ${MATERIALS[p.output].name}`, "#22d3ee");
  save(false);

  toast(`⚙️ ${p.title}: +${totalOut} ${MATERIALS[p.output].name} produzidos!`);
}

function completeMission(i){
  if(i !== activeMissionIndex()) return;
  const m = MISSIONS[i];
  if((state.stock[m.goal] || 0) < m.target){
    playSfx("click");
    toast(`⚠️ Você precisa de ${m.target} un. de ${MATERIALS[m.goal].name}.`);
    return;
  }
  state.completed.push(i);
  state.coins += m.reward;
  playSfx("win");
  spawnFloatingText(`+🪙 ${fmt(m.reward)} CR!`, "#fbbf24");
  save(true);

  const justUnlockedPhase2 = state.completed.length === 10;
  const isAllDone = state.completed.length >= MISSIONS.length;

  const titleModal = isAllDone ? "👑 IMPÉRIO SUPREMO CONQUISTADO!" : justUnlockedPhase2 ? "🏆 NÍVEL 2 · FASE 2 LIBERADA!" : `${m.sticker} Missão Concluída!`;
  const htmlResult = isAllDone
    ? `Parabéns Diretor VovôBrDias! Você completou todas as 20 missões e salvou sua glória!`
    : justUnlockedPhase2
    ? `⭐ <strong>Homenagem ao Diretor VovôBrDias!</strong><br><br>Você completou as 10 missões industriais e subiu para o <strong>Nível 2</strong>!<br>🚀 A <strong>Fase 2 (Chips & Espaço)</strong> foi desbloqueada!`
    : `Excelente trabalho! Você completou <strong>${m.title}</strong> e ganhou 🪙 <strong>+${fmt(m.reward)} Créditos</strong>!`;

  showModal(titleModal, htmlResult, isAllDone ? "👑" : justUnlockedPhase2 ? "🏆" : m.sticker, "RECOMPENSA");
}

function sellMaterial(id){
  const input = $("sell-" + id);
  if(!input) return;
  const qty = Math.floor(Number(input.value));
  if(!Number.isFinite(qty) || qty <= 0 || qty > state.stock[id]){
    toast("⚠️ Quantidade inválida.");
    return;
  }
  const revenue = qty * MATERIALS[id].price;
  state.stock[id] -= qty;
  state.coins += revenue;
  playSfx("coin");
  spawnFloatingText(`+🪙 ${fmt(revenue)} CR`, "#4ade80");
  save(false);
  toast(`💰 Venda realizada: +${fmt(revenue)} CR!`);
}

function buyUpgrade(id){
  const u = UPGRADES.find(x => x.id === id);
  if(!u || state.upgrades.includes(id) || state.coins < u.cost) return;
  state.coins -= u.cost;
  state.upgrades.push(id);
  playSfx("win");
  spawnFloatingText(`+${u.eff}% Eficiência!`, "#a855f7");
  save(true);
  showModal("Melhoria Instalada!", `<strong>${u.name}</strong> agora está operando na sua fábrica (+${u.eff}% eficiência)!`, u.icon, "ENGENHARIA");
}

async function startNewGame(){
  playSfx("click");
  if(!confirm("Deseja reiniciar sua campanha do zero com 25.000 de Minério Bruto e 250.000 Créditos?")) return;
  closeModal();
  state = structuredClone(DEFAULT_STATE);
  saveToLocalStorage();
  renderAll();
  if(firebaseInitialized && currentUserUid){
    await writeToFirebase(true);
  }
  changeView("dashboard");
  toast("✨ Nova campanha iniciada com 25.000 Minérios e 250.000 CR!");
}

function mineOreBonus(){
  state.stock.ore += 1000;
  playSfx("crush");
  spawnFloatingText("+1.000 🪨 Minério Bruto", "#fbbf24");
  save(false);
  toast("⛏️ Escavadeira extraiu +1.000 unidades de Minério Bruto!");
}

document.querySelectorAll(".nav-link").forEach(b => b.addEventListener("click", () => changeView(b.dataset.view)));
document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => changeView(b.dataset.goto)));

if($("brandHome")) $("brandHome").addEventListener("click", e => { e.preventDefault(); changeView("dashboard"); });

if($("mobileMenu") && $("sidebar") && $("sidebarBackdrop")){
  $("mobileMenu").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
    $("sidebarBackdrop").classList.toggle("show");
  });
  $("sidebarBackdrop").addEventListener("click", () => {
    $("sidebar").classList.remove("open");
    $("sidebarBackdrop").classList.remove("show");
  });
}

["newGame", "resetGame"].forEach(id => {
  if($(id)) $(id).addEventListener("click", startNewGame);
});

if($("forceSyncBtn")){
  $("forceSyncBtn").addEventListener("click", async () => {
    playSfx("click");
    saveToLocalStorage();
    if(firebaseInitialized && currentUserUid){
      await writeToFirebase(true);
    }
    toast("💾 Progresso salvo localmente e na nuvem!");
  });
}

if($("mineBonusBtn")) $("mineBonusBtn").addEventListener("click", mineOreBonus);
if($("factoryMineBtn")) $("factoryMineBtn").addEventListener("click", mineOreBonus);

if($("sfxToggleBtn")){
  $("sfxToggleBtn").addEventListener("click", () => {
    sfxEnabled = !sfxEnabled;
    $("sfxToggleBtn").textContent = sfxEnabled ? "🔊 SFX: ON" : "🔇 SFX: OFF";
    if(sfxEnabled) playSfx("coin");
  });
}

if($("modalClose")) $("modalClose").addEventListener("click", closeModal);
if($("modalOk")) $("modalOk").addEventListener("click", closeModal);
if($("modalBackdrop")) $("modalBackdrop").addEventListener("click", e => { if(e.target === $("modalBackdrop")) closeModal(); });
if($("speakMissionBtn")) $("speakMissionBtn").addEventListener("click", speakCurrentMission);

if($("audioEnable")) $("audioEnable").addEventListener("click", () => { audioVoiceEnabled = true; speak("Narrador tático ativado, Diretor!"); });
if($("audioRepeat")) $("audioRepeat").addEventListener("click", () => speak(lastSpokenText));
$("audioToggle")?.addEventListener("click", () => {
  audioVoiceEnabled = !audioVoiceEnabled;
  $("audioToggle").textContent = audioVoiceEnabled ? "Voz Ligada" : "Voz Desligada";
});

renderAll();
initFirebaseSync();

