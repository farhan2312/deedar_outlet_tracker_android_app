import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useColors } from '@/constants/theme';
import { useSession } from '@/lib/auth/session';
import { useLanguage } from '@/lib/i18n/language';
import { useThemePreference } from '@/lib/theme/preference';

export default function AccountScreen() {
  const Colors = useColors();
  const { session, signOut } = useSession();
  const { lang, setLang, t } = useLanguage();
  const { preference, setPreference } = useThemePreference();
  if (session.status !== 'signedIn') return null;
  const { user } = session;

  function confirmSignOut() {
    Alert.alert(t('Sign out?'), t('Location sharing stops on this phone when you sign out.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Sign out'), style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 p-4 pb-10">
      <Card className="items-center gap-1 p-6">
        <View className="mb-2 h-20 w-20 items-center justify-center rounded-full bg-brand">
          <Text weight="extrabold" className="text-[28px] text-white">
            {user.name
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join('')}
          </Text>
        </View>
        <Text weight="extrabold" className="text-center text-[20px]">
          {user.name}
        </Text>
        <Text className="text-[14px] text-ink-2">
          {t('Field Salesman ISR')} · {user.phone}
        </Text>
      </Card>

      <Card className="px-4">
        <InfoRow icon="storefront-outline" label={t('Stockist')} value={user.depot?.name ?? '—'} />
        <InfoRow
          icon="location-outline"
          label={t('Areas')}
          value={user.areas.length > 0 ? user.areas.map((a) => a.name).join(', ') : '—'}
        />
        <InfoRow icon="person-outline" label={t('Sales Officer')} value={user.reportsTo?.name ?? '—'} last />
      </Card>

      <Card className="gap-3 p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-tint">
            <Ionicons name="language-outline" size={17} color={Colors.accentDark} />
          </View>
          <Text weight="semibold" className="flex-1 text-[15px]">
            {t('Language')}
          </Text>
        </View>
        <Segmented
          options={[
            { value: 'en', label: 'English' },
            { value: 'hi', label: 'हिंदी' },
          ]}
          value={lang}
          onChange={setLang}
        />
      </Card>

      <Card className="gap-3 p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-tint">
            <Ionicons name="contrast-outline" size={17} color={Colors.accentDark} />
          </View>
          <Text weight="semibold" className="flex-1 text-[15px]">
            {t('Theme')}
          </Text>
        </View>
        <Segmented
          options={[
            { value: 'light', label: `☀️ ${t('Light')}` },
            { value: 'dark', label: `🌙 ${t('Dark')}` },
            { value: 'system', label: t('System') },
          ]}
          value={preference}
          onChange={setPreference}
        />
        {preference === 'system' ? (
          <Text className="text-[12px] text-ink-3">{t("Follows your phone's light or dark setting.")}</Text>
        ) : null}
      </Card>

      <Card className="px-4">
        <LinkRow icon="key-outline" label={t('Change password')} onPress={() => router.push('/change-password')} />
        <LinkRow icon="navigate-outline" label={t('Location sharing')} onPress={() => router.push('/location-permission')} />
        <LinkRow
          icon="bug-outline"
          label={t('Report a Bug')}
          onPress={() => router.push({ pathname: '/report-bug', params: { from: 'account' } })}
          last
        />
      </Card>

      <Card className="px-4">
        <LinkRow icon="log-out-outline" label={t('Sign out')} onPress={confirmSignOut} danger last />
      </Card>

      <Text className="text-center text-[12px] text-ink-3">
        Deedar ISR · {t('version')} {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </ScrollView>
  );
}

type IconName = ComponentProps<typeof Ionicons>['name'];

function InfoRow({ icon, label, value, last }: { icon: IconName; label: string; value: string; last?: boolean }) {
  const Colors = useColors();
  return (
    <View className={`flex-row items-center gap-3 py-3.5 ${last ? '' : 'border-b border-line-soft'}`}>
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-tint">
        <Ionicons name={icon} size={17} color={Colors.accentDark} />
      </View>
      <Text className="text-[13.5px] text-ink-3">{label}</Text>
      <Text weight="semibold" className="flex-1 text-right text-[14px]">
        {value}
      </Text>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  danger,
  last,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const Colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={`flex-row items-center gap-3 py-3.5 active:opacity-70 ${last ? '' : 'border-b border-line-soft'}`}>
      <View className={`h-9 w-9 items-center justify-center rounded-xl ${danger ? 'bg-danger-tint' : 'bg-accent-tint'}`}>
        <Ionicons name={icon} size={17} color={danger ? Colors.danger : Colors.accentDark} />
      </View>
      <Text weight="semibold" className={`flex-1 text-[15px] ${danger ? 'text-danger' : 'text-ink-1'}`}>
        {label}
      </Text>
      {!danger && <Ionicons name="chevron-forward" size={18} color={Colors.ink3} />}
    </Pressable>
  );
}
