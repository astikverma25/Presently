/**
 * In-App High Performance Scan Feedback Overlay Modal
 * Provides audio chime, haptic vibration, and animated visual feedback for QR attendance scans
 */

export function playAudioFeedback(type = 'success') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Pleasant double-beep chime (E5 -> A5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Warning double tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(220, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    // AudioContext blocked or not supported on device
  }
}

export function triggerHapticFeedback(type = 'success') {
  try {
    if (navigator.vibrate) {
      if (type === 'success') {
        navigator.vibrate([35, 50, 35]);
      } else {
        navigator.vibrate([100, 60, 100]);
      }
    }
  } catch (e) {}
}

export function showScanFeedbackModal({ success, isDuplicate, isWrongSection, title, message, subDetail, onDismiss }) {
  const isWarn = isDuplicate || (!success && title?.toLowerCase().includes('already'));
  const isSecMismatch = isWrongSection || (!success && title?.toLowerCase().includes('section'));
  const feedbackType = success ? 'success' : (isWarn ? 'warning' : 'error');

  // Trigger Sound & Vibration
  playAudioFeedback(feedbackType === 'success' ? 'success' : (feedbackType === 'warning' ? 'success' : 'error'));
  triggerHapticFeedback(feedbackType === 'success' ? 'success' : 'error');

  // Remove existing feedback modal if any
  const existing = document.getElementById('scan-feedback-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'scan-feedback-overlay';
  overlay.className = 'scan-feedback-backdrop';

  let iconHTML = '';
  if (success) {
    iconHTML = `
      <div class="feedback-icon-circle success">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    `;
  } else if (isSecMismatch) {
    iconHTML = `
      <div class="feedback-icon-circle error" style="background: rgba(239, 68, 68, 0.12); border: 2px solid rgba(239, 68, 68, 0.4);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
    `;
  } else if (isWarn) {
    iconHTML = `
      <div class="feedback-icon-circle warning">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
    `;
  } else {
    iconHTML = `
      <div class="feedback-icon-circle error">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
    `;
  }

  const cardClass = success 
    ? 'feedback-card-success' 
    : (isWarn ? 'feedback-card-warning' : 'feedback-card-error');

  const btnClass = success 
    ? 'btn-success' 
    : (isWarn ? 'btn-warning' : 'btn-retry');

  const defaultTitle = success 
    ? 'Attendance Verified!' 
    : (isSecMismatch ? 'Wrong Section / Unauthorized' : (isWarn ? 'Already Recorded' : 'Verification Failed'));

  overlay.innerHTML = `
    <div class="scan-feedback-card ${cardClass}">
      ${iconHTML}
      <h3 class="feedback-title">${title || defaultTitle}</h3>
      <p class="feedback-message">${message || ''}</p>
      ${subDetail ? `<div class="feedback-sub-pill">${subDetail}</div>` : ''}

      <button type="button" class="btn-feedback-action ${btnClass}" id="btn-feedback-done">
        ${success ? 'Done & Return to Dashboard' : (isWarn ? 'Got It' : 'Dismiss / Try Again')}
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Trigger animation
  requestAnimationFrame(() => {
    overlay.classList.add('active');
  });

  const closeFeedback = () => {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.remove();
      if (typeof onDismiss === 'function') onDismiss();
    }, 220);
  };

  const doneBtn = overlay.querySelector('#btn-feedback-done');
  if (doneBtn) {
    doneBtn.addEventListener('click', closeFeedback);
  }

  // Auto-close on backdrop tap
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeFeedback();
    }
  });

  // Auto-dismiss on success after 3.5 seconds if user doesn't tap
  if (success) {
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        closeFeedback();
      }
    }, 3500);
  }
}
