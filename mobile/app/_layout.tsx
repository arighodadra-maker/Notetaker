import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useRouter, useSegments } from "expo-router";
import { useColorScheme, View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/colors";

function RootGuard() {
  const { user, authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/sign-in");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [user, authLoading, segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <AuthProvider>
      <RootGuard />
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.card },
          headerTintColor: c.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="session/[id]"
          options={{ title: "Notes", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="session/new"
          options={{ title: "New Session", presentation: "modal" }}
        />
      </Stack>
    </AuthProvider>
  );
}
