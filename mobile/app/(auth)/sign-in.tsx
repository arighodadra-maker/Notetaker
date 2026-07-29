import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, useColorScheme,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Sign in failed", e.message ?? "Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Enter your email first", "Type your email address above, then tap Forgot Password.");
      return;
    }
    try {
      await resetPassword(email.trim());
      Alert.alert("Email sent", "Check your inbox for a password reset link.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const s = styles(c);
  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <Text style={s.logo}>📚</Text>
          <Text style={s.title}>ClassCapsule</Text>
          <Text style={s.subtitle}>Your AI study companion</Text>
        </View>

        <View style={s.card}>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={c.subtext}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={c.subtext}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleSignIn}
          />

          <TouchableOpacity style={s.forgotBtn} onPress={handleForgotPassword}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.primaryBtn, loading && s.btnDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={s.primaryBtnText}>{loading ? "Signing in…" : "Sign In"}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={[s.footerText, { color: c.subtext }]}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text style={s.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (c: typeof Colors.light) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { flexGrow: 1, justifyContent: "center", padding: 24 },
    hero: { alignItems: "center", marginBottom: 32 },
    logo: { fontSize: 56, marginBottom: 8 },
    title: { fontSize: 28, fontWeight: "700", color: c.text },
    subtitle: { fontSize: 15, color: c.subtext, marginTop: 4 },
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: c.border,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
      fontSize: 15,
      color: c.text,
      backgroundColor: c.background,
    },
    forgotBtn: { alignSelf: "flex-end", marginBottom: 16 },
    forgotText: { fontSize: 13, color: Colors.primary },
    primaryBtn: {
      backgroundColor: Colors.primary,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
    },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
    footerText: { fontSize: 14 },
    linkText: { fontSize: 14, color: Colors.primary, fontWeight: "600" },
  });
