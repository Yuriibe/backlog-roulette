const LONGFORM_SINGLEPLAYER_GENRES = [
  "rpg",
  "action-adventure",
  "adventure",
  "open-world",
  "open world",
  "exploration",
  "metroidvania",
  "immersive sim",
  "survival",
  "mmorpg",
  "jrpg",
  "narrative",
  "story",
];

/**
 * Defaults to "yes, treat as longform" and only backs off when there's actual
 * evidence this is a short-loop game. This is deliberately asymmetric: games
 * imported via Steam sync carry no genre (Steam's API doesn't return one) and,
 * since they're unplayed, have 0 estimated hours — so most of a real backlog
 * has *no* signal either way. Defaulting to "short" in that case would silently
 * undo the whole point of this setting for anyone who hasn't hand-filled genre
 * on every game. Only two things count as real evidence of "short":
 * a genre that's explicitly a short-loop genre, or a playtime bucket the user
 * (or an import) explicitly set to "short" with no long-genre hint alongside it.
 */
function looksLongformSingleplayer(game) {
  const genre = (game.genre ?? "").toLowerCase();
  const isShortLoopGenre = /roguelike|arcade|puzzle|card|rhythm|platformer/.test(genre);
  if (isShortLoopGenre) return false;

  const hasLongSignal =
    LONGFORM_SINGLEPLAYER_GENRES.some((g) => genre.includes(g)) ||
    game.playtime === "long" ||
    (game.estimatedHours ?? 0) >= 20;
  if (hasLongSignal) return true;

  if (game.playtime === "short") return false;

  return true;
}

/**
 * Builds the prompt sent to Claude for challenge generation.
 * Pure string construction — no shell involvement, no file paths.
 * Used both for the real CLI call and for the manual copy/paste fallback,
 * so what the user sees in "view prompt" always matches what was sent.
 *
 * `challengeFocus` is a player-level preference (Settings → Challenge focus):
 * - "variety": quick, session-sized objectives (good for roguelikes/short games).
 * - "longform": challenges are framed as an ongoing approach for the whole
 *   playthrough, aimed at players who tend to drop long single-player games
 *   partway through. Only actually changes behavior for games that look like
 *   long, story-driven single-player experiences — a roguelike run still gets
 *   a normal run-sized objective either way.
 */
