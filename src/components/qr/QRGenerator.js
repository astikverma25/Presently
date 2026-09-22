import QRCode from 'qrcode';

export class QRGenerator {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.sessionId = options.sessionId || null;
    this.refreshIntervalSec = options.refreshIntervalSec || 35;
    this.onTokenChange = options.onTokenChange || (() => {});
    this.intervalId = null;
    this.timerId = null;
    this.remainingSeconds = this.refreshIntervalSec;
  }

  async start(fetchTokenCallback) {
    this.stop();
    await this.refresh(fetchTokenCallback);

    this.intervalId = setInterval(async () => {
      await this.refresh(fetchTokenCallback);
    }, this.refreshIntervalSec * 1000);
  }

  async refresh(fetchTokenCallback) {
    try {
      this.remainingSeconds = this.refreshIntervalSec;
      const payload = fetchTokenCallback ? await fetchTokenCallback() : {
        s: this.sessionId,
        t: Math.random().toString(36).substring(2, 15),
        exp: new Date(Date.now() + this.refreshIntervalSec * 1000).toISOString()
      };

      await this.renderQRCode(JSON.stringify(payload));
      this.onTokenChange(payload);
    } catch (err) {
      console.error('Error refreshing QR Code:', err);
    }
  }

  async renderQRCode(text) {
    if (!this.container) return;
    this.container.innerHTML = '';

    try {
      const dataUrl = await QRCode.toDataURL(text, {
        width: 256,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#1E1B4B',
          light: '#FFFFFF'
        }
      });
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = 'Attendance QR Code';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.borderRadius = '12px';
      this.container.appendChild(img);
    } catch (err) {
      console.error('QR Render Error:', err);
    }
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.timerId) clearInterval(this.timerId);
  }
}
