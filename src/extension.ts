import { approveAll } from "@github/copilot-sdk";
import { extension } from "@github/copilot-sdk/extension";
import { playWav } from "./player.js";
import {
  sessionStartSound,
  userPromptSound,
  toolCompleteSound,
  errorSound,
  sessionEndSound,
} from "./notes.js";

// Pre-render all WAV buffers once at startup so playback is instant.
const sounds = {
  start: sessionStartSound(),
  prompt: userPromptSound(),
  tool: toolCompleteSound(),
  error: errorSound(),
  end: sessionEndSound(),
};

await extension.start();

await extension.createSession({
  onPermissionRequest: approveAll,
  tools: [],
  hooks: {
    onSessionStart: async () => {
      playWav(sounds.start).catch(() => {});
      return {};
    },
    onUserPromptSubmitted: async () => {
      playWav(sounds.prompt).catch(() => {});
      return {};
    },
    onPostToolUse: async () => {
      playWav(sounds.tool).catch(() => {});
      return {};
    },
    onErrorOccurred: async () => {
      playWav(sounds.error).catch(() => {});
      return {};
    },
    onSessionEnd: async () => {
      playWav(sounds.end).catch(() => {});
      return {};
    },
  },
});
