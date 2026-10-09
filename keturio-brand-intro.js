/* Keturio branded intro and spoken tagline. Browsers may require a tap before audio. */
(() => {
  const overlay = document.getElementById('keturioBoot');
  if (!overlay) return;
  const voiceButton = document.getElementById('bootVoiceButton');
  const skipButton = document.getElementById('bootSkip');
  const voiceStatus = document.getElementById('bootVoiceStatus');
  const start = performance.now();
  const duration = 10800 + Math.floor(Math.random() * 1201); // 10.8–12 seconds
  let dismissed = false;
  let spoken = false;
  let finishTimer;
  const message = 'Keturio. Beyond Social. Beyond Smart.';

  function speak() {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      voiceStatus.textContent = 'Voice playback is not supported in this browser.';
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      utterance.pitch = 1.02;
      utterance.volume = 1;
      utterance.onstart = () => { spoken = true; voiceStatus.textContent = 'Introducing Keturio…'; };
      utterance.onend = () => { voiceStatus.textContent = 'A smarter world of social connection.'; };
      utterance.onerror = () => { voiceStatus.textContent = 'Tap “Hear Keturio” to play the introduction.'; };
      window.speechSynthesis.speak(utterance);
      voiceStatus.textContent = 'Playing Keturio introduction…';
      return true;
    } catch (_) {
      voiceStatus.textContent = 'Tap “Hear Keturio” to play the introduction.';
      return false;
    }
  }

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(finishTimer);
    overlay.classList.add('is-leaving');
    window.setTimeout(() => overlay.remove(), 750);
  }

  voiceButton?.addEventListener('click', () => {
    speak();
    voiceButton.textContent = '🔊 Play introduction again';
  });
  skipButton?.addEventListener('click', dismiss);

  // Attempt voice automatically; browser autoplay rules may block it until a user gesture.
  window.setTimeout(() => {
    if (!spoken) {
      const ok = speak();
      if (!ok) voiceStatus.textContent = 'Tap “Hear Keturio” to hear the name and motto.';
    }
  }, 650);

  // Keep the intro visible for 10.8–12 seconds unless the user chooses Continue.
  finishTimer = window.setTimeout(dismiss, duration);
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'Enter') dismiss();
  });
})();
