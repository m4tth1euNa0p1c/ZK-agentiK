"use strict";

const supplierOrigin = "http://127.0.0.1:38081";
const byId = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Élément d'interface absent : ${id}`);
  return element;
};
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const shortId = (value) => typeof value === "string" ? `${value.slice(0, 10)}…${value.slice(-4)}` : "—";
const clockFormat = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const durationFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const methodNames = {
  challenge_bound: "Preuve spécialisée fraîche",
  reusable: "Preuve spécialisée réutilisée",
  disclosure: "Ouvertures signées divulguées",
};
let challenge = null;
let presentation = null;
let snapshot = null;
let stateKnown = false;
let busy = false;
let executionAttempted = false;

class RequestFailure extends Error {
  constructor(message, uncertain = false) {
    super(message);
    this.uncertain = uncertain;
  }
}

function feedback(message, kind = "neutral") {
  const element = byId("feedback");
  element.className = `feedback ${kind}`;
  element.textContent = message;
}

function log(message) {
  const list = byId("activity-log");
  list.querySelector(".empty-entry")?.remove();
  const item = document.createElement("li");
  const time = document.createElement("time");
  const now = new Date();
  time.dateTime = now.toISOString();
  time.textContent = clockFormat.format(now);
  const text = document.createElement("span");
  text.textContent = message;
  item.append(time, text);
  list.prepend(item);
  while (list.children.length > 24) list.lastElementChild?.remove();
}

function refreshButtons() {
  const revoked = stateKnown && snapshot?.state.revoked === 1;
  byId("challenge-button").disabled = busy || revoked;
  byId("prove-button").disabled = busy || !challenge;
  byId("execute-button").disabled = busy || !presentation;
  byId("replay-button").disabled = busy || !presentation || !executionAttempted;
  byId("tamper-button").disabled = busy || !presentation;
  byId("refresh-button").disabled = busy;
  // Operator credentials never enter the browser. These controls are explanatory only.
  byId("rotate-button").disabled = true;
  byId("revoke-confirm").disabled = true;
  byId("revoke-button").disabled = true;
  byId("operation-select").disabled = true;
  byId("reconcile-button").disabled = true;
  byId("workflow").setAttribute("aria-busy", String(busy));
}

function renderExpiry() {
  const element = byId("challenge-expiry");
  if (!challenge) {
    element.textContent = "—";
    element.classList.remove("expired");
    return;
  }
  const remaining = challenge.expires_at_ms - Date.now();
  element.textContent = remaining > 0 ? `${Math.ceil(remaining / 1000)} s (horloge locale)` : "Expiré selon l'horloge locale";
  element.classList.toggle("expired", remaining <= 0);
}

function renderChallenge() {
  byId("challenge-id").textContent = challenge ? shortId(challenge.nonce) : "Aucun";
  byId("proof-status").textContent = presentation ? "Disponible en mémoire" : challenge ? "À produire" : "En attente du challenge";
  byId("method-badge").textContent = challenge ? methodNames[challenge.method] ?? "Profil serveur inconnu" : "Mode fixé par le contrôleur";
  byId("method-description").textContent = challenge?.method === "disclosure"
    ? "La politique serveur autorise ici la divulgation des ouvertures au contrôleur. Cette baseline n'est pas une preuve ZK. Les valeurs ne sont pas affichées dans la page."
    : "Le contrôleur impose le mode. Dans les profils ZK, les montants restent privés ; les engagements et métadonnées publics permettent de relier les présentations.";
  renderExpiry();
  refreshButtons();
}

function renderSnapshot(value) {
  snapshot = value;
  stateKnown = true;
  const revoked = value.state.revoked === 1;
  const connection = byId("connection-status");
  connection.textContent = revoked ? "Révoqué" : "Disponible";
  connection.className = `state-label${revoked ? " revoked" : ""}`;
  byId("effect-count").textContent = String(value.effects.length);
  byId("policy-epoch").textContent = String(value.state.policy_epoch);
  byId("trust-epoch").textContent = String(value.state.trust_epoch);
  byId("state-observed").textContent = `État serveur relu à ${clockFormat.format(new Date())}.`;
  const rows = byId("operations-body");
  rows.replaceChildren();
  const select = byId("operation-select");
  const previousSelection = select.value;
  select.replaceChildren();
  if (!value.operations.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.textContent = "Aucune opération enregistrée.";
    row.append(cell);
    rows.append(row);
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Aucune opération";
    select.append(option);
  }
  for (const operation of value.operations) {
    const row = document.createElement("tr");
    const id = document.createElement("td");
    const status = document.createElement("td");
    id.textContent = shortId(operation.id);
    id.title = operation.id;
    status.textContent = operation.status;
    row.append(id, status);
    rows.append(row);
    const option = document.createElement("option");
    option.value = operation.id;
    option.textContent = `${shortId(operation.id)} · ${operation.status}`;
    select.append(option);
  }
  if (value.operations.some((operation) => operation.id === previousSelection)) select.value = previousSelection;
  const audit = byId("server-audit");
  audit.replaceChildren();
  const names = { challenge_issued: "Challenge émis", reserved: "Opération réservée", completed: "Enregistrement terminé",
    unknown: "Résultat inconnu", revoked: "Confiance révoquée", policy_rotated: "Époque de politique changée",
    rejected_after_reservation: "Refus après réservation", reconciled: "Opération réconciliée" };
  for (const entry of value.audit.slice(-8).reverse()) {
    const item = document.createElement("li");
    let event;
    try { event = JSON.parse(entry.event); } catch { event = null; }
    const eventName = record(event) && typeof event.type === "string" ? names[event.type] ?? "Événement serveur" : "Événement non interprété";
    const date = record(event) && Number.isSafeInteger(event.at_ms) ? new Date(event.at_ms) : null;
    item.textContent = `#${entry.sequence} · ${eventName}${date && !Number.isNaN(date.valueOf()) ? ` · ${clockFormat.format(date)}` : ""}`;
    audit.append(item);
  }
  if (!value.audit.length) {
    const item = document.createElement("li");
    item.textContent = "Aucun événement serveur.";
    audit.append(item);
  }
  refreshButtons();
}

