import {
  generateNote,
  generateChord,
  generateArpeggio,
  samplesToWav,
  type NoteOptions,
} from "./synth.js";

// ── Frequency helpers ───────────────────────────────────────────────
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Named pitches we use
const N = {
  C4: midiToFreq(60),
  D4: midiToFreq(62),
  E4: midiToFreq(64),
  G4: midiToFreq(67),
  A4: midiToFreq(69),
  C5: midiToFreq(72),
  E5: midiToFreq(76),
  G5: midiToFreq(79),
  C6: midiToFreq(84),
  // darker tones for errors
  Eb4: midiToFreq(63),
  Bb3: midiToFreq(58),
} as const;

// ── Timbres ─────────────────────────────────────────────────────────
const BELL: NoteOptions = {
  envelope: { attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.4 },
  harmonics: [1.0, 0.4, 0.15, 0.06],
  volume: 0.22,
};

const CHIME: NoteOptions = {
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.12, release: 0.5 },
  harmonics: [1.0, 0.3, 0.1],
  volume: 0.18,
};

const PAD: NoteOptions = {
  envelope: { attack: 0.05, decay: 0.15, sustain: 0.5, release: 0.5 },
  harmonics: [1.0, 0.5, 0.2, 0.08],
  volume: 0.18,
};

const DARK: NoteOptions = {
  envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.6 },
  harmonics: [1.0, 0.6, 0.3, 0.15],
  volume: 0.2,
};

// ── Event sounds (pre-rendered WAV buffers) ─────────────────────────

/** Ascending pentatonic arpeggio — welcome chime. */
export function sessionStartSound(): Buffer {
  return samplesToWav(
    generateArpeggio([N.C5, N.E5, N.G5, N.C6], 0.25, 0.06, BELL),
  );
}

/** Single soft high-register chime. */
export function userPromptSound(): Buffer {
  return samplesToWav(generateNote(N.E5, 0.35, CHIME));
}

/** Gentle ascending two-note motif. */
export function toolCompleteSound(): Buffer {
  return samplesToWav(generateArpeggio([N.G4, N.C5], 0.2, 0.04, CHIME));
}

/** Descending minor interval — something went wrong. */
export function errorSound(): Buffer {
  return samplesToWav(generateArpeggio([N.Eb4, N.Bb3], 0.3, 0.06, DARK));
}

/** Warm closing chord (C major). */
export function sessionEndSound(): Buffer {
  return samplesToWav(
    generateChord([N.C4, N.E4, N.G4, N.C5], 0.9, PAD),
  );
}
