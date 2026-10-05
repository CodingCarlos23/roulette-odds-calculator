# Roulette Odds Calculator

A small, browser based calculator for American roulette. Place chips on numbers or standard outside bets and explore the combined probabilities and possible returns.

The American wheel has 38 pockets: 1–36, 0, and 00. This project explains the odds and payouts; it does not predict spins.

## Run locally

Open `index.html` in a browser. The app uses plain HTML, CSS, and JavaScript, so it has no install or build step.

## Place and remove chips

- Drag a $1, $5, $10, $25, $50, or $100 chip onto a table space, or enter an amount and drag the custom chip.
- Alternatively, select a chip value and click or tap a bet. Keyboard users can select a value and activate a table button with Enter or Space.
- Up to four standard chips appear in separate corners of a bet, with their denomination colors and dollar amounts. Five or more chips, or any chip placed using the custom amount, collapse into a black-and-white badge showing the chip count. Removing chips restores the individual markers when possible.
- Drag a chip from the table or the list below it to another bet to move it, or to the removal area to delete it. Dragging a combined count badge moves the most recently placed chip in that stack. Each listed chip also has a remove button; Delete or Backspace removes a focused chip.
- Use **Clear all** to empty the table. Bets last for the current page session.

The summary counts distinct pockets with any payout, the chance that returns exceed the total wager, and the minimum–maximum gross return across all 38 outcomes. A payout may still be less than the total wager when several bets are placed.

The **Your bets** panel starts with the overall chances of any net profit, any net loss, and breaking even, measured against the total wager. It expands automatically to show every distinct combination of winning bets, its probability, total return, and net profit or loss. Open an outcome's details to see the exact pockets and the return from each winning bet. Stacked chips on the same bet are combined, and overlapping bets pay together. Clearing the table hides this breakdown again.

## Check calculations

With Node.js installed, run `node --test roulette.test.js`. The checks cover stacked and overlapping bets, net profit versus payouts, zero versus double zero, and chip amount validation.

## Publish with GitHub Pages

1. Push this repository to GitHub.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then save.

GitHub Pages will provide a live link after deployment completes. Future commits to the selected branch update the site.

## License

MIT. See [LICENSE](LICENSE).
