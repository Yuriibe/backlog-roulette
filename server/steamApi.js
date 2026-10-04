/**
 * Thin wrapper around Valve's official Steam Web API. Runs server-side so the
 * API key never has to be exposed to a cross-origin request from the browser,
 * and so CORS (Steam's API doesn't send permissive CORS headers) is a non-issue.
 */

const FETCH_TIMEOUT_MS = 15_000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Steam rejected the request (HTTP ${res.status}) — check that your API key is correct.`);
      }
      throw new Error(`Steam API returned HTTP ${res.status}.`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function isSteamId64(value) {
  return /^\d{17}$/.test(value);
}

/** Resolves a vanity profile name (steamcommunity.com/id/<this>) to a SteamID64. */
async function resolveVanityUrl(apiKey, vanity) {
  const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${encodeURIComponent(
    apiKey
  )}&vanityurl=${encodeURIComponent(vanity)}&format=json`;
  const data = await fetchJson(url);
  if (data?.response?.success !== 1 || !data.response.steamid) {
    throw new Error(
      "Couldn't resolve that Steam ID or custom URL. Double-check it, or use your full 17-digit SteamID64 instead."
    );
  }
  return data.response.steamid;
}

async function getOwnedGames(apiKey, steamId64) {
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${encodeURIComponent(
    apiKey
  )}&steamid=${encodeURIComponent(
    steamId64
  )}&include_appinfo=true&include_played_free_games=true&format=json`;
  const data = await fetchJson(url);
  const games = data?.response?.games;
  if (!Array.isArray(games)) {
    throw new Error(
      "Steam returned no games. Make sure 'Game details' is set to Public in your Steam privacy settings (even for your own API key)."
    );
  }
  return games;
}

/**
 * Fetches the caller's full owned-games library and maps it to the shape the
 * frontend's import preview already understands.
 */
export async function syncSteamLibrary(apiKey, steamIdOrVanity) {
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, error: "A Steam Web API key is required." };
  }
  if (!steamIdOrVanity || !steamIdOrVanity.trim()) {
    return { ok: false, error: "A SteamID64 or custom profile URL name is required." };
  }

  try {
    const steamId64 = isSteamId64(steamIdOrVanity.trim())
      ? steamIdOrVanity.trim()
      : await resolveVanityUrl(apiKey.trim(), steamIdOrVanity.trim());

    const rawGames = await getOwnedGames(apiKey.trim(), steamId64);

    const games = rawGames
      .filter((g) => g && typeof g.name === "string" && g.name.trim())
      .map((g) => {
        // playtime_forever is hours YOU'VE PLAYED, not how long the game takes to
        // beat — those are different numbers (a 2-hour demo of a 70-hour game is
        // not a 2-hour game). Keep them separate: playedHours is informational,
        // estimatedHours/playtime stay unset here so HowLongToBeat (or manual
        // entry) can fill in a real length estimate later without being blocked
        // by an already-"filled" field.
        const playedHours = Math.round((g.playtime_forever ?? 0) / 60) || undefined;
        return {
          title: g.name.trim(),
          playedHours,
          previouslyPlayed: (g.playtime_forever ?? 0) > 0,
          coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_600x900.jpg`,
        };
      });

    return { ok: true, games };
  } catch (err) {
    return { ok: false, error: err.message || "Steam sync failed." };
  }
}
