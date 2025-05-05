// c:\Users\scubo\OneDrive\Documents\FC_proj\FinClassify\FinClassifyApp\app\CreateAccounts.tsx
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
import { Stack, useRouter, useLocalSearchParams } from "expo-router"; // Import useLocalSearchParams
import {
  getDoc, // Import getDoc
  getFirestore,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc, // Import updateDoc
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "../app/firebase"; // Adjust path if needed
import { useDateContext } from "./context/DateContext"; // Import context for currency
import { CURRENCY_SYMBOLS } from "../utils/formatting"; // Import symbols map

// --- Firestore Initialization ---
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Auth

// --- Account Icon Data ---
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

// --- Types ---
type IncomeFrequency = "Daily" | "Weekly" | "Monthly";

// --- Component ---
const CreateAccountsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ accountId?: string }>(); // Get navigation params
  const { selectedCurrency } = useDateContext(); // Get currency from context

  const [currentUser, setCurrentUser] = useState<User | null>(null); // State for the current user
  // --- State ---
  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState(""); // Represents current balance in edit mode
  const [selectedIconOption, setSelectedIconOption] =
    useState<AccountImageOption | null>(null);
  const [incomeAmount, setIncomeAmount] = useState("");
  const [selectedIncomeFrequency, setSelectedIncomeFrequency] =
    useState<IncomeFrequency | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false); // State for loading existing data
  const isEditMode = !!params.accountId; // Determine if we are editing

  // Validation State
  const [nameError, setNameError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);

  // --- Listen for Auth State Changes ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        // Handle user not logged in (e.g., navigate to login, disable form)
        console.log("CreateAccounts: No user logged in.");
        Alert.alert(
          "Login Required",
          "You must be logged in to manage accounts."
        );
        router.replace("/"); // Redirect to login
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  // --- Fetch Existing Account Data if Editing ---
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
            // Set the balance field (non-editable in this version)
            setInitialBalance(String(data.balance ?? 0));
            setIncomeAmount(data.incomeAmount ? String(data.incomeAmount) : "");
            setSelectedIncomeFrequency(data.incomeFrequency || null);

            // Find and set the selected icon
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
            router.back(); // Go back if account not found
          }
        })
        .catch((error) => {
          console.error("Error fetching account for editing:", error);
          Alert.alert("Error", "Failed to load account data for editing.");
          router.back();
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    } else {
      // Reset form if creating new or user changes
      setName("");
      setInitialBalance("");
      setSelectedIconOption(null);
      setIncomeAmount("");
      setSelectedIncomeFrequency(null);
    }
  }, [isEditMode, currentUser, params.accountId, router]); // Add dependencies

  // --- Handlers ---
  const handleNameChange = (text: string) => {
    setName(text);
    if (text.trim()) {
      setNameError(null); // Clear error if name is not empty
    }
  };

  const handleBalanceChange = (text: string) => {
    // Allow empty string, numbers, and a single decimal point
    if (text === "" || /^-?\d*\.?\d*$/.test(text)) {
      setInitialBalance(text);
      setBalanceError(null); // Clear error on valid input
    } else {
      setBalanceError("Invalid number format");
    }
  };

  const handleIncomeAmountChange = (text: string) => {
    // Allow only positive numbers or empty string
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      setIncomeAmount(text);
      // If income amount is cleared, also clear frequency
      if (text === "") {
        setSelectedIncomeFrequency(null);
      }
    }
  };

  const handleFrequencySelect = (frequency: IncomeFrequency) => {
    // Only allow selection if income amount is entered and positive
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
    setIconError(null); // Clear error when an icon is selected
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/Accounts"); // Fallback if cannot go back
    }
  };

  // --- Validation Logic ---
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

    // Only validate initial balance strictly when *creating*
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
      // In edit mode, just ensure it's a number if not empty (it's non-editable anyway)
      if (initialBalance !== "" && isNaN(balanceValue)) {
        setBalanceError("Balance must be a number."); // Should not happen if non-editable
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

    // Validate income frequency only if income amount is set
    const incomeValue = parseFloat(incomeAmount);
    if (incomeAmount && (isNaN(incomeValue) || incomeValue <= 0)) {
      // Technically handled by input validation, but good to double-check
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

  // --- Save Account Logic ---
  const handleSaveAccount = async () => {
    Keyboard.dismiss(); // Dismiss keyboard before saving

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
    // Use currentBalance for both create and update logic, but it's only set initially for create
    const currentBalance = parseFloat(initialBalance);
    const incomeNum = incomeAmount ? parseFloat(incomeAmount) : null; // Parse income amount

    const accountDataToSave = {
      title: trimmedName,
      balance: currentBalance, // Use the balance value (non-editable in edit)
      iconName: selectedIconOption!.name, // Non-null assertion safe due to validation
      incomeAmount: incomeNum && incomeNum > 0 ? incomeNum : null, // Store null if 0 or empty
      incomeFrequency:
        incomeNum && incomeNum > 0 ? selectedIncomeFrequency : null, // Store null if no income amount
    };

    try {
      if (isEditMode && params.accountId) {
        // --- Update Existing Account ---
        const accountDocRef = doc(
          db,
          "Accounts",
          currentUser.uid,
          "accounts",
          params.accountId
        );
        // Update only the fields that can change (exclude balance if non-editable)
        const { balance, ...updateData } = accountDataToSave; // Exclude balance from updateData
        await updateDoc(accountDocRef, updateData); // Update without balance
        Alert.alert(
          "Success",
          `Account "${accountDataToSave.title}" updated successfully.`
        );
        router.back(); // Go back after editing
      } else {
        // --- Create New Account (using Transaction) ---
        await runTransaction(db, async (transaction) => {
          const accountsCollectionRef = collection(
            db,
            "Accounts",
            currentUser.uid, // Use actual user UID
            "accounts"
          );
          const transactionsCollectionRef = collection(
            db,
            "Accounts",
            currentUser.uid, // Use actual user UID
            "transactions"
          );

          // Create a new document reference for the account *within* the transaction
          const accountDocRef = doc(accountsCollectionRef);
          // Set the account data using the transaction object
          transaction.set(accountDocRef, accountDataToSave);

          // Create initial balance transaction only if balance is not zero
          if (currentBalance !== 0) {
            const balanceChange = currentBalance;
            const transactionType = balanceChange >= 0 ? "Income" : "Expenses";
            const transactionCategory = "Initial Balance";
            const transactionIcon =
              balanceChange >= 0 ? "bank-plus" : "bank-minus";

            // Create a new document reference for the transaction *within* the transaction
            const newTransactionRef = doc(transactionsCollectionRef);
            const transactionData = {
              type: transactionType,
              categoryName: transactionCategory,
              categoryIcon: transactionIcon,
              amount: Math.abs(balanceChange),
              accountId: accountDocRef.id, // Use the ID generated within the transaction
              accountName: accountDataToSave.title,
              description: "Initial account balance", // Add description
              timestamp: serverTimestamp(),
            };
            // Set the transaction data using the transaction object
            transaction.set(newTransactionRef, transactionData);
          }
        });

        Alert.alert(
          "Success",
          `Account "${accountDataToSave.title}" added successfully.`
        );
        router.replace("/Accounts"); // Navigate back to Accounts list after creating
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

  // --- JSX ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      {/* Stack Screen Configuration */}
      <Stack.Screen
        options={{
          title: isEditMode ? "Edit Account" : "Create New Account", // Dynamic title
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: "#006400" }, // Dark green header
          headerTintColor: "#fff", // White text/icons in header
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={{ flexGrow: 1 }} // Ensure content can grow
          keyboardShouldPersistTaps="handled"
        >
          {/* Show loader while fetching existing data */}
          {isLoadingData && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#006400" />
              <Text style={styles.loadingText}>Loading Account Data...</Text>
            </View>
          )}
          <View style={styles.formContainer}>
            {/* Account Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Name *</Text>
              <TextInput
                style={[styles.input, nameError && { borderColor: "red" }]}
                placeholder="e.g., Savings, Wallet, BDO"
                value={name}
                onChangeText={handleNameChange}
                placeholderTextColor="#999"
                maxLength={50} // Limit name length
                editable={!isLoadingData && !isSaving} // Disable while loading/saving
              />
              {nameError && (
                <Text style={styles.validationHint}>{nameError}</Text>
              )}
            </View>

            {/* Initial/Current Balance */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isEditMode ? "Current Balance" : "Initial Balance *"}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  balanceError && { borderColor: "red" },
                  isEditMode && styles.inputDisabled, // Style for non-editable
                ]}
                placeholder="0.00"
                keyboardType="numeric"
                value={initialBalance}
                onChangeText={handleBalanceChange}
                placeholderTextColor="#999"
                editable={!isEditMode && !isLoadingData && !isSaving} // Make balance non-editable in edit mode
              />
              {balanceError && (
                <Text style={styles.validationHint}>{balanceError}</Text>
              )}
            </View>

            {/* Icon Selection */}
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
                    disabled={isLoadingData || isSaving} // Disable while loading/saving
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

            {/* Optional Recurring Income Section */}
            <View style={styles.incomeSection}>
              <Text style={styles.sectionTitle}>
                Optional: Recurring Income
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {/* Dynamically display currency symbol */}
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
                  editable={!isLoadingData && !isSaving} // Disable while loading/saving
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
                          // Disable if no income amount is entered or if it's zero/invalid
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

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isSaving || isLoadingData} // Disable cancel while saving/loading
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.saveButton,
                  (isSaving || isLoadingData || !currentUser) &&
                    styles.actionButtonDisabled, // Style when disabled/loading/no user
                ]}
                onPress={handleSaveAccount}
                disabled={isSaving || isLoadingData || !currentUser} // Prevent multiple clicks or if loading/no user
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
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: "#f4f6f8", // Light grey background
  },
  scrollContainer: {
    flex: 1, // Take available space
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, // Cover the screen
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10, // Ensure it's on top
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  formContainer: {
    padding: 25,
    flexGrow: 1, // Allow container to grow within ScrollView
    paddingBottom: 40, // Ensure space for buttons at the bottom
  },
  inputGroup: {
    width: "100%",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#555", // Dark grey label
    marginBottom: 8,
  },
  input: {
    height: 50,
    width: "100%",
    borderWidth: 1,
    borderColor: "#bdc3c7", // Medium grey border
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fdfdfd", // Slightly off-white input background
    color: "#333", // Dark text color
  },
  inputDisabled: {
    // Style for non-editable inputs
    backgroundColor: "#e9ecef", // Light grey background
    color: "#6c757d", // Muted text color
  },
  iconScrollView: {
    paddingTop: 5,
    paddingBottom: 10,
  },
  iconTouchable: {
    marginRight: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: "transparent", // Default no border
    borderRadius: 10,
    backgroundColor: "#f0f0f0", // Light background for icons
    alignItems: "center",
    justifyContent: "center",
  },
  iconSelected: {
    borderColor: "#006400", // Dark green border when selected
    backgroundColor: "#e8f5e9", // Light green background when selected
  },
  iconImage: {
    width: 55,
    height: 55,
  },
  validationHint: {
    fontSize: 12,
    color: "red",
    marginTop: 5,
    marginLeft: 5,
  },
  incomeSection: {
    width: "100%",
    marginTop: 15,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1", // Light separator line
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#7f8c8d", // Muted grey for optional section title
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
    borderColor: "#bdc3c7", // Match input border
    borderRadius: 25, // Pill shape
    backgroundColor: "#fdfdfd", // Match input background
    alignItems: "center",
  },
  frequencyButtonSelected: {
    backgroundColor: "#006400", // Dark green background when selected
    borderColor: "#004d00", // Slightly darker border for selected
  },
  frequencyButtonDisabled: {
    backgroundColor: "#f0f0f0", // Lighter background when disabled
    borderColor: "#dcdcdc", // Lighter border when disabled
    opacity: 0.7, // Fade disabled button
  },
  frequencyButtonText: {
    fontSize: 13,
    color: "#555", // Match label color
    fontWeight: "500",
    textAlign: "center",
  },
  frequencyButtonTextSelected: {
    color: "#fff", // White text on selected button
    fontWeight: "bold",
  },
  frequencyButtonDisabledText: {
    color: "#aaa", // Greyed out text when disabled
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 30, // Space above buttons
    paddingHorizontal: 5, // Slight horizontal padding if needed
  },
  actionButton: {
    flex: 1, // Equal width buttons
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6, // Space between buttons
    borderWidth: 1,
    minHeight: 48, // Ensure consistent height, especially with loader
    justifyContent: "center", // Center content (text or loader)
  },
  cancelButton: {
    borderColor: "#ccc", // Light grey border for cancel
    backgroundColor: "#f8f9fa", // Very light grey background for cancel
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555", // Dark grey text for cancel
  },
  saveButton: {
    backgroundColor: "#DAA520", // Gold color for save
    borderColor: "#DAA520", // Match background color for border
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff", // White text for save
  },
  actionButtonDisabled: {
    opacity: 0.6, // General disabled style
    backgroundColor: "#e9d8a1", // Lighter gold when save is disabled
    borderColor: "#e9d8a1",
  },
});

export default CreateAccountsScreen;
