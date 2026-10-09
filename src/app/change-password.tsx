import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, View, type TextInput } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useColors } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/auth/session';
import { useT } from '@/lib/i18n/language';

/**
 * Change password. Also the only screen a new ISR can reach until they set one:
 * accounts start with the mobile number as the password (same rule as the web
 * portal's change-password page).
 */
export default function ChangePassword() {
  const Colors = useColors();
  const { session, changePassword, signOut } = useSession();
  const t = useT();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  if (session.status !== 'signedIn') return null;
  const { user } = session;
  const forced = user.mustChangePassword;

  async function handleSubmit() {
    if (submitting) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Fill in all three password fields.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
      <Text className="text-[13.5px] text-ink-2">
        {t('Signed in as')} <Text weight="bold">{user.name}</Text> · {user.phone}
      </Text>

      {forced && (
        <View className="flex-row gap-3 rounded-2xl bg-accent-tint p-4">
          <Ionicons name="shield-checkmark" size={22} color={Colors.brand} />
          <Text className="flex-1 text-[13.5px] leading-5">
            {t('Your account was set up with your mobile number as a temporary password. Choose a new one to continue — your current password is your mobile number.')}
          </Text>
        </View>
      )}

      <Card className="gap-4 p-4">
        <TextField
          label={t('Current password')}
          icon="lock-closed-outline"
          password
          value={currentPassword}
          onChangeText={setCurrentPassword}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => newRef.current?.focus()}
          submitBehavior="submit"
          editable={!submitting}
        />
        <TextField
          ref={newRef}
          label={t('New password')}
          icon="key-outline"
          password
          value={newPassword}
          onChangeText={setNewPassword}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          submitBehavior="submit"
          editable={!submitting}
        />
        <TextField
          ref={confirmRef}
          label={t('Confirm new password')}
          icon="key-outline"
          password
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          editable={!submitting}
        />
      </Card>

      {error ? <ErrorBanner message={error} /> : null}

      <Button title={forced ? t('Set password') : t('Change password')} onPress={handleSubmit} loading={submitting} />
      {forced && <Button title={t('Sign out')} variant="secondary" onPress={signOut} disabled={submitting} />}
    </ScrollView>
  );
}
