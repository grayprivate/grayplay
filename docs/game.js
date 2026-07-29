/* Same rules as prisoners_dilemma.py */
const C = "C";
const D = "D";

const PAYOFFS = {
  [`${C}${C}`]: 3,
  [`${C}${D}`]: 0,
  [`${D}${C}`]: 5,
  [`${D}${D}`]: 1,
};

function payoff(me, opp) {
  return PAYOFFS[`${me}${opp}`];
}

function maybeFlip(move, noise, rng) {
  if (noise > 0 && rng() < noise) {
    return move === C ? D : C;
  }
  return move;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function defaultRng() {
  return Math.random;
}

const strategyFactories = {
  "Always Cooperate": () => ({
    name: "Always Cooperate",
    reset() {},
    move() {
      return C;
    },
  }),
  "Always Defect": () => ({
    name: "Always Defect",
    reset() {},
    move() {
      return D;
    },
  }),
  "Tit for Tat": () => ({
    name: "Tit for Tat",
    reset() {},
    move(myHistory, oppHistory) {
      if (!oppHistory.length) return C;
      return oppHistory[oppHistory.length - 1];
    },
  }),
  "Tit for Two Tats": () => ({
    name: "Tit for Two Tats",
    reset() {},
    move(myHistory, oppHistory) {
      if (oppHistory.length < 2) return C;
      const a = oppHistory[oppHistory.length - 1];
      const b = oppHistory[oppHistory.length - 2];
      return a === D && b === D ? D : C;
    },
  }),
  "Grim Trigger": () => ({
    name: "Grim Trigger",
    triggered: false,
    reset() {
      this.triggered = false;
    },
    move(myHistory, oppHistory) {
      if (this.triggered || (oppHistory.length && oppHistory[oppHistory.length - 1] === D)) {
        this.triggered = true;
        return D;
      }
      return C;
    },
  }),
  Pavlov: () => ({
    name: "Pavlov",
    reset() {},
    move(myHistory, oppHistory) {
      if (!myHistory.length) return C;
      const last = payoff(myHistory[myHistory.length - 1], oppHistory[oppHistory.length - 1]);
      if (last >= 3) return myHistory[myHistory.length - 1];
      return myHistory[myHistory.length - 1] === C ? D : C;
    },
  }),
  Random: (rng) => ({
    name: "Random",
    reset() {},
    move() {
      return rng() < 0.5 ? C : D;
    },
  }),
  "Suspicious Tit for Tat": () => ({
    name: "Suspicious Tit for Tat",
    reset() {},
    move(myHistory, oppHistory) {
      if (!oppHistory.length) return D;
      return oppHistory[oppHistory.length - 1];
    },
  }),
};

const ALL_NAMES = Object.keys(strategyFactories);

function createStrategy(name, rng) {
  return strategyFactories[name](rng);
}

function playMatch(a, b, rounds, noise, rng) {
  a.reset();
  b.reset();
  const historyA = [];
  const historyB = [];
  let scoreA = 0;
  let scoreB = 0;

  for (let i = 0; i < rounds; i++) {
    let moveA = a.move(historyA, historyB);
    let moveB = b.move(historyB, historyA);
    moveA = maybeFlip(moveA, noise, rng);
    moveB = maybeFlip(moveB, noise, rng);
    scoreA += payoff(moveA, moveB);
    scoreB += payoff(moveB, moveA);
    historyA.push(moveA);
    historyB.push(moveB);
  }

  return { scoreA, scoreB, historyA, historyB };
}

function runTournament(rounds, noise, seed) {
  const rng = seed === null || seed === undefined || Number.isNaN(seed)
    ? defaultRng()
    : mulberry32(seed);

  const instances = ALL_NAMES.map((name) => createStrategy(name, rng));
  const totals = Object.fromEntries(instances.map((s) => [s.name, 0]));
  const matchesPlayed = Object.fromEntries(instances.map((s) => [s.name, 0]));

  for (let i = 0; i < instances.length; i++) {
    for (let j = i; j < instances.length; j++) {
      const a = instances[i];
      const b = instances[j];
      // Fresh instances per match so stateful strategies reset cleanly
      const stratA = createStrategy(a.name, rng);
      const stratB = createStrategy(b.name, rng);
      const result = playMatch(stratA, stratB, rounds, noise, rng);
      totals[a.name] += result.scoreA;
      matchesPlayed[a.name] += 1;
      if (i !== j) {
        totals[b.name] += result.scoreB;
        matchesPlayed[b.name] += 1;
      }
    }
  }

  return Object.entries(totals)
    .map(([name, total]) => ({
      name,
      total,
      played: matchesPlayed[name],
      avg: matchesPlayed[name] ? total / matchesPlayed[name] : 0,
    }))
    .sort((x, y) => y.total - x.total);
}

/* ---------- UI ---------- */

const $ = (sel) => document.querySelector(sel);

function setMode(mode) {
  document.querySelectorAll(".tab").forEach((tab) => {
    const on = tab.dataset.panel === mode;
    tab.classList.toggle("is-active", on);
    tab.setAttribute("aria-selected", String(on));
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    const on = panel.id === `panel-${mode}`;
    panel.classList.toggle("is-active", on);
    panel.hidden = !on;
  });
}

document.querySelectorAll(".tab, [data-mode]").forEach((el) => {
  el.addEventListener("click", () => {
    const mode = el.dataset.panel || el.dataset.mode;
    setMode(mode);
  });
});

function bindNoise(rangeId, labelId) {
  const range = $(rangeId);
  const label = $(labelId);
  const sync = () => {
    label.textContent = `${Math.round(Number(range.value) * 100)}%`;
  };
  range.addEventListener("input", sync);
  sync();
}

bindNoise("#play-noise", "#play-noise-label");
bindNoise("#t-noise", "#t-noise-label");

/* Interactive match */
let match = null;

function resetTokens() {
  const you = $("#you-token");
  const ai = $("#ai-token");
  you.textContent = "?";
  ai.textContent = "?";
  you.className = "token you-token";
  ai.className = "token ai-token";
}

const FACE = {
  C: "😊",
  D: "😵",
};

function showToken(el, move) {
  el.textContent = FACE[move] || move;
  el.className = `token ${el.classList.contains("you-token") ? "you-token" : "ai-token"} is-${move.toLowerCase()} is-pulse`;
}

function renderHistory() {
  const box = $("#history");
  if (!match) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = match.historyYou
    .map((m, i) => {
      const theirs = match.historyAi[i];
      return `<span class="chip">#${i + 1} <span class="face ${m.toLowerCase()}" title="${m}">${FACE[m]}</span>/<span class="face ${theirs.toLowerCase()}" title="${theirs}">${FACE[theirs]}</span></span>`;
    })
    .join("");
}

function updateScoreboard() {
  if (!match) {
    $("#score-you").textContent = "0";
    $("#score-ai").textContent = "0";
    $("#round-num").textContent = "—";
    return;
  }
  $("#score-you").textContent = String(match.scoreYou);
  $("#score-ai").textContent = String(match.scoreAi);
  $("#round-num").textContent = match.done
    ? String(match.rounds)
    : String(match.historyYou.length + 1);
  $("#round-total").textContent = String(match.rounds);
}

function setActionsEnabled(on) {
  $("#btn-c").disabled = !on;
  $("#btn-d").disabled = !on;
}

function startMatch() {
  const name = $("#opponent").value;
  const rounds = Math.max(1, Number($("#play-rounds").value) || 20);
  const noise = Number($("#play-noise").value) || 0;
  const rng = defaultRng();
  const ai = createStrategy(name, rng);

  match = {
    ai,
    rounds,
    noise,
    rng,
    scoreYou: 0,
    scoreAi: 0,
    historyYou: [],
    historyAi: [],
    done: false,
  };

  ai.reset();
  $("#ai-label").textContent = name;
  $("#play-status").textContent = `Round 1 of ${rounds}. Choose Cooperate or Defect.`;
  resetTokens();
  setActionsEnabled(true);
  updateScoreboard();
  renderHistory();
}

function playRound(humanMove) {
  if (!match || match.done) return;

  let moveYou = humanMove;
  let moveAi = match.ai.move(match.historyAi, match.historyYou);
  moveYou = maybeFlip(moveYou, match.noise, match.rng);
  moveAi = maybeFlip(moveAi, match.noise, match.rng);

  match.scoreYou += payoff(moveYou, moveAi);
  match.scoreAi += payoff(moveAi, moveYou);
  match.historyYou.push(moveYou);
  match.historyAi.push(moveAi);

  showToken($("#you-token"), moveYou);
  showToken($("#ai-token"), moveAi);
  updateScoreboard();
  renderHistory();

  if (match.historyYou.length >= match.rounds) {
    match.done = true;
    setActionsEnabled(false);
    const youWin = match.scoreYou > match.scoreAi;
    const tie = match.scoreYou === match.scoreAi;
    $("#play-status").textContent = tie
      ? `Match over. Tie ${match.scoreYou}–${match.scoreAi}.`
      : youWin
        ? `Match over. You win ${match.scoreYou}–${match.scoreAi}.`
        : `Match over. AI wins ${match.scoreAi}–${match.scoreYou}.`;
    $("#round-num").textContent = String(match.rounds);
  } else {
    const n = match.historyYou.length + 1;
    $("#play-status").textContent = `Round ${n} of ${match.rounds}. Your move.`;
  }
}

$("#start-match").addEventListener("click", startMatch);
$("#reset-match").addEventListener("click", () => {
  match = null;
  $("#ai-label").textContent = "AI";
  $("#play-status").textContent = "Choose a strategy and start a match.";
  resetTokens();
  setActionsEnabled(false);
  updateScoreboard();
  renderHistory();
});
$("#btn-c").addEventListener("click", () => playRound(C));
$("#btn-d").addEventListener("click", () => playRound(D));

/* Tournament */
$("#run-tournament").addEventListener("click", () => {
  const rounds = Math.max(1, Number($("#t-rounds").value) || 200);
  const noise = Number($("#t-noise").value) || 0;
  const seedRaw = $("#t-seed").value;
  const seed = seedRaw === "" ? null : Number(seedRaw);
  const board = runTournament(rounds, noise, seed);
  const max = board[0]?.total || 1;
  const list = $("#leaderboard");
  list.innerHTML = board
    .map((row, i) => {
      const pct = Math.round((row.total / max) * 100);
      return `<li class="row${i === 0 ? " rank-1" : ""}" style="--pct:${pct}%; animation-delay:${i * 40}ms">
        <span class="rank">${i + 1}</span>
        <span class="name">${row.name}</span>
        <span class="stats"><strong>${row.total}</strong>avg ${row.avg.toFixed(2)}</span>
      </li>`;
    })
    .join("");
});
