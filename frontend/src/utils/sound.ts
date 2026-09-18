// Web Audio Tone Synthesizer & Audio Unlock Manager

let audioCtx: AudioContext | null = null;
let soundUnlocked = false;

export function isAudioUnlocked(): boolean {
  return soundUnlocked;
}

export function unlockAudio(): boolean {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    soundUnlocked = true;
    // Play an inaudible pulse to verify unlock
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.001;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
    return true;
  } catch (e) {
    console.warn('AudioContext initialization failed:', e);
    return false;
  }
}

export function playAlertSound(): void {
  // 1. Try playing audio file if available
  try {
    const audio = new Audio('/sounds/alert.mp3');
    audio.volume = 0.8;
    audio.play().catch(() => {
      // Autoplay or file missing fallback to Web Audio
      playSynthesizedTone();
    });
  } catch {
    playSynthesizedTone();
  }
}

function playSynthesizedTone(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    
    // Clinical instrument alert: Crisp dual-frequency hit (880Hz & 1320Hz)
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.35);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, now);
    osc2.frequency.exponentialRampToValueAtTime(660, now + 0.35);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  } catch (e) {
    console.warn('Unable to play synthesized alert tone:', e);
  }
}
