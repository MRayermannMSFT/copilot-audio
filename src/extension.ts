import { joinSession } from "@github/copilot-sdk/extension";
import { approveAll } from "@github/copilot-sdk";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { playWav } from "./player.js";
import {
  sessionStartNote,
  sessionEndNote,
  userPromptNote,
  toolStartNote,
  toolCompleteNote,
  errorNote,
  subagentNote,
} from "./notes.js";

const LOG_FILE = join(tmpdir(), "copilot-audio.log");

async function log(msg: string): Promise<void> {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  await appendFile(LOG_FILE, line).catch(() => {});
}

await log(`Extension starting. PID=${process.pid} SESSION_ID=${process.env.SESSION_ID}`);

// Pre-render only the fixed sounds; dynamic ones are generated per-event.
const fixedSounds = {
  start: sessionStartNote(),
  end: sessionEndNote(),
};

await log("Fixed sounds pre-rendered. Calling joinSession...");

const session = await joinSession({
  onPermissionRequest: approveAll,
  tools: [],
  hooks: {
    onSessionStart: async () => {
      await log("HOOK onSessionStart");
      playWav(fixedSounds.start).catch((e) => log(`playWav error: ${e}`));
      return {};
    },
    onUserPromptSubmitted: async (input) => {
      const prompt = (input as any)?.prompt ?? "";
      await log(`HOOK onUserPromptSubmitted: "${prompt.slice(0, 60)}"`);
      playWav(userPromptNote(prompt)).catch((e) => log(`playWav error: ${e}`));
      return {};
    },
    onPreToolUse: async (input) => {
      const toolName = (input as any)?.toolName ?? "unknown";
      await log(`HOOK onPreToolUse: ${toolName}`);
      playWav(toolStartNote(toolName)).catch((e) => log(`playWav error: ${e}`));
      return {};
    },
    onPostToolUse: async (input) => {
      const toolName = (input as any)?.toolName ?? "unknown";
      const result = (input as any)?.toolResult;
      const success = result?.resultType === "success";
      await log(`HOOK onPostToolUse: ${toolName} success=${success}`);
      playWav(toolCompleteNote(toolName, success)).catch((e) => log(`playWav error: ${e}`));
      return {};
    },
    onErrorOccurred: async (input) => {
      const ctx = (input as any)?.errorContext ?? "unknown";
      await log(`HOOK onErrorOccurred: context=${ctx}`);
      playWav(errorNote(ctx)).catch((e) => log(`playWav error: ${e}`));
      return {};
    },
    onSessionEnd: async () => {
      await log("HOOK onSessionEnd");
      playWav(fixedSounds.end).catch((e) => log(`playWav error: ${e}`));
      return {};
    },
  },
});

// Listen to session events for things hooks don't cover
session.on("subagent.started", (event: any) => {
  const name = event?.data?.agentName ?? "subagent";
  log(`EVENT subagent.started: ${name}`);
  playWav(subagentNote(name)).catch((e) => log(`playWav error: ${e}`));
});

session.on("subagent.completed", (event: any) => {
  const name = event?.data?.agentName ?? "subagent";
  log(`EVENT subagent.completed: ${name}`);
  playWav(subagentNote(name)).catch((e) => log(`playWav error: ${e}`));
});

await log("joinSession completed. Extension ready.");
