const redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const grid = document.querySelector("#number-grid");
const outsideGrid = document.querySelector("#outside-grid");
const columnBets = document.querySelector("#column-bets");
const wagerInput = document.querySelector("#wager");
const chips = [];
let nextChipId = 1;
let selectedCustom = false;

for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 12; col++) {
    const number = 3 * (col + 1) - row;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pocket ${redNumbers.has(number) ? "red" : "black"}`;
    button.dataset.bet = `number-${number}`;
    button.dataset.number = String(number);
    button.dataset.numbers = String(number);
    button.textContent = String(number);
    button.setAttribute("aria-label", `Bet on ${number}`);
    grid.append(button);
  }
}

const bets = [
  { label: "1st column", kind: "column", values: Array.from({length:12},(_,i)=>1+3*i), odds: "2:1", symbol:"C1" },
  { label: "2nd column", kind: "column", values: Array.from({length:12},(_,i)=>2+3*i), odds: "2:1", symbol:"C2" },
  { label: "3rd column", kind: "column", values: Array.from({length:12},(_,i)=>3+3*i), odds: "2:1", symbol:"C3" },
  { label: "1st dozen", kind: "dozen", values: range(1,12), odds: "2:1", symbol:"1–12" },
  { label: "2nd dozen", kind: "dozen", values: range(13,24), odds: "2:1", symbol:"13–24" },
  { label: "3rd dozen", kind: "dozen", values: range(25,36), odds: "2:1", symbol:"25–36" },
  { label: "Low (1–18)", kind: "even", values: range(1,18), odds: "1:1", symbol:"1–18" },
  { label: "Even", kind: "even", values: range(1,36).filter(n=>n%2===0), odds: "1:1", symbol:"EVEN" },
  { label: "Odd", kind: "even", values: range(1,36).filter(n=>n%2===1), odds: "1:1", symbol:"ODD" },
  { label: "High (19–36)", kind: "even", values: range(19,36), odds: "1:1", symbol:"19–36" },
  { label: "Black", kind: "even", values: range(1,36).filter(n=>!redNumbers.has(n)), odds: "1:1", symbol:"BLK" },
  { label: "Red", kind: "even", values: [...redNumbers], odds: "1:1", symbol:"RED" }
];

for (const bet of bets.filter(item => item.kind !== "column")) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `outside-bet ${bet.kind === "column" ? "column-bet" : bet.kind === "dozen" ? "dozen" : "wide"} ${bet.label === "Red" ? "red" : bet.label === "Black" ? "black" : ""}`;
  button.dataset.bet = bet.label;
  button.dataset.values = bet.values.join(",");
  button.dataset.odds = bet.odds;
  button.dataset.kind = bet.kind;
  button.dataset.symbol = bet.symbol;
  button.textContent = bet.label;
  outsideGrid.append(button);
}

// Match the number rows from top (3, 6, ... 36) to bottom (1, 4, ... 34).
for (const bet of bets.filter(item => item.kind === "column").reverse()) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "outside-bet column-bet";
  button.dataset.bet = `column-${bet.symbol.slice(1)}`;
  button.dataset.values = bet.values.join(",");
  button.dataset.kind = bet.kind;
  button.dataset.odds = bet.odds;
  button.dataset.symbol = bet.symbol;
  button.textContent = "2 to 1";
  button.setAttribute("aria-label", `Bet on ${bet.label}, pays 2 to 1`);
  columnBets.append(button);
}

const tableButtons = [...document.querySelectorAll(".pocket, .outside-bet")];
const betDefinitions = new Map(tableButtons.map(button => {
  const number = button.dataset.number;
  const label = number !== undefined ? `Straight up · ${number}`
    : button.dataset.kind === "column" ? `Column ${button.dataset.symbol.slice(1)}` : button.dataset.bet;
  return [button.dataset.bet, {
    label,
    values: number !== undefined ? [number] : button.dataset.values.split(","),
    multiplier: Number((button.dataset.odds || "35:1").split(":")[0]) + 1
  }];
}));
const chipList = document.querySelector("#placed-list");
const trash = document.querySelector("#chip-trash");
const status = document.querySelector("#chip-status");
const customChip = document.querySelector("#custom-chip");
let drag = null;
let suppressClick = false;

function range(start, end) { return Array.from({ length: end - start + 1 }, (_, i) => start + i); }
function money(cents) { return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }); }
function shortMoney(cents) { return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`; }
function announce(message) { status.textContent = message; }

