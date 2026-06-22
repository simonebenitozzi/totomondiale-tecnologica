const PRIZES = [70, 40, 20];
const ENTRY_FEE = 10;
const FLAGS = {
  "MESSICO": "🇲🇽",
  "REP. CECA": "🇨🇿",
  "KOREA": "🇰🇷",
  "SUDAFRICA": "🇿🇦",
  "SVIZZERA": "🇨🇭",
  "BOSNIA": "🇧🇦",
  "CANADA": "🇨🇦",
  "QATAR": "🇶🇦",
  "BRASILE": "🇧🇷",
  "MAROCCO": "🇲🇦",
  "SCOZIA": "🏴",
  "HAITI": "🇭🇹",
  "USA": "🇺🇸",
  "TURCHIA": "🇹🇷",
  "PARAGUAY": "🇵🇾",
  "AUSTRALIA": "🇦🇺",
  "GERMANIA": "🇩🇪",
  "ECUADOR": "🇪🇨",
  "COSTA D'AVORIO": "🇨🇮",
  "CURACAO": "🇨🇼",
  "OLANDA": "🇳🇱",
  "GIAPPONE": "🇯🇵",
  "SVEZIA": "🇸🇪",
  "TUNISIA": "🇹🇳",
  "BELGIO": "🇧🇪",
  "EGITTO": "🇪🇬",
  "IRAN": "🇮🇷",
  "NUOVA ZELANDA": "🇳🇿",
  "SPAGNA": "🇪🇸",
  "URUGUAY": "🇺🇾",
  "ARABIA SAUDITA": "🇸🇦",
  "CAPO VERDE": "🇨🇻",
  "FRANCIA": "🇫🇷",
  "NORVEGIA": "🇳🇴",
  "SENEGAL": "🇸🇳",
  "IRAQ": "🇮🇶",
  "ARGENTINA": "🇦🇷",
  "AUSTRIA": "🇦🇹",
  "ALGERIA": "🇩🇿",
  "GIORDANIA": "🇯🇴",
  "PORTOGALLO": "🇵🇹",
  "COLOMBIA": "🇨🇴",
  "CONGO": "🇨🇬",
  "UZBEKISTAN": "🇺🇿",
  "INGHILTERRA": "🏴",
  "CROAZIA": "🇭🇷",
  "GHANA": "🇬🇭",
  "PANAMA": "🇵🇦",
};

const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_KEY = window.APP_CONFIG?.SUPABASE_PUBLISHABLE_KEY;
const AUTH_USERNAME_DOMAIN = "fantamondiale.local";
const AUTH_STORAGE_KEY = "fantamondiale.admin.session";
const RESULT_FIELDS = [
  ["Punti Girone", "group", 1],
  ["Qualificazione Girone", "groupQualification", 2],
  ["Sedicesimi", "knockout", 3],
  ["Ottavi", "knockout", 4],
  ["Quarti", "knockout", 5],
  ["Semifinale", "knockout", 6],
  ["Finale", "knockout", 7],
];

const els = {
  totalPrize: document.querySelector("#totalPrize"),
  leaderName: document.querySelector("#leaderName"),
  leaderMeta: document.querySelector("#leaderMeta"),
  leaderPoints: document.querySelector("#leaderPoints"),
  updatedAt: document.querySelector("#updatedAt"),
  rankingList: document.querySelector("#rankingList"),
  teamsCount: document.querySelector("#teamsCount"),
  teamsList: document.querySelector("#teamsList"),
  teamSearch: document.querySelector("#teamSearch"),
  scoreViewSelects: document.querySelectorAll("[data-score-view]"),
  teamSortButtons: document.querySelectorAll("[data-team-sort]"),
  teamDirectionButtons: document.querySelectorAll("[data-team-direction]"),
  pickedFilter: document.querySelector("#pickedFilter"),
  rulesText: document.querySelector("#rulesText"),
  pointsTable: document.querySelector("#pointsTable"),
  dialog: document.querySelector("#participantDialog"),
  dialogType: document.querySelector("#dialogType"),
  dialogName: document.querySelector("#dialogName"),
  dialogSummary: document.querySelector("#dialogSummary"),
  dialogTeams: document.querySelector("#dialogTeams"),
  closeDialog: document.querySelector("#closeDialog"),
  loginButton: document.querySelector("#loginButton"),
  logoutButton: document.querySelector("#logoutButton"),
  loginDialog: document.querySelector("#loginDialog"),
  loginForm: document.querySelector("#loginForm"),
  loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword"),
  loginSubmit: document.querySelector("#loginSubmit"),
  loginError: document.querySelector("#loginError"),
  closeLogin: document.querySelector("#closeLogin"),
  editTeamDialog: document.querySelector("#editTeamDialog"),
  editTeamForm: document.querySelector("#editTeamForm"),
  editTeamName: document.querySelector("#editTeamName"),
  editTeamId: document.querySelector("#editTeamId"),
  editEliminationPhase: document.querySelector("#editEliminationPhase"),
  editResults: document.querySelector("#editResults"),
  editTeamError: document.querySelector("#editTeamError"),
  saveTeamButton: document.querySelector("#saveTeamButton"),
  closeEditTeam: document.querySelector("#closeEditTeam"),
  errorBox: document.querySelector("#errorBox"),
};

