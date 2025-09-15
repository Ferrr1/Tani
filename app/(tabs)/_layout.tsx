import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  const colorScheme = useColorScheme();

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
