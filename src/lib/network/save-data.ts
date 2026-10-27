/** The person asked their browser to save data (PRD §8 Save-Data): skip anything decorative or loaded ahead. */
export const savesData = () =>
  typeof navigator !== 'undefined' &&
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