function updateChipValue() {
  const cents = Roulette.parseAmount(wagerInput.value);
  wagerInput.setAttribute("aria-invalid", String(cents === null));
  document.querySelector("#wager-error").hidden = cents !== null;
  customChip.textContent = cents === null ? "Enter a valid chip amount" : `Drag custom chip · ${shortMoney(cents)}`;
  customChip.disabled = cents === null;
  document.querySelectorAll(".chip").forEach(chip => {
    const active = !selectedCustom && Number(chip.dataset.value) * 100 === cents;
    chip.classList.toggle("active", active);
    chip.setAttribute("aria-pressed", String(active));
    chip.setAttribute("aria-label", `Select or drag a ${chip.textContent} chip`);
  });
}

function placeChip(betId, cents, custom = selectedCustom) {
  if (cents === null) {
    announce("Enter a valid chip amount before placing a bet.");
    wagerInput.focus();
    return;
  }
  // Keep totals and every possible payout within exact integer arithmetic.
  const total = chips.reduce((sum, chip) => sum + chip.cents, 0) + cents;
  if (!Number.isSafeInteger(total * 36)) {
    announce("The table total is too large. Remove chips before adding more.");
    return;
  }
  chips.push({ id: nextChipId++, betId, cents, custom });
  render();
  announce(`Placed ${money(cents)} on ${betDefinitions.get(betId).label}.`);
}

function removeChip(id) {
  const index = chips.findIndex(chip => chip.id === id);
  if (index === -1) return;
  const [chip] = chips.splice(index, 1);
  render();
  announce(`Removed ${money(chip.cents)} from ${betDefinitions.get(chip.betId).label}.`);
}