let appData = null;
let scoreView = "total";
let teamSort = {
  field: "points",
  direction: "desc",
};
let showPickedOnly = false;
let authSession = readStoredSession();
let isAdmin = false;

init().catch(showError);

async function init() {
  validateConfig();
  await restoreAdminSession();
  await loadData();
  bindEvents();
  renderAuth();
}

async function loadData() {
  const [points, participantsData, teams, teamResults, settings] = await Promise.all([
    fetchSupabase("scoring_events?select=phase,event,points&order=sort_order"),
    fetchSupabase("participants?select=id,name,participant_picks(pick_order,teams(name))&order=name"),
    fetchSupabase("teams?select=id,name,group_name,multiplier,elimination_phase&order=name"),
    fetchSupabase("team_results?select=id,team_id,label,points,display_value,category,sort_order&order=sort_order"),
    fetchSupabase("app_settings?select=key,value"),
  ]);

  const participants = participantsData.map((participant) => ({
    Partecipante: participant.name,
    ...Object.fromEntries(
      participant.participant_picks
        .sort((a, b) => a.pick_order - b.pick_order)
        .map((pick, index) => [`Squadra${index + 1}`, pick.teams.name]),
    ),
  }));
  const resultsByTeam = teamResults.reduce((groups, result) => {
    if (!groups.has(result.team_id)) groups.set(result.team_id, []);
    groups.get(result.team_id).push(result);
    return groups;
  }, new Map());
  const results = teams.map((team) => ({ team, events: resultsByTeam.get(team.id) || [] }));
  const rulesText = settings.find((setting) => setting.key === "rules")?.value || "";
  const pointsForView = points.map((row) => ({ Phase: row.phase, Event: row.event, Points: row.points }));
  const pickedByTeam = buildPickedByTeam(participants);
  const teamScores = results
    .map((row) => ({
      ...buildTeamScore(row),
      pickedBy: pickedByTeam.get(normalize(row.team.name)) || [],
    }))
    .sort((a, b) => b.total - a.total || a.team.localeCompare(b.team, "it"));

  const teamScoresByName = new Map(teamScores.map((team) => [normalize(team.team), team]));
  const ranking = participants
    .map((participant) => buildParticipantScore(participant, teamScoresByName))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "it"));

  applyRanks(ranking);
  applyPrizes(ranking);

  appData = { points: pointsForView, ranking, teamScores, rulesText };
  renderAll();
}

function validateConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes("YOUR_PROJECT_REF") || SUPABASE_KEY.includes("YOUR_SUPABASE")) {
    throw new Error("Configura SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY in config.js");
  }
}

async function fetchSupabase(resource, options = {}) {
  if (options.authenticated) await ensureFreshSession();
  const token = options.authenticated ? authSession?.access_token : SUPABASE_KEY;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${resource}`, {
    cache: "no-store",
    method: options.method || "GET",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Errore Supabase (${response.status}): ${details}`);
  }
  if (response.status === 204 || response.headers.get("content-length") === "0") return null;
  return response.json();
}

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function storeSession(session) {
  authSession = session;
  if (session) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function authRequest(path, body, accessToken) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "Autenticazione non riuscita");
  return data;
}

