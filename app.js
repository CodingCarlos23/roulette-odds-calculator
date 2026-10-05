const redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const grid = document.querySelector("#number-grid");
const outsideGrid = document.querySelector("#outside-grid");
const columnBets = document.querySelector("#column-bets");
const wagerInput = document.querySelector("#wager");
let selected = null;

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

document.querySelectorAll(".pocket, .outside-bet").forEach(button => button.addEventListener("click", () => {
  if (selected?.dataset.bet === button.dataset.bet) selected = null;
  else selected = button;
  update();
}));

function update() {
  document.querySelectorAll(".pocket, .outside-bet").forEach(button => {
    const active = selected && button.dataset.bet === selected.dataset.bet;
    button.classList.toggle("selected", Boolean(active));
    button.setAttribute("aria-pressed", String(Boolean(active)));
  });
  const name = document.querySelector("#bet-name");
  const icon = document.querySelector("#selection-icon");
  const probability = document.querySelector("#probability");
  const pockets = document.querySelector("#pockets");
  const payoutOdds = document.querySelector("#payout-odds");
  const totalReturn = document.querySelector("#total-return");
  const amount = Number(wagerInput.value);
  if (!selected) {
    name.textContent = "Choose a space"; icon.textContent = "—";
    probability.textContent = pockets.textContent = payoutOdds.textContent = totalReturn.textContent = "—";
    return;
  }
  const values = (selected.dataset.values || "").split(",").filter(Boolean).map(Number);
  const count = selected.dataset.number !== undefined ? 1 : values.length;
  const odds = selected.dataset.odds || "35:1";
  const payoutMultiplier = Number(odds.split(":")[0]) + 1;
  name.textContent = selected.dataset.bet.startsWith("number-") ? `Straight up · ${selected.dataset.number}` : selected.dataset.bet.startsWith("column-") ? `Column ${selected.dataset.bet.slice(-1)}` : selected.dataset.bet;
  icon.textContent = selected.dataset.symbol || selected.dataset.number;
  probability.textContent = `${(count / 38 * 100).toFixed(2)}%`;
  pockets.textContent = `${count} of 38`;
  payoutOdds.textContent = `${odds} (${selected.dataset.number !== undefined ? "straight up" : "standard payout"})`;
  totalReturn.textContent = money(Math.max(0, amount) * payoutMultiplier);
}

function range(start,end){return Array.from({length:end-start+1},(_,i)=>start+i)}
function money(value){return value.toLocaleString("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2})}
wagerInput.addEventListener("input", update);
document.querySelectorAll(".chip").forEach(chip=>chip.addEventListener("click",()=>{wagerInput.value=chip.dataset.value;document.querySelectorAll(".chip").forEach(c=>c.classList.toggle("active",c===chip));update()}));
document.querySelector("#clear-bet").addEventListener("click",()=>{selected=null;update()});
update();
