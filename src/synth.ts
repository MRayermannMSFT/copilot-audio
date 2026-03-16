const SAMPLE_RATE = 44100;

export interface ADSREnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface NoteOptions {
  envelope?: ADSREnvelope;
  /** Amplitude multipliers for 1st, 2nd, 3rd… harmonics */
  harmonics?: number[];
  volume?: number;
}

const DEFAULT_ENVELOPE: ADSREnvelope = {
  attack: 0.005,
  decay: 0.15,
  sustain: 0.2,
  release: 0.4,
};

const DEFAULT_HARMONICS = [1.0, 0.4, 0.15, 0.06];

function envelopeAt(t: number, duration: number, env: ADSREnvelope): number {
  const { attack, decay, sustain, release } = env;
  const releaseStart = duration - release;

  if (t < attack) return t / attack;
  if (t < attack + decay) return 1.0 - ((t - attack) / decay) * (1.0 - sustain);
  if (t < releaseStart) return sustain;
  if (t < duration) return sustain * (1.0 - (t - releaseStart) / release);
  return 0;
}

/** Synthesise a single tone with harmonics and ADSR envelope. */
export function generateNote(
  freq: number,
  duration: number,
  options: NoteOptions = {},
): Float64Array {
  const {
    envelope = DEFAULT_ENVELOPE,
    harmonics = DEFAULT_HARMONICS,
    volume = 0.25,
  } = options;

  const len = Math.ceil(SAMPLE_RATE * duration);
  const out = new Float64Array(len);
  const harmonicSum = harmonics.reduce((a, b) => a + b, 0);

  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;
    for (let h = 0; h < harmonics.length; h++) {
      sample += harmonics[h] * Math.sin(2 * Math.PI * freq * (h + 1) * t);
    }
    out[i] = (sample / harmonicSum) * envelopeAt(t, duration, envelope) * volume;
  }
  return out;
}

/** Layer multiple frequencies into a chord. */
export function generateChord(
  freqs: number[],
  duration: number,
  options: NoteOptions = {},
): Float64Array {
  const len = Math.ceil(SAMPLE_RATE * duration);
  const out = new Float64Array(len);
  const vol = (options.volume ?? 0.25) / freqs.length;

  for (const freq of freqs) {
    const note = generateNote(freq, duration, { ...options, volume: vol });
    for (let i = 0; i < len; i++) out[i] += note[i];
  }
  return out;
}

/** Play notes one after another with a gap between them. */
export function generateArpeggio(
  freqs: number[],
  noteDuration: number,
  gap: number,
  options: NoteOptions = {},
): Float64Array {
  const total = freqs.length * noteDuration + Math.max(0, freqs.length - 1) * gap;
  const out = new Float64Array(Math.ceil(SAMPLE_RATE * total));

  for (let n = 0; n < freqs.length; n++) {
    const note = generateNote(freqs[n], noteDuration, options);
    const offset = Math.floor(n * (noteDuration + gap) * SAMPLE_RATE);
    for (let i = 0; i < note.length && offset + i < out.length; i++) {
      out[offset + i] += note[i];
    }
  }
  return out;
}

/** Encode Float64 samples as a 16-bit mono WAV buffer. */
export function samplesToWav(samples: Float64Array): Buffer {
  const bps = 2; // bytes per sample
  const dataSize = samples.length * bps;
  const buf = Buffer.alloc(44 + dataSize);

  // RIFF header
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);

  // fmt chunk
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);              // PCM
  buf.writeUInt16LE(1, 22);              // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * bps, 28);
  buf.writeUInt16LE(bps, 32);
  buf.writeUInt16LE(16, 34);             // bits per sample

  // data chunk
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.floor(clamped * 32767), 44 + i * bps);
  }
  return buf;
}
