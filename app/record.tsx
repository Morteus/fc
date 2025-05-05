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
  // Platform removed
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Import SafeAreaView
import HeaderTopNav from "../components/headertopnav";
import BotNavigationBar from "../components/botnavigationbar";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  Timestamp,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../app/firebase";
import { useDateContext } from "./context/DateContext";
import { formatCurrency } from "../utils/formatting";

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
    useDateContext(); // Add selectedFilter

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
  }, [currentUser, selectedYear, selectedMonth, selectedFilter]); // Add selectedFilter to dependencies

  const renderContent = () => {
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
            {selectedFilter === "Daily"
              ? "Today"
              : selectedFilter === "Weekly"
              ? "This Week"
              : `${selectedMonth} ${selectedYear}`}
            .
          </Text>
          <Text style={[styles.infoText, { marginTop: 20 }]}>
            Tap '+' to add one!
          </Text>
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
                      }
                    >
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

  return (
    <>
      {/* Use SafeAreaView for the main screen content area, excluding the bottom nav */}
      <SafeAreaView style={styles.safeAreaContainer}>
        {/* Header remains outside SafeAreaView to span full width */}
        <View style={styles.headerContainer}>
          <HeaderTopNav />
        </View>
        {/* Content area */}
        <View style={styles.mainContentContainer}>
          {renderContent()}
          {/* FAB */}
          {currentUser &&
            !loading && ( // Also hide FAB while loading
              <TouchableOpacity
                style={styles.fab}
                onPress={navigateToTransaction}
              >
                <MaterialIcons name="add" size={28} color="white" />
              </TouchableOpacity>
            )}
        </View>
      </SafeAreaView>
      {/* Bottom Nav remains outside SafeAreaView */}
      <BotNavigationBar />
    </>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa", // Match background
  },
  mainContentContainer: {
    flex: 1, // Takes remaining space
  },
  fab: {
    position: "absolute",
    bottom: 20, // Adjusted bottom position (relative to mainContentContainer)
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
    zIndex: 1, // Ensure FAB is above ScrollView content
  },
  headerContainer: {
    // Removed paddingTop, HeaderTopNav handles its internal padding
    backgroundColor: "#006400",
  },
  // container style removed as SafeAreaView is the main container now
  content: {
    flex: 1, // Ensure ScrollView takes space
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    // Removed paddingBottom, FAB positioning handles overlap
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