async function request(path, payload, timingId, origin = window.location.origin) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  const started = performance.now();
  try {
    const response = await fetch(new URL(path, origin), {
      method: payload === undefined ? "GET" : "POST",
      headers: payload === undefined ? undefined : { "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });
    let value;
    try { value = await response.json(); }
    catch { throw new RequestFailure(`Réponse HTTP ${response.status} non interprétable.`, true); }
    if (!response.ok) {
      const code = record(value) && typeof value.error === "string" && /^[A-Z0-9_]{1,80}$/.test(value.error) ? ` · ${value.error}` : "";
      const unknown = record(value) && (value.result_unknown === true || value.authorization_result === 'rejected_or_unknown');
      throw new RequestFailure(`${unknown ? 'Résultat à réconcilier' : 'Requête refusée'} : HTTP ${response.status}${code}.`, unknown);
    }
    return value;
  } catch (error) {
    if (error instanceof RequestFailure) throw error;
    throw new RequestFailure("Réponse indisponible ou délai HTTP dépassé. Le résultat n'est pas connu.", true);
  } finally {
    clearTimeout(timer);
    if (timingId) byId(timingId).textContent = `Requête HTTP : ${durationFormat.format(performance.now() - started)} ms`;
  }
}

async function readState() {
  try {
    const value = await request("/api/state");
    if (!record(value) || !record(value.state) || !Array.isArray(value.effects) || !Array.isArray(value.operations)
      || !Array.isArray(value.audit) || !value.operations.every((operation) => record(operation)
        && typeof operation.id === "string" && typeof operation.status === "string")) {
      throw new RequestFailure("État serveur non interprétable.", true);
    }
    renderSnapshot(value);
    return value;
  } catch {
    stateKnown = false;
    byId("connection-status").textContent = "État inconnu";
    byId("connection-status").className = "state-label unavailable";
    byId("effect-count").textContent = "?";
    byId("state-observed").textContent = "Lecture impossible. Les opérations ci-dessous, s'il y en a, sont le dernier état connu.";
    refreshButtons();
    return null;
  }
}

async function run(label, action) {
  if (busy) return;
  busy = true;
  refreshButtons();
  feedback(`${label}…`);
  try { await action(); }
  catch (error) {
    const message = error instanceof RequestFailure ? error.message : "Réponse inattendue. L'action ne peut pas être confirmée.";
    feedback(message, "warning");
    log(message);
    const state = await readState();
    if (!state) feedback(`${message} L'état n'a pas pu être relu ; aucun effet nul ne peut être affirmé.`, "warning");
  } finally {
    busy = false;
    refreshButtons();
  }
}

function alteredCopy(original) {
  const copy = structuredClone(original);
  for (const keyMatches of [(key) => key === "proof_hex", (key) => /signature/i.test(key)]) {
    const queue = [copy];
    while (queue.length) {
      const value = queue.shift();
      if (!record(value) && !Array.isArray(value)) continue;
      for (const [key, child] of Object.entries(value)) {
        if (keyMatches(key) && typeof child === "string" && /^[0-9a-f]{2,}$/i.test(child)) {
          value[key] = `${child[0] === "0" ? "1" : "0"}${child.slice(1)}`;
          return { value: copy, field: key === "proof_hex" ? "preuve" : "signature" };
        }
        if (record(child) || Array.isArray(child)) queue.push(child);
      }
    }
  }
  throw new RequestFailure("Aucun champ de preuve ou signature altérable trouvé. Aucun appel d'exécution envoyé.");
}

async function execute(candidate, expectedRejection, label) {
  if (!challenge) throw new RequestFailure("Demandez un challenge avant cet essai.");
  byId("effect-observation").textContent = "Lecture des compteurs autour de cet appel…";
  const before = await readState();
  byId("effects-before").textContent = before ? String(before.effects.length) : "?";
  byId("effects-after").textContent = "?";
  if (!before) {
    byId("effect-observation").textContent = "État initial inconnu ; aucun appel d'exécution envoyé.";
    throw new RequestFailure("État initial non consultable : aucun appel d'exécution envoyé.");
  }
  let outcome;
  let failure;
  if (!expectedRejection) executionAttempted = true;
  try {
    outcome = await request("/api/execute", { nonce: challenge.nonce, presentation: candidate }, "execute-timing");
    if (!record(outcome) || typeof outcome.status !== "string") throw new RequestFailure("Réponse d'exécution non interprétable.", true);
    byId("execution-status").textContent = outcome.status;
  } catch (error) {
    failure = error instanceof RequestFailure ? error : new RequestFailure("Résultat d'exécution inconnu.", true);
    byId("execution-status").textContent = failure.uncertain ? "INCONNU" : "Refus HTTP reçu";
  }
  const after = await readState();
  byId("effects-after").textContent = after ? String(after.effects.length) : "?";
  const observation = after
    ? `${before.effects.length} → ${after.effects.length} effet(s), variation observée : ${after.effects.length - before.effects.length}.`
    : "État final inaccessible : l'absence d'effet n'est pas établie.";
  byId("effect-observation").textContent = observation;
  const conclusion = failure ? failure.message : `État retourné : ${outcome.status}.`;
  log(`${label} — ${conclusion} ${observation}`);
  if (expectedRejection && after && after.effects.length !== before.effects.length) {
    feedback(`${label} : le compteur d'effets a changé pendant cet essai de refus. ${observation} Un rejet sans effet n'est pas établi ; examinez les opérations.`, "error");
  } else if (expectedRejection && !failure) {
    feedback(`${label} : une réponse de succès a été reçue alors qu'un rejet était attendu. ${observation} Consultez les opérations.`, "error");
  } else if (failure?.uncertain || !after || outcome?.status === "UNKNOWN") {
    feedback(`${conclusion} ${observation} Consultez l'état et réconciliez l'opération ; aucune mutation n'est relancée automatiquement.`, "warning");
  } else if (failure) {
    feedback(`${conclusion} ${observation} Le compteur est observé globalement ; le code HTTP seul ne qualifie pas la cause du refus.`, expectedRejection ? "neutral" : "warning");
  } else {
    feedback(`${conclusion} ${observation} Seule une autorisation synthétique locale est enregistrée.`, outcome.status === "COMPLETED" ? "success" : "warning");
  }
}

byId("challenge-button").addEventListener("click", () => run("Demande au contrôleur", async () => {
  challenge = null;
  presentation = null;
  executionAttempted = false;
  renderChallenge();
  const value = await request("/api/challenge", {}, "challenge-timing");
  if (!record(value) || !record(value.challenge) || typeof value.challenge.nonce !== "string"
    || !Number.isSafeInteger(value.challenge.expires_at_ms)) throw new RequestFailure("Challenge non interprétable.");
  challenge = value.challenge;
  renderChallenge();
  log("Challenge reçu du contrôleur. La politique et l'action sont imposées par le serveur.");
  feedback("Challenge reçu. Produisez la présentation avant son expiration.");
  await readState();
}));
byId("prove-button").addEventListener("click", () => run("Production chez le fournisseur", async () => {
  if (!challenge) throw new RequestFailure("Aucun challenge disponible.");
  presentation = null;
  renderChallenge();
  const value = await request("/api/prove", { challenge }, "prove-timing", supplierOrigin);
  if (!record(value) || !record(value.presentation)) throw new RequestFailure("Présentation non interprétable.");
  presentation = value.presentation;
  renderChallenge();
  log("Présentation reçue du fournisseur et conservée en mémoire, sans affichage de son contenu.");
  feedback("Présentation disponible. Le contrôleur doit encore la vérifier avant tout enregistrement.");
}));
byId("execute-button").addEventListener("click", () => run("Vérification et enregistrement", () => execute(presentation, false, "Exécution")));
byId("replay-button").addEventListener("click", () => run("Essai de rejeu", () => execute(presentation, true, "Rejeu de la même présentation")));
byId("tamper-button").addEventListener("click", () => run("Essai d'altération", async () => {
  const altered = alteredCopy(presentation);
  await execute(altered.value, true, `Altération d'une ${altered.field} dans une copie`);
}));
byId("refresh-button").addEventListener("click", () => run("Lecture du contrôleur", async () => {
  const value = await readState();
  feedback(value ? "État du contrôleur relu. Aucun appel de mutation effectué." : "État inaccessible. Les compteurs ne sont pas confirmés.", value ? "neutral" : "warning");
}));

renderChallenge();
setInterval(renderExpiry, 1000);
void run("Connexion au contrôleur", async () => {
  const value = await readState();
  feedback(value ? value.state.revoked === 1
    ? "Cette instance est déjà révoquée. Ses effets et opérations restent consultables."
    : "Contrôleur disponible. Demandez un challenge pour commencer."
    : "Contrôleur inaccessible. Vérifiez les deux serveurs locaux, puis relisez l'état.", value ? "neutral" : "warning");
});
