import { spawn } from "node:child_process";
import crypto from "node:crypto";

const STATUS_TIMEOUT_MS = 6_000;
const GENERATE_TIMEOUT_MS = 90_000;

/**
 * Safe process invocation: argument arrays only, shell: false, never any
 * string interpolation of user data into a command line. The game title /
 * notes travel to the CLI only via the prompt text on stdin, never as argv.
 */
function spawnClaude(args, stdinData, timeoutMs) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn("claude", args, { shell: false });
    } catch (err) {
      resolve({ ok: false, error: `Failed to launch Claude CLI: ${err.message}` });
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      resolve({ ok: false, error: "Claude CLI timed out." });
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err.code === "ENOENT") {
        resolve({ ok: false, error: "Claude CLI not found on PATH." });
      } else {
        resolve({ ok: false, error: `Failed to launch Claude CLI: ${err.message}` });
      }
    });

    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        resolve({ ok: false, error: `Claude CLI exited with code ${code}: ${stderr.slice(0, 300) || "no output"}` });
        return;
      }
      resolve({ ok: true, raw: stdout });
    });

    if (stdinData !== undefined) {
      child.stdin.write(stdinData);
    }
    child.stdin.end();
  });
}

export async function checkClaudeAvailable() {
  const result = await spawnClaude(["--version"], undefined, STATUS_TIMEOUT_MS);
  if (!result.ok) return { available: false, reason: result.error };
  return { available: true };
}

function extractJsonArrayText(text) {
  const trimmed = text.trim();
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // fall through
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const inner = fenced[1].trim();
    try {
      JSON.parse(inner);
      return inner;
    } catch {
      // fall through
    }
  }
  const bracketed = trimmed.match(/\[[\s\S]*\]/);
  if (bracketed) {
    return bracketed[0];
  }
  return null;
}

const VALID_STYLES = new Set(["creative", "exploration", "wildcard"]);

function validateChallenges(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const item of raw) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.name !== "string" ||
      typeof item.description !== "string" ||
      typeof item.primaryObjective !== "string" ||
      !Array.isArray(item.bonusObjectives) ||
      typeof item.whyFun !== "string"
    ) {
      return null;
    }
    out.push({
      id: crypto.randomUUID(),
      style: VALID_STYLES.has(item.style) ? item.style : "creative",
      name: item.name,
      description: item.description,
      primaryObjective: item.primaryObjective,
      bonusObjectives: item.bonusObjectives.filter((b) => typeof b === "string").slice(0, 4),
      whyFun: item.whyFun,
      effortEstimate: typeof item.effortEstimate === "string" ? item.effortEstimate : undefined,
    });
  }
  // The app's whole premise is "three distinct styles" — silently accepting 1 or 2
  // would mean a generation glitch shows up as a confusing half-empty screen
  // instead of the existing, well-understood "generation failed" error path.
  return out.length === 3 ? out : null;
}

/**
 * Invokes the Claude CLI in non-interactive print mode, feeding the prompt
 * via stdin (never argv, never shell interpolation), and parses + validates
 * the structured JSON response.
 */
export async function generateChallengesViaCli(prompt) {
  const result = await spawnClaude(["--print", "--output-format", "json"], prompt, GENERATE_TIMEOUT_MS);
  if (!result.ok) return { ok: false, error: result.error };

  let outerText;
  try {
    const outer = JSON.parse(result.raw);
    outerText = typeof outer.result === "string" ? outer.result : result.raw;
  } catch {
    outerText = result.raw;
  }

  const jsonText = extractJsonArrayText(outerText);
  if (!jsonText) {
    return { ok: false, error: "Claude CLI returned a response that wasn't valid JSON." };
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "Could not parse Claude's response as JSON." };
  }

  const challenges = validateChallenges(parsed);
  if (!challenges) {
    return { ok: false, error: "Claude's response didn't match the expected challenge format." };
  }

  return { ok: true, challenges };
}
