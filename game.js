const ROUND_MS = 80_000;

function missedGroups(result) {
  return result.total - result.correct;
}

function decideWinner(a, b) {
  const wrongA = missedGroups(a);
  const wrongB = missedGroups(b);
  if (wrongA !== wrongB) return wrongA < wrongB ? "a" : "b";
  if (a.timeMs !== b.timeMs) return a.timeMs < b.timeMs ? "a" : "b";
  return "tie";
}

function winnerReason(a, b, winner) {
  if (winner === "tie") {
    return "Tie. Both players missed the same number of groups and took the same time.";
  }
  const winnerResult = winner === "a" ? a : b;
  const other = winner === "a" ? b : a;
  const name = winnerResult.name;
  if (winnerResult.correct === winnerResult.total && other.correct === other.total) {
    return `${name} wins. Both boards were complete, and ${name} was faster.`;
  }
  if (winnerResult.correct === winnerResult.total && other.correct < other.total) {
    if (other.timeMs < winnerResult.timeMs) {
      return `${name} wins. A complete board beats a faster unfinished one.`;
    }
    return `${name} wins. They solved every group.`;
  }
  if (winnerResult.correct > other.correct) {
    return `${name} wins. Fewer groups were left unsolved.`;
  }
  return `${name} wins. They missed the same number of groups, and ${name} was faster.`;
}

const DEMO = {
  id: "demo",
  player: "Practice",
  columns: 4,
  groups: [
    {
      id: "animals",
      name: "Animals",
      color: "#efc56d",
      ink: "#1b1714",
      items: ["Eagle", "Wolf", "Salmon", "Beetle"],
    },
    {
      id: "food",
      name: "Food",
      color: "#d7e4bc",
      ink: "#1b1714",
      items: ["Bread", "Apple", "Cheese", "Rice"],
    },
  ],
};

const TIMELINE = {
  id: "timeline",
  name: "Transport timeline",
  color: "#e07a3d",
  ink: "#1b1714",
  items: [
    line("Railways began it, linking cities along a track", "Railways"),
    line("Elevators carried it upward, floor by floor", "Elevators"),
    line("Bicycles carried it off the rails, onto your own route", "Bicycles"),
    line("Aircraft carried it into the air, off the ground", "Aircraft"),
  ],
};

const GAME_1 = {
  id: "p1",
  player: "Player 1",
  columns: 3,
  groups: [
    {
      id: "standardization",
      name: "Standardization",
      color: "#e6d3a3",
      ink: "#1b1714",
      items: [
        line("One unit of length", "One"),
        line("One track width across countries", "One"),
        line("Common train rules across borders", "Common"),
        line("One postage rate, near or far", "One"),
      ],
    },
    TIMELINE,
    {
      id: "investment",
      name: "Investment",
      color: "#2f5d52",
      ink: "#fbf6ee",
      items: [
        line("Outside money funding the network", "money"),
        line("Routes drawn for the investor, not local trade", "investor"),
        line("Comfort sold at a high price", "price"),
        line("Many makers chasing profit, most of them gone", "profit"),
      ],
    },
  ],
};

const GAME_2 = {
  id: "p2",
  player: "Player 2",
  columns: 3,
  groups: [
    structuredClone(TIMELINE),
    {
      id: "state",
      name: "The state",
      color: "#7a3030",
      ink: "#fbf6ee",
      items: [
        line("Public subsidies and free land", "Public"),
        line("A line built so armies could cross", "armies"),
        line("Speed limits imposed, then loosened", "limits"),
        line("Safety rules written after people got hurt", "rules"),
      ],
    },
    {
      id: "adoption",
      name: "Mass adoption",
      color: "#2c3a66",
      ink: "#fbf6ee",
      items: [
        line("The rich ride first", "rich"),
        line("Cheap lines later bring everyone else", "Cheap"),
        line("A luxury object that becomes everyday", "everyday"),
        line("The rich leave the shared carriage for a private one", "private"),
      ],
    },
  ],
};

