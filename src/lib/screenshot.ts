import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** The website stores screenshots inline and refuses anything over this many
 * characters of data URL (`MAX_SCREENSHOT_CHARS` in deedar-drive's
 * `src/lib/bugs/constants.ts`). Aim a little under it. */
const MAX_CHARS = 1_400_000;

/** Tries, in order, until one fits: phone screenshots are tall, photos big. */
const ATTEMPTS = [
  { maxWidth: 1280, compress: 0.7 },
  { maxWidth: 1080, compress: 0.55 },
  { maxWidth: 800, compress: 0.45 },
];

export type Screenshot = { uri: string; dataUrl: string; width: number; height: number };

export type PickResult =
  | { ok: true; screenshot: Screenshot }
  | { ok: false; reason: 'canceled' | 'denied' | 'too_large' | 'failed' };

/**
 * Pick an image from the gallery (e.g. a screenshot the ISR just took) or take
 * a photo, then shrink it to a JPEG data URL small enough for the Bug Tracker.
 */
export async function pickScreenshot(source: 'library' | 'camera'): Promise<PickResult> {
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { ok: false, reason: 'denied' };
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return { ok: false, reason: 'canceled' };

    const asset = result.assets[0];
    for (const { maxWidth, compress } of ATTEMPTS) {
      const context = ImageManipulator.manipulate(asset.uri);
      if (!asset.width || asset.width > maxWidth) context.resize({ width: maxWidth, height: null });
      const image = await context.renderAsync();
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
      if (!saved.base64) continue;
      const dataUrl = `data:image/jpeg;base64,${saved.base64}`;
      if (dataUrl.length <= MAX_CHARS) {
        return { ok: true, screenshot: { uri: saved.uri, dataUrl, width: saved.width, height: saved.height } };
      }
    }
    return { ok: false, reason: 'too_large' };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
