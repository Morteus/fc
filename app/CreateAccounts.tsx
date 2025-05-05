// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\CreateAccounts.tsx
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
  ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Import SafeAreaView
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import {
  getDoc,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../app/firebase";
import { useDateContext } from "./context/DateContext";
import { CURRENCY_SYMBOLS } from "../utils/formatting";

interface AccountImageOption {
  id: string;
  source: ImageSourcePropType;
  name: string;
}
const CardsSource = require("../assets/CAImages/Cards.png");
const MoneySource = require("../assets/CAImages/Money.png");
const PiggybankSource = require("../assets/CAImages/Piggybank.png");
const StoreSource = require("../assets/CAImages/Store.png");
const WalletSource = require("../assets/CAImages/Wallet.png");

const accountIconOptions: AccountImageOption[] = [
  { id: "1", source: CardsSource, name: "Cards" },
  { id: "2", source: MoneySource, name: "Money" },
  { id: "3", source: PiggybankSource, name: "Piggybank" },
  { id: "4", source: StoreSource, name: "Store" },
  { id: "5", source: WalletSource, name: "Wallet" },
];

type IncomeFrequency = "Daily" | "Weekly" | "Monthly";

const CreateAccountsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ accountId?: string }>();
  const { selectedCurrency } = useDateContext();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [selectedIconOption, setSelectedIconOption] =
    useState<AccountImageOption | null>(null);
  const [incomeAmount, setIncomeAmount] = useState("");
  const [selectedIncomeFrequency, setSelectedIncomeFrequency] =
    useState<IncomeFrequency | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const isEditMode = !!params.accountId;

  const [nameError, setNameError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        console.log("CreateAccounts: No user logged in.");
        Alert.alert(
          "Login Required",
          "You must be logged in to manage accounts."
        );
        router.replace("/");
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (isEditMode && currentUser && params.accountId) {
      setIsLoadingData(true);
      const accountDocRef = doc(
        db,
        "Accounts",
        currentUser.uid,
        "accounts",
        params.accountId
      );
      getDoc(accountDocRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setName(data.title || "");
            setInitialBalance(String(data.balance ?? 0));
            setIncomeAmount(data.incomeAmount ? String(data.incomeAmount) : "");
            setSelectedIncomeFrequency(data.incomeFrequency || null);
            const foundIcon = accountIconOptions.find(
              (opt) => opt.name === data.iconName
            );
            setSelectedIconOption(foundIcon || null);
            console.log("Editing account:", data.title);
          } else {
            console.error(
              "Account document not found for editing:",
              params.accountId
            );
            Alert.alert("Error", "Could not find the account data to edit.");
            router.back();
          }
        })
        .catch((error) => {
          console.error("Error fetching account for editing:", error);
          Alert.alert("Error", "Failed to load account data for editing.");
          router.back();
        })
        .finally(() => setIsLoadingData(false));
    } else {
      setName("");
      setInitialBalance("");
      setSelectedIconOption(null);
      setIncomeAmount("");
      setSelectedIncomeFrequency(null);
    }
  }, [isEditMode, currentUser, params.accountId, router]);

  const handleNameChange = (text: string) => {
    setName(text);
    if (text.trim()) setNameError(null);
  };
  const handleBalanceChange = (text: string) => {
    if (text === "" || /^-?\d*\.?\d*$/.test(text)) {
      setInitialBalance(text);
      setBalanceError(null);
    } else {
      setBalanceError("Invalid number format");
    }
  };
  const handleIncomeAmountChange = (text: string) => {
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      setIncomeAmount(text);
      if (text === "") setSelectedIncomeFrequency(null);
    }
  };
  const handleFrequencySelect = (frequency: IncomeFrequency) => {
    if (incomeAmount && parseFloat(incomeAmount) > 0) {
      setSelectedIncomeFrequency(frequency);
    } else {
      Alert.alert(
        "Set Income Amount",
        "Please enter a positive income amount before selecting a frequency."
      );
    }
  };
  const handleIconSelect = (option: AccountImageOption) => {
    setSelectedIconOption(option);
    setIconError(null);
  };
  const handleCancel = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/Accounts");
  };

  const validateForm = (): boolean => {
    let isValid = true;
    const trimmedName = name.trim();
    const balanceValue = parseFloat(initialBalance);
    if (!trimmedName) {
      setNameError("Account name is required.");
      isValid = false;
    } else {
      setNameError(null);
    }
    if (!isEditMode) {
      if (initialBalance === "" || isNaN(balanceValue)) {
        setBalanceError(
          "Initial balance must be a valid number (e.g., 0, 100.50)."
        );
        isValid = false;
      } else {
        setBalanceError(null);
      }
    } else {
      if (initialBalance !== "" && isNaN(balanceValue)) {
        setBalanceError("Balance must be a number.");
        isValid = false;
      } else {
        setBalanceError(null);
      }
    }
    if (!selectedIconOption) {
      setIconError("Please select an icon for the account.");
      isValid = false;
    } else {
      setIconError(null);
    }
    const incomeValue = parseFloat(incomeAmount);
    if (incomeAmount && (isNaN(incomeValue) || incomeValue <= 0)) {
      Alert.alert(
        "Invalid Income",
        "If setting income, it must be a positive number."
      );
      isValid = false;
    } else if (incomeAmount && incomeValue > 0 && !selectedIncomeFrequency) {
      Alert.alert(
        "Frequency Required",
        "Please select an income frequency (Daily, Weekly, or Monthly)."
      );
      isValid = false;
    }
    return isValid;
  };

  const handleSaveAccount = async () => {
    Keyboard.dismiss();
    if (!currentUser) {
      Alert.alert("Login Required", "You must be logged in to save accounts.");
      return;
    }
    if (!validateForm()) {
      Alert.alert(
        "Validation Failed",
        "Please correct the errors marked in red."
      );
      return;
    }
    setIsSaving(true);

    const trimmedName = name.trim();
    const currentBalance = parseFloat(initialBalance);
    const incomeNum = incomeAmount ? parseFloat(incomeAmount) : null;
    const accountDataToSave = {
      title: trimmedName,
      balance: currentBalance,
      iconName: selectedIconOption!.name,
      incomeAmount: incomeNum && incomeNum > 0 ? incomeNum : null,
      incomeFrequency:
        incomeNum && incomeNum > 0 ? selectedIncomeFrequency : null,
    };

    try {
      if (isEditMode && params.accountId) {
        const accountDocRef = doc(
          db,
          "Accounts",
          currentUser.uid,
          "accounts",
          params.accountId
        );
        const { balance, ...updateData } = accountDataToSave;
        await updateDoc(accountDocRef, updateData);
        Alert.alert(
          "Success",
          `Account "${accountDataToSave.title}" updated successfully.`
        );
        router.back();
      } else {
        await runTransaction(db, async (transaction) => {
          const accountsCollectionRef = collection(
            db,
            "Accounts",
            currentUser.uid,
            "accounts"
          );
          const transactionsCollectionRef = collection(
            db,
            "Accounts",
            currentUser.uid,
            "transactions"
          );
          const accountDocRef = doc(accountsCollectionRef);
          transaction.set(accountDocRef, accountDataToSave);
          if (currentBalance !== 0) {
            const balanceChange = currentBalance;
            const transactionType = balanceChange >= 0 ? "Income" : "Expenses";
            const transactionCategory = "Initial Balance";
            const transactionIcon =
              balanceChange >= 0 ? "bank-plus" : "bank-minus";
            const newTransactionRef = doc(transactionsCollectionRef);
            const transactionData = {
              type: transactionType,
              categoryName: transactionCategory,
              categoryIcon: transactionIcon,
              amount: Math.abs(balanceChange),
              accountId: accountDocRef.id,
              accountName: accountDataToSave.title,
              description: "Initial account balance",
              timestamp: serverTimestamp(),
            };
            transaction.set(newTransactionRef, transactionData);
          }
        });
        Alert.alert(
          "Success",
          `Account "${accountDataToSave.title}" added successfully.`
        );
        router.replace("/Accounts");
      }
    } catch (error: any) {
      console.error("Account save/update failed: ", error);
      Alert.alert(
        "Save Error",
        `Could not ${isEditMode ? "update" : "save"} the account. ${
          error.message || "Please try again."
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // Use SafeAreaView as the top-level container
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
      >
        <Stack.Screen
          options={{
            title: isEditMode ? "Edit Account" : "Create New Account",
            headerTitleAlign: "center",
            headerStyle: { backgroundColor: "#006400" },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "bold" },
          }}
        />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {isLoadingData && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#006400" />
                <Text style={styles.loadingText}>Loading Account Data...</Text>
              </View>
            )}
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Name *</Text>
                <TextInput
                  style={[styles.input, nameError && { borderColor: "red" }]}
                  placeholder="e.g., Savings, Wallet, BDO"
                  value={name}
                  onChangeText={handleNameChange}
                  placeholderTextColor="#999"
                  maxLength={50}
                  editable={!isLoadingData && !isSaving}
                />
                {nameError && (
                  <Text style={styles.validationHint}>{nameError}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {isEditMode ? "Current Balance" : "Initial Balance *"}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    balanceError && { borderColor: "red" },
                    isEditMode && styles.inputDisabled,
                  ]}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={initialBalance}
                  onChangeText={handleBalanceChange}
                  placeholderTextColor="#999"
                  editable={!isEditMode && !isLoadingData && !isSaving}
                />
                {balanceError && (
                  <Text style={styles.validationHint}>{balanceError}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Icon *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.iconScrollView}
                >
                  {accountIconOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.iconTouchable,
                        selectedIconOption?.id === option.id &&
                          styles.iconSelected,
                      ]}
                      onPress={() => handleIconSelect(option)}
                      disabled={isLoadingData || isSaving}
                    >
                      <Image
                        source={option.source}
                        style={styles.iconImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {iconError && (
                  <Text style={styles.validationHint}>{iconError}</Text>
                )}
              </View>

              <View style={styles.incomeSection}>
                <Text style={styles.sectionTitle}>
                  Optional: Recurring Income
                </Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Estimated Income Amount (
                    {CURRENCY_SYMBOLS[selectedCurrency] || selectedCurrency})
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 5000"
                    keyboardType="numeric"
                    value={incomeAmount}
                    onChangeText={handleIncomeAmountChange}
                    placeholderTextColor="#999"
                    editable={!isLoadingData && !isSaving}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Income Frequency</Text>
                  <View style={styles.frequencySelector}>
                    {(["Daily", "Weekly", "Monthly"] as IncomeFrequency[]).map(
                      (freq) => (
                        <TouchableOpacity
                          key={freq}
                          style={[
                            styles.frequencyButton,
                            selectedIncomeFrequency === freq &&
                              styles.frequencyButtonSelected,
                            (!incomeAmount ||
                              parseFloat(incomeAmount) <= 0 ||
                              isLoadingData ||
                              isSaving) &&
                              styles.frequencyButtonDisabled,
                          ]}
                          onPress={() => handleFrequencySelect(freq)}
                          disabled={
                            !incomeAmount ||
                            parseFloat(incomeAmount) <= 0 ||
                            isLoadingData ||
                            isSaving
                          }
                        >
                          <Text
                            style={[
                              styles.frequencyButtonText,
                              selectedIncomeFrequency === freq &&
                                styles.frequencyButtonTextSelected,
                              (!incomeAmount ||
                                parseFloat(incomeAmount) <= 0 ||
                                isLoadingData ||
                                isSaving) &&
                                styles.frequencyButtonDisabledText,
                            ]}
                          >
                            {freq}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCancel}
                  disabled={isSaving || isLoadingData}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.saveButton,
                    (isSaving || isLoadingData || !currentUser) &&
                      styles.actionButtonDisabled,
                  ]}
                  onPress={handleSaveAccount}
                  disabled={isSaving || isLoadingData || !currentUser}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {isEditMode ? "Update Account" : "Save Account"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f6f8" }, // Apply background to SafeAreaView
  keyboardAvoidingContainer: { flex: 1 }, // Removed background color
  scrollContainer: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  formContainer: { padding: 25, flexGrow: 1, paddingBottom: 40 },
  inputGroup: { width: "100%", marginBottom: 20 },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  input: {
    height: 50,
    width: "100%",
    borderWidth: 1,
    borderColor: "#bdc3c7",
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fdfdfd",
    color: "#333",
  },
  inputDisabled: { backgroundColor: "#e9ecef", color: "#6c757d" },
  iconScrollView: { paddingTop: 5, paddingBottom: 10 },
  iconTouchable: {
    marginRight: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  iconSelected: { borderColor: "#006400", backgroundColor: "#e8f5e9" },
  iconImage: { width: 55, height: 55 },
  validationHint: { fontSize: 12, color: "red", marginTop: 5, marginLeft: 5 },
  incomeSection: {
    width: "100%",
    marginTop: 15,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#7f8c8d",
    marginBottom: 20,
    textAlign: "center",
  },
  frequencySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 5,
  },
  frequencyButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#bdc3c7",
    borderRadius: 25,
    backgroundColor: "#fdfdfd",
    alignItems: "center",
  },
  frequencyButtonSelected: {
    backgroundColor: "#006400",
    borderColor: "#004d00",
  },
  frequencyButtonDisabled: {
    backgroundColor: "#f0f0f0",
    borderColor: "#dcdcdc",
    opacity: 0.7,
  },
  frequencyButtonText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
    textAlign: "center",
  },
  frequencyButtonTextSelected: { color: "#fff", fontWeight: "bold" },
  frequencyButtonDisabledText: { color: "#aaa" },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 30,
    paddingHorizontal: 5,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  cancelButton: { borderColor: "#ccc", backgroundColor: "#f8f9fa" },
  cancelButtonText: { fontSize: 16, fontWeight: "bold", color: "#555" },
  saveButton: { backgroundColor: "#DAA520", borderColor: "#DAA520" },
  saveButtonText: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  actionButtonDisabled: {
    opacity: 0.6,
    backgroundColor: "#e9d8a1",
    borderColor: "#e9d8a1",
  },
});

export default CreateAccountsScreen;
