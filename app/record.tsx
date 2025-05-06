// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\record.tsx
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

const getMonthNumber = (monthName: string): number => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months.indexOf(monthName);
};

const HistoryScreen = () => {
  const router = useRouter();
  const { selectedYear, selectedMonth, selectedFilter, selectedCurrency } =
    useDateContext();

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

    // --- Calculate start and end dates based on selectedFilter ---
    let startDate: Date;
    let endDate: Date;
    const now = new Date();
    const monthNumber = getMonthNumber(selectedMonth);

    if (selectedFilter === "Daily") {
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0
      );
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0
      );
    } else if (selectedFilter === "Weekly") {
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - dayOfWeek, // Start of the current week (Sunday)
        0,
        0,
        0
      );
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + (7 - dayOfWeek), // End of the current week (next Sunday)
        0,
        0,
        0
      );
    } else {
      // Monthly (default)
      if (monthNumber < 0) {
        setError("Invalid month selected in context.");
        setLoading(false);
        return;
      }
      startDate = new Date(selectedYear, monthNumber, 1, 0, 0, 0);
      endDate = new Date(selectedYear, monthNumber + 1, 1, 0, 0, 0);
    }
    // --- End date calculation ---

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const transactionsCollectionRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "transactions"
    );

    const q = query(
      transactionsCollectionRef,
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<", endTimestamp),
      orderBy("timestamp", "desc")
    );

    console.log(
      `Fetching transactions from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedTransactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (
            data &&
            typeof data.type === "string" &&
            typeof data.categoryName === "string" &&
            typeof data.categoryIcon === "string" &&
            typeof data.amount === "number" &&
            data.timestamp instanceof Timestamp &&
            (typeof data.accountId === "string" || data.accountId === null)
          ) {
            fetchedTransactions.push({
              id: doc.id,
              type: data.type as "Income" | "Expenses",
              categoryName: data.categoryName,
              categoryIcon:
                (data.categoryIcon as keyof typeof MaterialCommunityIcons.glyphMap) ||
                "help-circle-outline",
              amount: data.amount,
              timestamp: data.timestamp,
              accountId: data.accountId,
              accountName: data.accountName || "Unknown Account",
            });
          } else {
            console.warn(`Invalid transaction data found: ${doc.id}`, data);
          }
        });
        setTransactions(fetchedTransactions);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching transactions: ", err);
        setError("Failed to load transaction history.");
        if (err.code === "permission-denied") {
          setError("Permission denied. Check Firestore rules.");
        } else if (err.code === "failed-precondition") {
          setError(
            "Query requires an index. Check Firestore console for index creation link."
          );
          console.error("Firestore Index Required:", err.message);
        }
        setLoading(false);
      }
    );

    return () => {
      console.log(
        `RecordScreen: Unsubscribing from transaction listener for ${currentUser?.uid}`
      );
      unsubscribe();
    };
  }, [currentUser, selectedYear, selectedMonth, selectedFilter]);

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
          <Text style={styles.loadingText}>
            Loading Records for{" "}
            {selectedFilter === "Daily"
              ? "Today"
              : selectedFilter === "Weekly"
              ? "This Week"
              : `${selectedMonth} ${selectedYear}`}
            ...
          </Text>
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
            <Text style={styles.emptyStateText}>
              No transactions recorded for{" "}
              {selectedFilter === "Daily"
                ? "Today"
                : selectedFilter === "Weekly"
                ? "This Week"
                : `${selectedMonth} ${selectedYear}`}
              .
            </Text>
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
              activeOpacity={0.8}
              onPress={navigateToTransaction}
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
    backgroundColor: "#B58900",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
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
