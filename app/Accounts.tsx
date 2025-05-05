// c:\Users\scubo\Downloads\FinClassify-dea0c4be4da0318ed62b8b3aa713817c40b0002f\FinClassifyApp\app\Accounts.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity, // Make sure TouchableOpacity is imported
  Image,
  ImageSourcePropType,
  Alert,
  ActivityIndicator,
} from "react-native";
import Header from "@/components/headertopnav";
import BottomNavigationBar from "@/components/botnavigationbar"; // Corrected import name
import type { NavigationProp } from "@react-navigation/native"; // Import NavigationProp
import { Ionicons, MaterialIcons } from "@expo/vector-icons"; // Make sure Ionicons is imported
import { useNavigation } from "expo-router";
import {
  getFirestore,
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth"; // Import Firebase Auth
import { app } from "../app/firebase"; // Adjust path if needed
import type { RootStackParamList } from "./types/navigation"; // Adjust path if needed
import { useDateContext } from "./context/DateContext"; // Import context for currency
import { formatCurrency } from "../utils/formatting"; // <-- Import shared function

// --- Firestore Initialization ---
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Auth

// --- Image Assets ---
const CardsSource = require("../assets/CAImages/Cards.png");
const MoneySource = require("../assets/CAImages/Money.png");
const PiggybankSource = require("../assets/CAImages/Piggybank.png");
const StoreSource = require("../assets/CAImages/Store.png");
const WalletSource = require("../assets/CAImages/Wallet.png");

// --- Interfaces ---
interface AccountImageOption {
  id: string;
  source: ImageSourcePropType;
  name: string;
}

type IncomeFrequency = "Daily" | "Weekly" | "Monthly" | null;

interface AccountRecord {
  id: string;
  title: string;
  balance: number;
  iconName: string;
  incomeAmount?: number | null;
  incomeFrequency?: IncomeFrequency;
}

// --- Data ---
const accountIconOptions: AccountImageOption[] = [
  { id: "1", source: CardsSource, name: "Cards" },
  { id: "2", source: MoneySource, name: "Money" },
  { id: "3", source: PiggybankSource, name: "Piggybank" },
  { id: "4", source: StoreSource, name: "Store" },
  { id: "5", source: WalletSource, name: "Wallet" },
];

// --- Helper functions ---
// formatCurrency moved to utils/formatting.ts
const getIconSourceFromName = (
  iconName: string | undefined
): ImageSourcePropType => {
  const foundOption = accountIconOptions.find(
    (option) => option.name === iconName
  );
  return foundOption ? foundOption.source : WalletSource;
};

// --- Component ---
function Accounts() {
  // Explicitly type the navigation prop
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { selectedCurrency } = useDateContext(); // Get currency from context

  const [currentUser, setCurrentUser] = useState<User | null>(null); // State for the current user
  // Account State
  const [accountRecords, setAccountRecords] = useState<AccountRecord[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [errorAccounts, setErrorAccounts] = useState<string | null>(null);

  // Calculated Total Income State
  const [totalMonthlyIncome, setTotalMonthlyIncome] = useState<number>(0);
  const [totalWeeklyIncome, setTotalWeeklyIncome] = useState<number>(0);
  const [totalDailyIncome, setTotalDailyIncome] = useState<number>(0);

  // --- Navigation ---
  const navigateToTransaction = () => {
    navigation.navigate("transactions" as never);
  };

  // --- Navigation for Add Account (Updated) ---
  const navigateToAddAccount = () => {
    // Navigate to the CreateAccounts screen
    navigation.navigate("CreateAccounts" as never); // Changed from "add-account"
    console.log("Navigating to CreateAccounts page..."); // Updated log
  };

  // --- Listen for Auth State Changes ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        console.log("Accounts: No user logged in.");
        setIsLoadingAccounts(false);
        setErrorAccounts("Please log in to view accounts.");
        setAccountRecords([]); // Clear accounts if user logs out
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- Fetch Accounts from Firestore ---
  useEffect(() => {
    if (!currentUser) return; // Don't fetch if no user

    setIsLoadingAccounts(true);
    setErrorAccounts(null);
    const accountsCollectionRef = collection(
      db,
      "Accounts",
      currentUser.uid, // Use actual user UID
      "accounts"
    );
    const q = query(accountsCollectionRef, orderBy("title"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedAccounts: AccountRecord[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (
            data &&
            typeof data.title === "string" &&
            typeof data.balance === "number" &&
            typeof data.iconName === "string"
          ) {
            fetchedAccounts.push({
              id: doc.id,
              title: data.title,
              balance: data.balance,
              iconName: data.iconName,
              incomeAmount: data.incomeAmount ?? null,
              incomeFrequency: data.incomeFrequency ?? null,
            });
          } else {
            console.warn(`Invalid account data found for doc ID: ${doc.id}`);
          }
        });
        setAccountRecords(fetchedAccounts);
        setIsLoadingAccounts(false);
      },
      (err) => {
        console.error("Error fetching accounts: ", err);
        setErrorAccounts("Failed to load accounts. Please try again.");
        if (err.code === "permission-denied") {
          setErrorAccounts(
            "Permission denied. Check Firestore rules for Accounts/User/accounts."
          );
        }
        setIsLoadingAccounts(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser]); // Re-run if user changes

  // --- Calculate Total Income ---
  useEffect(() => {
    let calculatedMonthlyTotal = 0;
    accountRecords.forEach((account) => {
      const income = account.incomeAmount;
      const freq = account.incomeFrequency;
      // Ensure income is a valid positive number and frequency exists
      if (typeof income === "number" && income > 0 && freq) {
        switch (freq) {
          case "Daily":
            calculatedMonthlyTotal += income * (365.25 / 12);
            break;
          case "Weekly":
            calculatedMonthlyTotal += income * (52.18 / 12);
            break;
          case "Monthly":
            calculatedMonthlyTotal += income;
            break;
        }
      }
    });

    setTotalMonthlyIncome(calculatedMonthlyTotal);

    if (calculatedMonthlyTotal > 0) {
      const yearlyIncome = calculatedMonthlyTotal * 12;
      setTotalWeeklyIncome(yearlyIncome / 52.18);
      setTotalDailyIncome(yearlyIncome / 365.25);
    } else {
      setTotalWeeklyIncome(0);
      setTotalDailyIncome(0);
    }
  }, [accountRecords]);

  // --- Delete Account Operation ---
  const handleDeleteAccount = (accountToDelete: AccountRecord) => {
    if (!accountToDelete || !accountToDelete.id) {
      Alert.alert("Error", "Invalid account selected for deletion.");
      return;
    }

    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to delete accounts.");
      return;
    }

    Alert.alert(
      "Delete Account",
      `Are you sure you want to delete the account "${accountToDelete.title}"?\n\nAssociated transactions will NOT be deleted but will refer to a missing account. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          onPress: async () => {
            const accountDocRef = doc(
              db,
              "Accounts",
              currentUser.uid, // Use actual user UID
              "accounts",
              accountToDelete.id
            );
            try {
              await deleteDoc(accountDocRef);
              Alert.alert(
                "Success",
                `Account "${accountToDelete.title}" has been deleted.`
              );
            } catch (error: any) {
              console.error("Error deleting account:", error);
              Alert.alert(
                "Deletion Error",
                `Could not delete the account. ${
                  error.message || "Please try again."
                }`
              );
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  // --- Render Loading/Error/Content States ---
  const renderAccountList = () => {
    // Show message if user is not logged in (and auth check is done)
    if (!currentUser && !isLoadingAccounts) {
      return (
        <View style={styles.centeredStateContainer}>
          <MaterialIcons name="login" size={40} color="#888" />
          <Text style={styles.infoText}>
            {errorAccounts || "Please log in."}
          </Text>
        </View>
      );
    }
    if (isLoadingAccounts) {
      return (
        <View style={styles.centeredStateContainer}>
          <ActivityIndicator size="large" color="#006400" />
          <Text style={styles.infoText}>Loading Accounts...</Text>
        </View>
      );
    }
    if (errorAccounts) {
      return (
        <View style={styles.centeredStateContainer}>
          <MaterialIcons name="error-outline" size={40} color="red" />
          <Text style={[styles.infoText, styles.errorText]}>
            {errorAccounts}
          </Text>
        </View>
      );
    }
    if (accountRecords.length === 0) {
      return (
        <View style={styles.centeredStateContainer}>
          <Ionicons name="wallet-outline" size={40} color="#888" />
          <Text style={styles.infoText}>No accounts yet.</Text>
          <Text style={styles.infoText}>Tap 'Add New Account' to start.</Text>
        </View>
      );
    }
    // Render the list if data is available
    return (
      <>
        {accountRecords.map((account) => (
          // Wrap item in TouchableOpacity for editing
          <TouchableOpacity
            key={account.id}
            style={styles.accountItem}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("CreateAccounts", { accountId: account.id })
            } // Navigate to edit
          >
            <>
              <Image
                source={getIconSourceFromName(account.iconName)}
                style={styles.accountIconImage}
                resizeMode="contain"
              />
              <View style={styles.accountDetails}>
                <Text style={styles.accountTitle} numberOfLines={1}>
                  {account.title}
                </Text>
                <Text style={styles.accountBalance}>
                  {formatCurrency(account.balance, selectedCurrency)}{" "}
                  {/* Pass currency */}
                </Text>
                {/* CORRECTED Est. Income Line */}
                {account.incomeAmount && account.incomeFrequency && (
                  <Text style={styles.accountIncomeInfo}>
                    Est. Income:{" "}
                    {formatCurrency(account.incomeAmount, selectedCurrency)} /{" "}
                    {account.incomeFrequency}
                  </Text>
                )}
                {/* END CORRECTED Line */}
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteAccount(account);
                  }} // Prevent triggering edit on delete press
                  style={styles.actionButton}
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                >
                  <Ionicons name="trash-outline" size={22} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            </>
          </TouchableOpacity>
        ))}
      </>
    );
  };

  // --- Main Component Return ---
  return (
    <>
      <View style={styles.container}>
        <Header />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* --- TOTAL Income Section --- */}
          <View style={styles.incomeSection}>
            <View style={styles.incomeHeader}>
              <Text style={styles.incomeTitle}>Total Estimated Income</Text>
            </View>
            <View style={styles.incomeDetails}>
              <View style={styles.incomeRow}>
                <Text style={styles.incomeLabel}>Monthly (Avg):</Text>
                <Text style={styles.incomeValue}>
                  {formatCurrency(totalMonthlyIncome, selectedCurrency)}{" "}
                  {/* Pass currency */}
                </Text>
              </View>
              <View style={styles.incomeRow}>
                <Text style={styles.incomeLabel}>Weekly (Avg):</Text>
                <Text style={styles.incomeValue}>
                  {formatCurrency(totalWeeklyIncome, selectedCurrency)}{" "}
                  {/* Pass currency */}
                </Text>
              </View>
              <View style={styles.incomeRow}>
                <Text style={styles.incomeLabel}>Daily (Avg):</Text>
                <Text style={styles.incomeValue}>
                  {formatCurrency(totalDailyIncome, selectedCurrency)}{" "}
                  {/* Pass currency */}
                </Text>
              </View>
            </View>
          </View>

          {/* --- Add New Account Button Restored --- */}
          {/* Conditionally render based on loading/error state */}
          {currentUser &&
            !isLoadingAccounts && ( // Only show if logged in and not loading
              <TouchableOpacity
                style={styles.addButton}
                onPress={navigateToAddAccount} // Navigate to the new page
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={24} color="#006400" />
                <Text style={styles.addButtonText}>Add New Account</Text>
              </TouchableOpacity>
            )}

          {/* --- Accounts List Section --- */}
          <Text style={styles.sectionTitle}>Your Accounts</Text>
          {renderAccountList()}
        </ScrollView>

        {/* Floating Action Button for Transactions */}
        <TouchableOpacity
          style={styles.fab}
          onPress={navigateToTransaction}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>
      {/* Bottom Navigation Bar */}
      <BottomNavigationBar />
    </>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 100,
  },
  // --- Income Section Styles ---
  incomeSection: {
    backgroundColor: "#e6f4ea",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#c8e6c9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  incomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#b2dfdb",
  },
  incomeTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#004d40",
  },
  incomeDetails: {},
  incomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  incomeLabel: {
    fontSize: 14,
    color: "#00695c",
  },
  incomeValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#004d40",
  },
  // --- Add Button Styles Restored ---
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8f5e9", // Very light green
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#a5d6a7", // Soft green border
  },
  addButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "500",
    color: "#1b5e20", // Dark green text
  },
  // --- Section Title ---
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  // --- Account Item Styles ---
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  accountIconImage: {
    width: 40,
    height: 40,
    marginRight: 15,
  },
  accountDetails: {
    flex: 1,
    marginRight: 10,
  },
  accountTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#34495e",
  },
  accountBalance: {
    fontSize: 15,
    color: "#333",
    marginTop: 4,
    fontWeight: "500",
  },
  accountIncomeInfo: {
    fontSize: 12,
    color: "#27ae60",
    marginTop: 4,
    fontStyle: "italic",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  // --- FAB ---
  fab: {
    position: "absolute",
    bottom: 70,
    right: 20,
    backgroundColor: "#0F730C",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
  },
  // --- Centered Loading/Error/Empty State ---
  centeredStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    marginTop: 40,
    minHeight: 200,
  },
  infoText: {
    marginTop: 15,
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    lineHeight: 22,
  },
  errorText: {
    color: "#c0392b",
    fontWeight: "bold",
  },
});

export default Accounts;
