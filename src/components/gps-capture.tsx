import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useT } from '@/lib/i18n/language';

/** A fix can take a while indoors; give up rather than spin forever. */
const FIX_TIMEOUT_MS = 25_000;

/**
 * Captures the phone's current GPS position as `"lat, lng"` — the same string
 * (4 decimals) the website's GpsCapture produces and `parseCoords` accepts.
 */
export function GpsCapture({ value, onCapture }: { value: string; onCapture: (coords: string) => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  async function capture() {
    if (busy) return;
    setError('');
    setBlocked(false);
    setBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        // Once refused for good, Android won't ask again — only Settings can.
        setBlocked(!permission.canAskAgain);
        setError('Location permission denied — allow it and try again.');
        return;
      }

      if (!(await Location.hasServicesEnabledAsync())) {
        try {
          // Android's "turn on location" prompt.
          await Location.enableNetworkProviderAsync();
        } catch {
          setError('Turn on location (GPS) on your phone and try again.');
          return;
        }
      }

      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), FIX_TIMEOUT_MS)),
      ]);
      const { latitude, longitude, accuracy: meters } = position.coords;
      setAccuracy(meters ?? null);
      onCapture(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    } catch {
      setError("Couldn't get your location. Step outside or near a window and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-2">
      <Pressable
        onPress={capture}
        disabled={busy}
        accessibilityRole="button"
        className={`min-h-[54px] flex-row items-center justify-center gap-2 rounded-2xl px-4 active:opacity-80 ${
          value ? 'border border-success/30 bg-success-tint' : 'bg-brand'
        } ${busy ? 'opacity-80' : ''}`}>
        {busy ? (
          <>
            <ActivityIndicator color={value ? '#1e9e5a' : '#fff'} />
            <Text weight="bold" className={`text-[15px] ${value ? 'text-success' : 'text-white'}`}>
              {t('Locating…')}
            </Text>
          </>
        ) : value ? (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#1e9e5a" />
            <Text weight="bold" className="text-[15px] text-success">
              {t('Captured ·')} {value}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="locate" size={20} color="#fff" />
            <Text weight="bold" className="text-[15px] text-white">
              {t('Capture Current Location')}
            </Text>
          </>
        )}
      </Pressable>

      {value && !busy ? (
        <Text className="text-[12px] text-ink-3">
          {accuracy != null ? `${t('Accurate to about {n} m.', { n: Math.round(accuracy) })} ` : ''}
          {t('Tap again to re-capture.')}
        </Text>
      ) : null}

      {error ? (
        <View className="gap-1">
          <Text className="text-[13px] text-danger">{t(error)}</Text>
          {blocked && (
            <Pressable onPress={() => Linking.openSettings()} accessibilityRole="link" hitSlop={8}>
              <Text weight="bold" className="text-[13px] text-brand">
                {t('Open settings')}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}