function normalizeSession(session) {
  return {
    ...session,
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + session.expires_in,
  };
}

async function ensureFreshSession() {
  if (!authSession) throw new Error("Sessione amministratore non disponibile");
  if (authSession.expires_at > Math.floor(Date.now() / 1000) + 60) return;
  const refreshed = await authRequest("token?grant_type=refresh_token", { refresh_token: authSession.refresh_token });
  storeSession(normalizeSession(refreshed));
}

async function restoreAdminSession() {
  if (!authSession) return;
  try {
    await ensureFreshSession();
    isAdmin = Boolean(await fetchSupabase("rpc/is_admin", { method: "POST", body: {}, authenticated: true }));
    if (!isAdmin) storeSession(null);
  } catch {
    storeSession(null);
    isAdmin = false;
  }
}

async function login(username, password) {
  const cleanUsername = username.trim().toLocaleLowerCase("it-IT");
  const email = cleanUsername.includes("@") ? cleanUsername : `${cleanUsername}@${AUTH_USERNAME_DOMAIN}`;
  const session = normalizeSession(await authRequest("token?grant_type=password", { email, password }));
  storeSession(session);
  try {
    isAdmin = Boolean(await fetchSupabase("rpc/is_admin", { method: "POST", body: {}, authenticated: true }));
    if (!isAdmin) throw new Error("Questo account non e' autorizzato come amministratore");
  } catch (error) {
    await logout();
    throw error;
  }
}

async function logout() {
  const token = authSession?.access_token;
  storeSession(null);
  isAdmin = false;
  if (token) await authRequest("logout", {}, token).catch(() => {});
  renderAuth();
  if (appData) renderTeams();
}

function renderAuth() {
  els.loginButton.hidden = isAdmin;
  els.logoutButton.hidden = !isAdmin;
}

function buildTeamScore({ team, events: resultRows }) {
  const multiplier = toNumber(team.multiplier);
  const events = resultRows.map((result) => ({
    label: result.label,
    value: result.display_value,
    points: toNumber(result.points),
    category: result.category,
  }));
  const base = events.reduce((sum, event) => sum + event.points, 0);

  return {
    id: team.id,
    team: team.name,
    group: team.group_name,
    multiplier,
    base,
    total: base * multiplier,
    events,
    eliminationPhase: team.elimination_phase || "",
  };
}

function buildParticipantScore(participant, teamScoresByName) {
  const picks = [participant.Squadra1, participant.Squadra2, participant.Squadra3].map((teamName) => {
    const score = teamScoresByName.get(normalize(teamName));
    return {
      name: teamName,
      group: score?.group || "-",
      multiplier: toNumber(score?.multiplier),
      base: score?.base || 0,
      total: score?.total || 0,
      events: score?.events || [],
      eliminationPhase: score?.eliminationPhase || "",
    };
  });

  return {
    name: participant.Partecipante,
    picks,
    total: picks.reduce((sum, pick) => sum + pick.total, 0),
  };
}

function buildPickedByTeam(participants) {
  const pickedByTeam = new Map();
  participants.forEach((participant) => {
    [participant.Squadra1, participant.Squadra2, participant.Squadra3].forEach((teamName) => {
      const key = normalize(teamName);
      if (!pickedByTeam.has(key)) pickedByTeam.set(key, []);
      pickedByTeam.get(key).push(participant.Partecipante);
    });
  });
  return pickedByTeam;
}

function applyRanks(ranking) {
  let previousScore = null;
  let previousRank = 0;
  ranking.forEach((participant, index) => {
    const rank = participant.total === previousScore ? previousRank : index + 1;
    participant.rank = rank;
    previousScore = participant.total;
    previousRank = rank;
  });
}

