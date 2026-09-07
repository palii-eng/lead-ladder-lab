// Extracts the client's realistic starting ad budget (in USD) straight from
// their task text, instead of always defaulting to a fixed placeholder.
// Handles UAH figures like "7к/міс" or "12-15к/міс" (converted at an
// approximate rate), and explicit USD figures like "$50-70k/міс". Falls
// back to $2000 for a typical small client, or $5000 when the text signals
// a larger business (chain/network/big turnover) with no explicit figure.
const UAH_TO_USD_RATE = 41;

export const estimateClientBudgetUsd = (task: string): number => {
  if (!task) return 2000;

  // Explicit USD: "$50-70k/міс", "$5000", "$2 000"
  const usdRange = task.match(/\$\s*(\d[\d\s]*)\s*-\s*(\d[\d\s]*)\s*k/i);
  if (usdRange) {
    const lo = parseInt(usdRange[1].replace(/\s/g, ''), 10) * 1000;
    const hi = parseInt(usdRange[2].replace(/\s/g, ''), 10) * 1000;
    return Math.round((lo + hi) / 2);
  }
  const usdK = task.match(/\$\s*(\d[\d\s]*)\s*k\b/i);
  if (usdK) return parseInt(usdK[1].replace(/\s/g, ''), 10) * 1000;
  const usdPlain = task.match(/\$\s*(\d[\d\s]{2,7})(?!\s*k)/i);
  if (usdPlain) {
    const val = parseInt(usdPlain[1].replace(/\s/g, ''), 10);
    if (val > 0) return val;
  }

  // UAH thousands-per-month: "7к/міс", "12-15к/міс", "10-12к"
  const uahRange = task.match(/(\d+)\s*-\s*(\d+)\s*к(?:\/міс)?/i);
  if (uahRange) {
    const lo = parseInt(uahRange[1], 10) * 1000;
    const hi = parseInt(uahRange[2], 10) * 1000;
    return Math.max(200, Math.round(((lo + hi) / 2) / UAH_TO_USD_RATE));
  }
  const uahSingle = task.match(/(\d+)\s*к(?:\/міс)?/i);
  if (uahSingle) {
    const uah = parseInt(uahSingle[1], 10) * 1000;
    return Math.max(200, Math.round(uah / UAH_TO_USD_RATE));
  }

  // Plain "грн" figures: "бюджет 1500 грн", "2000 грн/міс"
  const grnMatch = task.match(/бюджет[^.]{0,20}?(\d[\d\s]{2,7})\s*грн/i) || task.match(/(\d[\d\s]{2,7})\s*грн\/міс/i);
  if (grnMatch) {
    const uah = parseInt(grnMatch[1].replace(/\s/g, ''), 10);
    if (uah > 0) return Math.max(50, Math.round(uah / UAH_TO_USD_RATE));
  }

  // No explicit figure mentioned — look for signals of a bigger business.
  const bigBusinessSignals = /мереж[аиі]|філі[ай]|\d+\s*точ(ок|ки)|мільйон|\$\d+\s*[MM]|оборот|франшиз/i;
  return bigBusinessSignals.test(task) ? 5000 : 2000;
};
