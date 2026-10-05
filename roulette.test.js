const { test } = require("node:test");
const assert = require("node:assert/strict");
const { pockets, parseAmount, summarize } = require("./roulette.js");

const red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].map(String);
const bets = new Map([
  ["red", { values: red, multiplier: 2 }],
  ["black", { values: pockets.filter(n => Number(n) > 0 && !red.includes(n)), multiplier: 2 }],
  ["one", { values: ["1"], multiplier: 36 }],
  ["five", { values: ["5"], multiplier: 36 }],
  ["zero", { values: ["0"], multiplier: 36 }],
  ["double-zero", { values: ["00"], multiplier: 36 }],
  ["dozen", { values: Array.from({ length: 12 }, (_, i) => String(i + 1)), multiplier: 3 }]
]);

test("chip amounts preserve cents and reject invalid amounts", () => {
  assert.equal(parseAmount("0.01"), 1);
  assert.equal(parseAmount("12.34"), 1234);
  assert.equal(parseAmount("1000000"), 100000000);
  for (const value of ["", " ", "-1", "0", "1.001", "Infinity", "NaN", "1e5", "1000001"]) {
    assert.equal(parseAmount(value), null, value);
  }
});

test("empty table has no wager, coverage, or profit", () => {
  const result = summarize([], bets);
  assert.equal(result.wager, 0);
  assert.equal(result.covered, 0);
  assert.equal(result.profitable, 0);
  assert.equal(result.losing, 0);
  assert.equal(result.breakEven, 0);
  assert.equal(result.maxReturn, 0);
  assert.deepEqual(result.outcomes, []);
});

test("stacked chips combine stakes and returns", () => {
  const result = summarize([{ betId: "red", cents: 1000 }, { betId: "red", cents: 500 }], bets);
  assert.equal(result.wager, 1500);
  assert.equal(result.covered, 18);
  assert.equal(result.profitable, 18);
  assert.equal(result.minReturn, 0);
  assert.equal(result.maxReturn, 3000);
});

test("overlapping bets pay together without double-counting pockets", () => {
  const result = summarize([{ betId: "red", cents: 1000 }, { betId: "one", cents: 500 }], bets);
  assert.equal(result.covered, 18);
  assert.equal(result.profitable, 18);
  assert.equal(result.returns[pockets.indexOf("1")], 20000);
  assert.equal(result.returns[pockets.indexOf("3")], 2000);
});

test("a payout is not necessarily a net profit", () => {
  const result = summarize([{ betId: "red", cents: 1000 }, { betId: "black", cents: 1000 }], bets);
  assert.equal(result.covered, 36);
  assert.equal(result.profitable, 0);
  assert.equal(result.maxReturn, result.wager);
});

test("zero and double zero remain separate bets", () => {
  const result = summarize([{ betId: "zero", cents: 100 }, { betId: "double-zero", cents: 200 }], bets);
  assert.equal(result.covered, 2);
  assert.equal(result.returns[0], 3600);
  assert.equal(result.returns[1], 7200);
});

test("mixed bets retain the American wheel expected loss", () => {
  const result = summarize([{ betId: "dozen", cents: 1234 }, { betId: "red", cents: 101 }, { betId: "zero", cents: 100 }], bets);
  const expectedReturn = result.returns.reduce((sum, amount) => sum + amount, 0) / 38;
  assert.ok(Math.abs(expectedReturn - result.wager * 36 / 38) < 1e-9);
});

test("a chip on number 5 and a chip on red produce three distinct rewards", () => {
  const result = summarize([{ betId: "five", cents: 500 }, { betId: "red", cents: 500 }], bets);
  assert.equal(result.outcomes.length, 3);
  const [both, redOnly, neither] = result.outcomes;
  assert.equal(result.profitable, 1);
  assert.equal(result.losing, 20);
  assert.equal(result.breakEven, 17);
  assert.deepEqual(both.pockets, ["5"]);
  assert.deepEqual(both.winningBets.map(bet => bet.betId), ["five", "red"]);
  assert.equal(both.grossReturn, 19000);
  assert.equal(both.net, 18000);
  assert.equal(both.probability, 1 / 38);
  assert.equal(redOnly.pockets.length, 17);
  assert.equal(redOnly.grossReturn, 1000);
  assert.equal(redOnly.net, 0);
  assert.equal(redOnly.probability, 17 / 38);
  assert.equal(neither.pockets.length, 20);
  assert.equal(neither.grossReturn, 0);
  assert.equal(neither.net, -1000);
  assert.equal(neither.probability, 20 / 38);
});

test("three chips on one number combine into one winning reward", () => {
  const result = summarize([2500, 5000, 10000].map(cents => ({ betId: "five", cents })), bets);
  const win = result.outcomes[0];
  assert.equal(result.outcomes.length, 2);
  assert.equal(win.winningBets.length, 1);
  assert.equal(win.winningBets[0].chipCount, 3);
  assert.equal(win.winningBets[0].cents, 17500);
  assert.equal(win.grossReturn, 630000);
  assert.equal(win.net, 612500);
  assert.equal(win.probability, 1 / 38);
});

test("equal rewards from different winning bets keep their own probabilities", () => {
  const result = summarize([{ betId: "red", cents: 500 }, { betId: "black", cents: 500 }], bets);
  assert.equal(result.outcomes.length, 3);
  const winners = result.outcomes.filter(outcome => outcome.grossReturn > 0);
  assert.deepEqual(new Set(winners.map(outcome => outcome.winningBets[0].betId)), new Set(["red", "black"]));
  for (const outcome of winners) {
    assert.equal(outcome.probability, 18 / 38);
    assert.equal(outcome.net, 0);
  }
});

test("outcome groups partition every pocket exactly once with consistent payouts", () => {
  const result = summarize([
    { betId: "red", cents: 2500 }, { betId: "dozen", cents: 500 },
    { betId: "five", cents: 100 }, { betId: "zero", cents: 75 }, { betId: "double-zero", cents: 150 }
  ], bets);
  const covered = result.outcomes.flatMap(outcome => outcome.pockets);
  assert.equal(covered.length, 38);
  assert.equal(result.profitable + result.losing + result.breakEven, 38);
  assert.deepEqual(new Set(covered), new Set(pockets));
  assert.ok(Math.abs(result.outcomes.reduce((sum, outcome) => sum + outcome.probability, 0) - 1) < 1e-12);
  for (const outcome of result.outcomes) {
    for (const pocket of outcome.pockets) assert.equal(outcome.grossReturn, result.returns[pockets.indexOf(pocket)]);
    assert.equal(outcome.net, outcome.grossReturn - result.wager);
  }
});

test("overall losses include partial payouts below the total wager", () => {
  const result = summarize([{ betId: "red", cents: 500 }, { betId: "black", cents: 1000 }], bets);
  assert.equal(result.profitable, 18);
  assert.equal(result.losing, 20);
  assert.equal(result.breakEven, 0);
});

test("equal red and black bets show break even separately from profit", () => {
  const result = summarize([{ betId: "red", cents: 500 }, { betId: "black", cents: 500 }], bets);
  assert.equal(result.profitable, 0);
  assert.equal(result.losing, 2);
  assert.equal(result.breakEven, 36);
});
