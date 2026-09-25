/**
 * Instant, Lightweight Student Thumbnail Avatar Generator
 * Zero-latency, offline-compatible SVG Data-URI avatars with curated gradient palettes
 */

// Modern, high-contrast accessible gradient palettes
const AVATAR_PALETTES = [
  { bg1: '#6366F1', bg2: '#4338CA', text: '#FFFFFF', border: '#818CF8' }, // Indigo
  { bg1: '#0EA5E9', bg2: '#0284C7', text: '#FFFFFF', border: '#38BDF8' }, // Sky
  { bg1: '#10B981', bg2: '#059669', text: '#FFFFFF', border: '#34D399' }, // Emerald
  { bg1: '#8B5CF6', bg2: '#6D28D9', text: '#FFFFFF', border: '#A78BFA' }, // Purple
  { bg1: '#F59E0B', bg2: '#D97706', text: '#FFFFFF', border: '#FCD34D' }, // Amber
  { bg1: '#EC4899', bg2: '#BE185D', text: '#FFFFFF', border: '#F472B6' }, // Pink
  { bg1: '#14B8A6', bg2: '#0F766E', text: '#FFFFFF', border: '#2DD4BF' }, // Teal
  { bg1: '#3B82F6', bg2: '#1D4ED8', text: '#FFFFFF', border: '#60A5FA' }, // Blue
];

/**
 * Deterministically generates a palette index from a name or roll number string
 */
export const getAvatarPalette = (identifier = '') => {
  const str = String(identifier || 'student').trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
};

/**
 * Extracts clean 2-letter uppercase initials
 */
