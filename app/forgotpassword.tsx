// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\forgotpassword.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth"; // Keep needed auth imports
import { auth } from "./firebase"; // Import initialized auth

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Validation ---
  const validateEmail = (): boolean => {
    setError(null); // Clear previous messages
    setSuccessMessage(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return false;
    }
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return false;
    }
    return true;
  };

  // --- Handle Password Reset ---
  const handlePasswordReset = async () => {
    Keyboard.dismiss();
    if (!validateEmail()) {
      return; // Stop if validation fails
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    const trimmedEmail = email.trim();

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setSuccessMessage(
        `Password reset email sent to ${trimmedEmail}. Please check your inbox (and spam folder).`
      );
      setEmail(""); // Clear email field on success
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      let userFriendlyError =
        "Failed to send password reset email. Please try again.";
      // Handle specific Firebase errors
      if (error.code === "auth/user-not-found") {
        // Note: For security, you might not want to reveal if an email exists.
        // Consider showing a generic message like the success one even if the user isn't found.
        // However, for better UX during development/testing, specific errors are helpful.
        userFriendlyError =
          "No account found with this email address. Please check the email or sign up.";
      } else if (error.code === "auth/invalid-email") {
        userFriendlyError = "Please enter a valid email address.";
      }
      setError(userFriendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Navigate Back to Login ---
  const navigateToLogin = () => {
    // Check if we can go back in the navigation stack
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback if cannot go back (e.g., deep link)
      router.replace("/"); // Assuming '/' is your login screen route
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      {/* Set the header title for this screen */}
      <Stack.Screen options={{ title: "Reset Password" }} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled" // Allows taps on buttons while keyboard is up
        >
          <View style={styles.innerContainer}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address below and we'll send you a link to reset
              your password.
            </Text>

            {/* Display Error or Success Message */}
            {error && <Text style={styles.errorText}>{error}</Text>}
            {successMessage && (
              <Text style={styles.successText}>{successMessage}</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              keyboardType="email-address"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading} // Disable input while loading
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handlePasswordReset}
              disabled={isLoading} // Disable button while loading
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
              <Text style={styles.toggleText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

// --- Styles (You can adapt these to match your app's theme) ---
const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  innerContainer: {
    width: "90%",
    maxWidth: 400,
    alignSelf: "center",
    alignItems: "center",
    paddingVertical: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#B58900",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginBottom: 30,
    lineHeight: 22,
  },
  errorText: {
    color: "red",
    marginBottom: 15,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  successText: {
    color: "green",
    marginBottom: 15,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  input: {
    width: "100%",
    height: 50,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    borderColor: "#ccc",
    backgroundColor: "#fdfdfd",
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#B58900",
    paddingVertical: 15,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    shadowColor: "#B58900",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 15,
    minHeight: 50,
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#CFAA70",
    opacity: 0.7,
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  toggleText: {
    marginTop: 20,
    color: "#006400",
    fontSize: 15,
    fontWeight: "bold",
  },
});

export default ForgotPasswordScreen;
