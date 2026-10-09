import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { LanguageToggle } from '@/components/language-toggle';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useColors } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n/language';

/**
 * Forgot password — the website's flow: it sends a reset request to the admin,
 * who resets the password and tells the ISR the new one. Nothing is changed
 * from here, by design (the admin recognising the person is the check).
 */
export default function ForgotPasswordScreen() {
  const Colors = useColors();
  const t = useT();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (submitting) return;
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api('/api/mobile/forgot-password', { method: 'POST', body: { phone } });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 overflow-hidden bg-brand">
      <View className="absolute -right-24 -top-16 h-80 w-80 rounded-full bg-white/5" />
      <View className="absolute -left-20 top-64 h-56 w-56 rounded-full bg-accent/10" />
      <View className="absolute right-5 top-3 z-10">
        <LanguageToggle onDark />
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center gap-8 p-5" keyboardShouldPersistTaps="handled">
          <View className="items-center gap-3">
            <BrandMark size="lg" />
            <Text weight="extrabold" className="text-[32px] text-white">
              D-Drive
            </Text>
          </View>

          <View className="gap-4 rounded-3xl bg-surface p-6 shadow-xl shadow-black/30">
            {sent ? (
              <>
                <View className="h-14 w-14 items-center justify-center self-center rounded-full bg-success-tint">
                  <Ionicons name="checkmark" size={28} color={Colors.success} />
                </View>
                <View className="items-center gap-1.5">
                  <Text weight="extrabold" className="text-center text-[22px]">
                    {t('Request sent')}
                  </Text>
                  <Text className="text-center text-[14px] leading-5 text-ink-2">
                    {t("Your admin will reset your password and tell you the new one. Please contact your admin if it's urgent.")}
                  </Text>
                </View>
                <Button title={t('Back to sign in')} icon="arrow-back" onPress={() => router.back()} />
              </>
            ) : (
              <>
                <View className="gap-1">
                  <Text weight="extrabold" className="text-[24px]">
                    {t('Forgot password')}
                  </Text>
                  <Text className="text-[14px] leading-5 text-ink-2">
                    {t('Enter your mobile number and your admin will reset your password.')}
                  </Text>
                </View>

                <TextField
                  label={t('Phone number')}
                  icon="call-outline"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t.replace(/\D/g, '').slice(0, 10));
                    setError('');
                  }}
                  placeholder={t('10-digit mobile number')}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  maxLength={10}
                  returnKeyType="send"
                  onSubmitEditing={submit}
                  editable={!submitting}
                />

                {error ? <ErrorBanner message={error} /> : null}

                <Button title={t('Request password reset')} icon="send" onPress={submit} loading={submitting} />
                <Button title={t('Back to sign in')} variant="ghost" onPress={() => router.back()} disabled={submitting} />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
