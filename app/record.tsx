// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\record.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderTopNav from "../components/headertopnav";
import BotNavigationBar from "../components/botnavigationbar";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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

// --- Interfaces ---
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

interface TransactionSection {
  title: string; // The formatted date string (YYYY-MM-DD)
  data: Transaction[]; // Array of transactions for that date
}

// --- Helper Functions ---
const formatFirestoreTimestamp = (
  timestamp: Timestamp | null | undefined
): string => {
  if (!timestamp) return "No date";
  try {
    const date = timestamp.toDate();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`; // Key for grouping
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return "Invalid date";
  }
};

const formatDisplayDate = (dateKey: string): string => {
  try {
    // Ensure parsing as local date, not UTC, by adding time component
    const date = new Date(dateKey + "T00:00:00");
    if (isNaN(date.getTime())) {
      // Check if date is valid after parsing
      throw new Error("Invalid date parsed");
    }
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      weekday: "long",
    });
  } catch (e) {
    console.error("Error formatting display date:", dateKey, e);
    return "Invalid Date";
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
// --- End Helper Functions ---

const HistoryScreen = () => {
  const navigation = useNavigation();
  const { selectedYear, selectedMonth, selectedCurrency } = useDateContext();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigateToTransaction = () => {
    navigation.navigate("transactions" as never);
  };

  // --- Listen for Auth State Changes ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        console.log("Record: No user logged in.");
        // Don't set loading to false here if fetch effect depends on user
        setError("Please log in to view records.");
        setTransactions([]);
        // Set loading false only if no fetch will happen
        setLoading(false);
      }
      // If user logs in, the other effect will trigger and set loading
    });
    return () => unsubscribeAuth();
  }, []);

  // --- Fetch Transactions based on User and Date Context ---
  useEffect(() => {
    // Only run if user is logged in
    if (!currentUser) {
      // If there's no user, ensure loading is false and data is clear
      setLoading(false);
      setTransactions([]);
      // Keep the "Please log in" error if set by auth listener
      if (!error) setError("Please log in to view records.");
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors on new fetch
    setTransactions([]); // Clear previous transactions

    const monthNumber = getMonthNumber(selectedMonth);
    if (monthNumber < 0) {
      setError("Invalid month selected in context.");
      setLoading(false);
      return;
    }

    let startDate, endDate;
    try {
      startDate = new Date(selectedYear, monthNumber, 1, 0, 0, 0);
      endDate = new Date(selectedYear, monthNumber + 1, 1, 0, 0, 0);
      // Basic validation for dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date created from year/month");
      }
    } catch (e) {
      console.error("Error creating date range:", e);
      setError("Invalid date range selected.");
      setLoading(false);
      return;
    }

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
          // Perform robust data validation
          if (
            data &&
            (data.type === "Income" || data.type === "Expenses") &&
            typeof data.categoryName === "string" &&
            typeof data.categoryIcon === "string" && // Check if icon is valid later if needed
            typeof data.amount === "number" &&
            data.timestamp instanceof Timestamp &&
            (typeof data.accountId === "string" || data.accountId === null)
          ) {
            // Ensure categoryIcon is a valid key if possible, otherwise use a default
            const iconKey =
              data.categoryIcon as keyof typeof MaterialCommunityIcons.glyphMap;
            const validIcon = MaterialCommunityIcons.glyphMap[iconKey]
              ? iconKey
              : "help-circle-outline"; // Default icon

            fetchedTransactions.push({
              id: doc.id,
              type: data.type,
              categoryName: data.categoryName,
              categoryIcon: validIcon,
              amount: data.amount,
              timestamp: data.timestamp,
              accountId: data.accountId,
              accountName:
                typeof data.accountName === "string"
                  ? data.accountName
                  : "Unknown Account",
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
        let specificError = "Failed to load transaction history.";
        if (err.code === "permission-denied") {
          specificError = "Permission denied. Check Firestore rules.";
        } else if (err.code === "unimplemented") {
          specificError = "Operation failed. Check Firestore query or rules.";
        } else if (
          err.code === "failed-precondition" &&
          err.message.includes("index")
        ) {
          specificError =
            "Query requires an index. Check Firestore console for index creation link.";
          console.error("Firestore Index Required:", err.message);
        }
        setError(specificError);
        setLoading(false);
      }
    );

    // Cleanup function
    return () => {
      console.log("Unsubscribing from transaction listener");
      unsubscribe();
    };
  }, [currentUser, selectedYear, selectedMonth]); // Dependencies

  // --- Prepare data for SectionList ---
  const transactionSections = useMemo((): TransactionSection[] => {
    // Return empty array immediately if no transactions
    if (transactions.length === 0) return [];

    const grouped: { [dateKey: string]: Transaction[] } = {};
    transactions.forEach((transaction) => {
      const dateKey = formatFirestoreTimestamp(transaction.timestamp);
      // Ensure dateKey is valid before grouping
      if (dateKey !== "Invalid date" && dateKey !== "No date") {
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(transaction);
      } else {
        console.warn("Skipping transaction with invalid date:", transaction.id);
      }
    });

    // Convert grouped object into SectionList data format
    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a)) // Sort dates descending (YYYY-MM-DD format sorts correctly)
      .map((dateKey) => ({
        title: dateKey, // Use the YYYY-MM-DD key as title
        data: grouped[dateKey], // Assign the array of transactions
      }));
  }, [transactions]); // Dependency

  // --- Render Item for SectionList ---
  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionDetails}>
        <MaterialCommunityIcons
          name={item.categoryIcon} // Already validated or defaulted in fetch effect
          size={24}
          color="#006400"
          style={styles.categoryIcon}
        />
        <View style={styles.textContainer}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {item.categoryName}
          </Text>
          <Text style={styles.accountNameText} numberOfLines={1}>
            {item.accountName}
          </Text>
        </View>
        <Text style={item.type === "Income" ? styles.income : styles.expense}>
          {formatCurrency(item.amount, selectedCurrency)}
        </Text>
      </View>
    </View>
  );

  // --- Render Section Header for SectionList ---
  const renderSectionHeader = ({
    section: { title },
  }: {
    section: TransactionSection;
  }) => {
    const displayDate = formatDisplayDate(title);
    // Render header only if displayDate is valid
    return displayDate !== "Invalid Date" ? (
      <Text style={styles.dateHeader}>{displayDate}</Text>
    ) : null; // Don't render header for invalid dates
  };

  // --- Render Empty Component for SectionList ---
  const renderEmptyListComponent = () => {
    // Order matters: Check loading first, then error, then no user, then empty data
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
          {/* Specific hint for index error */}
          {error.includes("index") && (
            <Text
              style={[
                styles.infoText,
                styles.errorText,
                { fontSize: 12, marginTop: 5 },
              ]}
            >
              (You might need to create a composite index in your Firebase
              Firestore settings for the 'transactions' collection)
            </Text>
          )}
        </View>
      );
    }
    // If not loading and no error, check if user is logged out
    if (!currentUser) {
      return (
        <View style={styles.centered}>
          <MaterialIcons name="login" size={40} color="#888" />
          {/* Use the error message if it exists (e.g., "Please log in"), otherwise a default */}
          <Text style={styles.infoText}>{error || "Please log in."}</Text>
        </View>
      );
    }
    // If logged in, not loading, no error, but no transactions
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
    // Should not be reached if loading/error/data exists/no user
    return null;
  };

  // --- Main Return ---
  return (
    <>
      <SafeAreaView style={styles.container}>
        <HeaderTopNav />
        <SectionList
          sections={transactionSections}
          keyExtractor={(item, index) => item.id + index} // Add index for potential duplicate IDs if issues arise
          renderItem={renderTransactionItem}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={renderEmptyListComponent}
          contentContainerStyle={styles.listContentContainer}
          stickySectionHeadersEnabled={false} // Keep headers non-sticky
          // Performance optimization for large lists (optional)
          initialNumToRender={15} // Adjust based on typical screen size
          maxToRenderPerBatch={10}
          windowSize={21} // Default is 21
        />
        {/* Render FAB only if user is logged in */}
        {currentUser && (
          <TouchableOpacity style={styles.fab} onPress={navigateToTransaction}>
            <MaterialIcons name="add" size={28} color="white" />
          </TouchableOpacity>
        )}
      </SafeAreaView>
      <BotNavigationBar />
    </>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  listContentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 80, // Space below list for FAB/Nav
    flexGrow: 1, // Ensure empty component can center vertically
  },
  centered: {
    flex: 1, // Takes up available space in the list container
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: -60, // Adjust to pull the centered content up slightly
  },
  infoText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    lineHeight: 22,
  },
  errorText: {
    color: "#dc3545", // Use expense red for errors
    fontWeight: "bold",
  },
  dateHeader: {
    fontSize: 14,
    color: "#495057",
    marginBottom: 10,
    marginTop: 18, // Slightly more space above headers
    paddingTop: 6,
    paddingBottom: 4, // Add padding bottom
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    backgroundColor: "#f8f9fa", // Match background
  },
  transactionItem: {
    marginBottom: 10,
    // paddingHorizontal is handled by listContentContainer
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
    flex: 1, // Allow text to take available space
    marginRight: 10, // Space between text and amount
  },
  categoryName: {
    fontSize: 16,
    color: "#343a40",
    fontWeight: "500", // Slightly bolder category
  },
  accountNameText: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 3, // Slightly more space
  },
  expense: {
    fontSize: 16,
    color: "#dc3545",
    fontWeight: "bold",
    textAlign: "right",
    minWidth: 70, // Ensure minimum width for amount alignment
  },
  income: {
    fontSize: 16,
    color: "#28a745",
    fontWeight: "bold",
    textAlign: "right",
    minWidth: 70, // Ensure minimum width for amount alignment
  },
  fab: {
    position: "absolute",
    bottom: 70, // Position above bottom nav bar
    right: 20,
    backgroundColor: "#0F730C", // Your primary green
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
});

export default HistoryScreen;
