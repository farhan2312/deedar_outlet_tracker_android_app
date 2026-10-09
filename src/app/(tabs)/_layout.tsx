import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderActions } from '@/components/report-bug-button';
import { Fonts, HindiFonts, useColors } from '@/constants/theme';
import { useLanguage } from '@/lib/i18n/language';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName; headerShown?: boolean }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconActive: 'home', headerShown: false },
  { name: 'beat', title: 'Beat', icon: 'flag-outline', iconActive: 'flag' },
  { name: 'map', title: 'Map', icon: 'map-outline', iconActive: 'map' },
  { name: 'counters', title: 'Counters', icon: 'storefront-outline', iconActive: 'storefront' },
  { name: 'day-log', title: 'Day Log', icon: 'calendar-outline', iconActive: 'calendar' },
];

const HEADER_TITLES: Record<string, string> = {
  beat: "Today's Beat",
  map: 'Live map',
  counters: 'All Counters',
  'day-log': 'Day Log',
};

/** The ISR's five main sections, in the order of a working day. */
export default function TabsLayout() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();
  const F = lang === 'hi' ? HindiFonts : Fonts;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.brand,
        tabBarInactiveTintColor: Colors.ink3,
        tabBarLabelStyle: { fontFamily: F.semibold, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.lineSoft,
          height: 72 + Math.max(insets.bottom, 8),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        headerStyle: { backgroundColor: Colors.canvas },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: F.extrabold, fontSize: 20, color: Colors.ink1 },
        headerTitleAlign: 'left',
        sceneStyle: { backgroundColor: Colors.canvas },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.title),
            headerTitle: t(HEADER_TITLES[tab.name] ?? tab.title),
            headerShown: tab.headerShown ?? true,
            headerRight: () => <HeaderActions from={tab.name} />,
            tabBarIcon: ({ focused, color }) => (
              <View
                className={`h-8 w-14 items-center justify-center rounded-full ${focused ? 'bg-accent-tint' : ''}`}>
                <Ionicons name={focused ? tab.iconActive : tab.icon} size={21} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
