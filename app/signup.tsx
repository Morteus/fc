// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\signup.tsx
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
import { SafeAreaView } from "react-native-safe-area-context"; // Import SafeAreaView
import { useRouter, Stack } from "expo-router";
import { createUserWithEmailAndPassword, User } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

const SignUpScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateInputs = (): boolean => {
    const trimmedEmail = email.trim();
    setError(null);
    if (!trimmedEmail || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (password.length < 6) {
      setError("Password should be at least 6 characters long.");
      return false;
    }
    return true;
  };

  const getFirebaseAuthErrorMessage = (
    errorCode: string,
    defaultMessage: string
  ): string => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email address is already registered. Please log in.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password is too weak. It should be at least 6 characters long.";
      default:
        return defaultMessage || "An unexpected error occurred during sign up.";
    }
  };

  const createUserDocument = async (user: User) => {
    if (!user) return;
    const userAccountDocRef = doc(db, "Accounts", user.uid);
    const userInfoDocRef = doc(userAccountDocRef, "Information", "profile");
    try {
      await setDoc(userInfoDocRef, {
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp(),
        displayName:
          user.displayName || user.email?.split("@")[0] || "New User",
      });
      await setDoc(
        userAccountDocRef,
        { lastUpdated: serverTimestamp() },
        { merge: true }
      );
      console.log("Firestore user structure created for:", user.uid);
    } catch (firestoreError) {
      console.error("Error creating Firestore user structure:", firestoreError);
    }
  };

  const handleSignUp = async () => {
    setError(null);
    Keyboard.dismiss();
    if (!validateInputs()) return;
    setIsLoading(true);
    const trimmedEmail = email.trim();

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );
      console.log("Sign Up Successful!", userCredential.user.email);
      await createUserDocument(userCredential.user);
      Alert.alert(
        "Sign Up Successful",
        `Account created for ${trimmedEmail}. You can now log in.`
      );
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (error: any) {
      console.error("Sign Up Error:", error.code, error.message);
      setError(getFirebaseAuthErrorMessage(error.code, error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    // Use SafeAreaView as the top-level container
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
      >
        <Stack.Screen
          options={{ title: "Create Account", headerBackTitle: "Login" }}
        />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.innerContainer}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Manage your money smarter and celebrate every win.
              </Text>

              {error && <Text style={styles.errorText}>{error}</Text>}

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
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                autoComplete="new-password"
                editable={!isLoading}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                secureTextEntry
                placeholderTextColor="#888"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isLoading}
              />

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
                <Text style={styles.toggleText}>
                  Already have an account? Log in
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" }, // Apply background to SafeAreaView
  keyboardAvoidingContainer: { flex: 1 }, // Removed background color
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
    marginTop: 10,
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

export default SignUpScreen;