function applyPrizes(ranking) {
  ranking.forEach((participant) => {
    participant.prize = 0;
  });

  const groups = [];
  for (let i = 0; i < ranking.length; ) {
    const sameScore = ranking.filter((participant) => participant.total === ranking[i].total);
    groups.push({
      start: i + 1,
      end: i + sameScore.length,
      participants: sameScore,
    });
    i += sameScore.length;
  }

  groups.forEach((group) => {
    const prizePool = PRIZES
      .slice(group.start - 1, group.end)
      .reduce((sum, prize) => sum + (prize || 0), 0);
    const prize = prizePool / group.participants.length;
    group.participants.forEach((participant) => {
      participant.prize = prize;
    });
  });
}

function getScoredEvents(team) {
  if (scoreView === "group") {
    return team.events.filter((event) => event.category === "group");
  }
  if (scoreView === "groupQualification") {
    return team.events.filter((event) => ["group", "groupQualification"].includes(event.category));
  }
  if (scoreView === "knockout") {
    return team.events.filter((event) => event.category === "knockout");
  }
  return team.events;
}

function getTeamBase(team) {
  return getScoredEvents(team).reduce((sum, event) => sum + event.points, 0);
}

function getTeamTotal(team) {
  return getTeamBase(team) * team.multiplier;
}

function getTeamByName(teamName) {
  return appData?.teamScores.find((team) => normalize(team.team) === normalize(teamName));
}

