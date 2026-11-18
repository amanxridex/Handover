import { getStoredSettings } from './settingsService';

let audioCtx = null;
let isAudioUnlocked = false;
let lastSoundTime = 0;
let preloadedNotifAudio = null;
let preloadedMsgAudio = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext || null;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function unlockAudio() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  isAudioUnlocked = true;
}

// Automatically prime Web Audio on first user interaction so subsequent notifications can play sound
if (typeof window !== 'undefined') {
  const unlockEvents = ['pointerdown', 'touchstart', 'keydown', 'click'];
  const handleFirstInteraction = () => {
    unlockAudio();
    unlockEvents.forEach((evt) =>
      window.removeEventListener(evt, handleFirstInteraction, true)
    );
  };
  unlockEvents.forEach((evt) =>
    window.addEventListener(evt, handleFirstInteraction, {
      capture: true,
      once: true,
    })
  );

  try {
    preloadedNotifAudio = new Audio('/notification.wav');
    preloadedNotifAudio.preload = 'auto';
    preloadedMsgAudio = new Audio('/message.wav');
    preloadedMsgAudio.preload = 'auto';
  } catch {
    // Ignore audio preloading errors
  }
}

/**
 * Synthesizes a luxury notification chime directly in the Web Audio context.
 * Requires 0 network requests, 0 asset downloads, and plays with zero decode latency.
 */
function playSyntheticSound(kind = 'notification') {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.38, now);
    masterGain.connect(ctx.destination);

    if (kind === 'message') {
      // Soft bubbly pop (520Hz -> 659.25Hz sweep) + crisp B5 crystal chime (987.77Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(520, now);
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.018);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.42, now + 0.004);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.14);

      // Chime overtone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(987.77, now + 0.06);

      gain2.gain.setValueAtTime(0.001, now + 0.06);
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.065);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.34);
    } else {
      // Warm 3-tone harmonic chime: D5 (587.33Hz) -> A5 (880Hz) -> D6 (1174.66Hz) + shimmer
      const notes = [
        { time: 0.0, freq: 587.33, dur: 0.22, amp: 0.34, type: 'sine' },
        { time: 0.08, freq: 880.0, dur: 0.28, amp: 0.38, type: 'sine' },
        { time: 0.16, freq: 1174.66, dur: 0.38, amp: 0.44, type: 'triangle' },
        { time: 0.165, freq: 2349.32, dur: 0.2, amp: 0.09, type: 'sine' },
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = n.type;
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        gain.gain.setValueAtTime(0.001, now + n.time);
        gain.gain.linearRampToValueAtTime(n.amp, now + n.time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur + 0.02);
      });
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Plays the custom notification sound effect.
 * Uses Web Audio synthesis first with automatic fallback to preloaded audio.
 * Throttles rapid successive calls within 250ms and checks user settings.
 */
export function playNotificationSound({
  type = 'notification',
  force = false,
} = {}) {
  const now = Date.now();
  if (!force && now - lastSoundTime < 240) {
    return;
  }
  lastSoundTime = now;

  if (!force) {
    const settings = getStoredSettings();
    if (
      settings.soundEnabled === false ||
      settings.notificationsEnabled === false
    ) {
      return;
    }
  }

  // 1. Try zero-latency Web Audio synthesis
  const synthSuccess = playSyntheticSound(type);
  if (!synthSuccess) {
    // 2. Fall back to preloaded Audio element
    try {
      const audio = type === 'message' ? preloadedMsgAudio : preloadedNotifAudio;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } catch {
      // Audio autoplay blocked or unsupported
    }
  }
}
