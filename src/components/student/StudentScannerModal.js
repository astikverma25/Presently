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

      <!-- Floating Zoom Control Line Bar (Zoom in / out for projector distance) -->
      <div class="scanner-zoom-overlay">
        <div class="scanner-zoom-control-bar">
          <button type="button" class="btn-zoom-step" id="btn-zoom-out" title="Zoom Out ( - )">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>

          <div class="zoom-slider-container">
            <input type="range" id="scanner-zoom-slider" class="scanner-zoom-slider-line" min="1.0" max="4.0" step="0.1" value="1.0" title="Adjust Camera Zoom">
            <span class="zoom-badge-indicator" id="zoom-badge-text">1.0x</span>
          </div>

          <button type="button" class="btn-zoom-step" id="btn-zoom-in" title="Zoom In ( + )">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>

        <!-- Quick Zoom Presets -->
        <div class="zoom-presets-row">
          <button type="button" class="btn-zoom-preset active" data-zoom="1.0">1x</button>
          <button type="button" class="btn-zoom-preset" data-zoom="1.5">1.5x</button>
          <button type="button" class="btn-zoom-preset" data-zoom="2.0">2x</button>
          <button type="button" class="btn-zoom-preset" data-zoom="3.0">3x</button>
        </div>
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
