/**
 * Looks up expected completion time from HowLongToBeat.
 *
 * IMPORTANT: there is no official HowLongToBeat API. This calls the same
 * internal endpoint their own website's search box uses, reverse-engineered
 * from their client bundle. It requires no API key, but it is inherently
 * fragile — HLTB can change this endpoint, its payload shape, or their
 * anti-bot token scheme at any time without notice, which would break this
 * silently until updated. Every failure mode here is caught and surfaced as
 * a plain error rather than a crash, and the rest of the app works fine
 * without this (genre/length just stay unset until filled in some other way).
 *
 * Verified working as of this writing: HLTB now gates /api/search/site
 * behind a short-lived token from /api/search/site/init, so each lookup
 * fetches a fresh token first.
 */

const FETCH_TIMEOUT_MS = 10_000;
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://howlongtobeat.com/",
};

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getSearchToken() {
  const res = await fetchWithTimeout(`https://howlongtobeat.com/api/search/site/init?t=${Date.now()}`, {
    headers: BROWSER_HEADERS,
  });
  if (!res.ok) {
    throw new Error(`HowLongToBeat didn't respond as expected (init HTTP ${res.status}) — the site may have changed.`);
  }
  const data = await res.json();
  if (!data?.token) {
    throw new Error("HowLongToBeat didn't return a search token — the site may have changed.");
  }
  return data.token;
}

function bucketFromHours(hours) {
  if (hours === undefined || Number.isNaN(hours)) return undefined;
  if (hours <= 6) return "short";
  if (hours <= 20) return "medium";
  return "long";
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[:\-–—].*$/, "")
    .trim();
}

/**
 * Looks up a single game by title. Returns an estimated hours-to-beat
 * (main story time, falling back to "main + extras" / "all playstyles" if
 * a game has no main-story category) and a derived playtime bucket.
 * No genre — HLTB's search payload doesn't carry one.
 */
export async function lookupGameLength(title) {
  if (!title || !title.trim()) {
    return { ok: false, error: "A game title is required." };
  }

  try {
    const token = await getSearchToken();

    const res = await fetchWithTimeout("https://howlongtobeat.com/api/search/site", {
      method: "POST",
      headers: { ...BROWSER_HEADERS, "Content-Type": "application/json", "x-auth-token": token },
      body: JSON.stringify({
        searchType: "games",
        searchTerms: title.trim().split(/\s+/).filter(Boolean),
        searchPage: 1,
        size: 10,
        searchOptions: {
          games: {
            userId: 0,
            platform: "",
            sortCategory: "popular",
            rangeCategory: "main",
            rangeTime: { min: 0, max: 0 },
            gameplay: { perspective: "", flow: "", genre: "" },
            modifier: "",
          },
          users: { sortCategory: "postcount" },
          lists: { sortCategory: "follows" },
          filter: "",
          sort: 0,
          randomizer: 0,
        },
        useCache: true,
      }),
    });

    if (res.status === 429) {
      return { ok: false, error: "HowLongToBeat rate limit hit — wait a moment and try again." };
    }
    if (!res.ok) {
      return { ok: false, error: `HowLongToBeat search returned HTTP ${res.status} — the site may have changed.` };
    }

    const data = await res.json();
    const results = (Array.isArray(data?.data) ? data.data : []).filter((g) => g.game_type === "game");
    if (results.length === 0) {
      return { ok: false, error: "No match found on HowLongToBeat." };
    }

    const target = normalizeTitle(title);
    const best = results.find((r) => normalizeTitle(r.game_name ?? "") === target) ?? results[0];

    // comp_* fields are seconds. comp_all is HLTB's headline "All PlayStyles"
    // figure (blended across Main Story / Main+Extra / Completionist submissions)
    // — the number HLTB itself leads with — rather than just the Main Story time,
    // which undercounts games people actually spend longer on.
    const seconds = best.comp_all || best.comp_main || best.comp_plus || best.comp_100 || 0;
    const hours = seconds > 0 ? Math.round(seconds / 3600) : undefined;

    return {
      ok: true,
      matchedTitle: best.game_name,
      estimatedHours: hours,
      playtime: bucketFromHours(hours),
    };
  } catch (err) {
    if (err.name === "AbortError") {
      return { ok: false, error: "HowLongToBeat lookup timed out." };
    }
    return { ok: false, error: err.message || "HowLongToBeat lookup failed." };
  }
}