function render() {
  for (const button of tableButtons) {
    const placed = chips.filter(chip => chip.betId === button.dataset.bet);
    button.classList.toggle("selected", placed.length > 0);
    button.querySelectorAll(".table-chip").forEach(marker => marker.remove());
    const label = betDefinitions.get(button.dataset.bet).label;
    const total = placed.reduce((sum, chip) => sum + chip.cents, 0);
    button.setAttribute("aria-label", `Place chip on ${label}${placed.length ? `; ${placed.length} chips, ${money(total)} placed` : ""}`);
    if (placed.length) {
      const collapsed = placed.length >= 5 || placed.some(chip => chip.custom);
      const visibleChips = collapsed ? [placed[placed.length - 1]] : placed;
      visibleChips.forEach((chip, corner) => {
        const marker = document.createElement("span");
        marker.className = collapsed ? "table-chip chip-summary" : `table-chip chip-corner-${corner}`;
        marker.dataset.chipId = String(chip.id);
        if (!collapsed) marker.dataset.value = String(chip.cents / 100);
        marker.textContent = collapsed ? String(placed.length) : shortMoney(chip.cents);
        marker.title = collapsed
          ? `${placed.length} chips, ${money(total)} total. Drag to move the most recently placed chip.`
          : `${money(chip.cents)} chip. Drag to move this chip.`;
        marker.setAttribute("aria-hidden", "true");
        button.append(marker);
      });
      button.title = `${label}: ${money(total)} (${placed.length} chips)`;
    } else button.title = label;
  }

  chipList.replaceChildren();
  for (const chip of chips) {
    const item = document.createElement("li");
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "placed-chip";
    handle.dataset.chipId = String(chip.id);
    const label = betDefinitions.get(chip.betId).label;
    handle.textContent = `${shortMoney(chip.cents)} · ${label}`;
    handle.setAttribute("aria-label", `${money(chip.cents)} on ${label}. Drag to move, or press Delete to remove.`);
    handle.addEventListener("keydown", event => {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeAndFocus(chip.id);
      }
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-chip";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${money(chip.cents)} chip from ${label}`);
    remove.addEventListener("click", () => removeAndFocus(chip.id));
    item.append(handle, remove);
    chipList.append(item);
  }
  document.querySelector("#empty-chips").hidden = chips.length > 0;
  document.querySelector("#chip-count").textContent = `${chips.length} chip${chips.length === 1 ? "" : "s"}`;
  document.querySelector("#clear-bet").disabled = chips.length === 0;
  const summary = Roulette.summarize(chips, betDefinitions);
  document.querySelector("#total-wager").textContent = money(summary.wager);
  document.querySelector("#probability").textContent = chips.length ? `${(summary.profitable / 38 * 100).toFixed(2)}%` : "—";
  document.querySelector("#loss-probability").textContent = chips.length ? `${(summary.losing / 38 * 100).toFixed(2)}%` : "—";
  document.querySelector("#break-even-probability").textContent = chips.length ? `${(summary.breakEven / 38 * 100).toFixed(2)}%` : "—";
  document.querySelector("#pockets").textContent = chips.length ? `${summary.covered} of 38` : "—";
  document.querySelector("#total-return").textContent = chips.length
    ? summary.minReturn === summary.maxReturn ? money(summary.maxReturn) : `${money(summary.minReturn)} – ${money(summary.maxReturn)}`
    : "—";
  renderOutcomes(summary.outcomes);
}

function renderOutcomes(outcomes) {
  const section = document.querySelector("#outcome-breakdown");
  const list = document.querySelector("#outcome-list");
  section.hidden = outcomes.length === 0;
  list.replaceChildren();
  for (const outcome of outcomes) {
    const item = document.createElement("li");
    item.className = "outcome-card";
    const heading = document.createElement("div");
    heading.className = "outcome-heading";
    const title = document.createElement("strong");
    const names = outcome.winningBets.map(bet => betDefinitions.get(bet.betId).label.replace("Straight up · ", "Number "));
    title.textContent = names.length ? `${names.join(" + ")} ${names.length === 1 ? "wins" : "win"}` : "No winning bets";
    const chance = document.createElement("span");
    chance.className = "outcome-chance";
    chance.textContent = `${(outcome.probability * 100).toFixed(2)}%`;
    heading.append(title, chance);

    const reward = document.createElement("div");
    reward.className = "outcome-reward";
    const label = document.createElement("span");
    label.textContent = "Total return";
    const amount = document.createElement("strong");
    amount.textContent = money(outcome.grossReturn);
    reward.append(label, amount);
    const net = document.createElement("p");
    net.className = `outcome-net ${outcome.net > 0 ? "profit" : outcome.net < 0 ? "loss" : "break-even"}`;
    net.textContent = outcome.net > 0 ? `+${money(outcome.net)} net profit`
      : outcome.net < 0 ? `−${money(-outcome.net)} net loss` : "Break even";

    const detail = document.createElement("details");
    detail.className = "outcome-details";
    const toggle = document.createElement("summary");
    toggle.textContent = `${outcome.pockets.length} of 38 pockets · View details`;
    const pockets = document.createElement("p");
    pockets.textContent = `Lands on: ${outcome.pockets.join(", ")}`;
    detail.append(toggle, pockets);
    for (const bet of outcome.winningBets) {
      const line = document.createElement("p");
      line.className = "outcome-bet";
      line.textContent = `${betDefinitions.get(bet.betId).label}: ${bet.chipCount} chip${bet.chipCount === 1 ? "" : "s"}, ${money(bet.cents)} wager → ${money(bet.grossReturn)} return`;
      detail.append(line);
    }
    item.append(heading, reward, net, detail);
    list.append(item);
  }
}

function removeAndFocus(id) {
  const index = chips.findIndex(chip => chip.id === id);
  removeChip(id);
  const remaining = chipList.querySelectorAll(".remove-chip");
  (remaining[Math.min(index, remaining.length - 1)] || document.querySelector(".chip.active") || customChip).focus();
}

for (const button of tableButtons) {
  button.addEventListener("click", () => placeChip(button.dataset.bet, Roulette.parseAmount(wagerInput.value)));
}
wagerInput.addEventListener("input", () => {
  selectedCustom = true;
  updateChipValue();
});
document.querySelectorAll(".chip").forEach(chip => chip.addEventListener("click", () => {
  selectedCustom = false;
  wagerInput.value = chip.dataset.value;
  updateChipValue();
}));
customChip.addEventListener("click", () => {
  selectedCustom = true;
  updateChipValue();
  announce("Click a table space to place your custom chip, or drag this chip onto it.");
});
document.querySelector("#clear-bet").addEventListener("click", () => {
  chips.length = 0;
  render();
  document.querySelector(".chip.active")?.focus();
  announce("All chips removed.");
});

// Pointer events support mouse, pen, and touch; click/keyboard placement works too.
document.addEventListener("pointerdown", event => {
  if (event.button !== 0 || !event.isPrimary || drag) return;
  const source = event.target.closest(".chip, .custom-chip, .placed-chip, .table-chip");
  if (!source || source.disabled) return;
  // Only rack chips change the selected denomination; placed markers retain their own value.
  if (source.classList.contains("chip")) {
    selectedCustom = false;
    wagerInput.value = source.dataset.value;
    updateChipValue();
  }
  const chipId = source.dataset.chipId ? Number(source.dataset.chipId) : null;
  const existing = chips.find(chip => chip.id === chipId);
  const cents = existing?.cents ?? (source.dataset.value ? Number(source.dataset.value) * 100 : Roulette.parseAmount(wagerInput.value));
  if (cents === null) return;
  const custom = existing ? existing.custom : source === customChip;
  drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, cents, custom, chipId, source, ghost: null, target: null };
  source.setPointerCapture(event.pointerId);
});

