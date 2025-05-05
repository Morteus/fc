// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\profile.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView, // Import ScrollView
  // Platform removed
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Import SafeAreaView
import { Ionicons } from "@expo/vector-icons";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "expo-router";
import { auth } from "./firebase";
import { useDateContext } from "./context/DateContext";
import { CURRENCY_SYMBOLS } from "../utils/formatting";

const AVAILABLE_CURRENCIES = ["PHP", "USD", "EUR", "JPY", "GBP"];

const ProfilePage = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedCurrency, setSelectedCurrency } = useDateContext();
  const [isCurrencyModalVisible, setIsCurrencyModalVisible] = useState(false);

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

  return (
    // Use SafeAreaView as the main container, applying background color
    <SafeAreaView style={styles.safeAreaContainer}>
      {/* Top Bar remains outside SafeAreaView to span full width */}
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
        <View style={{ width: 24 }} /> {/* Spacer */}
      </View>

      {/* Wrap the scrollable content in ScrollView */}
      <ScrollView style={styles.scrollContainer}>
        {/* Profile Header */}
        <View style={styles.header}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#006400" />
          ) : currentUser ? (
            <>
              <Text style={[styles.name, { marginTop: 10 }]}>
                {" "}
                {/* Added marginTop */}
                {currentUser.displayName || "User Name"}
              </Text>
              <View style={styles.infoContainer}>
                <View style={styles.infoItem}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#555"
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoText}>{currentUser.email}</Text>
                </View>
                {currentUser.phoneNumber && (
                  <View style={styles.infoItem}>
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color="#555"
                      style={styles.infoIcon}
                    />
                    <Text style={styles.infoText}>
                      {currentUser.phoneNumber}
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <Text style={styles.infoText}>Not Logged In</Text>
          )}
        </View>

        {/* Additional Sections */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => router.push("/password")}
              disabled={!currentUser || isLoading}
            >
              <Text>Change Password</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.listItem}
              onPress={() =>
                Alert.alert(
                  "Notifications",
                  "Notification settings coming soon!"
                )
              }
              disabled={!currentUser || isLoading}
            >
              <Text>Notifications</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => setIsCurrencyModalVisible(true)}
              disabled={!currentUser || isLoading}
            >
              <Text>Currency</Text>
              <View style={styles.preferenceValueContainer}>
                <Text style={styles.preferenceValueText}>
                  {CURRENCY_SYMBOLS[selectedCurrency] || selectedCurrency}
                </Text>
                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color="#888"
                />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.logoutButton, !currentUser && styles.disabledButton]}
            onPress={handleLogout}
            disabled={!currentUser}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Currency Selection Modal */}
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
    backgroundColor: "#f4f4f4", // Apply background to SafeAreaView
  },
  // container removed
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#006400",
    // Removed paddingTop, SafeAreaView handles top inset
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContainer: {
    // Added for ScrollView
    flex: 1,
  },
  header: {
    backgroundColor: "white",
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    borderRadius: 8,
    marginHorizontal: 15,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  profileImage: { width: "100%", height: "100%" },
  name: { fontSize: 22, fontWeight: "bold", marginBottom: 10, color: "#333" },
  infoContainer: { width: "80%", alignItems: "center" },
  infoItem: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  infoIcon: { marginRight: 10, color: "#777" },
  infoText: { fontSize: 16, color: "#555" },
  content: { paddingHorizontal: 15, paddingBottom: 30 }, // Added paddingBottom
  section: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
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
  preferenceValueText: { color: "#888", marginRight: 5, fontSize: 16 },
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
  // Removed unused modal styles (modalScrollContainer, modalLabel, modalInput, modalButtons, etc.)
});

export default ProfilePage;