function getParticipantRanking() {
  const ranking = appData.ranking
    .map((participant) => {
      const picks = participant.picks.map((pick) => {
        const team = getTeamByName(pick.name);
        return {
          ...pick,
          base: team ? getTeamBase(team) : 0,
          total: team ? getTeamTotal(team) : 0,
          events: team ? getScoredEvents(team) : [],
          eliminationPhase: team?.eliminationPhase || "",
        };
      });
      return {
        ...participant,
        picks,
        total: picks.reduce((sum, pick) => sum + pick.total, 0),
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "it"));

  applyRanks(ranking);
  applyPrizes(ranking);
  return ranking;
}

function isParticipantEliminated(participant) {
  return participant.picks.length === 3 && participant.picks.every((pick) => pick.eliminationPhase);
}

function scoreViewLabel() {
  if (scoreView === "group") return "Punti Girone";
  if (scoreView === "groupQualification") return "Girone + Qualificazione";
  if (scoreView === "knockout") return "Eliminazione diretta";
  return "Punteggi Totali";
}

function renderAll() {
  els.totalPrize.textContent = formatEuro(appData.ranking.length * ENTRY_FEE);
  renderHero();
  renderRanking();
  renderTeams();
  renderRules();
}

function renderHero() {
  const ranking = getParticipantRanking();
  const leaders = ranking.filter((participant) => participant.rank === 1);
  const label = leaders.length === 1 ? leaders[0].name : `${leaders.length} in testa`;
  els.leaderName.textContent = label;
  els.leaderPoints.textContent = formatNumber(leaders[0]?.total || 0);
  els.leaderMeta.textContent = scoreView === "total"
    ? leaders.length === 1
      ? `Premio provvisorio ${formatEuro(leaders[0].prize)}`
      : `Premio diviso: ${formatEuro(leaders[0]?.prize || 0)} a testa`
    : scoreViewLabel();
  els.updatedAt.textContent = scoreViewLabel();
}

function renderRanking() {
  els.rankingList.innerHTML = getParticipantRanking()
    .map((participant) => {
      const rankClass = participant.rank === 1 ? "gold" : participant.rank === 2 ? "silver" : participant.rank === 3 ? "bronze" : "";
      const showsPrize = scoreView === "total" && participant.prize > 0;
      const prize = showsPrize ? `<span>${formatEuro(participant.prize)}</span>` : "";
      const eliminated = isParticipantEliminated(participant);
      return `
        <article class="rank-card ${showsPrize ? "prize" : ""}" data-eliminated="${eliminated}">
          <div class="position ${rankClass}">${participant.rank}</div>
          <button type="button" data-participant="${escapeHtml(participant.name)}">
            <div class="person-name">${escapeHtml(participant.name)}</div>
            <div class="person-teams">${participant.picks.map((pick) => `${teamFlag(pick.name)} ${escapeHtml(pick.name)}`).join(" / ")}</div>
          </button>
          <div class="score-cell">
            <strong>${formatNumber(participant.total)}</strong>
            ${prize}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTeams() {
  const query = normalize(els.teamSearch.value);
  const filteredTeams = appData.teamScores.filter((team) => {
    const matchesSearch = normalize(team.team).includes(query);
    const matchesPickedFilter = !showPickedOnly || team.pickedBy.length > 0;
    return matchesSearch && matchesPickedFilter;
  });
  const teams = sortTeams(filteredTeams);
  els.teamsCount.textContent = `${teams.length} nazionali`;
  els.teamsList.innerHTML = teams.map((team) => renderTeamCard(team, { clickable: true })).join("");
}

function sortTeams(teams) {
  const direction = teamSort.direction === "asc" ? 1 : -1;
  return [...teams].sort((a, b) => {
    const primary = compareTeamValue(a, b, teamSort.field);
    if (primary !== 0) return primary * direction;
    return a.team.localeCompare(b.team, "it");
  });
}

function compareTeamValue(a, b, field) {
  if (field === "name") return a.team.localeCompare(b.team, "it");
  if (field === "group") return a.group.localeCompare(b.group, "it");
  if (field === "multiplier") return a.multiplier - b.multiplier;
  return getTeamTotal(a) - getTeamTotal(b);
}

function renderTeamCard(team, options = {}) {
  const tag = options.clickable ? "button" : "article";
  const attrs = options.clickable
    ? `type="button" class="team-card team-button" data-team="${escapeHtml(team.team)}"`
    : 'class="team-card"';
  const base = getTeamBase(team);
  const total = getTeamTotal(team);
  const visibleEvents = getScoredEvents(team);
  const eventLabel = visibleEvents.length === 1 ? "fase con punti" : "fasi con punti";

  return `
    <${tag} ${attrs} data-eliminated="${team.eliminationPhase ? "true" : "false"}">
      <div>
        <div class="team-title">
          <span class="flag" aria-hidden="true">${teamFlag(team.team)}</span>
          <strong>${escapeHtml(team.team)}</strong>
          <span class="group-box" aria-label="Girone ${escapeHtml(team.group)}">${escapeHtml(team.group)}</span>
          <span class="badge">x${formatNumber(team.multiplier)}</span>
          <span class="picked-badge">${formatNumber(team.pickedBy?.length || 0)} 👥</span>
        </div>
        <div class="team-meta">${team.eliminationPhase ? '<span class="eliminated-badge">Eliminata</span> ' : ""}${formatNumber(base)} punti base - ${visibleEvents.length} ${eventLabel}${team.eliminationPhase ? ` - Fase Eliminazione: ${escapeHtml(team.eliminationPhase)}` : ""}</div>
      </div>
      <div class="team-points">
        <strong>${formatNumber(total)}</strong>
        <span>punti</span>
      </div>
      ${options.clickable && isAdmin ? `<span class="edit-team-button" role="button" data-edit-team="${team.id}">Modifica risultati</span>` : ""}
    </${tag}>
  `;
}

function renderRules() {
  els.rulesText.textContent = appData.rulesText.trim();
  els.pointsTable.innerHTML = appData.points
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.Phase)}</td>
          <td>${escapeHtml(row.Event)}</td>
          <td>${formatNumber(toNumber(row.Points))}</td>
        </tr>
      `,
    )
    .join("");
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`#${tab.dataset.tab}`).classList.add("active");
    });
  });

  els.rankingList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-participant]");
    if (!button) return;
    const participant = getParticipantRanking().find((item) => item.name === button.dataset.participant);
    if (participant) openParticipant(participant);
  });

  els.teamsList.addEventListener("click", (event) => {
    const editControl = event.target.closest("[data-edit-team]");
    if (editControl) {
      const team = appData.teamScores.find((item) => item.id === Number(editControl.dataset.editTeam));
      if (team && isAdmin) openEditTeam(team);
      return;
    }
    const button = event.target.closest("button[data-team]");
    if (!button) return;
    const team = appData.teamScores.find((item) => item.team === button.dataset.team);
    if (team) openTeam(team);
  });

  els.teamSearch.addEventListener("input", renderTeams);
  els.scoreViewSelects.forEach((select) => {
    select.addEventListener("change", () => {
      scoreView = select.value;
      updateScoreViewControls();
      renderHero();
      renderRanking();
      renderTeams();
    });
  });
  els.teamSortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      teamSort.field = button.dataset.teamSort;
      updateSortControls();
      renderTeams();
    });
  });
  els.teamDirectionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      teamSort.direction = button.dataset.teamDirection;
      updateSortControls();
      renderTeams();
    });
  });
  els.pickedFilter.addEventListener("click", () => {
    showPickedOnly = !showPickedOnly;
    updateSortControls();
    renderTeams();
  });
  els.closeDialog.addEventListener("click", () => els.dialog.close());
  els.loginButton.addEventListener("click", () => {
    els.loginError.hidden = true;
    els.loginForm.reset();
    els.loginDialog.showModal();
    els.loginUsername.focus();
  });
  els.closeLogin.addEventListener("click", () => els.loginDialog.close());
  els.loginForm.addEventListener("submit", handleLoginSubmit);
  els.logoutButton.addEventListener("click", logout);
  els.closeEditTeam.addEventListener("click", () => els.editTeamDialog.close());
  els.editTeamForm.addEventListener("submit", handleTeamSave);
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  els.loginError.hidden = true;
  els.loginSubmit.disabled = true;
  els.loginSubmit.textContent = "Accesso...";
  try {
    await login(els.loginUsername.value, els.loginPassword.value);
    els.loginForm.reset();
    els.loginDialog.close();
    renderAuth();
    renderTeams();
  } catch (error) {
    els.loginError.textContent = error.message;
    els.loginError.hidden = false;
  } finally {
    els.loginSubmit.disabled = false;
    els.loginSubmit.textContent = "Accedi";
  }
}

