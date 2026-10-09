import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useColors } from '@/constants/theme';
import { useT } from '@/lib/i18n/language';
import { isExpoGo, requestTrackingPermissions } from '@/lib/tracking/tracker';

/**
 * Explains location sharing before Android's prompts appear. Google Play
 * requires this "prominent disclosure" ahead of a background location request,
 * and an ISR who knows why is far likelier to pick "Allow all the time".
 */
export default function LocationPermissionScreen() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState(false);

  async function allow() {
    if (busy) return;
    setBusy(true);
    try {
      const background = await requestTrackingPermissions();
      if (background || isExpoGo) {
        router.back();
        return;
      }
      setDeclined(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 p-5 pb-10">
      <View className="items-center gap-3 pt-2">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-accent-tint">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-brand">
            <Ionicons name="navigate" size={28} color="#fff" />
          </View>
        </View>
        <Text weight="extrabold" className="text-center text-[22px] leading-7">
          {t('Share your location during work hours')}
        </Text>
        <Text className="text-center text-[14.5px] leading-[22px] text-ink-2">
          {t('Deedar ISR collects your location to show your live position to your Sales Officer while your work day is open —')}{' '}
          <Text weight="bold">{t('even when the app is closed or not in use')}</Text>.
        </Text>
      </View>

      <Card className="gap-4 p-4">
        <Point icon="play-circle" text={t('Sharing starts when you start your day in the Day Log.')} />
        <Point icon="stop-circle" text={t('It stops automatically when you end your day. Nothing is shared after that.')} />
        <Point icon="notifications" text={t('A notification stays visible the whole time sharing is on.')} />
        <Point icon="eye" text={t('Only your Sales Officer, your C&F office and Central Admin can see it.')} />
      </Card>

      <View className="gap-1.5 rounded-2xl bg-accent-tint p-4">
        <Text weight="bold" className="mb-1 text-[13px] text-brand">
          {t('ON THE NEXT SCREENS')}
        </Text>
        <Text className="text-[14px] leading-5">1. {t('Allow location access.')}</Text>
        <Text className="text-[14px] leading-5">
          2. {t('Choose')} <Text weight="bold">{t('Allow all the time')}</Text>{' '}
          {t('so sharing keeps working with the screen off.')}
        </Text>
      </View>

      {declined && (
        <View className="rounded-2xl bg-warning-tint p-4">
          <Text className="text-[14px] leading-5 text-warning">
            {t('Location is only shared while the app is open. To share during your whole day, tap Continue again and choose')}{' '}
            <Text weight="bold" className="text-warning">
              {t('Allow all the time')}
            </Text>
            .
          </Text>
        </View>
      )}

      <View className="gap-3">
        <Button title={t('Continue')} icon="arrow-forward" onPress={allow} loading={busy} />
        <Button title={t('Not now')} variant="ghost" onPress={() => router.back()} disabled={busy} />
      </View>
    </ScrollView>
  );
}

function Point({ icon, text }: { icon: ComponentProps<typeof Ionicons>['name']; text: string }) {
  const Colors = useColors();
  return (
    <View className="flex-row items-start gap-3">
      <Ionicons name={icon} size={22} color={Colors.accentDark} />
      <Text className="flex-1 text-[14px] leading-5">{text}</Text>
    </View>
  );
}
