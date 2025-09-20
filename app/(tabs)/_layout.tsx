import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, useRootNavigationState } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const navReady = !!useRootNavigationState()?.key;
  const { authReady, session, profileReady, role } = useAuth();
  const deciding = !navReady || !authReady || (session && !profileReady);
  if (deciding) return null;
  if (!session) return <Redirect href="/(auth)" />;
  if (role === "admin") return <Redirect href="/(admin)" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: 'Penerimaan',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="arrow-down-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="expense"
        options={{
          title: 'Pengeluaran',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="arrow-up-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chart"
        options={{
          title: 'Grafik',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="stats-chart-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="document-text-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