function openEditTeam(team) {
  els.editTeamError.hidden = true;
  els.editTeamId.value = team.id;
  els.editTeamName.textContent = `${teamFlag(team.team)} ${team.team}`;
  els.editEliminationPhase.value = team.eliminationPhase || "";
  const eventsByLabel = new Map(team.events.map((item) => [item.label, item]));
  els.editResults.innerHTML = RESULT_FIELDS.map(([label]) => {
    const value = eventsByLabel.has(label) ? eventsByLabel.get(label).points : "";
    return `
      <label class="result-field">
        <span>${escapeHtml(label)}</span>
        <input type="number" min="0" step="0.01" inputmode="decimal" data-result-label="${escapeHtml(label)}" value="${value}">
      </label>
    `;
  }).join("");
  els.editTeamDialog.showModal();
}

async function handleTeamSave(event) {
  event.preventDefault();
  if (!isAdmin) return;
  els.editTeamError.hidden = true;
  els.saveTeamButton.disabled = true;
  els.saveTeamButton.textContent = "Salvataggio...";

  const results = [...els.editResults.querySelectorAll("[data-result-label]")]
    .filter((input) => input.value.trim() !== "")
    .map((input) => ({ label: input.dataset.resultLabel, points: Number(input.value) }));

  try {
    await fetchSupabase("rpc/save_team_results", {
      method: "POST",
      authenticated: true,
      body: {
        p_team_id: Number(els.editTeamId.value),
        p_elimination_phase: els.editEliminationPhase.value || null,
        p_results: results,
      },
    });
    els.editTeamDialog.close();
    await loadData();
  } catch (error) {
    els.editTeamError.textContent = error.message;
    els.editTeamError.hidden = false;
  } finally {
    els.saveTeamButton.disabled = false;
    els.saveTeamButton.textContent = "Salva risultati";
  }
}

function updateSortControls() {
  els.teamSortButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.teamSort === teamSort.field);
  });
  els.teamDirectionButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.teamDirection === teamSort.direction);
  });
  els.pickedFilter.classList.toggle("active", showPickedOnly);
  els.pickedFilter.setAttribute("aria-pressed", String(showPickedOnly));
}

function updateScoreViewControls() {
  els.scoreViewSelects.forEach((select) => {
    select.value = scoreView;
  });
}