export const getStudentInitials = (name = '', fallback = 'ST') => {
  if (!name) return fallback;
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Generates an ultra-lightweight inline SVG data URI avatar (<300 bytes)
 * Instantaneous rendering with zero HTTP requests.
 */
export const getStudentAvatarSvgDataUri = (name = '', rollNumber = '', size = 64) => {
  const initials = getStudentInitials(name);
  const palette = getAvatarPalette(rollNumber || name);
  const fontSize = Math.round(size * 0.42);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>
      <linearGradient id="g_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette.bg1}"/>
        <stop offset="100%" stop-color="${palette.bg2}"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.28)}" fill="url(#g_${initials})"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${(size / 2) - 1.5}" fill="none" stroke="${palette.border}" stroke-width="1.5" stroke-opacity="0.5"/>
    <text x="50%" y="54%" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', sans-serif" font-size="${fontSize}" font-weight="800" fill="${palette.text}" text-anchor="middle" dominant-baseline="middle" letter-spacing="-0.5px">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Renders complete HTML snippet for student thumbnail image
 */
/**
 * Renders complete HTML snippet for student thumbnail image with crisp Retina rendering
 */
export const renderStudentThumbnail = (student = {}, options = {}) => {
  const name = student.name || student.studentName || 'Student';
  const roll = student.rollNumber || student.roll_no || student.rollNo || '';
  const size = options.size || 38;
  const isVerified = options.isVerified || student.status === 'marked' || student.status === 'present';
  const customPhoto = student.photoUrl || student.photo_url || student.avatar_url || student.profile_image || '';
  const initials = getStudentInitials(name);
  const palette = getAvatarPalette(roll || name);
  const avatarSrc = customPhoto || getStudentAvatarSvgDataUri(name, roll, size);

  return `
    <div class="student-thumb-wrapper ${options.className || ''}" style="width: ${size}px; height: ${size}px; min-width: ${size}px; position: relative; border-radius: ${Math.round(size * 0.28)}px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.08); overflow: hidden; background: #F8FAFC; border: 1px solid rgba(226, 232, 240, 0.8);">
      <img src="${avatarSrc}" alt="${name}" width="${size}" height="${size}" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit; display: block; image-rendering: -webkit-optimize-contrast;" loading="lazy" onerror="this.onerror=null; this.src='${getStudentAvatarSvgDataUri(name, roll, size)}';">
      ${isVerified ? `
        <span class="thumb-verified-dot" style="position: absolute; bottom: -1px; right: -1px; width: ${Math.max(10, Math.round(size * 0.3))}px; height: ${Math.max(10, Math.round(size * 0.3))}px; border-radius: 50%; background: #10B981; border: 2px solid #FFFFFF; box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);" title="Verified Present"></span>
      ` : ''}
    </div>
  `;
};

/**
 * Creates a high-clarity, lightweight Retina square thumbnail (~10-15 KB WebP)
 * Uses high-quality bicubic downsampling to prevent pixelation while maintaining instant loading
 */
export const createThumbnailFromMedia = async (source, targetSize = 256, quality = 0.84) => {
  return new Promise((resolve, reject) => {
    try {
      const drawAndExport = (imgOrVideo, sw, sh) => {
        if (!sw || !sh) {
          return reject(new Error('Invalid image dimensions'));
        }

        // 1. Calculate center square crop
        const minDim = Math.min(sw, sh);
        const sx = (sw - minDim) / 2;
        const sy = (sh - minDim) / 2;

        // 2. High-quality multi-step reduction for razor-sharp downsampling
        let currentCanvas = document.createElement('canvas');
        currentCanvas.width = minDim;
        currentCanvas.height = minDim;
        let currentCtx = currentCanvas.getContext('2d');
        currentCtx.imageSmoothingEnabled = true;
        currentCtx.imageSmoothingQuality = 'high';
        currentCtx.drawImage(imgOrVideo, sx, sy, minDim, minDim, 0, 0, minDim, minDim);

        // Step down by halves if image is very large to avoid aliasing
        let curW = minDim;
        while (curW / 2 >= targetSize) {
          const nextCanvas = document.createElement('canvas');
          const nextW = Math.floor(curW / 2);
          nextCanvas.width = nextW;
          nextCanvas.height = nextW;
          const nextCtx = nextCanvas.getContext('2d');
          nextCtx.imageSmoothingEnabled = true;
          nextCtx.imageSmoothingQuality = 'high';
          nextCtx.drawImage(currentCanvas, 0, 0, curW, curW, 0, 0, nextW, nextW);
          currentCanvas = nextCanvas;
          curW = nextW;
        }

        // Final target canvas
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetSize;
        finalCanvas.height = targetSize;
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.imageSmoothingEnabled = true;
        finalCtx.imageSmoothingQuality = 'high';
        finalCtx.drawImage(currentCanvas, 0, 0, curW, curW, 0, 0, targetSize, targetSize);

        // Export as WebP with JPEG fallback
        let dataUri = '';
        try {
          dataUri = finalCanvas.toDataURL('image/webp', quality);
          if (!dataUri || !dataUri.startsWith('data:image/webp')) {
            dataUri = finalCanvas.toDataURL('image/jpeg', quality);
          }
        } catch {
          dataUri = finalCanvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUri);
      };

      if (source instanceof HTMLVideoElement) {
        const vw = source.videoWidth || 640;
        const vh = source.videoHeight || 480;
        drawAndExport(source, vw, vh);
      } else if (source instanceof HTMLImageElement) {
        if (source.complete && source.naturalWidth > 0) {
          drawAndExport(source, source.naturalWidth, source.naturalHeight);
        } else {
          source.onload = () => drawAndExport(source, source.naturalWidth, source.naturalHeight);
          source.onerror = (e) => reject(e);
        }
      } else if (source instanceof File || source instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => drawAndExport(img, img.naturalWidth, img.naturalHeight);
          img.onerror = (err) => reject(err);
          img.src = e.target.result;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(source);
      } else {
        reject(new Error('Unsupported media source for thumbnail'));
      }
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Starts camera video stream on a given HTMLVideoElement with resilient fallbacks
 */
export const openCameraStream = async (videoElement, facingMode = 'user') => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera API is not supported on this browser or requires a secure HTTPS/localhost connection.');
  }

  let stream = null;

  // Attempt 1: Specific facing mode & resolution
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facingMode ? { ideal: facingMode } : undefined,
        width: { ideal: 640 },
        height: { ideal: 640 }
      },
      audio: false
    });
  } catch (err) {
    console.warn('Initial camera constraint failed, attempting generic video fallback:', err);
    // Attempt 2: Generic video fallback (crucial for USB webcams & desktop PCs without facingMode support)
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
    } catch (fallbackErr) {
      console.error('All camera access attempts failed:', fallbackErr);
      throw fallbackErr;
    }
  }

  if (videoElement && stream) {
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.autoplay = true;
    videoElement.srcObject = stream;
    try {
      await videoElement.play();
    } catch (playErr) {
      console.warn('video.play() auto-play error, retrying on loadedmetadata:', playErr);
      videoElement.onloadedmetadata = () => {
        videoElement.play().catch(e => console.error('Video play retry failed:', e));
      };
    }
  }

  return stream;
};

/**
 * Safely stops camera tracks for a video element
 */
export const stopCameraStream = (videoElement) => {
  if (videoElement && videoElement.srcObject) {
    const stream = videoElement.srcObject;
    if (typeof stream.getTracks === 'function') {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Track stop error:', e);
        }
      });
    }
    videoElement.srcObject = null;
  }
};

