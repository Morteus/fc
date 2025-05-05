// c:\Users\scubo\OneDrive\Documents\FC_proj\FinClassify\FinClassifyApp\app\signup.tsx
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
import { getAuth, createUserWithEmailAndPassword, User } from "firebase/auth"; // Import User type
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore"; // Firestore imports
import { app } from "./firebase"; // Import your Firebase app instance

// Initialize Firebase Auth & Firestore
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore here

const SignUpScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // State for inline errors

  // --- Validation Function ---
  const validateInputs = (): boolean => {
    const trimmedEmail = email.trim();
    setError(null); // Clear previous errors

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

  // --- Get User-Friendly Error Message ---
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

  // --- Function to create user document structure in Firestore ---
  const createUserDocument = async (user: User) => {
    if (!user) return; // Should not happen if called correctly

    // 1. Reference the main user document in the 'Accounts' collection
    const userAccountDocRef = doc(db, "Accounts", user.uid);

    // 2. Reference the 'profile' document within the 'Information' subcollection
    //    Note: Using 'profile' as a fixed ID for the single profile doc in the subcollection
    const userInfoDocRef = doc(userAccountDocRef, "Information", "profile");

    try {
      // 3. Set the user's profile data in the 'Information/profile' document
      await setDoc(userInfoDocRef, {
        // Profile Info
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp(), // Record creation time
        displayName:
          user.displayName || user.email?.split("@")[0] || "New User", // Default display name
      });

      // 4. Optional: Set minimal data on the main user document ('Accounts/{uid}') if needed,
      //    or leave it empty if only subcollections are used.
      //    Setting it ensures the document path exists immediately in the console.
      await setDoc(
        userAccountDocRef,
        { lastUpdated: serverTimestamp() }, // Example: Add a timestamp or placeholder field
        { merge: true } // Use merge:true if you might add other fields later directly to Accounts/{uid}
      );

      console.log(
        "Firestore user structure created in Accounts/{uid}/Information/profile for:",
        user.uid
      );
    } catch (firestoreError) {
      console.error("Error creating Firestore user structure:", firestoreError);
      // Decide how to handle this error - maybe alert the user, maybe just log
      // Alert.alert("Profile Error", "Could not save user profile information.");
    }
  };

  // --- Sign Up Handler ---
  const handleSignUp = async () => {
    setError(null); // Clear previous errors
    Keyboard.dismiss();

    if (!validateInputs()) {
      return;
    }

    setIsLoading(true);
    const trimmedEmail = email.trim();

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );
      console.log("Sign Up Successful!", userCredential.user.email);

      // --- Create user profile document structure in Firestore ---
      await createUserDocument(userCredential.user);
      // --- End Firestore document creation ---

      // Show success message
      Alert.alert(
        "Sign Up Successful",
        `Account created for ${trimmedEmail}. You can now log in.`
      );

      // Navigate to login screen after successful signup
      if (router.canGoBack()) {
        router.back(); // Go back if possible (e.g., if navigated from login)
      } else {
        router.replace("/"); // Replace with login screen route if cannot go back
      }
    } catch (error: any) {
      console.error("Sign Up Error:", error.code, error.message);
      setError(getFirebaseAuthErrorMessage(error.code, error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Navigate to Login ---
  const navigateToLogin = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/"); // Go to index (login) screen
    }
  };

  // --- Render UI ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      {/* Optional: Configure header if needed */}
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

            {/* Display Error Message */}
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
              autoComplete="new-password" // Use new-password for sign up
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
  );
};

// --- Styles (Copied and adapted from index.tsx styles) ---
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
    color: "#B58900", // Gold color
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
    // Style for inline error messages
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
    marginTop: 10, // Added margin top for spacing
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
  toggleText: {
    marginTop: 20, // Increased spacing
    color: "#006400",
    fontSize: 15,
    fontWeight: "bold",
  },
});

export default SignUpScreen;
