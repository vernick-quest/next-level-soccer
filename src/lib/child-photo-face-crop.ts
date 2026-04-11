/**
 * Client-side profile photo prep: face-aware square crop + resize for circular avatars.
 * Uses dynamic imports so TensorFlow.js is not loaded on the server or until needed.
 */

export const CHILD_PROFILE_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif' as const

export const CHILD_PROFILE_PHOTO_ACCEPT_LABEL = 'JPEG, PNG, WebP, or GIF'

const ACCEPTED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export const CHILD_PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024

const OUTPUT_SIZE = 512

export function isChildProfilePhotoMime(mime: string): boolean {
  return ACCEPTED_MIMES.has(mime)
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image.'))
    }
    img.src = url
  })
}

function readPoint(p: unknown): [number, number] {
  if (Array.isArray(p) && p.length >= 2) return [Number(p[0]), Number(p[1])]
  throw new Error('Unexpected face coordinate format')
}

function centerSquareCrop(imgW: number, imgH: number): { sx: number; sy: number; s: number } {
  const s = Math.min(imgW, imgH)
  const sx = Math.max(0, Math.round((imgW - s) / 2))
  const sy = Math.max(0, Math.round((imgH - s) / 2))
  return { sx, sy, s }
}

function faceSquareCrop(
  imgW: number,
  imgH: number,
  topLeft: unknown,
  bottomRight: unknown,
): { sx: number; sy: number; s: number } {
  const [x1, y1] = readPoint(topLeft)
  const [x2, y2] = readPoint(bottomRight)
  const fw = Math.max(1, x2 - x1)
  const fh = Math.max(1, y2 - y1)
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const pad = 0.55 * Math.max(fw, fh)
  const maxS = Math.min(imgW, imgH)
  let s = Math.min(Math.ceil(Math.max(fw, fh) + 2 * pad), maxS)
  s = Math.max(s, Math.min(Math.ceil(1.2 * Math.max(fw, fh)), maxS))

  let sx = Math.round(cx - s / 2)
  let sy = Math.round(cy - s / 2)
  sx = Math.max(0, Math.min(sx, imgW - s))
  sy = Math.max(0, Math.min(sy, imgH - s))
  return { sx, sy, s }
}

let blazeModelPromise: Promise<import('@tensorflow-models/blazeface').BlazeFaceModel> | null = null

async function getBlazeFace() {
  if (!blazeModelPromise) {
    blazeModelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs')
      await tf.ready()
      const blazeface = await import('@tensorflow-models/blazeface')
      return blazeface.load({ maxFaces: 8, scoreThreshold: 0.55 })
    })()
  }
  return blazeModelPromise
}

function pickBestFace(
  faces: import('@tensorflow-models/blazeface').NormalizedFace[],
): import('@tensorflow-models/blazeface').NormalizedFace | null {
  if (!faces.length) return null
  let best = faces[0]
  let bestScore = Number(best.probability ?? 0)
  let bestArea = 0
  try {
    const [x1, y1] = readPoint(best.topLeft)
    const [x2, y2] = readPoint(best.bottomRight)
    bestArea = Math.abs(x2 - x1) * Math.abs(y2 - y1)
  } catch {
    /* ignore */
  }
  for (let i = 1; i < faces.length; i++) {
    const f = faces[i]
    const p = Number(f.probability ?? 0)
    let area = 0
    try {
      const [x1, y1] = readPoint(f.topLeft)
      const [x2, y2] = readPoint(f.bottomRight)
      area = Math.abs(x2 - x1) * Math.abs(y2 - y1)
    } catch {
      /* ignore */
    }
    if (p > bestScore || (p === bestScore && area > bestArea)) {
      best = f
      bestScore = p
      bestArea = area
    }
  }
  return best
}

/**
 * Square-crops to the dominant face when detected; otherwise center-crops.
 * Returns a JPEG `File` suitable for upload (fixed size, circle-friendly).
 */
export async function processChildPhotoForUpload(file: File): Promise<File> {
  if (!isChildProfilePhotoMime(file.type)) {
    throw new Error(`Use ${CHILD_PROFILE_PHOTO_ACCEPT_LABEL}.`)
  }
  if (file.size > CHILD_PROFILE_PHOTO_MAX_BYTES) {
    throw new Error('Image must be 5 MB or smaller.')
  }

  const img = await loadImageFromFile(file)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (w < 32 || h < 32) {
    throw new Error('Image is too small. Try a larger photo.')
  }

  let crop = centerSquareCrop(w, h)
  try {
    const model = await getBlazeFace()
    const faces = await model.estimateFaces(img, false, false, true)
    const face = pickBestFace(faces)
    if (face) {
      crop = faceSquareCrop(w, h, face.topLeft, face.bottomRight)
    }
  } catch {
    crop = centerSquareCrop(w, h)
  }

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not prepare image.')
  }
  ctx.drawImage(img, crop.sx, crop.sy, crop.s, crop.s, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error('Could not encode image.'))
      },
      'image/jpeg',
      0.9,
    )
  })

  return new File([blob], 'profile.jpg', { type: 'image/jpeg', lastModified: Date.now() })
}