export function buildChallengePrompt(game, challengeFocus = "variety") {
  const facts = [
    `Title: ${game.title}`,
    game.genre ? `Genre: ${game.genre}` : null,
    game.playtime ? `Estimated playtime bucket: ${game.playtime}` : null,
    game.estimatedHours ? `Estimated hours to beat: ${game.estimatedHours}` : null,
    `Player has played this before: ${game.previouslyPlayed ? "yes" : "no"}`,
    game.playedHours ? `Hours already played so far: ${game.playedHours}` : null,
    game.notes ? `Player's personal note about why they want to play it: ${game.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const useLongform = challengeFocus === "longform" && looksLongformSingleplayer(game);
  const genreKnown = Boolean(game.genre && game.genre.trim());

  const familiarityNote = !game.previouslyPlayed
    ? `
PLAYER FAMILIARITY: this player has never played this game before — they don't yet know its specific systems, mechanics, or terminology, or what counts as "normal" vs "unusual" in it. If a challenge leans on a game-specific system, resource, or mechanic (especially anything named uniquely to this game), briefly explain what it is in plain language as part of the description — a short clause is enough (e.g. "ranch the small creatures you find underground, called critters, for resources, instead of farming or mining"). Never assume insider knowledge of this specific game; the idea should make sense and sound exciting to someone who's never seen it.`
    : "";

  const playerContext = useLongform
    ? `PLAYER CONTEXT (important — shapes the whole task below)
This player often struggles to finish long, story-driven single-player games — they lose momentum and drop off partway through. This game looks like exactly that kind of long single-player experience, so do NOT design any of the three challenges as a single isolated task to complete once. Instead, design each one as an ongoing approach or framework for the ENTIRE playthrough — something that gives the player a reason to keep coming back and a sense of forward momentum all the way to the credits. Good shapes for this, roughly in priority order:
- A build or playstyle experiment carried through the whole game — commit to an unusual weapon/skill/equipment focus, a mechanical restriction, or an unexpected combo, and keep leaning into it as you unlock more options.
- A pacing ritual tied to natural story beats or chapters (e.g. "before moving the main story forward, always do one side thing first").
- A recurring session habit — something small done at the start or end of every sitting that builds investment over time.
- A long-running side-goal or collection thread that runs in parallel to the main story, giving the player something to return to.
- A roleplay lens (a persona, a code of conduct, a theme that colors decisions) — a valid option, but NOT the default. This has been overused — don't reach for "adopt a moral code of conduct" as the go-to Creative idea. Only use it when it's a genuinely strong fit for this specific game, and even then prefer tying it to a concrete mechanical hook (a build, a restriction, a recurring action) rather than pure narrative immersion. The player wants fun, concrete things to actually DO — builds to try, combos to chase, playstyle twists — not mainly a lens to roleplay through.
"primaryObjective" should describe this ongoing practice/approach for the whole game, not a one-off task. "bonusObjectives" can be optional layers or milestones within that ongoing approach (e.g. things to do at specific points), not just extra one-off tasks.
IMPORTANT for the "exploration" challenge specifically: do NOT frame it as "fully clear every area before advancing the story" or any other rule that gates story progress behind mandatory completionism — for a player who already struggles to finish long games, that framing adds friction and risks becoming a new reason to stall. It must also NOT default to the generic "notice optional stuff and take a quick detour before moving on" habit, or vague language like "follow sidepaths" / "look for secrets" — that exact shape is overused and reads as vague rather than fun, even though it technically satisfies the non-gating rule. Instead make it something specific and concrete to chase, varying the shape rather than reusing the same one every time. Options include (pick whichever fits this game best, or invent another that's just as concrete):
- A themed micro-collection — hunt for a specific, fun category of thing (the strangest creatures/items/vistas/characters you come across), not a vague "secrets" search.
- A running guessing game — bet with yourself on what's behind the next door/over the next hill/in the next room before you get there, and see how often you're right.
- Seeking out and getting to know a specific set of side characters or NPCs, building a mental roster as you go.
- A documentation ritual with a specific format — a one-line field journal entry, a screenshot, a sketch — of one specific thing per area/region/chapter.
- Chasing one particular TYPE of discovery that's unusual for this genre (a sound, a mechanic interaction, an environmental detail) rather than generic exploration.
Whatever shape you choose, it rides alongside normal progress and never requires full completion before advancing.${
        genreKnown
          ? ""
          : `
CAVEAT: this game's genre wasn't provided (only an estimated hours figure, which may just be a tracking/data gap, or may be cumulative time across many short runs rather than one continuous campaign — e.g. a roguelike or deckbuilder). If you recognize this specific title as a short-session, run-based, or highly replayable game (roguelike, deckbuilder, arcade, puzzle, score-chaser, etc.) rather than a long continuous single-player campaign, ignore the instructions above and generate standard session- or run-sized objectives instead — the ongoing-playthrough framing only makes sense for games that actually have one long continuous campaign to sustain momentum through.`
      }`
    : `PLAYER CONTEXT
This is a short-session or replayable game (or the player hasn't flagged a long-game engagement problem for it). Standard session-sized or run-sized objectives are appropriate.`;

  return `You are the creative challenge generator inside "Backlog Roulette", an app that helps a player pick a game from their backlog and gives them a fun, personalized challenge for it.

GAME INFO
${facts}

${playerContext}
${familiarityNote}

TASK
Generate exactly three distinct challenge options for this game. They are different STYLES of experiencing the game, not difficulty levels:
1. "creative" — a fun, concrete way to actually PLAY differently: an unusual build, an unexpected skill/gear/weapon combo, a playstyle restriction or inversion, chasing a specific mechanical gimmick. A roleplay or moral-code angle is allowed but should be the exception, not the default — prioritize ideas that are fun to actually DO moment-to-moment over ideas that are mainly about adopting a persona or code of conduct.
2. "exploration" — a challenge focused on discovering mechanics, locations, characters or systems.
3. "wildcard" — a surprising, imaginative challenge that still fits the game.

AVOID GENERIC CLICHÉS: don't default to overused "challenge run" tropes — starting-weapon/sidearm-only, no-damage run, pacifist run, permadeath/ironman, speedrun — picked once and then just passively followed for the rest of the game. Those are flat because nothing about them changes or surprises you after the first five minutes. Favor ideas that keep generating new moments throughout the playthrough instead: things that rotate, escalate, involve an element of chance, chain together, or react to what you find as you play. A restriction is more fun when it evolves or resets than when it's one static rule for the whole game. If a classic trope is genuinely the best fit, give it a specific twist that makes it feel fresh rather than using it as-is.

Each challenge must be achievable through normal gameplay and respect the game's real mechanics and genre conventions.

SPOILER RULES (critical, follow strictly):
- Never reveal story twists, character deaths, hidden identities, secret endings, or late-game events.
- Do not name specific undiscovered areas, bosses, characters, or secret mechanics.
- Prefer broad phrasing like "discover a new area" or "try an unusual build" instead of naming a specific secret.
- Never reveal puzzle solutions or specific strategies that would remove the fun of discovery.
- If you are not confident about this specific game's content, write a general challenge based on its genre and known mechanics instead of inventing or guessing specific plot/story details.

OUTPUT FORMAT
Respond with ONLY a JSON array of exactly 3 objects, no surrounding prose, no markdown code fences. Each object must have this exact shape:
{
  "style": "creative" | "exploration" | "wildcard",
  "name": "a short memorable challenge name",
  "description": "1-3 sentences explaining the idea",
  "primaryObjective": "a single clear primary objective or ongoing approach, per the PLAYER CONTEXT above",
  "bonusObjectives": ["2 to 4 short optional bonus objectives or milestones"],
  "whyFun": "1-2 sentences on why this could be fun",
  "effortEstimate": "a short rough estimate of extra effort, e.g. 'light', 'a few extra hours', or omit if unknown"
}`;
}
