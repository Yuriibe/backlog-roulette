/**
 * Strips trademark/registered/copyright marks (e.g. "DOOM™", "DARK SOULS® III")
 * that publishers bake into official titles. Left in, they get sent as literal
 * search tokens to HowLongToBeat and break matching — so titles are cleaned at
 * every point they enter the app (manual entry, file import, Steam sync).
 */
export function cleanTitle(title: string): string {
  return title
    .replace(/[™®©]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
