import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useColors } from '@/constants/theme';
import { Button } from './button';
import { ErrorBanner } from './error-banner';
import { useT } from '@/lib/i18n/language';
import { Text } from './text';

/** Full-screen spinner for a first load. */
export function LoadingScreen() {
  const Colors = useColors();
  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <ActivityIndicator color={Colors.brand} size="large" />
    </View>
  );
}

/** Full-screen error for a first load that failed. */
export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useT();
  return (
    <View className="flex-1 justify-center gap-4 bg-canvas p-6">
      <ErrorBanner message={message} />
      <Button title={t('Try again')} icon="refresh" variant="secondary" onPress={onRetry} />
    </View>
  );
}

/** A friendly "nothing here" block with an icon and optional action. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  const Colors = useColors();
  return (
    <View className="items-center gap-2 rounded-2xl border border-dashed border-line bg-surface px-6 py-8">
      <View className="mb-1 h-14 w-14 items-center justify-center rounded-full bg-accent-tint">
        <Ionicons name={icon} size={26} color={Colors.accentDark} />
      </View>
      <Text weight="bold" className="text-center text-[15px]">
        {title}
      </Text>
      {body ? <Text className="text-center text-[13.5px] leading-5 text-ink-2">{body}</Text> : null}
      {action ? <View className="mt-2 self-stretch">{action}</View> : null}
    </View>
  );
}

/** A section title with an optional right-hand element. */
export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text weight="extrabold" className="text-[17px]">
        {title}
      </Text>
      {right}
    </View>
  );
}

/** A centred message (e.g. a guard) with an optional action. */
export function MessageScreen({
  icon,
  title,
  body,
  action,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <View className="flex-1 justify-center bg-canvas p-6">
      <EmptyState icon={icon} title={title} body={body} action={action} />
    </View>
  );
}
