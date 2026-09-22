/**
 * In-App Camera Scanner Viewport Modal Component
 */
export const renderStudentScannerModal = () => `
  <div id="student-scanner-modal" class="scanner-viewport-modal">
    <!-- Header -->
    <div class="scanner-modal-header">
      <button type="button" class="btn-close-scanner" id="btn-close-scanner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <span style="font-size: 0.95rem; font-weight: 700;">Scan Classroom QR</span>
      <div style="width: 38px;"></div>
    </div>

    <!-- Camera Viewport with Viewfinder and Laser Line -->
    <div class="scanner-camera-area">
      <div id="camera-stream-viewport" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%;"></div>
      <div class="camera-viewfinder">
        <div class="laser-scanner-line"></div>
      </div>
    </div>

    <!-- Instructions & Controls -->
    <div class="scanner-instructions">
      <p id="scanner-status-text" style="font-size: 0.85rem; color: #CBD5E1; margin-bottom: 10px;">Align the live projector QR code inside the viewfinder</p>
      
      <div style="display: flex; gap: 8px; justify-content: center;">
        <label for="input-qr-file" class="btn-simulate-scan" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: #FFFFFF; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 999px; font-size: 0.82rem; font-weight: 600;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          Scan from Image
        </label>
        <input type="file" id="input-qr-file" accept="image/*" style="display: none;">
      </div>
    </div>
  </div>
`;
