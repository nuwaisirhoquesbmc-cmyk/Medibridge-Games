// Web Audio API Synthesizer for MediBridge Games Sound Effects
// Handcrafted programmatically to avoid any 404 asset download issues.

export type SoundEffectType = "click" | "correct" | "wrong" | "incorrect" | "levelup" | "battle" | "victory" | "buy" | "notification";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSound(type: SoundEffectType) {
  try {
    if (typeof window !== "undefined" && localStorage.getItem("medi_sfx_muted") === "true") {
      return;
    }
    const ctx = getAudioContext();
    const time = ctx.currentTime;

    switch (type) {
      case "click": {
        // Quick high-hat style click or sine tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(1000, time);
        osc.frequency.exponentialRampToValueAtTime(300, time + 0.08);

        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

        osc.start(time);
        osc.stop(time + 0.08);
        break;
      }
      case "correct": {
        // Double chime rising chord: C5 then E5 then G5 then C6
        const playTone = (freq: number, startOffset: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, time + startOffset);
          
          gain.gain.setValueAtTime(0.0, time + startOffset);
          gain.gain.linearRampToValueAtTime(0.08, time + startOffset + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.01, time + startOffset + duration);

          osc.start(time + startOffset);
          osc.stop(time + startOffset + duration);
        };

        playTone(523.25, 0, 0.15);     // C5
        playTone(659.25, 0.06, 0.15);  // E5
        playTone(783.99, 0.12, 0.25);  // G5
        playTone(1046.50, 0.18, 0.35); // C6
        break;
      }
      case "wrong":
      case "incorrect": {
        // Sad low descending warning growl: C3 down to Ab2
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(180, time);
        osc1.frequency.linearRampToValueAtTime(110, time + 0.45);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(185, time);
        osc2.frequency.linearRampToValueAtTime(112, time + 0.45);

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.45);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 0.45);
        osc2.stop(time + 0.45);
        break;
      }
      case "levelup": {
        // Triumphal heroic progression
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Arpeggio of C Major
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, time + idx * 0.1);
          
          gain.gain.setValueAtTime(0.1, time + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, time + idx * 0.1 + 0.45);

          osc.start(time + idx * 0.1);
          osc.stop(time + idx * 0.1 + 0.45);
        });
        break;
      }
      case "battle": {
        // Laser swish noise or synthesized sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(80, time);
        osc.frequency.exponentialRampToValueAtTime(1200, time + 0.3);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2000, time);
        filter.frequency.exponentialRampToValueAtTime(300, time + 0.3);

        osc.disconnect(gain);
        osc.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
        break;
      }
      case "victory": {
        // Epic game win fanfare
        const fanfare = [
          { f: 523.25, d: 0.12 }, // C
          { f: 523.25, d: 0.12 }, // C
          { f: 523.25, d: 0.12 }, // C
          { f: 523.25, d: 0.25 }, // C long
          { f: 415.30, d: 0.25 }, // Ab
          { f: 466.16, d: 0.25 }, // Bb
          { f: 523.25, d: 0.50 }  // C massive
        ];
        let cumulativeTime = 0;
        fanfare.forEach((n) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = "triangle";
          osc.frequency.setValueAtTime(n.f, time + cumulativeTime);
          
          gain.gain.setValueAtTime(0.0, time + cumulativeTime);
          gain.gain.linearRampToValueAtTime(0.08, time + cumulativeTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, time + cumulativeTime + n.d);

          osc.start(time + cumulativeTime);
          osc.stop(time + cumulativeTime + n.d);
          cumulativeTime += n.d + 0.02;
        });
        break;
      }
      case "buy": {
        // Coin collection sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(987.77, time); // B5
        osc.frequency.setValueAtTime(1318.51, time + 0.08); // E6

        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

        osc.start(time);
        osc.stop(time + 0.25);
        break;
      }
      case "notification": {
        // Premium Telegram / Facebook style crystal chime notification sound
        // Tone 1: E6 (1318.5 Hz) soft glass chime
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(1318.51, time);
        gain1.gain.setValueAtTime(0.0, time);
        gain1.gain.linearRampToValueAtTime(0.12, time + 0.015);
        gain1.gain.exponentialRampToValueAtTime(0.005, time + 0.28);

        osc1.start(time);
        osc1.stop(time + 0.28);

        // Tone 2: B6 (1975.53 Hz) bright harmonic bell
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(1975.53, time + 0.07);
        gain2.gain.setValueAtTime(0.0, time + 0.07);
        gain2.gain.linearRampToValueAtTime(0.14, time + 0.09);
        gain2.gain.exponentialRampToValueAtTime(0.002, time + 0.48);

        osc2.start(time + 0.07);
        osc2.stop(time + 0.48);
        break;
      }
    }
  } catch (error) {
    console.warn("Audio Context blocked or failed:", error);
  }
}