function openParticipant(participant) {
  els.dialogType.textContent = "Partecipante";
  els.dialogName.textContent = participant.name;
  els.dialogSummary.textContent = scoreView === "total"
    ? `${formatNumber(participant.total)} punti totali - premio provvisorio ${formatEuro(participant.prize)}`
    : `${formatNumber(participant.total)} punti - ${scoreViewLabel()}`;
  els.dialogTeams.innerHTML = participant.picks
    .map((pick) => renderTeamDetail(getTeamByName(pick.name) || pick))
    .join("");
  els.dialog.showModal();
}

function openTeam(team) {
  els.dialogType.textContent = "Squadra";
  els.dialogName.textContent = `${teamFlag(team.team)} ${team.team}`;
  els.dialogSummary.textContent = `Girone ${team.group} - coefficiente x${formatNumber(team.multiplier)} - scelta da ${formatNumber(team.pickedBy.length)} partecipanti${team.eliminationPhase ? ` - Fase Eliminazione: ${team.eliminationPhase}` : ""}`;
  els.dialogTeams.innerHTML = renderTeamDetail(team);
  els.dialog.showModal();
}

function renderTeamDetail(team) {
  const base = getTeamBase(team);
  const total = getTeamTotal(team);
  return `
    <section class="journey-card" data-eliminated="${team.eliminationPhase ? "true" : "false"}">
      <div class="journey-top">
        <div>
          <h3><span class="flag large" aria-hidden="true">${teamFlag(team.team)}</span>${escapeHtml(team.team)}</h3>
          <p>Girone ${escapeHtml(team.group)} - coefficiente x${formatNumber(team.multiplier)}${team.eliminationPhase ? ` - Fase Eliminazione: ${escapeHtml(team.eliminationPhase)}` : ""}</p>
        </div>
        <div class="journey-score">
          <strong>${formatNumber(total)}</strong>
          <span>punti</span>
        </div>
      </div>
      <div class="journey-formula">
        ${formatNumber(base)} punti base x ${formatNumber(team.multiplier)} = ${formatNumber(total)}
      </div>
      ${renderPickedBy(team)}
      ${renderJourney(team)}
      ${renderElimination(team)}
    </section>
  `;
}

function renderPickedBy(team) {
  const pickedBy = getPickedBy(team.team);
  if (!pickedBy.length) {
    return `
      <div class="picked-panel">
        <h4>Scelta da</h4>
        <p>Nessun partecipante</p>
      </div>
    `;
  }

  return `
    <div class="picked-panel">
      <h4>Scelta da ${formatNumber(pickedBy.length)} partecipanti</h4>
      <div class="picked-list">
        ${pickedBy.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderJourney(team) {
  const events = getScoredEvents(team);
  if (!events.length) {
    return `
      <div class="empty-journey">
        Nessun risultato inserito per ora.
      </div>
    `;
  }

  return `
    <div class="journey-list">
      ${events
        .map((event) => {
          const multiplied = event.points * team.multiplier;
          return `
            <div class="journey-step">
              <div class="journey-marker"></div>
              <div class="journey-copy">
                <strong>${escapeHtml(event.label)}</strong>
                <span>${escapeHtml(event.value)}</span>
              </div>
              <div class="journey-points">
                <strong>+${formatNumber(multiplied)}</strong>
                <span>${formatNumber(event.points)} base</span>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderElimination(team) {
  if (!team.eliminationPhase) return "";

  return `
    <div class="elimination-step">
      <span class="elimination-x">X</span>
      <strong>Fase Eliminazione</strong>
      <span>${escapeHtml(team.eliminationPhase)}</span>
    </div>
  `;
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLocaleUpperCase("it-IT");
}

function teamFlag(teamName) {
  return FLAGS[normalize(teamName)] || "🏳";
}

function getPickedBy(teamName) {
  const team = appData?.teamScores.find((item) => normalize(item.team) === normalize(teamName));
  return team?.pickedBy || [];
}

function toNumber(value) {
  return parseNumber(value) ?? 0;
}

function parseNumber(value) {
  const clean = String(value || "").trim();
  if (!/^-?\d+([,.]\d+)?$/.test(clean)) return null;
  const parsed = Number(clean.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value) {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(value);
}

function formatEuro(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(error) {
  els.errorBox.hidden = false;
  els.errorBox.textContent = error.message || "Errore durante il caricamento dei dati.";
}
