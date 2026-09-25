import QRCode from 'qrcode';

/**
 * Standard Compliant QR Code Generator for Presently
 * Generates ISO/IEC 18004 standard scannable QR codes for anti-proxy dynamic attendance
 */
export class QRGenerator {
  /**
   * Generates a real ISO-standard scannable Data URL for the given text payload
   */
  static async generateDataURL(text, size = 1024) {
    try {
      return await QRCode.toDataURL(text, {
        width: size,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (err) {
      console.error('QRCode generation error:', err);
      return '';
    }
  }

  /**
   * Generates real SVG markup string
   */
  static async generateSVG(text, size = 1024) {
    try {
      return await QRCode.toString(text, {
        type: 'svg',
        width: size,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (err) {
      console.error('QRCode SVG generation error:', err);
      return '';
    }
  }
}
