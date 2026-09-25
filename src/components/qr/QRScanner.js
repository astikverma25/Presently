import { Html5Qrcode } from 'html5-qrcode';
import { playScanBeep } from '../../utils/audioUtils.js';

/**
 * In-App Browser QR Scanner for Presently Student Panel
 * Uses html5-qrcode for lightweight, direct camera scanning via getUserMedia
 * Supports Hardware Camera Zoom & CSS Digital Scale Zoom Fallback
 */
export class QRScanner {
  constructor(readerElementId, options = {}) {
    this.readerElementId = readerElementId;
    this.html5QrCode = null;
    this.onScanSuccess = options.onScanSuccess || (() => {});
    this.onScanError = options.onScanError || (() => {});
    this.fps = options.fps || 20;
    this.currentZoom = 1.0;
  }

  async start() {
    const ScannerClass = Html5Qrcode || window.Html5Qrcode;
    if (!ScannerClass) {
      console.warn("Html5Qrcode library not loaded yet.");
      return;
    }

    try {
      this.html5QrCode = new ScannerClass(this.readerElementId, {
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });

      const config = {
        fps: 20,
        disableFlip: false,
        videoConstraints: {
          facingMode: "environment"
        }
      };

      await this.html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText, decodedResult) => {
          playScanBeep();
          this.onScanSuccess(decodedText, decodedResult);
        },
        (errorMessage) => {
          this.onScanError(errorMessage);
        }
      );
    } catch (err) {
      console.error("Camera access failed or denied:", err);
      // Fallback: try default camera if facingMode: "environment" fails
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCamera = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear')) || cameras[cameras.length - 1];
          await this.html5QrCode.start(
            backCamera.id,
            { fps: this.fps },
            (decodedText, decodedResult) => {
              playScanBeep();
              this.onScanSuccess(decodedText, decodedResult);
            },
            (errorMessage) => this.onScanError(errorMessage)
          );
          return;
        }
      } catch (fallbackErr) {
        console.error("Camera fallback failed:", fallbackErr);
      }
      throw err;
    }
  }

  /**
   * Applies zoom level (1.0x to 4.0x) using Hardware constraints or CSS fallback
   */
  async applyZoom(zoomFactor) {
    const factor = Math.max(1.0, Math.min(4.0, Number(zoomFactor) || 1.0));
    this.currentZoom = factor;

    // 1. Try Hardware Camera Zoom via MediaStreamTrack
    try {
      const container = document.getElementById(this.readerElementId);
      const videoEl = container ? container.querySelector('video') : null;
      if (videoEl && videoEl.srcObject && videoEl.srcObject.getVideoTracks) {
        const track = videoEl.srcObject.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const capabilities = track.getCapabilities();
          if (capabilities.zoom) {
            const min = capabilities.zoom.min || 1;
            const max = capabilities.zoom.max || 5;
            const targetZoom = Math.min(Math.max(factor, min), max);
            await track.applyConstraints({
              advanced: [{ zoom: targetZoom }]
            });
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Hardware zoom constraint not supported, using digital fallback:', err);
    }

    // 2. Smooth Digital CSS Scale Zoom Fallback (Works everywhere)
    try {
      const container = document.getElementById(this.readerElementId);
      const videoEl = container ? container.querySelector('video') : null;
      if (videoEl) {
        videoEl.style.transform = `scale(${factor})`;
        videoEl.style.transformOrigin = 'center center';
        videoEl.style.transition = 'transform 0.12s cubic-bezier(0, 0, 0.2, 1)';
      }
    } catch (err) {
      console.warn('Digital zoom transform failed:', err);
    }
  }

  async stop() {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      await this.html5QrCode.stop();
      this.html5QrCode.clear();
    }
  }
}
