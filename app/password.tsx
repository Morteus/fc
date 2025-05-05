// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\password.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Import SafeAreaView
import { Ionicons } from "@expo/vector-icons";
import {
  signOut,
  onAuthStateChanged,
  User,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useRouter, Stack } from "expo-router";
import { auth } from "./firebase";

const ChangePasswordScreen = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingUser(false);
      if (!user) router.replace("/");
    });
    return () => unsubscribe();
  }, [router]);

  const handleChangePassword = async () => {
    Keyboard.dismiss();
    setPasswordError(null);
    if (!currentUser || !currentUser.email) {
      setPasswordError("Could not verify user information.");
      return;
    }
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    setIsUpdatingPassword(true);

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      Alert.alert("Success", "Password updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      console.error("Password Change Error:", error);
      let userFriendlyError = "Failed to update password. Please try again.";
      if (error.code === "auth/wrong-password")
        userFriendlyError = "Incorrect current password.";
      else if (error.code === "auth/weak-password")
        userFriendlyError = "New password is too weak.";
      else if (error.code === "auth/requires-recent-login")
        userFriendlyError =
          "For security, please log out and log back in before changing your password.";
      setPasswordError(userFriendlyError);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (isLoadingUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006400" />
      </View>
    );
  }

  return (
    // Use SafeAreaView as the top-level container
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container} // Keep container style for KAV
      >
        <Stack.Screen options={{ title: "Change Password" }} />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.innerContainer}>
              <Text style={styles.subtitle}>
                Enter your current password and set a new one.
              </Text>
              {passwordError && (
                <Text style={styles.errorText}>{passwordError}</Text>
              )}

              <Text style={styles.label}>Current Password:</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
                placeholderTextColor="#999"
                editable={!isUpdatingPassword}
              />
              <Text style={styles.label}>New Password:</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password (min. 6 characters)"
                placeholderTextColor="#999"
                editable={!isUpdatingPassword}
              />
              <Text style={styles.label}>Confirm New Password:</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="Confirm your new password"
                placeholderTextColor="#999"
                editable={!isUpdatingPassword}
              />

              <TouchableOpacity
                style={[
                  styles.button,
                  isUpdatingPassword && styles.buttonDisabled,
                ]}
                onPress={handleChangePassword}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f4f4" }, // Apply background to SafeAreaView
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 }, // KAV container, no background needed here
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },
  innerContainer: {
    backgroundColor: "white",
    padding: 25,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginBottom: 25,
  },
  label: { fontSize: 16, color: "#333", marginBottom: 8, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginBottom: 15,
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#DAA520",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    minHeight: 50,
    justifyContent: "center",
  },
  buttonDisabled: { backgroundColor: "#e9d8a1", opacity: 0.7 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});

export default ChangePasswordScreen;
