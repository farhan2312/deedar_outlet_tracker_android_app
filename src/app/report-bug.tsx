import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useColors } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/auth/session';
import { useT } from '@/lib/i18n/language';
import { pickScreenshot, type Screenshot } from '@/lib/screenshot';

type BugType = 'bug' | 'feature';
type Severity = 'low' | 'medium' | 'high' | 'critical';

/** Every string that flips with the Bug/Feature toggle — the website's COPY. */
const COPY = {
  bug: {
    heading: 'Report a Bug',
    blurb: "Tell us what went wrong — it goes straight to the admin's Bug Tracker.",
    thanks: "Your report went straight to the admin's Bug Tracker.",
    titlePlaceholder: 'Short summary of the issue',
    detailLabel: 'What happened?',
    detailPlaceholder: 'Steps to reproduce, what you expected, what actually happened…',
    rankLabel: 'Severity',
    submit: 'Submit Bug',
  },
  feature: {
    heading: 'Report a Feature',
    blurb: "Tell us what you'd like — it goes straight to the admin's Bug Tracker.",
    thanks: "Your request went straight to the admin's Bug Tracker.",
    titlePlaceholder: 'Short summary of the idea',
    detailLabel: 'What would you like?',
    detailPlaceholder: 'What should it do, who needs it, and what it would save you…',
    rankLabel: 'Priority',
    submit: 'Submit Feature',
  },
} as const;

/** Screen names for the report's "page", so the admin knows where it was. */
const SCREENS: Record<string, string> = {
  index: 'Home',
  beat: "Today's Beat",
  map: 'Live map',
  counters: 'All Counters',
  'day-log': 'Day Log',
  account: 'My account',
};

/** Report a bug or ask for a feature — the website's `ReportBugDialog`,
 * filed with the same `submitBugReport`. */
