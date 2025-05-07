// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\signup.tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "./firebase";

const SignUpScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    if (!validateInputs()) return;
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await sendEmailVerification(userCredential.user);
      await createUserDocument(userCredential.user);

      // Sign out the user immediately after creation
      await auth.signOut();

      Alert.alert(
        "Email Verification Required",
        "A verification link has been sent to your email. Please verify your email before logging in.",
        [
          {
            text: "OK",
            onPress: () => {
              router.replace("/"); // Always redirect to login after signup
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Error:", error);
      setError(getFirebaseAuthErrorMessage(error.code, error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingContainer}
        >
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

                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>
                  Join us to manage your finances better and track your
                  progress.
                </Text>

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
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#555"
                      />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      secureTextEntry={!showPassword}
                      placeholderTextColor="#888"
                      value={password}
                      onChangeText={setPassword}
                      autoComplete="new-password"
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      activeOpacity={0.8}
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

                  {/* Confirm Password Input */}
                  <View style={styles.inputContainer}>
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={20}
                        color="#555"
                      />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      secureTextEntry={!showConfirmPassword}
                      placeholderTextColor="#888"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.eyeIcon}
                      onPress={toggleConfirmPasswordVisibility}
                    >
                      <Ionicons
                        name={
                          showConfirmPassword
                            ? "eye-off-outline"
                            : "eye-outline"
                        }
                        size={22}
                        color="#555"
                      />
                    </TouchableOpacity>
                  </View>

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
                </View>

                {/* Login Link */}
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>
                    Already have an account?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={navigateToLogin}
                    disabled={isLoading}
                  >
                    <Text style={styles.loginLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
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
  loginContainer: {
    flexDirection: "row",
    marginTop: 16,
    alignItems: "center",
  },
  loginText: {
    fontSize: 15,
    color: "#666",
  },
  loginLink: {
    color: "#006400",
    fontSize: 15,
    fontWeight: "bold",
  },
});

export default SignUpScreen;
