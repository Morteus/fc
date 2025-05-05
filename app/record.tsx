// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\record.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import HeaderTopNav from "../components/headertopnav";
import BotNavigationBar from "../components/botnavigationbar";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router"; // <-- Use useRouter
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  Timestamp,
  where, // Import where
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth"; // Import Firebase Auth
import { app, db, auth } from "../app/firebase"; // Import initialized db and auth
import { useDateContext } from "./context/DateContext"; // Import the context hook
import { formatCurrency } from "../utils/formatting"; // <-- Import shared function

// Interface for Firestore transaction data
interface Transaction {
  id: string;
  type: "Income" | "Expenses";
  categoryName: string;
  categoryIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  amount: number;
  timestamp: Timestamp;
  accountId: string | null; // Allow accountId to be null
  accountName?: string;
}

// Helper function to format Firestore Timestamp (Keep as is)
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

// Helper to get month number (0-indexed)
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
  const router = useRouter(); // <-- Use useRouter
  const { selectedYear, selectedMonth, selectedCurrency } = useDateContext(); // Get date and currency

  const [currentUser, setCurrentUser] = useState<User | null>(null); // State for the current user
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigateToTransaction = () => {
    router.push("/transactions"); // <-- Use router.push instead of navigation.navigate
  };

  // --- Listen for Auth State Changes ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        console.log("Record: No user logged in.");
        setLoading(false);
        setError("Please log in to view records.");
        setTransactions([]); // Clear records if user logs out
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- Fetch Transactions based on User and Date Context ---
  useEffect(() => {
    if (!currentUser) return; // Don't fetch if no user

    setLoading(true);
    setError(null);
    setTransactions([]); // Clear previous transactions

    // --- Calculate date range based on context ---
    const monthNumber = getMonthNumber(selectedMonth);
    if (monthNumber < 0) {
      setError("Invalid month selected in context.");
      setLoading(false);
      return;
    }
    const startDate = new Date(selectedYear, monthNumber, 1, 0, 0, 0);
    const endDate = new Date(selectedYear, monthNumber + 1, 1, 0, 0, 0); // Start of the *next* month
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);
    // --- End date range calculation ---

    const transactionsCollectionRef = collection(
      db,
      "Accounts",
      currentUser.uid, // Use actual user UID
      "transactions"
    );

    // --- Update the query to filter by date ---
    const q = query(
      transactionsCollectionRef,
      where("timestamp", ">=", startTimestamp), // Filter start date
      where("timestamp", "<", endTimestamp), // Filter end date (exclusive)
      orderBy("timestamp", "desc") // Keep ordering
    );
    // --- End query update ---

    console.log(
      `Fetching transactions from ${startDate.toISOString()} to ${endDate.toISOString()}`
    ); // For debugging

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedTransactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Validation (Keep as is)
          if (
            data &&
            typeof data.type === "string" &&
            typeof data.categoryName === "string" &&
            typeof data.categoryIcon === "string" &&
            typeof data.amount === "number" &&
            data.timestamp instanceof Timestamp &&
            (typeof data.accountId === "string" || data.accountId === null) // Allow string or null
          ) {
            fetchedTransactions.push({
              id: doc.id,
              type: data.type as "Income" | "Expenses",
              categoryName: data.categoryName,
              categoryIcon:
                (data.categoryIcon as keyof typeof MaterialCommunityIcons.glyphMap) ||
                "help-circle-outline", // Default icon if invalid
              amount: data.amount,
              timestamp: data.timestamp,
              accountId: data.accountId, // This will now correctly handle null
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
          // Log the specific error to the console for the developer
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
  }, [currentUser, selectedYear, selectedMonth]); // Re-run if user or date changes

  // --- renderContent (Grouping and rendering logic remains the same) ---
  const renderContent = () => {
    // Show message if user is not logged in (and auth check is done)
    if (!currentUser && !loading) {
      return (
        <View style={styles.centered}>
          <MaterialIcons name="login" size={40} color="#888" />
          <Text style={styles.infoText}>{error || "Please log in."}</Text>
        </View>
      );
    }
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#006400" />
          <Text style={styles.infoText}>
            Loading Records for {selectedMonth} {selectedYear}...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={40} color="red" />
          <Text style={[styles.infoText, styles.errorText]}>{error}</Text>
          {error.includes("index") && (
            <Text
              style={[
                styles.infoText,
                styles.errorText,
                { fontSize: 12, marginTop: 5 },
              ]}
            >
              (You might need to create a composite index in your Firebase
              Firestore settings)
            </Text>
          )}
        </View>
      );
    }

    if (transactions.length === 0) {
      return (
        <View style={styles.centered}>
          <MaterialIcons name="hourglass-empty" size={40} color="#888" />
          <Text style={styles.infoText}>No transactions recorded for</Text>
          <Text style={styles.infoText}>
            {selectedMonth} {selectedYear}.
          </Text>
          <Text style={[styles.infoText, { marginTop: 20 }]}>
            Tap '+' to add one!
          </Text>
        </View>
      );
    }

    // Group transactions by date
    const groupedTransactions: { [date: string]: Transaction[] } = {};
    transactions.forEach((transaction) => {
      const dateStr = formatFirestoreTimestamp(transaction.timestamp);
      if (!groupedTransactions[dateStr]) {
        groupedTransactions[dateStr] = [];
      }
      groupedTransactions[dateStr].push(transaction);
    });

    return (
      <ScrollView style={styles.content}>
        {Object.entries(groupedTransactions).map(
          ([date, dailyTransactions]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{date}</Text>
              {dailyTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionDetails}>
                    <MaterialCommunityIcons
                      name={transaction.categoryIcon}
                      size={24}
                      color="#006400"
                      style={styles.categoryIcon}
                    />
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
                      } // Apply style based on type
                    >
                      {" "}
                      {/* Let formatCurrency handle sign and symbol */}
                      {formatCurrency(transaction.amount, selectedCurrency)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>
    );
  };

  // --- Main Return (remains the same) ---
  return (
    <>
      <View style={styles.container}>
        <HeaderTopNav />
        {renderContent()}
        {/* Render FAB only if user is logged in */}
        {currentUser && (
          <TouchableOpacity style={styles.fab} onPress={navigateToTransaction}>
            <MaterialIcons name="add" size={28} color="white" />
          </TouchableOpacity>
        )}
      </View>
      <BotNavigationBar />
    </>
  );
};

// --- Styles (remain the same) ---
const styles = StyleSheet.create({
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
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingBottom: 80, // Add padding to avoid FAB overlap
  },
  infoText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
  },
  errorText: {
    color: "red",
    fontWeight: "bold",
  },
  dateGroup: {
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  dateHeader: {
    fontSize: 14,
    color: "#495057",
    marginBottom: 10,
    marginTop: 5,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  transactionItem: {
    marginBottom: 10,
  },
  transactionDetails: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIcon: {
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
    color: "#343a40",
  },
  accountNameText: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 2,
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
