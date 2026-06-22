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

const paths = {
  teams: "resources/teams.csv",
  points: "resources/punteggi.csv",
  participants: "resources/partecipanti.csv",
  results: "resources/risultati.csv",
  rules: "resources/regolamento.txt",
};

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
  errorBox: document.querySelector("#errorBox"),
};

let appData = null;
let scoreView = "total";
let teamSort = {
  field: "points",
  direction: "desc",
};
let showPickedOnly = false;

init().catch(showError);

async function init() {
  const [teamsText, pointsText, participantsText, resultsText, rulesText] = await Promise.all([
    fetchText(paths.teams),
    fetchText(paths.points),
    fetchText(paths.participants),
    fetchText(paths.results),
    fetchText(paths.rules),
  ]);

  const teams = parseCsv(teamsText);
  const points = parseCsv(pointsText);
  const participants = parseCsv(participantsText);
  const results = parseCsv(resultsText);
  const pointsByEvent = new Map(points.map((row) => [normalize(row.Event), toNumber(row.Points)]));
  const teamsByName = new Map(teams.map((team) => [normalize(team.Team), team]));
  const pickedByTeam = buildPickedByTeam(participants);
  const teamScores = results
    .map((row) => ({
      ...buildTeamScore(row, pointsByEvent),
      pickedBy: pickedByTeam.get(normalize(row.Team)) || [],
    }))
    .sort((a, b) => b.total - a.total || a.team.localeCompare(b.team, "it"));

  const teamScoresByName = new Map(teamScores.map((team) => [normalize(team.team), team]));
  const ranking = participants
    .map((participant) => buildParticipantScore(participant, teamsByName, teamScoresByName))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "it"));

  applyRanks(ranking);
  applyPrizes(ranking);

  appData = { teams, points, ranking, teamScores, rulesText };
  renderAll();
  bindEvents();
}

async function fetchText(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Impossibile leggere ${path}`);
  }
  return response.text();
}

function parseCsv(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  const [headers, ...records] = rows;
  return records.map((record) =>
    headers.reduce((item, header, index) => {
      item[header.trim()] = (record[index] || "").trim();
      return item;
    }, {}),
  );
}

function detectDelimiter(text) {
  const firstDataLine = text
    .split(/\r?\n/)
    .find((line) => line.trim() !== "");
  if (!firstDataLine) return ";";

  const semicolons = countDelimiter(firstDataLine, ";");
  const commas = countDelimiter(firstDataLine, ",");
  return commas > semicolons ? "," : ";";
}

function countDelimiter(line, delimiter) {
  let count = 0;
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      count += 1;
    }
  }

  return count;
}

function buildTeamScore(row, pointsByEvent) {
  const multiplier = toNumber(row.Multiplier);
  const scoringColumns = Object.keys(row).filter(
    (key) => !["Team", "Group", "Multiplier", "Fase Eliminazione"].includes(key),
  );
  const events = scoringColumns
    .map((column) => scoreCell(column, row[column], pointsByEvent))
    .filter(Boolean);
  const base = events.reduce((sum, event) => sum + event.points, 0);

  return {
    team: row.Team,
    group: row.Group,
    multiplier,
    base,
    total: base * multiplier,
    events,
    eliminationPhase: row["Fase Eliminazione"] || "",
  };
}

function scoreCell(column, value, pointsByEvent) {
  const clean = String(value || "").trim();
  if (!clean) return null;

  const numeric = parseNumber(clean);
  if (numeric !== null) {
    return { label: column, value: clean, points: numeric, category: phaseCategory(column) };
  }

  const lookup = pointsByEvent.get(normalize(clean));
  return {
    label: column,
    value: clean,
    points: Number.isFinite(lookup) ? lookup : 0,
    category: phaseCategory(column),
  };
}

function phaseCategory(column) {
  if (column === "Punti Girone") return "group";
  if (column === "Qualificazione Girone") return "groupQualification";
  return "knockout";
}

function buildParticipantScore(participant, teamsByName, teamScoresByName) {
  const picks = [participant.Squadra1, participant.Squadra2, participant.Squadra3].map((teamName) => {
    const team = teamsByName.get(normalize(teamName));
    const score = teamScoresByName.get(normalize(teamName));
    return {
      name: teamName,
      group: team?.Group || score?.group || "-",
      multiplier: toNumber(team?.Multiplier || score?.multiplier),
      base: score?.base || 0,
      total: score?.total || 0,
      events: score?.events || [],
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
  els.leaderMeta.textContent =
    leaders.length === 1
      ? `Premio provvisorio ${formatEuro(leaders[0].prize)}`
      : `Premio diviso: ${formatEuro(leaders[0]?.prize || 0)} a testa`;
  els.updatedAt.textContent = scoreViewLabel();
}

function renderRanking() {
  els.rankingList.innerHTML = getParticipantRanking()
    .map((participant) => {
      const rankClass = participant.rank === 1 ? "gold" : participant.rank === 2 ? "green" : participant.rank === 3 ? "blue" : "";
      const prize = participant.prize > 0 ? `<span>${formatEuro(participant.prize)}</span>` : "";
      return `
        <article class="rank-card ${participant.prize > 0 ? "prize" : ""}">
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
        <div class="team-meta">${formatNumber(base)} punti base - ${visibleEvents.length} ${eventLabel}${team.eliminationPhase ? ` - Fase Eliminazione: ${escapeHtml(team.eliminationPhase)}` : ""}</div>
      </div>
      <div class="team-points">
        <strong>${formatNumber(total)}</strong>
        <span>punti</span>
      </div>
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
  els.dialogSummary.textContent = `${formatNumber(participant.total)} punti totali - premio provvisorio ${formatEuro(participant.prize)}`;
  els.dialogTeams.innerHTML = participant.picks
    .map((pick) => renderTeamDetail({
      team: pick.name,
      group: pick.group,
      multiplier: pick.multiplier,
      base: pick.base,
      total: pick.total,
      events: pick.events,
    }))
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
          <p>Girone ${escapeHtml(team.group)} - coefficiente x${formatNumber(team.multiplier)}</p>
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
