import '../global.css';

import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
  NotoSansDevanagari_800ExtraBold,
} from '@expo-google-fonts/noto-sans-devanagari';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';

import { Fonts, HindiFonts, useColors, useIsDark } from '@/constants/theme';
import { useTrackingLifecycle } from '@/hooks/use-tracking';
import { SessionProvider, useSession } from '@/lib/auth/session';
import { LanguageProvider, useLanguage } from '@/lib/i18n/language';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/theme/preference';

// Keep the splash up until the fonts, saved settings and session are ready,
// so the ISR never sees unstyled text, the wrong theme, or the sign-in screen
// flash past.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold,
    NotoSansDevanagari_700Bold,
    NotoSansDevanagari_800ExtraBold,
  });

  return (
    <ThemePreferenceProvider>
      <LanguageProvider>
        <SessionProvider>
          <NavigationTheme>
            <SplashScreenController fontsLoaded={fontsLoaded} />
            {fontsLoaded && <RootNavigator />}
          </NavigationTheme>
        </SessionProvider>
      </LanguageProvider>
    </ThemePreferenceProvider>
  );
}

/** React Navigation's colours (screen backgrounds, headers) for the theme. */
function NavigationTheme({ children }: { children: ReactNode }) {
  const Colors = useColors();
  const base = useIsDark() ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: Colors.brand,
      background: Colors.canvas,
      card: Colors.canvas,
      text: Colors.ink1,
      border: Colors.line,
    },
  };
  return <ThemeProvider value={theme}>{children}</ThemeProvider>;
}

function SplashScreenController({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { session } = useSession();
  const { ready: langReady } = useLanguage();
  const { ready: themeReady } = useThemePreference();
  const loading = !fontsLoaded || !langReady || !themeReady || session.status === 'loading';

  useEffect(() => {
    if (!loading) SplashScreen.hide();
  }, [loading]);

  return null;
}

/** Mounted only while signed in: keeps live location in step with the day. */
function TrackingLifecycle() {
  useTrackingLifecycle();
  return null;
}

function RootNavigator() {
  const Colors = useColors();
  const dark = useIsDark();
  const { session } = useSession();
  const { t, lang } = useLanguage();
  const signedIn = session.status === 'signedIn';
  const mustChangePassword = signedIn && session.user.mustChangePassword;

  return (
    <>
      <StatusBar style={signedIn && !dark ? 'dark' : 'light'} />
      {signedIn && !mustChangePassword && <TrackingLifecycle />}
      <Stack
        screenOptions={{
          headerTintColor: Colors.ink1,
          headerTitleStyle: { fontFamily: (lang === 'hi' ? HindiFonts : Fonts).bold, fontSize: 17 },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Colors.canvas },
          contentStyle: { backgroundColor: Colors.canvas },
          headerBackButtonDisplayMode: 'minimal',
        }}>
        {/* A new ISR must set a password before anything else opens. */}
        <Stack.Protected guard={signedIn && !mustChangePassword}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="new-counter" options={{ title: t('Add New Counter') }} />
          <Stack.Screen name="counter/[id]/index" options={{ title: t('Counter') }} />
          <Stack.Screen name="counter/[id]/visit" options={{ title: t('Add visit') }} />
          <Stack.Screen name="visit/[visitId]" options={{ title: t('Edit visit') }} />
          <Stack.Screen name="account" options={{ title: t('My account') }} />
          <Stack.Screen name="report-bug" options={{ title: t('Report a Bug'), presentation: 'modal' }} />
          <Stack.Screen
            name="location-permission"
            options={{ title: t('Location sharing'), presentation: 'modal' }}
          />
        </Stack.Protected>

        <Stack.Protected guard={signedIn}>
          <Stack.Screen
            name="change-password"
            options={{ title: mustChangePassword ? t('Set your password') : t('Change password') }}
          />
        </Stack.Protected>

        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
