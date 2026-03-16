import { writeFile, unlink } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

function tempPath(): string {
  return join(tmpdir(), `copilot-audio-${randomBytes(6).toString("hex")}.wav`);
}

// Preferred player order for Linux: PipeWire → PulseAudio → ALSA → FFmpeg
const LINUX_PLAYERS: Array<{ cmd: string; args: (p: string) => string[] }> = [
  { cmd: "pw-play",  args: (p) => [p] },
  { cmd: "paplay",   args: (p) => [p] },
  { cmd: "aplay",    args: (p) => ["-q", p] },
  { cmd: "ffplay",   args: (p) => ["-nodisp", "-autoexit", "-loglevel", "quiet", p] },
];

let cachedLinuxPlayer: (typeof LINUX_PLAYERS)[number] | null | undefined;

function findLinuxPlayer(): (typeof LINUX_PLAYERS)[number] | null {
  if (cachedLinuxPlayer !== undefined) return cachedLinuxPlayer;

  for (const player of LINUX_PLAYERS) {
    try {
      execFileSync("which", [player.cmd], { stdio: "ignore" });
      cachedLinuxPlayer = player;
      return player;
    } catch {
      // not found, try next
    }
  }
  cachedLinuxPlayer = null;
  return null;
}

function playerCommand(filePath: string): { cmd: string; args: string[] } | null {
  switch (process.platform) {
    case "darwin":
      return { cmd: "afplay", args: [filePath] };
    case "win32":
      return {
        cmd: "powershell",
        args: [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `(New-Object System.Media.SoundPlayer '${filePath.replace(/'/g, "''")}').PlaySync()`,
        ],
      };
    default: {
      const player = findLinuxPlayer();
      if (!player) return null;
      return { cmd: player.cmd, args: player.args(filePath) };
    }
  }
}

/** Write a WAV buffer to a temp file and play it via the platform's player. */
export async function playWav(wavBuffer: Buffer): Promise<void> {
  const path = tempPath();
  await writeFile(path, wavBuffer);

  const command = playerCommand(path);
  if (!command) {
    await unlink(path).catch(() => {});
    return;
  }

  const child = spawn(command.cmd, command.args, { stdio: "ignore", detached: true });
  child.unref();

  const cleanup = () => unlink(path).catch(() => {});
  child.on("close", cleanup);
  child.on("error", cleanup);
}
