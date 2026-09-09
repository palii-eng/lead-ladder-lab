// Обрізає текст до приблизно maxChars символів, не розриваючи слово
// посередині — відрізає до останнього пробілу перед лімітом і додає "…".
// Використовується тільки для прев'ю-карток (лідів тощо); повний текст
// лишається незмінним там, де він реально потрібен (наприклад, у брифі
// клієнта під час роботи над сценарієм).
export const truncateForPreview = (text: string, maxChars: number): string => {
  if (!text || text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  const clean = lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${clean.replace(/[,;:.\-—]+$/, '')}…`;
};
