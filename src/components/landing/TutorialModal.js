/**
 * Interactive Tutorial / Video Walkthrough Modal for Presently
 */
export const initTutorialModal = () => {
  const modalHTML = `
    <div id="tutorial-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 720px; padding: 24px;">
        <button class="modal-close" id="close-tutorial-modal">&times;</button>
        <h3 style="font-size: 1.4rem; color: #0F172A; margin-bottom: 16px;">How Presently Works in 60 Seconds</h3>
        
        <div style="width: 100%; aspect-ratio: 16/9; background: #0F172A; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFFFFF; position: relative; overflow: hidden;">
          <div style="text-align: center; padding: 20px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: #4338CA; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; box-shadow: 0 0 20px rgba(67, 56, 202, 0.6); cursor: pointer;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
            <h4 style="font-size: 1.1rem; margin-bottom: 4px;">Interactive Workflow Preview</h4>
            <p style="font-size: 0.85rem; color: #94A3B8;">Faculty launches rolling QR code &bull; Students scan in 0.5s via mobile browser</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('tutorial-modal');
  const closeBtn = document.getElementById('close-tutorial-modal');

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  return {
    open: () => modal.classList.add('active'),
    close: () => modal.classList.remove('active')
  };
};
