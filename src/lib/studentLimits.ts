import { daysSinceRegistration } from '@/lib/daysSinceRegistration';

// "Студент ADSchool" (tier 2): 5 нових проєктів нараховується щодня з
// моменту підвищення (не з реєстрації — демо-період у квоту не рахується).
// Невикористані за день не згорають — сумуються з наступними.
export const STUDENT_DAILY_ALLOWANCE = 5;

export const countScenariosSince = (scenarios: { createdAt: string }[], since: string): number => {
  const sinceMs = new Date(since).getTime();
  return scenarios.filter(s => new Date(s.createdAt).getTime() >= sinceMs).length;
};

export interface StudentQuotaStatus {
  banked: number;
  taken: number;
  remaining: number;
  canCreate: boolean;
}

// studentSince === null означає "не студент" (демо чи випускник) — квота на
// них не діє, виклик цієї функції для таких акаунтів не повинен блокувати.
export const getStudentQuotaStatus = (studentSince: string | null, scenarios: { createdAt: string }[]): StudentQuotaStatus => {
  if (!studentSince) return { banked: Infinity, taken: 0, remaining: Infinity, canCreate: true };
  const days = daysSinceRegistration(studentSince);
  const banked = days * STUDENT_DAILY_ALLOWANCE;
  const taken = countScenariosSince(scenarios, studentSince);
  const remaining = Math.max(0, banked - taken);
  return { banked, taken, remaining, canCreate: remaining > 0 };
};