document.addEventListener("pointermove", event => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
  event.preventDefault();
  if (!drag.ghost) {
    drag.ghost = document.createElement("div");
    drag.ghost.className = "drag-chip";
    if (drag.custom) drag.ghost.classList.add("chip-summary");
    else drag.ghost.dataset.value = String(drag.cents / 100);
    drag.ghost.textContent = shortMoney(drag.cents);
    drag.ghost.setAttribute("aria-hidden", "true");
    document.body.append(drag.ghost);
    document.body.classList.add("dragging-chip");
    trash.classList.toggle("accepts-chip", drag.chipId !== null);
  }
  drag.ghost.style.left = `${event.clientX}px`;
  drag.ghost.style.top = `${event.clientY}px`;
  drag.target?.classList.remove("drop-target");
  drag.target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".pocket, .outside-bet, #chip-trash") || null;
  if (drag.target === trash && drag.chipId === null) drag.target = null;
  drag.target?.classList.add("drop-target");
}, { passive: false });

function endDrag(event, cancelled = false) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const current = drag;
  drag = null;
  current.ghost?.remove();
  current.target?.classList.remove("drop-target");
  document.body.classList.remove("dragging-chip");
  trash.classList.remove("accepts-chip");
  if (current.source.hasPointerCapture(current.pointerId)) current.source.releasePointerCapture(current.pointerId);
  if (!current.ghost) return;
  // A completed pointer drag may also dispatch click; never place a second chip.
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);
  if (cancelled || !current.target) {
    announce("Chip unchanged. Drop onto a table space to place it.");
    return;
  }
  if (current.target === trash) {
    removeChip(current.chipId);
  } else if (current.chipId !== null) {
    const chip = chips.find(item => item.id === current.chipId);
    if (!chip) return;
    chip.betId = current.target.dataset.bet;
    render();
    announce(`Moved ${money(chip.cents)} to ${betDefinitions.get(chip.betId).label}.`);
  } else {
    placeChip(current.target.dataset.bet, current.cents, current.custom);
  }
}
document.addEventListener("pointerup", event => endDrag(event));
document.addEventListener("pointercancel", event => endDrag(event, true));
document.addEventListener("lostpointercapture", event => endDrag(event, true));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && drag) endDrag({ pointerId: drag.pointerId }, true);
});
document.addEventListener("click", event => {
  if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); }
}, true);

updateChipValue();
render();
