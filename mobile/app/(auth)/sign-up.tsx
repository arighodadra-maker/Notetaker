import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const handleSignUp = async () => {
    if (!email || !password || !confirm) return;
    if (password !== confirm) {
      Alert.alert("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password too short", "Use at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Sign up failed", e.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const s = styles(c);
  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.heading}>Create your account</Text>
        <Text style={s.sub}>Start turning lectures into structured notes</Text>

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
            returnKeyType="next"
          />
          <TextInput
            style={s.input}
            placeholder="Confirm password"
            placeholderTextColor={c.subtext}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleSignUp}
          />

          <TouchableOpacity
            style={[s.primaryBtn, loading && s.btnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={s.primaryBtnText}>{loading ? "Creating account…" : "Create Account"}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={{ color: c.subtext, fontSize: 14 }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (c: typeof Colors.light) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { flexGrow: 1, justifyContent: "center", padding: 24 },
    heading: { fontSize: 24, fontWeight: "700", color: c.text, marginBottom: 6 },
    sub: { fontSize: 14, color: c.subtext, marginBottom: 28 },
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
    primaryBtn: {
      backgroundColor: Colors.primary,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
      marginTop: 4,
    },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
    linkText: { fontSize: 14, color: Colors.primary, fontWeight: "600" },
  });
