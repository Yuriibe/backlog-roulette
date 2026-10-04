import express from "express";
import cors from "cors";
import { buildChallengePrompt } from "./promptBuilder.js";
import { checkClaudeAvailable, generateChallengesViaCli } from "./claudeCli.js";
import { syncSteamLibrary } from "./steamApi.js";
import { lookupGameLength } from "./hltbApi.js";

const app = express();
const PORT = process.env.PORT || 5174;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/claude/status", async (_req, res) => {
  const status = await checkClaudeAvailable();
  res.json(status);
});

app.post("/api/challenges/prompt", (req, res) => {
  const game = req.body?.game;
  if (!game || typeof game.title !== "string" || !game.title.trim()) {
    res.status(400).json({ error: "A game with a title is required." });
    return;
  }
  const prompt = buildChallengePrompt(game, req.body?.challengeFocus);
  res.json({ prompt });
});

app.post("/api/challenges/generate", async (req, res) => {
  const game = req.body?.game;
  if (!game || typeof game.title !== "string" || !game.title.trim()) {
    res.status(400).json({ error: "A game with a title is required." });
    return;
  }
  const prompt = buildChallengePrompt(game, req.body?.challengeFocus);
  const result = await generateChallengesViaCli(prompt);
  if (!result.ok) {
    res.status(502).json({ error: result.error });
    return;
  }
  res.json({ challenges: result.challenges });
});

app.post("/api/steam/sync", async (req, res) => {
  const { apiKey, steamId } = req.body ?? {};
  const result = await syncSteamLibrary(apiKey, steamId);
  if (!result.ok) {
    res.status(502).json({ error: result.error });
    return;
  }
  res.json({ games: result.games });
});

app.post("/api/hltb/lookup", async (req, res) => {
  const { title } = req.body ?? {};
  const result = await lookupGameLength(title);
  if (!result.ok) {
    res.status(502).json({ error: result.error });
    return;
  }
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Backlog Roulette backend listening on http://localhost:${PORT}`);
});