const RECAP = [
  {
    group: GAME_1.groups[0],
    board: "p1",
    idea: "Space can shrink across a border only when everyone follows the same rule. One length, one track width, one set of train rules, and one price for a letter.",
  },
  {
    group: TIMELINE,
    board: "both",
    idea: "Each new machine opened a direction the one before it could not. Railways joined cities, elevators rose through buildings, bicycles left the track, and aircraft left the ground.",
  },
  {
    group: GAME_1.groups[2],
    board: "p1",
    idea: "Whoever paid for a network decided where it went. Outside money, routes drawn for profit, comfort sold at a price, and many makers who did not last.",
  },
  {
    group: GAME_2.groups[1],
    board: "p2",
    idea: "Governments paid when transport served power, and they wrote the rules after people got hurt. Subsidies and land, armies on the move, speed limits, then safety rules.",
  },
  {
    group: GAME_2.groups[2],
    board: "p2",
    idea: "A machine shrinks space for a whole society only once ordinary people use it. The rich ride first, cheap travel follows, it becomes everyday, and then the rich step back into a private seat.",
  },
];

const state = {
  screen: "intro",
  round: null,
  results: [],
  names: { p1: "", p2: "" },
  recapIndex: 0,
};

const app = document.querySelector("#app");
let timerId = 0;

document.addEventListener("keydown", (event) => {
  if (state.screen === "recap" && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
    event.preventDefault();
    showRecap(state.recapIndex + (event.key === "ArrowRight" ? 1 : -1));
    return;
  }
  if (event.key !== "Enter" || state.screen !== "play") return;
  if (event.target instanceof HTMLElement && event.target.classList.contains("tile")) return;
  event.preventDefault();
  submitSelection();
});

function displayName(gameId) {
  if (gameId === "p1") return state.names.p1.trim() || "Player 1";
  if (gameId === "p2") return state.names.p2.trim() || "Player 2";
  return "Practice";
}

function nextLabel(round) {
  if (round.id === "p2") return "See the winner";
  return `Continue to ${displayName(round.id === "demo" ? "p1" : "p2")}`;
}

function line(text, mark) {
  return { text, mark };
}

function itemText(item) {
  return typeof item === "string" ? item : item.text;
}

function groupPhrase(group) {
  return group.items.map(itemText).join(" · ");
}

