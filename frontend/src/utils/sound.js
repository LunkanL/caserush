export function isSoundEnabled() {
  return localStorage.getItem("soundEnabled") !== "false";
}

export function setSoundEnabled(enabled) {
  localStorage.setItem("soundEnabled", enabled ? "true" : "false");
}

function playTone({ frequency = 440, duration = 0.12, type = "sine", volume = 0.08 }) {
  if (!isSoundEnabled()) {
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    return;
  }

  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.value = volume;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();

  setTimeout(() => {
    oscillator.stop();
    audioContext.close();
  }, duration * 1000);
}

export function playWinSound() {
  playTone({
    frequency: 740,
    duration: 0.12,
    type: "triangle",
    volume: 0.08,
  });

  setTimeout(() => {
    playTone({
      frequency: 980,
      duration: 0.14,
      type: "triangle",
      volume: 0.07,
    });
  }, 120);
}

export function playLossSound() {
  playTone({
    frequency: 220,
    duration: 0.18,
    type: "sawtooth",
    volume: 0.04,
  });
}