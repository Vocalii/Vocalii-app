// Shared vocal-metrics DSP for VoiceAnalyzerPage.tsx and BaselineFlow.tsx (which record an
// identical 4-segment session and must score it the same way). Both used to carry their own
// copy-pasted hand-rolled autocorrelation pitch detector and ad hoc FFT-bin heuristics for
// resonance/clarity — noisy/octave-error-prone and not backed by any validated method. This
// replaces the noisiest pieces with two small MIT-licensed libraries (Pitchy, Meyda), keeping the
// same output shape/scales so existing saved reports and the onboarding baseline stay comparable:
//   - Pitch/range: Pitchy's McLeod Pitch Method (MPM) instead of naive autocorrelation.
//   - Clarity: MPM's own periodicity-confidence value (0-1, averaged across the segment) instead
//     of a "loudest FFT bin / total energy" heuristic that had no real acoustic meaning.
//   - Resonance: same 1-4kHz energy-ratio definition as before, computed via Meyda's properly
//     Hann-windowed amplitude spectrum instead of the browser's smoothed
//     `AnalyserNode.getFloatFrequencyData`, and now averaged across per-frame readings collected
//     throughout the whole recording instead of computed from a single ~46ms snapshot grabbed at
//     the instant recording stopped — that snapshot could land on a pause (or the click of tapping
//     "stop") regardless of what the rest of the recording sounded like.
//   - Loudness: averaged across per-frame RMS readings collected throughout the recording instead
//     of a single end-of-recording snapshot, then rescaled (not just shifted) from this session's
//     calibrated noise floor (see calibrateNoiseFloorDb) onto the -60..0 display range — a mic's
//     raw dynamic range is often much narrower than that once AGC is disabled, so a plain dB
//     shift/offset would drag quiet speech up right along with the noise floor instead of actually
//     separating quiet from loud.
//   - Stability/fatigue: same jitter formula as before, but fed the new clarity-gated pitch trace
//     instead of the noisy one, which is where most of the practical accuracy gain comes from.
//
// Both essentia.js and other "complete" audio-analysis toolkits were considered and rejected —
// essentia.js is AGPL-3.0, which is incompatible with shipping inside a closed-source app.
import { PitchDetector } from 'pitchy';
import Meyda from 'meyda';

// Fixed everywhere in the app: both recording components create their AnalyserNode with
// `fftSize = 2048` and read exactly that many samples per frame/snapshot.
export const ANALYSIS_BUFFER_SIZE = 2048;

const MIN_PITCH_HZ = 80;
const MAX_PITCH_HZ = 1200;
// Fallback "is there actually any signal in this frame" gate — used only before calibration has
// run for the session (see calibrateNoiseFloorDb, which computes a per-session replacement). A
// fixed absolute number here is always wrong for somebody: a phone's much less sensitive mic
// produces a far quieter raw signal than a laptop's once auto gain control is disabled, so a
// threshold tuned for a laptop mic can end up requiring the phone practically touch your mouth
// before it registers anything at all.
export const SILENCE_RMS_THRESHOLD = 0.01;
// How many times louder than the calibrated noise floor a frame's RMS must be to count as "signal
// present" — relative to that session's own floor rather than one fixed number, so it adapts to
// whatever this specific device's raw sensitivity turns out to be.
const SIGNAL_ABOVE_FLOOR_MULTIPLIER = 3;
// Bounds so a bad calibration (e.g. it happened to catch a cough or the click of tapping record
// instead of true silence) can't produce a threshold that's either always-open or impossible to
// clear.
const MIN_VOICE_THRESHOLD_RMS = 0.002;
const MAX_VOICE_THRESHOLD_RMS = 0.03;
// Fallback noise floor for the rare case a segment gets scored before calibration ever ran (see
// calibrateNoiseFloorDb) — a conservative middle-of-the-road guess, not a real reading.
const DEFAULT_NOISE_FLOOR_DB = -55;
const MIN_NOISE_FLOOR_DB = -70;
const MAX_NOISE_FLOOR_DB = -30;
// Assumed raw dB range from "just above the noise floor" to "as loud as this mic can usefully
// register" — the span that gets stretched to fill the whole -60..0 display scale. A plain
// additive offset (an earlier version of this) preserves whatever raw dB gap already exists
// between quiet and loud speech; if that gap is narrow (a mic with limited headroom), quiet speech
// gets shifted up right along with the noise floor instead of landing near the bottom of the scale.
// Rescaling by this assumed span, rather than just shifting, is what actually spreads quiet and
// loud apart.
const LOUD_HEADROOM_DB = 40;
// MPM's paper recommends 0.8-1 as the useful range for the clarity threshold; 0.85 is a
// conservative cut that favors rejecting ambiguous/noisy frames over accepting octave errors.
const PITCH_CLARITY_THRESHOLD = 0.85;

