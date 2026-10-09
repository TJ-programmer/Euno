
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { saveUsername } from "@/lib/profile";
import { useColorScheme } from "react-native";

export default function UsernameScreen() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];

  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    const value = username.trim();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
      Alert.alert(
        "Choose a username",
        "Use 3–20 letters, numbers, or underscores."
      );
      return;
    }

    try {
      setSaving(true);
      await saveUsername(value);

      // Replace this route so Back doesn't return to setup.
      router.replace("/");
    } catch (error: any) {
      const message = error?.code === "23505"
        ? "That username is already taken. Try another."
        : error?.message ?? "Could not save your username.";

      Alert.alert("Unable to continue", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Text style={[styles.brand, { color: theme.text }]}>
          euno
        </Text>

        <Text style={[styles.title, { color: theme.text }]}>
          What should we call you?
        </Text>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Choose a username for your place in Euno.
        </Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="your_username"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          editable={!saving}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.onboardingBorder,
            },
          ]}
        />

        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          3–20 characters · Letters, numbers, and underscores
        </Text>

        <Pressable
          onPress={handleContinue}
          disabled={saving}
          style={[
            styles.button,
            { backgroundColor: theme.onboardingAccent },
            saving && styles.disabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.background }]}>
              Continue
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    gap: 16,
  },
  brand: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    marginTop: 12,
  },
  hint: {
    fontSize: 12,
  },
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.6,
  },
});
