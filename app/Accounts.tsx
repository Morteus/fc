// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\Accounts.tsx
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Import SafeAreaView
import { auth, db } from "../app/firebase";
import BottomNavigationBar from "../components/botnavigationbar";
import Header from "../components/headertopnav";
import { formatCurrency } from "../utils/formatting";
import { useDateContext } from "./context/DateContext";
import type { RootStackParamList } from "./types/navigation";

const CardsSource = require("../assets/CAImages/Cards.png");
const MoneySource = require("../assets/CAImages/Money.png");
const PiggybankSource = require("../assets/CAImages/Piggybank.png");
const StoreSource = require("../assets/CAImages/Store.png");
const WalletSource = require("../assets/CAImages/Wallet.png");

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

const accountIconOptions: AccountImageOption[] = [
  { id: "1", source: CardsSource, name: "Cards" },
  { id: "2", source: MoneySource, name: "Money" },
  { id: "3", source: PiggybankSource, name: "Piggybank" },
  { id: "4", source: StoreSource, name: "Store" },
  { id: "5", source: WalletSource, name: "Wallet" },
];

const getIconSourceFromName = (
  iconName: string | undefined
): ImageSourcePropType => {
  const foundOption = accountIconOptions.find(
    (option) => option.name === iconName
  );
  return foundOption ? foundOption.source : WalletSource;
};

function Accounts() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { selectedCurrency } = useDateContext();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accountRecords, setAccountRecords] = useState<AccountRecord[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [errorAccounts, setErrorAccounts] = useState<string | null>(null);

  const [totalMonthlyIncome, setTotalMonthlyIncome] = useState<number>(0);
  const [totalWeeklyIncome, setTotalWeeklyIncome] = useState<number>(0);
  const [totalDailyIncome, setTotalDailyIncome] = useState<number>(0);

  const navigateToTransaction = () => {
    navigation.navigate("transactions" as never);
  };
  const navigateToAddAccount = () => {
    navigation.navigate("CreateAccounts" as never);
    console.log("Navigating to CreateAccounts page...");
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        console.log("Accounts: No user logged in.");
        setIsLoadingAccounts(false);
        setErrorAccounts("Please log in to view accounts.");
        setAccountRecords([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setIsLoadingAccounts(true);
    setErrorAccounts(null);
    const accountsCollectionRef = collection(
      db,
      "Accounts",
      currentUser.uid,
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
  }, [currentUser]);

  useEffect(() => {
    let calculatedMonthlyTotal = 0;
    accountRecords.forEach((account) => {
      const income = account.incomeAmount;
      const freq = account.incomeFrequency;
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
          style: "destructive",
          onPress: async () => {
            const accountDocRef = doc(
              db,
              "Accounts",
              currentUser.uid,
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
        },
      ],
      { cancelable: true }
    );
  };

  const renderAccountList = () => {
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
    return (
      <>
        {accountRecords.map((account) => (
          <TouchableOpacity
            key={account.id}
            style={styles.accountItem}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("CreateAccounts", { accountId: account.id })
            }
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
                  {formatCurrency(account.balance, selectedCurrency)}
                </Text>
                {account.incomeAmount && account.incomeFrequency && (
                  <Text style={styles.accountIncomeInfo}>
                    Est. Income:{" "}
                    {formatCurrency(account.incomeAmount, selectedCurrency)} /{" "}
                    {account.incomeFrequency}
                  </Text>
                )}
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteAccount(account);
                  }}
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

  return (
    <>
      {/* Use SafeAreaView for the main screen content area, excluding the bottom nav */}
      <SafeAreaView style={styles.safeAreaContainer}>
        {/* Header remains outside SafeAreaView */}
        <Header />
        {/* Content area */}
        <View style={styles.mainContentContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.incomeSection}>
              <View style={styles.incomeHeader}>
                <Text style={styles.incomeTitle}>Total Estimated Income</Text>
              </View>
              <View style={styles.incomeDetails}>
                <View style={styles.incomeRow}>
                  <Text style={styles.incomeLabel}>Monthly (Avg):</Text>
                  <Text style={styles.incomeValue}>
                    {formatCurrency(totalMonthlyIncome, selectedCurrency)}
                  </Text>
                </View>
                <View style={styles.incomeRow}>
                  <Text style={styles.incomeLabel}>Weekly (Avg):</Text>
                  <Text style={styles.incomeValue}>
                    {formatCurrency(totalWeeklyIncome, selectedCurrency)}
                  </Text>
                </View>
                <View style={styles.incomeRow}>
                  <Text style={styles.incomeLabel}>Daily (Avg):</Text>
                  <Text style={styles.incomeValue}>
                    {formatCurrency(totalDailyIncome, selectedCurrency)}
                  </Text>
                </View>
              </View>
            </View>

            {currentUser && !isLoadingAccounts && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={navigateToAddAccount}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={24} color="#006400" />
                <Text style={styles.addButtonText}>Add New Account</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>Your Accounts</Text>
            {renderAccountList()}
          </ScrollView>

          {/* FAB */}
          {currentUser &&
            !isLoadingAccounts && ( // Render FAB only if user is logged in and not loading
              <TouchableOpacity
                style={styles.fab}
                onPress={navigateToTransaction}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={28} color="white" />
              </TouchableOpacity>
            )}
        </View>
      </SafeAreaView>
      {/* Bottom Nav remains outside SafeAreaView */}
      <BottomNavigationBar />
    </>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#f4f6f8", // Match background
  },
  mainContentContainer: {
    flex: 1, // Takes remaining space
  },
  // container style removed
  scrollView: { flex: 1 },
  scrollViewContent: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 100,
  },
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
  incomeTitle: { fontSize: 17, fontWeight: "600", color: "#004d40" },
  incomeDetails: {},
  incomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  incomeLabel: { fontSize: 14, color: "#00695c" },
  incomeValue: { fontSize: 15, fontWeight: "600", color: "#004d40" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8f5e9",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#a5d6a7",
  },
  addButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "500",
    color: "#1b5e20",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
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
  accountIconImage: { width: 40, height: 40, marginRight: 15 },
  accountDetails: { flex: 1, marginRight: 10 },
  accountTitle: { fontSize: 16, fontWeight: "bold", color: "#34495e" },
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
  actionButtons: { flexDirection: "row", alignItems: "center" },
  actionButton: { padding: 8, marginLeft: 5 },
  fab: {
    position: "absolute",
    bottom: 20,
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
    zIndex: 1,
  },
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
  errorText: { color: "#c0392b", fontWeight: "bold" },
});

export default Accounts;
