export type AlertIdentity = { id: string };

export function newAlerts(previous: Set<string> | null, rows: AlertIdentity[]) {
  return previous ? rows.filter((row) => !previous.has(row.id)) : [];
}

let audio: AudioContext | undefined;
export async function playAlert() {
  audio ??= new AudioContext();
  await audio.resume();
  if (audio.state !== "running") return false;
  for (const [offset, frequency] of [[0, 660], [0.18, 880], [0.36, 1046]]) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, audio.currentTime + offset);
    gain.gain.linearRampToValueAtTime(0.12, audio.currentTime + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + offset + 0.16);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(audio.currentTime + offset);
    oscillator.stop(audio.currentTime + offset + 0.18);
  }
  return true;
}