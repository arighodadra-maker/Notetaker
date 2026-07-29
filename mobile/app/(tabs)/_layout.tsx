import { Tabs } from "expo-router";
import { useColorScheme, View, Text } from "react-native";
import { Colors } from "@/constants/colors";

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 10,
          color: focused ? Colors.primary : "#9CA3AF",
          fontWeight: focused ? "600" : "400",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBarBorder,
          height: 72,
          paddingBottom: 10,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "My Notes",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📓" label="Notes" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Learning Profile",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
