/**
 * AvatarRenderer - Canvas-based palette swap for AI-generated avatar base images.
 *
 * Base images use marker colors (salmon-pink skin ~5° + cyan hair ~180°, neutral gray bg).
 * At load time, skin/hair masks are auto-computed with strict HSL rules.
 * During palette swap: masked pixels are recolored (preserving hue offset for lip detail),
 * non-masked low-saturation / bright pixels are remapped to game background, and
 * feature pixels (eyes, mouth) are left untouched.
 */
const AvatarRenderer = (() => {
  const AVATAR_SIZE = 280;

  // Marker-color reference values (must match what AI generated)
  const SKIN_HUE_CENTER = 5;
  const HAIR_HUE_CENTER = 180;
  const SKIN_HUE_RANGE = 30;
  const HAIR_HUE_RANGE = 40;

  // Strict thresholds for mask computation
  const SKIN_MIN_SAT = 25;
  const SKIN_MIN_L = 45;
  const SKIN_MAX_L = 92;
  const HAIR_MIN_SAT = 35;
  const HAIR_MIN_L = 15;
  const HAIR_MAX_L = 90;

  // Game background color (replaces gray bg)
  const BG_COLOR = [30, 45, 64]; // #1e2d40

  // Base HSL reference for delta calculation
  const BASE_SKIN_S = 75;
  const BASE_SKIN_L = 72;
  const BASE_HAIR_S = 80;
  const BASE_HAIR_L = 55;

  // Per-gender source crop (fraction of original image) to normalize character size
  const CROP = {
    female: { x: 0.10, y: 0.06, w: 0.80, h: 0.88 },
    male:   { x: 0,    y: 0,    w: 1,    h: 1    },
  };

  const store = {};  // { female: { img, skinMask, hairMask }, male: { ... } }
  const cache = new Map();
  let canvas, ctx, maskCanvas, maskCtx;

  function init() {
    canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    maskCanvas = document.createElement('canvas');
    maskCanvas.width = AVATAR_SIZE;
    maskCanvas.height = AVATAR_SIZE;
    maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  }

  // --- Color utilities ---

  function hexToRgb(hex) {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l * 100];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h * 360, s * 100, l * 100];
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, h + 1/3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1/3) * 255),
    ];
  }

  function hueDist(a, b) {
    const d = Math.abs(a - b);
    return d > 180 ? 360 - d : d;
  }

  function signedHueDist(from, to) {
    let d = to - from;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // --- Draw with per-gender crop ---

  function drawWithCrop(context, img, crop) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const sx = crop.x * iw, sy = crop.y * ih;
    const sw = crop.w * iw, sh = crop.h * ih;
    context.drawImage(img, sx, sy, sw, sh, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  }

  // --- Mask computation (runs once per base image at preload) ---

  function computeMasks(img, crop) {
    maskCtx.clearRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    drawWithCrop(maskCtx, img, crop);
    const data = maskCtx.getImageData(0, 0, AVATAR_SIZE, AVATAR_SIZE).data;
    const pixelCount = AVATAR_SIZE * AVATAR_SIZE;
    const skinMask = new Uint8Array(pixelCount);
    const hairMask = new Uint8Array(pixelCount);

    for (let p = 0; p < pixelCount; p++) {
      const i = p * 4;
      if (data[i + 3] < 10) continue;

      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);

      const dSkin = hueDist(h, SKIN_HUE_CENTER);
      const dHair = hueDist(h, HAIR_HUE_CENTER);

      if (dSkin < SKIN_HUE_RANGE && s >= SKIN_MIN_SAT && l >= SKIN_MIN_L && l <= SKIN_MAX_L) {
        skinMask[p] = 1;
      } else if (dHair < HAIR_HUE_RANGE && s >= HAIR_MIN_SAT && l >= HAIR_MIN_L && l <= HAIR_MAX_L) {
        hairMask[p] = 1;
      }
    }

    return { skinMask, hairMask };
  }

  // --- Image loading ---

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function preloadAll() {
    const [femaleImg, maleImg] = await Promise.all([
      loadImage('assets/avatars/female_base.png'),
      loadImage('assets/avatars/male_base.png'),
    ]);

    const femaleMasks = computeMasks(femaleImg, CROP.female);
    const maleMasks = computeMasks(maleImg, CROP.male);

    store.female = { img: femaleImg, crop: CROP.female, ...femaleMasks };
    store.male = { img: maleImg, crop: CROP.male, ...maleMasks };
  }

  // --- Core palette swap (mask-guided) ---

  function paletteSwap(entry, targetSkinHex, targetHairHex) {
    const { img, crop, skinMask, hairMask } = entry;

    ctx.clearRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    drawWithCrop(ctx, img, crop);
    const imageData = ctx.getImageData(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    const data = imageData.data;

    const [tsH, tsS, tsL] = rgbToHsl(...hexToRgb(targetSkinHex));
    const [thH, thS, thL] = rgbToHsl(...hexToRgb(targetHairHex));

    const pixelCount = AVATAR_SIZE * AVATAR_SIZE;

    for (let p = 0; p < pixelCount; p++) {
      const i = p * 4;
      if (data[i + 3] < 10) continue;

      const isSkin = skinMask[p];
      const isHair = hairMask[p];

      if (!isSkin && !isHair) {
        const [, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
        // Broader background detection: catches anti-aliased edge pixels too
        if (s < 25 || (l > 80 && s < 40)) {
          const scale = l / 50;
          data[i]     = clamp(Math.round(BG_COLOR[0] * scale), 0, 255);
          data[i + 1] = clamp(Math.round(BG_COLOR[1] * scale), 0, 255);
          data[i + 2] = clamp(Math.round(BG_COLOR[2] * scale), 0, 255);
        }
        continue;
      }

      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      let newH, newS, newL;

      if (isSkin) {
        // Preserve hue offset so lips stay relatively redder than surrounding skin
        const hueOff = signedHueDist(SKIN_HUE_CENTER, h);
        newH = (tsH + hueOff * 0.5 + 360) % 360;
        newS = clamp(tsS + (s - BASE_SKIN_S) * 0.6, 0, 100);
        newL = clamp(tsL + (l - BASE_SKIN_L) * 0.85, 2, 98);
      } else {
        const hueOff = signedHueDist(HAIR_HUE_CENTER, h);
        newH = (thH + hueOff * 0.3 + 360) % 360;
        newS = clamp(thS + (s - BASE_HAIR_S) * 0.6, 0, 100);
        newL = clamp(thL + (l - BASE_HAIR_L) * 0.85, 2, 98);
      }

      const [nr, ng, nb] = hslToRgb(newH, newS, newL);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  // --- Public API ---

  return {
    async preload() {
      init();
      await preloadAll();
    },

    isReady() {
      return !!(store.female && store.male);
    },

    render(gender, skinColor, hairColor) {
      const g = gender === 'male' ? 'male' : 'female';
      const key = `${g}_${skinColor}_${hairColor}`;
      if (cache.has(key)) return cache.get(key);

      const entry = store[g];
      if (!entry) return '';

      const dataUrl = paletteSwap(entry, skinColor, hairColor);
      cache.set(key, dataUrl);
      return dataUrl;
    },

    renderAsHTML(gender, skinColor, hairColor) {
      const src = this.render(gender, skinColor, hairColor);
      if (!src) {
        return '<div style="width:140px;height:140px;border-radius:50%;background:#2a2a4a;display:flex;align-items:center;justify-content:center;font-size:48px;">⏳</div>';
      }
      return `<img src="${src}" alt="Avatar" style="width:140px;height:140px;border-radius:50%;object-fit:cover;" />`;
    }
  };
})();