function fillTile(button, tile) {
  const { text, mark } = tile;
  const start = mark ? text.indexOf(mark) : -1;
  if (start < 0) {
    button.append(text);
    return;
  }
  if (start > 0) button.append(text.slice(0, start));
  button.append(h("span", { class: "key", text: mark }));
  const end = text.slice(start + mark.length);
  if (end) button.append(end);
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeTiles(groups) {
  const tiles = [];
  groups.forEach((group) => {
    group.items.forEach((item, index) => {
      const text = itemText(item);
      tiles.push({
        id: `${group.id}-${index}`,
        text,
        mark: typeof item === "string" ? "" : item.mark || "",
        groupId: group.id,
      });
    });
  });
  return shuffle(tiles);
}

function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  });
  children.forEach((child) => {
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function render() {
  clear(app);
  if (state.screen === "intro") app.append(introView());
  else if (state.screen === "ready") app.append(readyView());
  else if (state.screen === "play") app.append(playView());
  else if (state.screen === "recap") app.append(recapView());
  else app.append(resultsView());
}

function introView() {
  const view = h("main", {});
  view.append(
    h("p", { class: "kicker", text: "Big History · Session 11" }),
    h("h1", { text: "Connections" }),
    h("p", {
      class: "lede",
      text: "Two players, one screen. Practice the rule, then each player gets 80 seconds on a different board.",
    })
  );

  const steps = h("ol", { class: "steps panel" });
  [
    ["Practice", "Two groups: animals and food. No clock."],
    ["Player 1", "Three groups of four. 80 seconds."],
    ["Player 2", "A different board. 80 seconds."],
    ["Results", "A finished board wins. Then fewer misses. Then the faster time."],
  ].forEach(([title, copy], index) => {
    steps.append(
      h("li", { class: "step" }, [
        h("span", { text: String(index + 1).padStart(2, "0") }),
        h("p", { text: `${title}. ${copy}` }),
      ])
    );
  });

  const names = h("div", { class: "names" });
  names.append(nameField("p1", "Player 1"), nameField("p2", "Player 2"));

  const actions = h("div", { class: "actions" });
  const start = h("button", { class: "btn", type: "button", text: "Begin practice" });
  start.addEventListener("click", () => {
    document.querySelectorAll(".name-input").forEach((input) => {
      state.names[input.dataset.player] = input.value;
    });
    startRound(DEMO);
  });
  actions.append(start);
  view.append(steps, names, actions);
  return view;
}

function nameField(id, label) {
  const field = h("label", { class: "name-field" });
  field.append(label);
  const input = h("input", {
    class: "name-input",
    type: "text",
    maxlength: "40",
    placeholder: "Name",
    value: state.names[id],
    autocomplete: "name",
  });
  input.dataset.player = id;
  field.append(input);
  return field;
}

function readyView() {
  const round = state.round;
  const view = h("main", {});
  view.append(
    h("p", { class: "kicker", text: "Pass the screen" }),
    h("h1", { text: round.player }),
    h("p", {
      class: "lede",
      text: "Three hidden groups, four tiles each. The clock starts when you press start. It stops when the board is complete, when you finish early, or at 80 seconds.",
    })
  );
  const actions = h("div", { class: "actions" });
  const start = h("button", { class: "btn", type: "button", text: "Start the clock" });
  start.addEventListener("click", () => beginTimedRound());
  actions.append(start);
  view.append(actions);
  return view;
}

function playView() {
  const round = state.round;
  const view = h("main", {});
  const head = h("header", { class: "play-head" });
  const titles = h("div", {});
  titles.append(
    h("p", { class: "kicker", text: round.player }),
    h("h1", { text: round.timed ? "Find the groups" : "Practice" })
  );
  titles.append(
    h("p", {
      class: "meta",
      text: round.complete
        ? "All groups found"
        : round.timed
          ? `${round.solved.size} of ${round.groups.length} groups found`
          : "Select four tiles that belong together.",
    })
  );
  head.append(titles);

  if (round.timed) {
    const timer = h("div", {
      class: remainingMs() <= 10_000 ? "timer danger" : "timer",
      "aria-live": "polite",
    });
    timer.append(h("span", { class: "clock", text: formatClock(remainingMs()) }));
    timer.append(h("span", { class: "timer-label", text: round.complete ? "done" : "remaining" }));
    head.append(timer);
  }
  view.append(head);

  const actions = h("div", { class: "play-actions" });
  if (round.complete) {
    const next = h("button", { class: "btn", type: "button", text: nextLabel(round) });
    next.addEventListener("click", proceedFromRound);
    actions.append(next);
    view.append(actions);
  }

  const solved = h("div", { class: "solved-list" });
  round.groups.forEach((group) => {
    if (!round.solved.has(group.id)) return;
    solved.append(solvedBar(group));
  });
  if (solved.childNodes.length) view.append(solved);

  const remaining = round.tiles.filter((tile) => !round.solved.has(tile.groupId));
  if (remaining.length) {
    const board = h("div", {
      class: `board board-${round.columns}${round.shake ? " shake" : ""}`,
    });
    remaining.forEach((tile) => {
      const button = h("button", {
        class: "tile",
        type: "button",
        "aria-pressed": round.selected.has(tile.id) ? "true" : "false",
      });
      fillTile(button, tile);
      button.addEventListener("click", () => toggleTile(tile.id));
      board.append(button);
    });
    view.append(board);
  }

  const feedback = h("p", {
    class: round.messageKind === "bad" ? "feedback bad" : "feedback",
    "aria-live": "polite",
    text: round.message,
  });
  view.append(feedback);

  if (!round.complete && (round.timed || remaining.length)) {
    const submit = h("button", {
      class: "btn",
      type: "button",
      text: "Submit four",
    });
    if (round.selected.size !== 4) submit.disabled = true;
    submit.addEventListener("click", submitSelection);
    actions.append(submit);
  }
  if (round.timed && !round.complete) {
    const finish = h("button", {
      class: "btn secondary",
      type: "button",
      text: "Finish now",
    });
    finish.addEventListener("click", () => finishTimedRound(performance.now() - round.startedAt));
    actions.append(finish);
  }
  if (!round.timed && !round.complete) {
    const skip = h("button", { class: "ghost", type: "button", text: "Skip practice" });
    skip.addEventListener("click", () => openReady(GAME_1));
    actions.append(skip);
  }
  if (!round.complete) view.append(actions);
  return view;
}

function solvedBar(group) {
  return h(
    "section",
    { class: "solved", style: `background:${group.color};color:${group.ink}` },
    [
      h("h2", { class: "solved-name", text: group.name }),
      h("p", { class: "solved-items", text: groupPhrase(group) }),
    ]
  );
}

function resultsView() {
  const [first, second] = state.results;
  const winner = decideWinner(first, second);
  const view = h("main", {});
  const banner = h("header", { class: "winner-banner" });
  banner.append(h("p", { class: "winner-kicker", text: winner === "tie" ? "Result" : "Winner" }));
  banner.append(
    h("h1", {
      class: "winner-name",
      text: winner === "tie" ? "Tie" : winner === "a" ? first.name : second.name,
    })
  );
  banner.append(h("p", { class: "reason", text: winnerReason(first, second, winner) }));
  view.append(banner);

  const scores = h("section", { class: "scores panel" });
  scores.append(scoreCard(first, winner === "a"));
  scores.append(scoreCard(second, winner === "b"));
  view.append(scores);

  const keys = h("section", { class: "keys panel" });
  keys.append(h("h2", { text: "Answer keys" }));
  state.results.forEach((result) => keys.append(answerKey(result)));
  view.append(keys);

  const actions = h("div", { class: "actions" });
  const recap = h("button", { class: "btn", type: "button", text: "Recap the groups" });
  recap.addEventListener("click", openRecap);
  const again = h("button", { class: "btn secondary", type: "button", text: "Play again" });
  again.addEventListener("click", resetGame);
  actions.append(recap, again);
  view.append(actions);
  return view;
}

function openRecap() {
  state.recapIndex = 0;
  state.screen = "recap";
  render();
}

function showRecap(index) {
  state.recapIndex = Math.max(0, Math.min(RECAP.length - 1, index));
  state.screen = "recap";
  render();
}

function recapWhere(board) {
  if (board === "both") return "Both boards";
  return `${displayName(board)}'s board`;
}

function recapView() {
  const entry = RECAP[state.recapIndex];
  const group = entry.group;
  const view = h("main", { class: "recap" });
  view.append(
    h("p", {
      class: "kicker",
      text: `Recap · ${state.recapIndex + 1} of ${RECAP.length}`,
    })
  );

  const card = h("section", {
    class: "recap-card",
    style: `background:${group.color};color:${group.ink}`,
  });
  card.append(h("p", { class: "recap-where", text: recapWhere(entry.board) }));
  card.append(h("h1", { text: group.name }));
  card.append(h("p", { class: "recap-idea", text: entry.idea }));

  const tiles = h("div", { class: "recap-tiles" });
  group.items.forEach((item) => {
    const tile = h("div", { class: "tile recap-tile" });
    fillTile(tile, typeof item === "string" ? { text: item, mark: "" } : item);
    tiles.append(tile);
  });
  card.append(tiles);
  view.append(card);

  const dots = h("div", { class: "recap-dots" });
  RECAP.forEach((item, index) => {
    const dot = h("button", {
      class: "recap-dot",
      type: "button",
      "aria-label": item.group.name,
    });
    if (index === state.recapIndex) dot.setAttribute("aria-current", "true");
    dot.addEventListener("click", () => showRecap(index));
    dots.append(dot);
  });
  view.append(dots);

  const actions = h("div", { class: "actions" });
  const back = h("button", { class: "btn secondary", type: "button", text: "Previous group" });
  if (state.recapIndex === 0) back.disabled = true;
  back.addEventListener("click", () => showRecap(state.recapIndex - 1));
  const next = h("button", {
    class: "btn",
    type: "button",
    text: state.recapIndex === RECAP.length - 1 ? "Back to the result" : "Next group",
  });
  next.addEventListener("click", () => {
    if (state.recapIndex === RECAP.length - 1) {
      state.screen = "results";
      render();
      return;
    }
    showRecap(state.recapIndex + 1);
  });
  actions.append(back, next);
  view.append(actions);
  return view;
}

function scoreCard(result, isWinner) {
  const card = h("article", { class: isWinner ? "score-card winner" : "score-card" });
  card.append(h("h2", { text: result.name }));
  card.append(stat("Groups solved", `${result.correct} / ${result.total}`));
  card.append(stat("Groups missed", String(missedGroups(result))));
  card.append(stat("Time", formatSeconds(result.timeMs)));
  return card;
}

function stat(label, value) {
  return h("div", { class: "stat" }, [h("span", { text: label }), h("b", { text: value })]);
}

function answerKey(result) {
  const block = h("div", { class: "key-block" });
  block.append(h("h3", { text: result.name }));
  result.groups.forEach((group) => {
    const found = result.solvedIds.includes(group.id);
    const row = h("div", { class: "key-row" });
    row.append(h("strong", { text: group.name }));
    row.append(h("span", { text: groupPhrase(group) }));
    row.append(
      h("span", {
        class: found ? "mark found" : "mark",
        text: found ? "Found" : "Missed",
      })
    );
    block.append(row);
  });
  return block;
}

function startRound(game) {
  clearInterval(timerId);
  state.results = game.id === "demo" ? [] : state.results;
  state.screen = "play";
  state.round = {
    id: game.id,
    player: displayName(game.id),
    columns: game.columns,
    groups: game.groups,
    tiles: makeTiles(game.groups),
    solved: new Set(),
    selected: new Set(),
    timed: false,
    startedAt: 0,
    message: "",
    messageKind: "",
    shake: false,
    open: true,
    complete: false,
    recorded: false,
  };
  render();
}

function openReady(game) {
  clearInterval(timerId);
  state.screen = "ready";
  state.round = {
    id: game.id,
    player: displayName(game.id),
    columns: game.columns,
    groups: game.groups,
    tiles: [],
    solved: new Set(),
    selected: new Set(),
    timed: true,
    startedAt: 0,
    message: "",
    messageKind: "",
    shake: false,
    open: false,
    complete: false,
    recorded: false,
  };
  render();
}

function beginTimedRound() {
  const round = state.round;
  round.tiles = makeTiles(round.groups);
  round.solved = new Set();
  round.selected = new Set();
  round.timed = true;
  round.open = true;
  round.startedAt = performance.now();
  round.message = "";
  round.messageKind = "";
  state.screen = "play";
  clearInterval(timerId);
  timerId = setInterval(tick, 100);
  render();
}

function tick() {
  const round = state.round;
  if (!round || !round.open) return;
  const elapsed = performance.now() - round.startedAt;
  if (elapsed >= ROUND_MS) {
    finishTimedRound(ROUND_MS);
    return;
  }
  const clock = document.querySelector(".clock");
  const timer = document.querySelector(".timer");
  if (clock) clock.textContent = formatClock(ROUND_MS - elapsed);
  if (timer) timer.className = ROUND_MS - elapsed <= 10_000 ? "timer danger" : "timer";
}

function remainingMs() {
  const round = state.round;
  if (!round?.timed || !round.startedAt) return ROUND_MS;
  return Math.max(0, ROUND_MS - (performance.now() - round.startedAt));
}

function toggleTile(id) {
  const round = state.round;
  if (!round?.open) return;
  if (round.selected.has(id)) round.selected.delete(id);
  else if (round.selected.size < 4) round.selected.add(id);
  round.message = "";
  round.messageKind = "";
  round.shake = false;
  render();
}

function submitSelection() {
  const round = state.round;
  if (!round?.open || round.selected.size !== 4) return;
  const chosen = round.tiles.filter((tile) => round.selected.has(tile.id));
  const groupIds = new Set(chosen.map((tile) => tile.groupId));
  if (groupIds.size === 1) {
    const groupId = chosen[0].groupId;
    round.solved.add(groupId);
    round.selected.clear();
    round.shake = false;
    round.message = "";
    round.messageKind = "";
    if (round.solved.size === round.groups.length) {
      round.complete = true;
      if (round.timed) finishTimedRound(performance.now() - round.startedAt);
      else {
        round.open = false;
        render();
      }
      return;
    }
    render();
    return;
  }

  const oneAway = round.groups.some((group) => {
    const hits = chosen.filter((tile) => tile.groupId === group.id).length;
    return hits === 3;
  });
  round.message = oneAway ? "One away." : "Not a group.";
  round.messageKind = "bad";
  round.shake = true;
  round.selected.clear();
  render();
}

function saveResult(timeMs) {
  const round = state.round;
  if (!round || round.recorded) return;
  round.recorded = true;
  state.results.push({
    name: round.player,
    total: round.groups.length,
    correct: round.solved.size,
    timeMs: Math.min(ROUND_MS, Math.max(0, timeMs)),
    solvedIds: [...round.solved],
    groups: round.groups,
  });
}

function finishTimedRound(timeMs) {
  const round = state.round;
  if (!round?.open && !round?.complete) return;
  if (round.open) {
    round.open = false;
    clearInterval(timerId);
    saveResult(timeMs);
  }
  if (round.complete) {
    render();
    return;
  }
  proceedFromRound();
}

function proceedFromRound() {
  const round = state.round;
  if (!round) return;
  if (round.id === "demo") openReady(GAME_1);
  else if (round.id === "p1") openReady(GAME_2);
  else {
    state.screen = "results";
    state.round = null;
    render();
  }
}

function resetGame() {
  clearInterval(timerId);
  state.screen = "intro";
  state.round = null;
  state.results = [];
  render();
}

function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

render();
