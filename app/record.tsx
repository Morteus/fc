// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\record.tsx
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../app/firebase";
import BotNavigationBar from "../components/botnavigationbar";
import HeaderTopNav from "../components/headertopnav";
import { formatCurrency } from "../utils/formatting";
import { useDateContext } from "./context/DateContext";

interface Transaction {
  id: string;
  type: "Income" | "Expenses";
  categoryName: string;
  categoryIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  amount: number;
  timestamp: Timestamp;
  accountId: string | null;
  accountName?: string;
}

const formatFirestoreTimestamp = (
  timestamp: Timestamp | null | undefined
): string => {
  if (!timestamp) return "No date";
  try {
    const date = timestamp.toDate();
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      weekday: "long",
    });
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return "Invalid date";
  }
};

const HistoryScreen = () => {
  const router = useRouter();
  const { startDate, endDate, selectedCurrency } = useDateContext();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigateToTransaction = () => {
    router.push("/transactions");
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        console.log("Record: No user logged in.");
        setLoading(false);
        setError("Please log in to view records.");
        setTransactions([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);
    setTransactions([]);

    const startTime = new Date(startDate);
    startTime.setHours(0, 0, 0, 0);

    const endTime = new Date(endDate);
    endTime.setHours(23, 59, 59, 999);

    const transactionsRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "transactions"
    );

    // Simplified query with proper ordering
    const q = query(
      transactionsRef,
      orderBy("timestamp", "desc"),
      where("timestamp", ">=", Timestamp.fromDate(startTime)),
      where("timestamp", "<=", Timestamp.fromDate(endTime))
    );

    console.log("Fetching records for:", {
      user: currentUser.uid,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
    });

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedTransactions = snapshot.docs
          .filter((doc) => !doc.data().isDeleted) // Filter deleted items in JS
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp,
          })) as Transaction[];

        console.log(`Found ${fetchedTransactions.length} transactions`);
        setTransactions(fetchedTransactions);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching transactions:", error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, startDate, endDate]);

  const handleDeleteTransaction = (transaction: Transaction) => {
    Alert.alert(
      "Delete Transaction",
      "This transaction will be moved to deleted records. You can restore it later from your profile page.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move to Deleted",
          style: "destructive",
          onPress: async () => {
            if (!currentUser) return;
            try {
              const transactionRef = doc(
                db,
                "Accounts",
                currentUser.uid,
                "transactions",
                transaction.id
              );
              await updateDoc(transactionRef, {
                isDeleted: true,
                deletedAt: serverTimestamp(),
              });
              Alert.alert(
                "Success",
                "Transaction moved to deleted records. You can restore it from your profile page."
              );
            } catch (error) {
              console.error("Error deleting transaction:", error);
              Alert.alert("Error", "Failed to delete transaction");
            }
          },
        },
      ]
    );
  };

  const renderContent = () => {
    if (!currentUser && !loading) {
      return (
        <View style={styles.centered}>
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="login" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Not Logged In</Text>
            <Text style={styles.emptyStateText}>
              {error || "Please log in to view your transaction records."}
            </Text>
          </View>
        </View>
      );
    }
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#B58900" />
          <Text style={styles.loadingText}>Loading Records...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="error-outline" size={64} color="#E53935" />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            {error.includes("index") && (
              <Text style={styles.errorHint}>
                (You might need to create a composite index in your Firebase
                Firestore settings)
              </Text>
            )}
          </View>
        </View>
      );
    }

    if (transactions.length === 0) {
      return (
        <View style={styles.centered}>
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="hourglass-empty" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Transactions</Text>
            <Text style={styles.emptyStateText}>No transactions recorded.</Text>
            <Text style={styles.emptyStateAction}>
              Tap &apos;+&apos; to add one!
            </Text>
          </View>
        </View>
      );
    }

    const groupedTransactions: { [date: string]: Transaction[] } = {};
    transactions.forEach((transaction) => {
      const dateStr = formatFirestoreTimestamp(transaction.timestamp);
      if (!groupedTransactions[dateStr]) {
        groupedTransactions[dateStr] = [];
      }
      groupedTransactions[dateStr].push(transaction);
    });

    return (
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {Object.entries(groupedTransactions).map(
          ([date, dailyTransactions]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{date}</Text>
              {dailyTransactions.map((transaction) => (
                <TouchableOpacity
                  key={transaction.id}
                  style={styles.transactionItem}
                  activeOpacity={0.8}
                  onLongPress={() => handleDeleteTransaction(transaction)}
                >
                  <View style={styles.transactionDetails}>
                    <View
                      style={[
                        styles.iconContainer,
                        transaction.type === "Income"
                          ? styles.incomeIconBg
                          : styles.expenseIconBg,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={transaction.categoryIcon}
                        size={24}
                        color="#fff"
                      />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.categoryName}>
                        {transaction.categoryName}
                      </Text>
                      <Text style={styles.accountNameText}>
                        {transaction.accountName}
                      </Text>
                    </View>
                    <Text
                      style={
                        transaction.type === "Income"
                          ? styles.income
                          : styles.expense
                      }
                    >
                      {transaction.type === "Income" ? "+" : "-"}
                      {formatCurrency(transaction.amount, selectedCurrency)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}
        {/* Bottom padding for FAB */}
        <View style={styles.fabSpace} />
      </ScrollView>
    );
  };

  return (
    <>
      <SafeAreaView
        style={styles.safeAreaContainer}
        edges={["top", "left", "right"]}
      >
        <View style={styles.headerContainer}>
          <HeaderTopNav />
        </View>
        <View style={styles.mainContentContainer}>
          {renderContent()}
          {currentUser && !loading && (
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
      <BotNavigationBar />
    </>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#f5f5f7",
  },
  mainContentContainer: {
    flex: 1,
  },
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
  fabSpace: {
    height: 80,
  },
  headerContainer: {
    backgroundColor: "#006400",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    maxWidth: 320,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyStateAction: {
    fontSize: 16,
    color: "#B58900",
    fontWeight: "600",
    marginTop: 24,
    textAlign: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#E53935",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    fontWeight: "500",
  },
  errorHint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
    lineHeight: 20,
  },
  dateGroup: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  dateHeader: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    marginTop: 5,
    fontWeight: "600",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  transactionItem: {
    marginBottom: 12,
  },
  transactionDetails: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.08,
    // shadowRadius: 8,
    // elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  incomeIconBg: {
    backgroundColor: "#28a745",
  },
  expenseIconBg: {
    backgroundColor: "#dc3545",
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  accountNameText: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
  expense: {
    fontSize: 16,
    color: "#dc3545",
    fontWeight: "bold",
    textAlign: "right",
  },
  income: {
    fontSize: 16,
    color: "#28a745",
    fontWeight: "bold",
    textAlign: "right",
  },
});

export default HistoryScreen;