export default function ReportBugScreen() {
  const Colors = useColors();
  const t = useT();
  const { authedApi } = useSession();
  const { from } = useLocalSearchParams<{ from?: string }>();

  const [type, setType] = useState<BugType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null);
  const [picking, setPicking] = useState(false);

  const copy = COPY[type];
  const screen = (from && SCREENS[from]) || from || 'App';

  async function attach(source: 'library' | 'camera') {
    if (picking || busy) return;
    setPicking(true);
    setError('');
    const result = await pickScreenshot(source);
    setPicking(false);
    if (result.ok) setScreenshot(result.screenshot);
    else if (result.reason === 'too_large') setError('That image is too large — keep it under about 1 MB.');
    else if (result.reason === 'denied') setError('Camera permission denied — allow it in Settings and try again.');
    else if (result.reason === 'failed') setError("Couldn't attach that image. Try another one.");
  }

  async function submit() {
    if (busy || picking) return;
    if (!title.trim()) {
      setError('Give it a short title.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await authedApi('/api/mobile/bugs', {
        method: 'POST',
        body: { type, title, description, severity, page: screen, screenshot: screenshot?.dataUrl ?? null },
        // A screenshot is up to ~1 MB — give a slow connection time to send it.
        timeoutMs: screenshot ? 90_000 : undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View className="flex-1 justify-center gap-5 bg-canvas p-6">
        <View className="items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-success-tint">
            <Ionicons name="checkmark" size={32} color={Colors.success} />
          </View>
          <Text weight="extrabold" className="text-[22px]">
            {t('Thanks!')}
          </Text>
          <Text className="text-center text-[14.5px] leading-[22px] text-ink-2">{t(copy.thanks)}</Text>
        </View>
        <Button title={t('Done')} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
      <View className="flex-row items-center gap-3">
        <View className={`h-12 w-12 items-center justify-center rounded-2xl ${type === 'bug' ? 'bg-danger-tint' : 'bg-warning-tint'}`}>
          <Ionicons
            name={type === 'bug' ? 'bug' : 'bulb'}
            size={24}
            color={type === 'bug' ? Colors.danger : Colors.warning}
          />
        </View>
        <View className="flex-1 gap-0.5">
          <Text weight="extrabold" className="text-[19px]">
            {t(copy.heading)}
          </Text>
          <Text className="text-[13px] leading-[18px] text-ink-2">{t(copy.blurb)}</Text>
        </View>
      </View>

      <Card className="gap-4 p-4">
        <View className="gap-2">
          <Text weight="semibold" className="text-[13.5px]">
            {t('Type')}
          </Text>
          <Segmented
            options={[
              { value: 'bug', label: `🐞 ${t('Bug')}` },
              { value: 'feature', label: `💡 ${t('Feature')}` },
            ]}
            value={type}
            onChange={setType}
          />
        </View>

        <TextField
          label={`${t('Title')} *`}
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setError('');
          }}
          placeholder={t(copy.titlePlaceholder)}
          maxLength={200}
        />

        <TextField
          label={t(copy.detailLabel)}
          value={description}
          onChangeText={setDescription}
          placeholder={t(copy.detailPlaceholder)}
          multiline
        />

        <View className="gap-2">
          <Text weight="semibold" className="text-[13.5px]">
            {t(copy.rankLabel)}
          </Text>
          <Segmented
            options={[
              { value: 'low', label: t('Low') },
              { value: 'medium', label: t('Medium') },
              { value: 'high', label: t('High') },
              { value: 'critical', label: t('Critical') },
            ]}
            value={severity}
            onChange={setSeverity}
          />
        </View>

        <View className="gap-2">
          <Text weight="semibold" className="text-[13.5px]">
            {t('Screenshot (optional)')}
          </Text>
          {screenshot ? (
            <View className="flex-row items-center gap-3 rounded-2xl border border-line bg-canvas p-2.5">
              <Image
                source={{ uri: screenshot.uri }}
                style={{ width: 56, height: 56 * Math.min(2.2, screenshot.height / Math.max(1, screenshot.width)), borderRadius: 10 }}
                contentFit="cover"
                accessibilityLabel={t('Screenshot attached')}
              />
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text weight="bold" className="text-[13.5px] text-success">
                    {t('Screenshot attached')}
                  </Text>
                </View>
                <Text className="text-[12px] text-ink-3">
                  {Math.round((screenshot.dataUrl.length * 0.75) / 1024)} KB
                </Text>
              </View>
              <Pressable
                onPress={() => setScreenshot(null)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('Remove')}
                hitSlop={8}
                className="h-9 flex-row items-center gap-1 rounded-xl border border-line bg-surface px-3 active:opacity-70">
                <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                <Text weight="semibold" className="text-[12.5px] text-danger">
                  {t('Remove')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-row gap-2">
              <AttachButton icon="images-outline" label={t('Gallery')} onPress={() => attach('library')} disabled={picking || busy} />
              <AttachButton icon="camera-outline" label={t('Camera')} onPress={() => attach('camera')} disabled={picking || busy} />
            </View>
          )}
          {picking ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color={Colors.brand} />
              <Text className="text-[12.5px] text-ink-3">{t('Preparing image…')}</Text>
            </View>
          ) : !screenshot ? (
            <Text className="text-[12px] leading-[17px] text-ink-3">
              {t('Tip: press Power + Volume down to take a screenshot of the problem, then attach it from the Gallery.')}
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center gap-2 rounded-xl bg-canvas px-3 py-2.5">
          <Ionicons name="phone-portrait-outline" size={15} color={Colors.ink3} />
          <Text className="flex-1 text-[12.5px] text-ink-2">
            {t('Page / where')}: <Text weight="semibold">{t(screen)}</Text>
          </Text>
        </View>
      </Card>

      {error ? <ErrorBanner message={error} /> : null}

      <View className="flex-row gap-3">
        <Button title={t('Cancel')} variant="secondary" onPress={() => router.back()} disabled={busy} className="flex-1" />
        <Button title={t(copy.submit)} icon="send" onPress={submit} loading={busy} disabled={picking} className="flex-1" />
      </View>
    </ScrollView>
  );
}

function AttachButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'images-outline' | 'camera-outline';
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const Colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={`min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-canvas active:opacity-70 ${
        disabled ? 'opacity-50' : ''
      }`}>
      <Ionicons name={icon} size={19} color={Colors.brand} />
      <Text weight="bold" className="text-[13.5px] text-brand">
        {label}
      </Text>
    </Pressable>
  );
}
