import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router"; // Import Stack for header config
import { StatusBar } from "expo-status-bar";
import {
  // getAuth, // No longer needed here
  signInWithEmailAndPassword, // Only need Sign In for this screen
} from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { auth } from "./firebase"; // <-- Import initialized auth instance

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // State for inline errors
  const [showPassword, setShowPassword] = useState(false);

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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // --- Render UI ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <StatusBar style="dark" />
      {/* Hide the header for the login screen */}
      <Stack.Screen options={{ headerShown: false }} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerContainer}>
            {/* Logo Placeholder */}
            <View style={styles.logoContainer}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>FC</Text>
              </View>
            </View>

            {/* Title and Subtitle */}
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your financial journey
            </Text>

            {/* Display Error Message */}
            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Form Container */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={styles.iconContainer}>
                  <Ionicons name="mail-outline" size={20} color="#555" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  keyboardType="email-address"
                  placeholderTextColor="#888"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.iconContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#555" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#777"
                  value={password}
                  onChangeText={setPassword}
                  autoComplete="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={togglePasswordVisibility}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#555"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.forgotPasswordContainer}
                onPress={() => router.push("/forgotpassword")}
                disabled={isLoading}
              >
                <Text style={styles.forgotPasswordText}>
                  Forgot your password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* --- Sign In Button --- */}
            <TouchableOpacity
              activeOpacity={0.8}
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
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don&apos;t have an account?</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/signup")}
                disabled={isLoading}
              >
                <Text style={styles.signUpLink}> Create one</Text>
              </TouchableOpacity>
            </View>
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
    paddingVertical: 40,
  },
  innerContainer: {
    width: "88%",
    maxWidth: 400,
    alignItems: "center",
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: "center",
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#B58900",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  errorText: {
    color: "#E53935",
    marginBottom: 20,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
    paddingHorizontal: 10,
  },
  formContainer: {
    width: "100%",
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 56,
    borderWidth: 1.2,
    borderRadius: 12,
    marginBottom: 16,
    borderColor: "#E0E0E0",
    backgroundColor: "#F9F9F9",
  },
  iconContainer: {
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#333",
    paddingRight: 12,
  },
  eyeIcon: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginTop: 4,
    paddingVertical: 5,
  },
  forgotPasswordText: {
    color: "#006400",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#B58900",
    paddingVertical: 16,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#B58900",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
    marginTop: 10,
    marginBottom: 20,
    minHeight: 56,
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
  signUpContainer: {
    flexDirection: "row",
    marginTop: 16,
    alignItems: "center",
  },
  signUpText: {
    fontSize: 15,
    color: "#666",
  },
  signUpLink: {
    color: "#006400",
    fontSize: 15,
    fontWeight: "bold",
  },
});

export default LoginScreen;
