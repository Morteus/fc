// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\index.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useRouter, Stack } from "expo-router"; // Import Stack for header config
import {
  // getAuth, // No longer needed here
  signInWithEmailAndPassword, // Only need Sign In for this screen
} from "firebase/auth";

import { auth } from "./firebase"; // <-- Import initialized auth instance

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // State for inline errors

  // --- Email/Password Login Handler ---
  const handleLogin = () => {
    Keyboard.dismiss();
    setError(null); // Clear previous errors

    // --- Input Validations ---
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    // --- End Validations ---

    setIsLoading(true);

    signInWithEmailAndPassword(auth, trimmedEmail, password)
      .then((userCredential) => {
        console.log("Successfully Logged in!", userCredential.user.email);
        // Alert.alert("Login Successful", "Welcome back!"); // Optional: Show alert
        router.replace("/record"); // Navigate on success
      })
      .catch((error) => {
        console.error("Login Error:", error.code, error.message);
        let errorMessage = "An unexpected error occurred during login.";
        switch (error.code) {
          case "auth/user-not-found":
          case "auth/wrong-password":
          case "auth/invalid-credential":
            errorMessage = "Invalid email or password.";
            break;
          case "auth/invalid-email":
            errorMessage = "Please enter a valid email address.";
            break;
          case "auth/user-disabled":
            errorMessage = "This user account has been disabled.";
            break;
          case "auth/too-many-requests":
            errorMessage =
              "Access temporarily disabled due to too many failed login attempts. Please reset your password or try again later.";
            break;
          default:
            errorMessage = `Login failed: ${error.message}`;
        }
        setError(errorMessage); // Show error inline
        // Alert.alert("Login Failed", errorMessage); // Optionally keep alert
      })
      .finally(() => setIsLoading(false));
  };

  // --- Render UI ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      {/* Hide the header for the login screen */}
      <Stack.Screen options={{ headerShown: false }} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerContainer}>
            {/* Title and Subtitle */}
            <Text style={styles.title}>Login here</Text>
            <Text style={styles.subtitle}>
              Welcome back, you've been missed!
            </Text>

            {/* Display Error Message */}
            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* --- Email/Password Inputs --- */}
            <TextInput
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address" // Keep keyboardType
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              placeholderTextColor="#777" // Darken placeholder slightly
              value={password}
              onChangeText={setPassword}
              autoComplete="password"
              editable={!isLoading}
            />

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordContainer} // Added container for better touch area
              onPress={() => router.push("/forgotpassword")} // Use correct route name
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>
                Forgot your password?
              </Text>
            </TouchableOpacity>

            {/* --- Sign In Button --- */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* --- Navigate to Sign Up Link --- */}
            <TouchableOpacity
              onPress={() => router.push("/signup")}
              disabled={isLoading}
              style={styles.signUpLink} // Added style for spacing
            >
              <Text style={styles.toggleText}>Create new account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

// --- Styles (Adapted and cleaned up) ---
const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  innerContainer: {
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    paddingVertical: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#B58900",
    marginBottom: 8,
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
  input: {
    width: "100%",
    height: 50,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    borderColor: "#aaa", // Darken border slightly
    backgroundColor: "#fdfdfd",
    fontSize: 16,
    color: "#333",
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end", // Position to the right
    marginBottom: 20,
    paddingVertical: 5, // Increase touch area vertically
  },
  forgotPasswordText: {
    color: "#006400",
    fontSize: 14,
    fontWeight: "500",
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
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  orContinueText: {
    marginTop: 20, // Adjusted margin
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  googleButton: {
    flexDirection: "row", // Align icon and text horizontally
    backgroundColor: "#4285F4", // Google blue
    paddingVertical: 12, // Slightly less padding than main button
    paddingHorizontal: 20,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    justifyContent: "center", // Center content
    shadowColor: "#4285F4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    marginTop: 0, // Removed margin top
    minHeight: 50,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  signUpLink: {
    marginTop: 25, // Added margin top for spacing
  },
  toggleText: {
    color: "#006400",
    fontSize: 15,
    fontWeight: "bold",
  },
});

export default LoginScreen;
