import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signOut,
  updateProfile,
  User,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CURRENCY_SYMBOLS } from "../utils/formatting";
import { useDateContext } from "./context/DateContext";
import { app, auth } from "./firebase";
const AVAILABLE_CURRENCIES = ["PHP", "USD", "EUR", "JPY", "GBP"];

const ProfilePage = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedCurrency, setSelectedCurrency } = useDateContext();
  const [isCurrencyModalVisible, setIsCurrencyModalVisible] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const db = getFirestore(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCurrencySelect = (currency: string) => {
    setSelectedCurrency(currency);
    setIsCurrencyModalVisible(false);
  };

  const handleLogout = async () => {
    if (!currentUser) return;
    try {
      await signOut(auth);
      router.replace("/");
    } catch (error) {
      console.error("Logout Error:", error);
      Alert.alert("Logout Failed", "Could not log out. Please try again.");
    }
  };

  const updateUserProfile = async (data: {
    displayName?: string;
    photoURL?: string;
  }) => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(
        userDocRef,
        {
          ...data,
          email: currentUser.email,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      if (data.displayName) {
        await updateProfile(currentUser, { displayName: data.displayName });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    }
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "You need to grant access to your photos to upload a profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      try {
        await updateUserProfile({ photoURL: result.assets[0].uri });
        setProfileImage(result.assets[0].uri);
      } catch (error) {
        Alert.alert("Error", "Failed to update profile picture");
      }
    }
  };

  const handleEmailChange = async () => {
    if (!currentUser || !newEmail || isUpdatingEmail) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    try {
      setIsUpdatingEmail(true);

      if (showPasswordField && password) {
        // Reauthenticate user before changing email
        const credential = EmailAuthProvider.credential(
          currentUser.email!,
          password
        );
        await reauthenticateWithCredential(currentUser, credential);
      }

      await verifyBeforeUpdateEmail(currentUser, newEmail);
      Alert.alert(
        "Verification Email Sent",
        `Please check ${newEmail} for verification link. A confirmation email has been sent to your current email address.`
      );
      setIsEmailModalVisible(false);
      setShowPasswordField(false);
      setPassword("");
    } catch (error: any) {
      if (error.code === "auth/requires-recent-login") {
        setShowPasswordField(true);
      } else {
        Alert.alert(
          "Error",
          error.message || "Failed to update email. Please try again."
        );
      }
    } finally {
      if (!showPasswordField) {
        setIsUpdatingEmail(false);
        setNewEmail("");
      }
    }
  };

  const getDefaultUsername = (email: string) => {
    return email.split("@")[0];
  };

  const handleUpdateDisplayName = async () => {
    if (!currentUser || !newDisplayName.trim()) return;

    try {
      await updateUserProfile({ displayName: newDisplayName.trim() });
      setIsEditingName(false);
      setNewDisplayName("");
    } catch (error: any) {
      Alert.alert("Error", "Failed to update display name");
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) return;

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.photoURL) {
            setProfileImage(userData.photoURL);
          }
          // The displayName is handled by Firebase Auth, so we don't need to set it here
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/record");
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#006400" />
          ) : currentUser ? (
            <>
              <TouchableOpacity
                onPress={pickImage}
                style={styles.profileImageContainer}
              >
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={40} color="#006400" />
                    <Text style={styles.uploadText}>Tap to upload</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.nameContainer}>
                {isEditingName ? (
                  <View style={styles.nameEditContainer}>
                    <TextInput
                      style={styles.nameInput}
                      value={newDisplayName}
                      onChangeText={setNewDisplayName}
                      placeholder={
                        currentUser.displayName ||
                        getDefaultUsername(currentUser.email!)
                      }
                      autoFocus
                    />
                    <View style={styles.nameEditButtons}>
                      <TouchableOpacity
                        style={styles.nameEditButton}
                        onPress={() => setIsEditingName(false)}
                      >
                        <Ionicons name="close" size={20} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.nameEditButton}
                        onPress={handleUpdateDisplayName}
                      >
                        <Ionicons name="checkmark" size={20} color="#006400" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.nameDisplay}
                    onPress={() => {
                      setNewDisplayName(
                        currentUser.displayName ||
                          getDefaultUsername(currentUser.email!)
                      );
                      setIsEditingName(true);
                    }}
                  >
                    <Text style={styles.name}>
                      {currentUser.displayName ||
                        getDefaultUsername(currentUser.email!)}
                    </Text>
                    <Ionicons
                      name="pencil-outline"
                      size={18}
                      color="#006400"
                      style={styles.nameEditIcon}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <Text style={styles.infoText}>Not Logged In</Text>
          )}
        </View>

        {currentUser && (
          <View style={styles.card}>
            <View style={styles.emailHeader}>
              <View style={styles.emailContent}>
                <Ionicons name="mail-outline" size={20} color="#006400" />
                <Text style={styles.emailText}>{currentUser.email}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEmailModalVisible(true)}
                style={styles.editButton}
              >
                <Ionicons name="pencil-outline" size={18} color="#006400" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push("/password")}
            disabled={!currentUser || isLoading}
          >
            <Text style={styles.listItemText}>Change Password</Text>
            <Ionicons
              name="chevron-forward-outline"
              size={20}
              color="#006400"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.listItem, { borderBottomWidth: 0 }]}
            onPress={() => Alert.alert("Notifications", "Coming soon!")}
            disabled={!currentUser || isLoading}
          >
            <Text style={styles.listItemText}>Notifications</Text>
            <Ionicons
              name="chevron-forward-outline"
              size={20}
              color="#006400"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <TouchableOpacity
            style={[styles.listItem, { borderBottomWidth: 0 }]}
            onPress={() => setIsCurrencyModalVisible(true)}
            disabled={!currentUser || isLoading}
          >
            <Text style={styles.listItemText}>Currency</Text>
            <View style={styles.preferenceValueContainer}>
              <Text style={styles.preferenceValueText}>
                {CURRENCY_SYMBOLS[selectedCurrency] || selectedCurrency}
              </Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#888" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={[styles.logoutButton, !currentUser && styles.disabledButton]}
            onPress={handleLogout}
            disabled={!currentUser}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={isEmailModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsEmailModalVisible(false);
          setShowPasswordField(false);
          setPassword("");
          setNewEmail("");
        }}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPressOut={() => {
            setIsEmailModalVisible(false);
            setShowPasswordField(false);
            setPassword("");
            setNewEmail("");
          }}
        >
          <View
            style={styles.modalContainer}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>
              {showPasswordField ? "Confirm Your Password" : "Change Email"}
            </Text>

            {!showPasswordField ? (
              <TextInput
                style={styles.input}
                placeholder="Enter new email"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsEmailModalVisible(false);
                  setShowPasswordField(false);
                  setPassword("");
                  setNewEmail("");
                }}
              >
                <Text style={[styles.modalButtonText, { color: "#666" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleEmailChange}
                disabled={
                  isUpdatingEmail ||
                  (!showPasswordField ? !newEmail : !password)
                }
              >
                {isUpdatingEmail ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalButtonText}>
                    {showPasswordField ? "Confirm" : "Change"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={isCurrencyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCurrencyModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPressOut={() => setIsCurrencyModalVisible(false)}
        >
          <View
            style={styles.modalContainer}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Select Currency</Text>
            <View>
              {AVAILABLE_CURRENCIES.map((currency) => (
                <TouchableOpacity
                  key={currency}
                  style={[
                    styles.pickerItem,
                    selectedCurrency === currency && styles.pickerItemSelected,
                  ]}
                  onPress={() => handleCurrencySelect(currency)}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      selectedCurrency === currency &&
                        styles.pickerTextSelected,
                    ]}
                  >
                    {currency}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#f4f4f4",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#006400",
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: "white",
    padding: 20,
    alignItems: "center",
    marginBottom: 15,
    borderRadius: 16,
    marginHorizontal: 15,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#f0f0f0",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profileImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  uploadText: {
    fontSize: 12,
    color: "#006400",
    marginTop: 5,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
  },
  card: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: "auto", // Ensures consistent width with other cards
  },
  emailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emailContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 12,
  },
  emailText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
    flex: 1,
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  listItemText: {
    fontSize: 16,
    color: "#333",
  },
  emailInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  confirmButton: {
    backgroundColor: "#006400",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  emailCard: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoContainer: { width: "80%", alignItems: "center" },
  infoCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 15,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
  },
  infoIcon: { marginRight: 10, color: "#777" },
  infoText: { fontSize: 16, color: "#555" },
  section: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  preferenceValueContainer: { flexDirection: "row", alignItems: "center" },
  preferenceValueText: {
    fontSize: 16,
    color: "#666",
    marginRight: 5,
  },
  logoutContainer: {
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  logoutButton: {
    backgroundColor: "#dc3545",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  logoutText: { color: "white", fontSize: 18, fontWeight: "bold" },
  disabledButton: { backgroundColor: "#aaa", opacity: 0.7 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 25,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#006400",
    marginBottom: 20,
    textAlign: "center",
  },
  pickerItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
    alignItems: "center",
  },
  pickerItemSelected: { backgroundColor: "#E8F5E9" },
  pickerText: { fontSize: 17, color: "#006400" },
  pickerTextSelected: { fontWeight: "bold", color: "#004D00" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  nameContainer: {
    width: "100%",
    alignItems: "center",
  },
  nameDisplay: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  nameEditContainer: {
    width: "80%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 4,
  },
  nameInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nameEditButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  nameEditButton: {
    padding: 8,
    marginLeft: 4,
  },
  nameEditIcon: {
    marginLeft: 8,
  },
});

export default ProfilePage;
