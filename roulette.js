// Amounts are integer cents; zero and double zero remain distinct outcomes.
(function (root) {
  const pockets = ["0", "00", ...Array.from({ length: 36 }, (_, i) => String(i + 1))];

  function parseAmount(value) {
    if (!/^\d+(?:\.\d{1,2})?$/.test(String(value).trim())) return null;
    const cents = Math.round(Number(value) * 100);
    return Number.isSafeInteger(cents) && cents > 0 && cents <= 100000000 ? cents : null;
  }

  function summarize(chips, bets) {
    const wager = chips.reduce((sum, chip) => sum + chip.cents, 0);
    const stakes = new Map();
    for (const chip of chips) {
      const stake = stakes.get(chip.betId) || { betId: chip.betId, cents: 0, chipCount: 0 };
      stake.cents += chip.cents;
      stake.chipCount++;
      stakes.set(chip.betId, stake);
    }
    const groups = new Map();
    const returns = pockets.map(pocket => {
      const winningBets = [...stakes.values()]
        .filter(stake => bets.get(stake.betId).values.includes(pocket))
        .map(stake => ({ ...stake, grossReturn: stake.cents * bets.get(stake.betId).multiplier }));
      const grossReturn = winningBets.reduce((sum, bet) => sum + bet.grossReturn, 0);
      // Different winning combinations remain separate even when they pay the same amount.
      const key = JSON.stringify(winningBets.map(bet => bet.betId));
      if (!groups.has(key)) groups.set(key, { winningBets, grossReturn, net: grossReturn - wager, pockets: [] });
      groups.get(key).pockets.push(pocket);
      return grossReturn;
    });
    const outcomes = chips.length ? [...groups.values()]
      .map(group => ({ ...group, probability: group.pockets.length / pockets.length }))
      .sort((a, b) => b.grossReturn - a.grossReturn) : [];
    return {
      wager,
      returns,
      outcomes,
      covered: returns.filter(value => value > 0).length,
      profitable: returns.filter(value => value > wager).length,
      losing: returns.filter(value => value < wager).length,
      breakEven: chips.length ? returns.filter(value => value === wager).length : 0,
      minReturn: Math.min(...returns),
      maxReturn: Math.max(...returns)
    };
  }

  const api = { pockets, parseAmount, summarize };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Roulette = api;
})(globalThis);
