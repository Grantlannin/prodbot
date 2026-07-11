import confetti from 'canvas-confetti';

export function fireCelebrationConfetti() {
  const duration = 4000;
  const end = Date.now() + duration;
  const colors = ['#3b82f6', '#60a5fa', '#2563eb', '#93c5fd', '#22c55e', '#fbbf24', '#f472b6'];

  confetti({ particleCount: 120, spread: 90, origin: { y: 0.55 }, colors });
  confetti({ particleCount: 80, spread: 120, origin: { x: 0.2, y: 0.4 }, colors });
  confetti({ particleCount: 80, spread: 120, origin: { x: 0.8, y: 0.4 }, colors });

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.5 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.5 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();

  setTimeout(() => {
    confetti({ particleCount: 200, spread: 160, origin: { y: 0.35 }, colors });
  }, 400);
}

export function triggerCelebration(
  settings: { enabled: boolean; showMessage: boolean },
  showOverlay: () => void
) {
  if (!settings.enabled) return;
  if (settings.showMessage) {
    showOverlay();
    return;
  }
  fireCelebrationConfetti();
}
