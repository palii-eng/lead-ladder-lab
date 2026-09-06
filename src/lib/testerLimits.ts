// Tester daily quota system: instead of a flat "3 scenarios ever" cap,
// testers get a fresh, small allowance every calendar day since signup —
// bigger on the very first day to let them explore, smaller (steady) after
// that to keep them coming back.
//
//   Day 1 (signup day):      4 offers available, can take 2
//   Day 2 onward, every day: 2 offers available, can take 1

export interface TesterDailyAllowance {
  offered: number;
  take: number;
}

// Day 1 = the calendar day the account was created (UTC calendar dates, so
// it doesn't matter what time of day signup happened).
export const getTesterDayNumber = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const createdDay = Date.UTC(created.getFullYear(), created.getMonth(), created.getDate());
  const nowDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(1, Math.floor((nowDay - createdDay) / 86400000) + 1);
};

export const getTesterDailyAllowance = (dayNumber: number): TesterDailyAllowance =>
  dayNumber <= 1 ? { offered: 4, take: 2 } : { offered: 2, take: 1 };

const isSameCalendarDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const countScenariosCreatedToday = (scenarios: { createdAt: string }[]): number => {
  const today = new Date();
  return scenarios.filter(s => isSameCalendarDay(new Date(s.createdAt), today)).length;
};

export const getTesterStatusToday = (createdAt: string, scenarios: { createdAt: string }[]) => {
  const day = getTesterDayNumber(createdAt);
  const { offered, take } = getTesterDailyAllowance(day);
  const takenToday = countScenariosCreatedToday(scenarios);
  const remaining = Math.max(0, take - takenToday);
  return { day, offered, take, takenToday, remaining, canCreate: remaining > 0 };
};
