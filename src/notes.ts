import {
  generateNote,
  samplesToWav,
  type NoteOptions,
} from "./synth.js";

// ── Frequency helpers ───────────────────────────────────────────────
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// C major pentatonic across 3 octaves — always consonant
const SCALE = [
  60, 62, 64, 67, 69,  // C4 D4 E4 G4 A4
  72, 74, 76, 79, 81,  // C5 D5 E5 G5 A5
  84, 86, 88,           // C6 D6 E6
].map(midiToFreq);

// Minor pentatonic for errors — tense but musical
const MINOR_SCALE = [
  58, 60, 63, 65, 67,  // Bb3 C4 Eb4 F4 G4
  70, 72, 75, 77, 79,  // Bb4 C5 Eb5 F5 G5
].map(midiToFreq);

/** Deterministic hash of a string → scale index. */
function hashToIndex(s: string, scaleLen: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % scaleLen;
}

// ── Timbres ─────────────────────────────────────────────────────────
const TIMBRES = {
  bell:  { envelope: { attack: 0.02, decay: 0.5, sustain: 0.25, release: 0.9 }, harmonics: [1.0, 0.45, 0.15, 0.06, 0.02], volume: 0.22 },
  pluck: { envelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.8 }, harmonics: [1.0, 0.5, 0.2, 0.1, 0.04], volume: 0.2 },
  soft:  { envelope: { attack: 0.06, decay: 0.5, sustain: 0.25, release: 0.8 }, harmonics: [1.0, 0.2, 0.06], volume: 0.18 },
  bright:{ envelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.7 }, harmonics: [1.0, 0.5, 0.25, 0.1, 0.04], volume: 0.18 },
  warm:  { envelope: { attack: 0.04, decay: 0.5, sustain: 0.3, release: 0.8 }, harmonics: [1.0, 0.3, 0.1, 0.03], volume: 0.2 },
  dark:  { envelope: { attack: 0.03, decay: 0.6, sustain: 0.3, release: 1.0 }, harmonics: [1.0, 0.5, 0.25, 0.15, 0.08], volume: 0.2 },
  pad:   { envelope: { attack: 0.12, decay: 0.5, sustain: 0.5, release: 1.0 }, harmonics: [1.0, 0.4, 0.15, 0.08], volume: 0.18 },
} satisfies Record<string, NoteOptions>;

// ── Tool → timbre mapping ───────────────────────────────────────────
function toolTimbre(toolName: string): NoteOptions {
  const t = toolName.toLowerCase();
  if (["edit", "create", "view", "show_file"].includes(t)) return TIMBRES.pluck;
  if (["grep", "glob", "sql"].some(k => t.includes(k)))    return TIMBRES.soft;
  if (["powershell", "bash", "shell"].some(k => t.includes(k))) return TIMBRES.bright;
  if (["web_fetch", "web_search"].includes(t))              return TIMBRES.warm;
  if (t.includes("github") || t.includes("git"))           return TIMBRES.bell;
  if (["task", "read_agent", "write_agent"].some(k => t.includes(k))) return TIMBRES.bell;
  return TIMBRES.soft;
}

// ── Public API: one note per event, modulated by content ────────────

export function sessionStartNote(): Buffer {
  return samplesToWav(generateNote(SCALE[10], 1.0, TIMBRES.bell));
}

export function sessionEndNote(): Buffer {
  return samplesToWav(generateNote(SCALE[0], 1.8, TIMBRES.pad));
}

export function userPromptNote(prompt: string): Buffer {
  const freq = SCALE[hashToIndex(prompt, SCALE.length)];
  const dur = 0.6 + Math.min(prompt.length / 150, 0.5);
  return samplesToWav(generateNote(freq, dur, TIMBRES.warm));
}

export function toolStartNote(toolName: string): Buffer {
  const freq = SCALE[hashToIndex(toolName, SCALE.length)];
  return samplesToWav(generateNote(freq, 0.6, toolTimbre(toolName)));
}

export function toolCompleteNote(toolName: string, success: boolean): Buffer {
  if (success) {
    const idx = hashToIndex(toolName, SCALE.length);
    const freq = SCALE[Math.min(idx + 1, SCALE.length - 1)];
    return samplesToWav(generateNote(freq, 0.7, toolTimbre(toolName)));
  } else {
    const freq = MINOR_SCALE[hashToIndex(toolName, MINOR_SCALE.length)];
    return samplesToWav(generateNote(freq, 0.9, TIMBRES.dark));
  }
}

export function errorNote(errorContext: string): Buffer {
  const freq = MINOR_SCALE[hashToIndex(errorContext, MINOR_SCALE.length)];
  const dur = errorContext === "system" ? 1.2 : 0.9;
  return samplesToWav(generateNote(freq, dur, TIMBRES.dark));
}

export function subagentNote(agentName: string): Buffer {
  const freq = SCALE[hashToIndex(agentName, SCALE.length)];
  return samplesToWav(generateNote(freq, 0.8, TIMBRES.bell));
}
