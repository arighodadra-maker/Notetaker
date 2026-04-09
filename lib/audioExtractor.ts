/**
 * Client-side audio extractor.
 *
 * Decodes the audio track from any video/audio file using the Web Audio API,
 * resamples to 16 kHz mono (Whisper's native rate), and splits into WAV chunks
 * that each fit under Whisper's 25 MB limit. All chunks are transcribed and
 * joined on the caller's side — no truncation, no duration limit.
 *
 * Processing runs via OfflineAudioContext (faster than real-time).
 */

const TARGET_SAMPLE_RATE = 16_000; // Hz — Whisper's native rate
const MAX_WAV_BYTES = 24 * 1024 * 1024; // 24 MB — safe headroom under 25 MB cap

// Max audio samples per chunk at 16 kHz 16-bit mono:
// (24 MB - 44 byte header) / 2 bytes per sample ≈ 12,582,890 samples ≈ ~786 seconds (~13 min)
const MAX_SAMPLES_PER_CHUNK = Math.floor((MAX_WAV_BYTES - 44) / 2);
const MAX_SECONDS_PER_CHUNK = MAX_SAMPLES_PER_CHUNK / TARGET_SAMPLE_RATE;

function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const samples = buffer.getChannelData(0);
  const dataBytes = samples.length * 2;
  const wav = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(wav);

  const str = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
  };

  str(0, "RIFF");
  v.setUint32(4, 36 + dataBytes, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);               // PCM
  v.setUint16(22, 1, true);               // mono
  v.setUint32(24, buffer.sampleRate, true);
  v.setUint32(28, buffer.sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);              // 16-bit
  str(36, "data");
  v.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return wav;
}

export interface ChunkInfo {
  /** Index of this chunk (0-based). */
  index: number;
  /** Total number of chunks. */
  total: number;
}

export interface ExtractionResult {
  /** WAV blobs, each ≤ 24 MB, ready to POST to /api/transcribe. */
  chunks: Blob[];
  /** Total audio duration in seconds. */
  totalSeconds: number;
}

export async function extractAudio(file: File): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();

  const tempCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await tempCtx.decodeAudioData(arrayBuffer);
  } finally {
    await tempCtx.close();
  }

  const totalSeconds = decoded.duration;
  const numChunks = Math.ceil(totalSeconds / MAX_SECONDS_PER_CHUNK);
  const chunks: Blob[] = [];

  for (let i = 0; i < numChunks; i++) {
    const startSec = i * MAX_SECONDS_PER_CHUNK;
    const endSec = Math.min((i + 1) * MAX_SECONDS_PER_CHUNK, totalSeconds);
    const chunkDuration = endSec - startSec;
    const outputSamples = Math.ceil(chunkDuration * TARGET_SAMPLE_RATE);

    const offlineCtx = new OfflineAudioContext(1, outputSamples, TARGET_SAMPLE_RATE);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    // start(when, offset, duration) — offset into the source, not the context timeline
    source.start(0, startSec, chunkDuration);

    const rendered = await offlineCtx.startRendering();
    chunks.push(new Blob([encodeWav(rendered)], { type: "audio/wav" }));
  }

  return { chunks, totalSeconds };
}
