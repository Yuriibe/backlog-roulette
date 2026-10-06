/**
 * Strips trademark/registered/copyright marks (e.g. "DOOM™", "DARK SOULS® III")
 * that publishers bake into official titles. Left in, they get sent as literal
 * search tokens to HowLongToBeat and break matching.
 */
export function cleanTitle(title) {
  return title
    .replace(/[™®©]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