const pitchDetector = PitchDetector.forFloat32Array(ANALYSIS_BUFFER_SIZE);
// Initial default — matches SILENCE_RMS_THRESHOLD, and gets replaced with a per-session, per-device
// value once calibrateNoiseFloorDb runs. Set as an absolute RMS value rather than via
// `minVolumeDecibels` — that setter's dB math is `10 ** (db/10)` (a power-domain formula), not the
// standard amplitude `20*log10` most people expect, so e.g. -40 there actually computes an
// absolute threshold of 0.0001, not 0.01, and barely filters anything.
pitchDetector.minVolumeAbsolute = SILENCE_RMS_THRESHOLD;

Meyda.bufferSize = ANALYSIS_BUFFER_SIZE;

export interface PitchFrame {
  hz: number;
  /** MPM's own periodicity confidence, 0-1. `0` (with `hz === 0`) means no pitch was found. */
  clarity: number;
}

// Real-time single-frame pitch read — call once per animation-frame tick during recording,
// exactly like the old `detectPitch`.
export function detectPitchFrame(buffer: Float32Array, sampleRate: number): PitchFrame {
  const [hz, clarity] = pitchDetector.findPitch(buffer, sampleRate);
  return { hz, clarity };
}

// Whether a frame's pitch reading is trustworthy enough to feed into the pitch/stability
// aggregates. Frames that fail this still count toward the clarity average (a breathy/noisy voice
// should pull clarity down, not just get silently excluded).
export function isConfidentPitch(frame: PitchFrame): boolean {
  return frame.clarity >= PITCH_CLARITY_THRESHOLD && frame.hz >= MIN_PITCH_HZ && frame.hz <= MAX_PITCH_HZ;
}

// Real-time single-frame RMS read — call once per animation-frame tick during recording (same
// cadence as detectPitchFrame; both can read from the same buffer), so loudness reflects the whole
// recording instead of a single snapshot taken at the end.
export function measureFrameRms(buffer: Float32Array): number {
  let sumSq = 0;
  for (let i = 0; i < buffer.length; i++) sumSq += buffer[i] * buffer[i];
  return Math.sqrt(sumSq / buffer.length);
}

// Real-time single-frame resonance read (0-100, same 1-4kHz energy-ratio definition as the final
// score) — call once per animation-frame tick during recording, same cadence as the above.
export function measureFrameResonance(buffer: Float32Array, sampleRate: number): number {
  const { amplitudeSpectrum } = Meyda.extract(['amplitudeSpectrum'], buffer) as { amplitudeSpectrum: Float32Array };
  const bins = amplitudeSpectrum.length;
  const hzPerBin = (sampleRate / 2) / bins;
  let midEnergy = 0, totalEnergy = 0;
  for (let i = 0; i < bins; i++) {
    const amp = amplitudeSpectrum[i];
    const hz = i * hzPerBin;
    totalEnergy += amp;
    if (hz >= 1000 && hz <= 4000) midEnergy += amp;
  }
  return totalEnergy > 0 ? Math.min(100, (midEnergy / totalEnergy) * 500) : 55;
}

export interface NoiseFloorCalibration {
  /** Feed to computeSegmentMetrics for that session's loudness rescale. */
  noiseFloorDb: number;
  /** Use in place of SILENCE_RMS_THRESHOLD when gating loudness/resonance sampling this session. */
  voiceThresholdRms: number;
}

