import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View, type TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { LanguageToggle } from '@/components/language-toggle';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/auth/session';
import { useT } from '@/lib/i18n/language';

export default function SignIn() {
  const { signIn } = useSession();
  const t = useT();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  async function handleSubmit() {
    if (submitting) return;
    if (!phone.trim() || !password) {
      setError('Enter your phone number and password.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await signIn(phone, password);
      // Success: the navigator swaps this screen out — leave the button busy
      // so a second tap can't fire another sign-in in the meantime.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
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
            <View className="items-center gap-1">
              <Text weight="extrabold" className="text-[32px] text-white">
                D-Drive
              </Text>
              <Text weight="semibold" className="text-[14px] text-white/70">
                {t('Sales & Delivery · ISR')}
              </Text>
            </View>
          </View>

          <View className="gap-4 rounded-3xl bg-surface p-6 shadow-xl shadow-black/30">
            <Text weight="extrabold" className="text-[24px]">
              {t('Welcome back')}
            </Text>

            <TextField
              label={t('Phone number')}
              icon="call-outline"
              value={phone}
              onChangeText={setPhone}
              placeholder={t('10-digit mobile number')}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={10}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              submitBehavior="submit"
              editable={!submitting}
            />

            <TextField
              ref={passwordRef}
              label={t('Password')}
              icon="lock-closed-outline"
              password
              value={password}
              onChangeText={setPassword}
              placeholder={t('Your password')}
              autoComplete="current-password"
              textContentType="password"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              editable={!submitting}
            />

            {error ? <ErrorBanner message={error} /> : null}

            <Button title={t('Sign in')} icon="arrow-forward" onPress={handleSubmit} loading={submitting} className="mt-1" />

            <Pressable
              onPress={() => router.push('/forgot-password')}
              disabled={submitting}
              accessibilityRole="link"
              hitSlop={10}
              className="self-center py-1 active:opacity-60">
              <Text weight="bold" className="text-[13.5px] text-brand">
                {t('Forgot password?')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
