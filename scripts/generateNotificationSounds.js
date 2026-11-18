import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

function createWavBuffer(samples, sampleRate = 44100, numChannels = 1) {
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // 'fmt ' sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20); // audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22); // num channels
  buffer.writeUInt32LE(sampleRate, 24); // sample rate
  buffer.writeUInt32LE(byteRate, 28); // byte rate
  buffer.writeUInt16LE(blockAlign, 32); // block align
  buffer.writeUInt16LE(bytesPerSample * 8, 34); // bits per sample

  // 'data' sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    buffer.writeInt16LE(Math.round(val), 44 + i * 2);
  }

  return buffer;
}

// Generate luxury warm notification chime (D5 -> A5 -> D6 harmonic glass bell)
function generateNotificationChime() {
  const sampleRate = 44100;
  const duration = 0.52;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  const notes = [
    { start: 0.0, freq: 587.33, tau: 0.15, amp: 0.65 }, // D5
    { start: 0.08, freq: 880.0, tau: 0.18, amp: 0.72 }, // A5
    { start: 0.16, freq: 1174.66, tau: 0.28, amp: 0.85 }, // D6
    { start: 0.165, freq: 2349.32, tau: 0.14, amp: 0.18 }, // D7 shimmer
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    for (const note of notes) {
      if (t >= note.start) {
        const dt = t - note.start;
        // 4ms smooth linear attack to avoid clicking
        const attack = Math.min(1, dt / 0.005);
        // Exponential decay
        const decay = Math.exp(-dt / note.tau);
        const env = attack * decay * note.amp;

        // Rich bell harmonic blend: Fundamental + octave harmonic + overtone
        const f = note.freq;
        const wave =
          Math.sin(2 * Math.PI * f * dt) * 0.7 +
          Math.sin(2 * Math.PI * f * 2.0 * dt) * 0.2 +
          Math.sin(2 * Math.PI * f * 3.01 * dt) * 0.1;

        val += wave * env;
      }
    }

    samples[i] = val;
  }

  // Normalize to 0.86 peak amplitude to avoid any clipping
  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 0) {
    const scale = 0.86 / peak;
    for (let i = 0; i < totalSamples; i++) {
      samples[i] *= scale;
    }
  }

  return createWavBuffer(samples, sampleRate, 1);
}

// Generate bubbly warm message ping (E5 pop -> B5 crystal chime)
function generateMessagePing() {
  const sampleRate = 44100;
  const duration = 0.36;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    // First droplet pop with slight pitch sweep (520Hz -> 659Hz)
    if (t < 0.18) {
      const dt = t;
      const attack = Math.min(1, dt / 0.004);
      const decay = Math.exp(-dt / 0.08);
      const freq = 520 + (659.25 - 520) * Math.min(1, dt / 0.015);
      const wave =
        Math.sin(2 * Math.PI * freq * dt) * 0.8 +
        Math.sin(2 * Math.PI * freq * 2 * dt) * 0.2;
      val += wave * attack * decay * 0.7;
    }

    // Second chime note (B5: 987.77Hz)
    if (t >= 0.06) {
      const dt = t - 0.06;
      const attack = Math.min(1, dt / 0.005);
      const decay = Math.exp(-dt / 0.18);
      const freq = 987.77;
      const wave =
        Math.sin(2 * Math.PI * freq * dt) * 0.75 +
        Math.sin(2 * Math.PI * freq * 2 * dt) * 0.18 +
        Math.sin(2 * Math.PI * freq * 3 * dt) * 0.07;
      val += wave * attack * decay * 0.82;
    }

    samples[i] = val;
  }

  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 0) {
    const scale = 0.84 / peak;
    for (let i = 0; i < totalSamples; i++) {
      samples[i] *= scale;
    }
  }

  return createWavBuffer(samples, sampleRate, 1);
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const notifWav = generateNotificationChime();
fs.writeFileSync(path.join(publicDir, 'notification.wav'), notifWav);
console.log(`Generated public/notification.wav (${notifWav.length} bytes)`);

const msgWav = generateMessagePing();
fs.writeFileSync(path.join(publicDir, 'message.wav'), msgWav);
console.log(`Generated public/message.wav (${msgWav.length} bytes)`);