// Samples ambient noise for `durationMs` right as a recording session starts (before the person
// has begun speaking) and calibrates detection to *this* mic/room rather than one fixed guess baked
// into the code. Laptop mics, headsets, phones, and rooms vary enormously in raw gain once the
// browser's own auto gain control is disabled (see startRecording — AGC has to stay off for
// accurate pitch/silence detection, but that also means the raw signal is no longer normalized for
// us, and a phone's much less sensitive mic ends up far quieter than a laptop's). As a side effect,
// this also updates the shared pitch detector's volume gate to match. Call this once per session
// (not once per segment) and reuse the result for every subsequent step.
export function calibrateNoiseFloorDb(analyser: AnalyserNode, durationMs = 400): Promise<NoiseFloorCalibration> {
  return new Promise(resolve => {
    const buffer = new Float32Array(analyser.fftSize);
    const samples: number[] = [];
    const start = performance.now();
    const poll = () => {
      analyser.getFloatTimeDomainData(buffer);
      samples.push(measureFrameRms(buffer));
      if (performance.now() - start < durationMs) {
        requestAnimationFrame(poll);
      } else {
        const noiseFloorRms = median(samples.length > 0 ? samples : [0]);
        const noiseFloorDb = noiseFloorRms > 0.00001 ? 20 * Math.log10(noiseFloorRms) : MIN_NOISE_FLOOR_DB;
        const voiceThresholdRms = Math.max(
          MIN_VOICE_THRESHOLD_RMS,
          Math.min(MAX_VOICE_THRESHOLD_RMS, noiseFloorRms * SIGNAL_ABOVE_FLOOR_MULTIPLIER),
        );
        pitchDetector.minVolumeAbsolute = voiceThresholdRms;
        resolve({
          noiseFloorDb: Math.max(MIN_NOISE_FLOOR_DB, Math.min(MAX_NOISE_FLOOR_DB, noiseFloorDb)),
          voiceThresholdRms,
        });
      }
    };
    requestAnimationFrame(poll);
  });
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// A segment at or below this loudness picked up essentially nothing — the -60 dBFS floor
// `computeSegmentMetrics` falls back to when the buffer is silent, plus a margin so genuinely
// quiet-but-present speech isn't flagged. Resonance/clarity/pitch are all meaningless noise-floor
// numbers on a segment like this, not real measurements of a voice.
const SILENT_SEGMENT_LOUDNESS_DB = -45;

export type LoudnessLevel = 'Low' | 'Medium' | 'High';

// Buckets the calibrated -60..0 loudness scale into three bands for display, the same way
// fatigue/stability already show as Low/Moderate/High instead of a raw number — a dBFS reading
// isn't meaningful to most people even once it's been calibrated to their specific mic/room.
export function loudnessLevel(loudnessDb: number): LoudnessLevel {
  if (loudnessDb <= -25) return 'Low';
  if (loudnessDb <= -15) return 'Medium';
  return 'High';
}

export function loudnessLevelColor(level: LoudnessLevel): string {
  return level === 'Low' ? '#60a5fa' : level === 'Medium' ? '#fbbf24' : '#fb7185';
}

export interface SegmentMetrics {
  pitchHz: number;
  pitchRangeHz: number;
  resonanceScore: number;
  clarityPct: number;
  loudnessDb: number;
  stabilityPct: number;
  /** True if this segment had essentially no usable voice signal (near-silent or no pitch found). */
  lowSignal: boolean;
}

// One "segment" = one of the 4 recorded steps (Sustained Vowel / Twisters / Read Aloud / Free
// Speech). `pitchReadings` are the confident (post `isConfidentPitch`) hz values; `clarityReadings`
// are every frame's raw clarity value; `loudnessReadings`/`resonanceReadings` are every
// signal-present (post the session's calibrated voiceThresholdRms, or SILENCE_RMS_THRESHOLD as a
// fallback) frame's RMS/resonance value — see `measureFrameRms`/`measureFrameResonance`.
// `noiseFloorDb` comes from `calibrateNoiseFloorDb`, once per session.
export function computeSegmentMetrics(
  pitchReadings: number[],
  clarityReadings: number[],
  loudnessReadings: number[],
  resonanceReadings: number[],
  noiseFloorDb: number = DEFAULT_NOISE_FLOOR_DB,
): SegmentMetrics {
  const pitchHz = pitchReadings.length > 0 ? Math.round(median(pitchReadings)) : 180;
  const pitchRangeHz = pitchReadings.length > 1
    ? Math.round(Math.max(...pitchReadings) - Math.min(...pitchReadings))
    : 20;

  const resonanceScore = resonanceReadings.length > 0
    ? Math.round(resonanceReadings.reduce((s, v) => s + v, 0) / resonanceReadings.length)
    : 55;

  const clarityPct = clarityReadings.length > 0
    ? Math.round(Math.max(0, Math.min(100, (clarityReadings.reduce((s, v) => s + v, 0) / clarityReadings.length) * 100)))
    : 60;

  let loudnessDb = -60;
  if (loudnessReadings.length > 0) {
    const avgRms = loudnessReadings.reduce((s, v) => s + v, 0) / loudnessReadings.length;
    if (avgRms > 0.00001) {
      const rawDb = 20 * Math.log10(avgRms);
      // Raw RMS-to-dBFS treats 1.0 (digital full scale) as the loudest possible reading, but with
      // echoCancellation/noiseSuppression/autoGainControl all disabled (see startRecording —
      // needed so this measurement reflects true input level rather than the browser normalizing
      // it), most mics never get anywhere near full scale even when shouting into them, and the
      // usable raw dB gap between quiet and loud speech is often narrow to begin with. Rescale
      // (not just shift) the span from this session's calibrated noise floor up through
      // LOUD_HEADROOM_DB onto the full -60..0 display range, so quiet and loud speech actually
      // spread apart instead of both landing near the top.
      const normalized = (rawDb - noiseFloorDb) / LOUD_HEADROOM_DB;
      loudnessDb = Math.round(Math.max(-60, Math.min(0, normalized * 60 - 60)));
    }
  }

  const jitter = pitchReadings.length > 2 ? stddev(pitchReadings) / (median(pitchReadings) || 1) : 0;
  const stabilityPct = Math.round(Math.max(0, Math.min(100, (1 - jitter / 0.12) * 100)));

  const lowSignal = loudnessDb <= SILENT_SEGMENT_LOUDNESS_DB || pitchReadings.length === 0;

  return { pitchHz, pitchRangeHz, resonanceScore, clarityPct, loudnessDb, stabilityPct, lowSignal };
}
