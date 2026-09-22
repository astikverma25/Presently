import { Html5Qrcode } from 'html5-qrcode';

/**
 * In-App Browser QR Scanner for Presently Student Panel
 * Uses html5-qrcode for lightweight, direct camera scanning via getUserMedia
 */
export class QRScanner {
  constructor(readerElementId, options = {}) {
    this.readerElementId = readerElementId;
    this.html5QrCode = null;
    this.onScanSuccess = options.onScanSuccess || (() => {});
    this.onScanError = options.onScanError || (() => {});
    this.fps = options.fps || 15;
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
            (decodedText, decodedResult) => this.onScanSuccess(decodedText, decodedResult),
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

  async stop() {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      await this.html5QrCode.stop();
      this.html5QrCode.clear();
    }
  }
}
