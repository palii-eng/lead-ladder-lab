// Скільки повних днів минуло з моменту реєстрації (день реєстрації = 1).
// Використовується і для "відео дня", і для куратованого набору лідів
// першого дня.
export const daysSinceRegistration = (registeredAt?: string): number => {
  if (!registeredAt) return 1;
  const start = new Date(registeredAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
};
