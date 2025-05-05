// c:\Users\scubo\Downloads\FinClassify-dea0c4be4da0318ed62b8b3aa713817c40b0002f\FinClassifyApp\app\analysis.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Alert,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList, // Using FlatList for better performance
} from "react-native";
import HeaderTopNav from "@/components/headertopnav"; // Corrected import name
import BottomNavigationBar from "@/components/botnavigationbar";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth"; // Import Firebase Auth
import { app } from "../app/firebase"; // Adjust path if needed
import { useDateContext } from "./context/DateContext"; // Import the context hook
import { formatCurrency } from "../utils/formatting"; // <-- Import shared function

// --- Firestore Initialization ---
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Auth

// --- Interfaces ---
// Re-using Transaction interface structure (ensure consistency with record.tsx)
interface Transaction {
  id: string;
  type: "Income" | "Expenses";
  categoryName: string;
  categoryIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  amount: number;
  timestamp: Timestamp;
  accountId: string | null; // Allow null accountId
  accountName?: string;
  description?: string;
}

// Interface for the processed data to display
interface CategorySpending {
  categoryName: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  totalAmount: number;
  transactionCount: number;
}

// --- Helper Functions ---
// formatCurrency moved to utils/formatting.ts
// Helper to get month number (0-indexed) - same as in record.tsx
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

// --- Component to Render Transaction Details for an Expanded Category ---
const ExpandedTransactionList = ({
  categoryName,
  transactions,
  selectedCurrency, // <-- Add prop for currency
}: {
  categoryName: string;
  transactions: Transaction[];
  selectedCurrency: string; // <-- Define prop type
}) => {
  // Filter transactions for the specific category
  const categoryTransactions = transactions.filter(
    (t) => t.categoryName === categoryName
  );

  if (categoryTransactions.length === 0) {
    return (
      <Text style={styles.noTransactionsText}>
        No specific transactions found for this category.
      </Text>
    );
  }

  return (
    <View style={styles.expandedListContainer}>
      {categoryTransactions.map((transaction) => (
        <View key={transaction.id} style={styles.expandedTransactionItem}>
          <View style={styles.expandedDetails}>
            <Text style={styles.expandedDate}>
              {transaction.timestamp.toDate().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
            <Text style={styles.expandedDescription} numberOfLines={1}>
              {transaction.description ||
                transaction.accountName ||
                "No Description"}
            </Text>
          </View>
          <Text style={styles.expandedAmount}>
            {formatCurrency(transaction.amount, selectedCurrency)}{" "}
            {/* Use prop */}
          </Text>
        </View>
      ))}
    </View>
  );
};
// --- End ExpandedTransactionList Component ---

function AnalysisScreen() {
  // Renamed component function to follow convention
  const navigation = useNavigation();
  const { selectedYear, selectedMonth, selectedCurrency } = useDateContext(); // Get date and currency

  const [currentUser, setCurrentUser] = useState<User | null>(null); // State for the current user
  const [expenseTransactions, setExpenseTransactions] = useState<Transaction[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null); // State for expanded item

  // --- State for Calculated Total Expenses ---
  const [totalMonthlyExpenses, setTotalMonthlyExpenses] = useState<number>(0);
  const [totalWeeklyExpenses, setTotalWeeklyExpenses] = useState<number>(0);
  const [totalDailyExpenses, setTotalDailyExpenses] = useState<number>(0);

  // --- Navigation Handler for FAB ---
  const navigateToTransaction = () => {
    navigation.navigate("transactions" as never);
  };

  // --- Listen for Auth State Changes ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user); // Set user to state (null if not logged in)
      if (!user) {
        // Handle user not logged in (e.g., navigate to login, show message)
        console.log("Analysis: No user logged in.");
        setLoading(false);
        setError("Please log in to view analysis.");
        setExpenseTransactions([]); // Clear data if user logs out
      }
    });
    return () => unsubscribeAuth(); // Cleanup listener
  }, []);

  // --- Fetch Expense Transactions based on Date Context ---
  useEffect(() => {
    if (!currentUser) return; // Don't fetch if user is not logged in

    setLoading(true);
    setError(null);
    setExpenseTransactions([]); // Clear previous data on date change
    setExpandedCategory(null); // Collapse any expanded item on date change

    // Calculate date range
    const monthNumber = getMonthNumber(selectedMonth);
    if (monthNumber < 0) {
      setError("Invalid month selected.");
      setLoading(false);
      return;
    }
    const startDate = new Date(selectedYear, monthNumber, 1, 0, 0, 0);
    const endDate = new Date(selectedYear, monthNumber + 1, 1, 0, 0, 0);
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const transactionsCollectionRef = collection(
      db,
      "Accounts",
      currentUser.uid, // Use the actual user's UID
      "transactions"
    );

    // Query for EXPENSE transactions within the date range
    const q = query(
      transactionsCollectionRef,
      where("type", "==", "Expenses"), // <<< Filter for Expenses only
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<", endTimestamp),
      orderBy("timestamp", "desc") // Keep ordering if needed, though grouping ignores it
    );

    console.log(
      `Analysis: Fetching expenses from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedExpenses: Transaction[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Basic validation
          if (
            data &&
            data.type === "Expenses" &&
            typeof data.categoryName === "string" &&
            typeof data.categoryIcon === "string" &&
            typeof data.amount === "number" &&
            data.timestamp instanceof Timestamp &&
            (typeof data.accountId === "string" || data.accountId === null) // Allow string or null
          ) {
            fetchedExpenses.push({
              id: doc.id,
              type: data.type,
              categoryName: data.categoryName,
              categoryIcon:
                (data.categoryIcon as keyof typeof MaterialCommunityIcons.glyphMap) ||
                "help-circle-outline",
              amount: data.amount,
              timestamp: data.timestamp,
              accountId: data.accountId, // Will be string or null
              accountName: data.accountName || "Unknown",
              description: data.description || undefined,
            });
          } else {
            console.warn(
              `Analysis: Invalid expense data found: ${doc.id}`,
              data
            );
          }
        });
        setExpenseTransactions(fetchedExpenses);
        setLoading(false);
      },
      (err) => {
        console.error("Analysis: Error fetching expenses: ", err);
        setError("Failed to load expense analysis.");
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

    return () => unsubscribe(); // Cleanup listener on unmount or date change
  }, [currentUser, selectedYear, selectedMonth]); // Re-run effect when user or date context changes

  // --- Calculate Total Expenses (Monthly, Weekly, Daily Averages) ---
  useEffect(() => {
    // Reset values if loading or no transactions
    if (loading || expenseTransactions.length === 0) {
      setTotalMonthlyExpenses(0);
      setTotalWeeklyExpenses(0);
      setTotalDailyExpenses(0);
      return;
    }

    // Calculate total for the period
    const totalForPeriod: number = expenseTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0
    );

    // Assuming the fetched data is for the selected month
    setTotalMonthlyExpenses(totalForPeriod);

    // Estimate weekly/daily based on monthly total (approximate)
    const monthNumber = getMonthNumber(selectedMonth);
    // Ensure monthNumber is valid before proceeding
    if (monthNumber >= 0) {
      const daysInMonth = new Date(selectedYear, monthNumber + 1, 0).getDate();
      // Avoid division by zero, although getDate() should return > 0 for valid dates
      if (daysInMonth > 0) {
        const dailyAverage: number = totalForPeriod / daysInMonth;
        const weeklyAverage: number = dailyAverage * 7;
        setTotalDailyExpenses(dailyAverage);
        setTotalWeeklyExpenses(weeklyAverage);
      } else {
        // Handle unlikely case of daysInMonth being 0 or less
        setTotalDailyExpenses(0);
        setTotalWeeklyExpenses(0);
      }
    } else {
      // Handle invalid month case
      setTotalDailyExpenses(0);
      setTotalWeeklyExpenses(0);
    }
  }, [expenseTransactions, loading, selectedYear, selectedMonth]); // Dependencies seem correct

  // --- Process fetched transactions to calculate spending per category ---
  const categorySpendingData = useMemo(() => {
    if (loading || expenseTransactions.length === 0) {
      return [];
    }

    const spendingMap = new Map<string, CategorySpending>();

    expenseTransactions.forEach((transaction) => {
      const categoryName = transaction.categoryName;
      const existing = spendingMap.get(categoryName);

      if (existing) {
        existing.totalAmount += transaction.amount;
        existing.transactionCount += 1;
      } else {
        spendingMap.set(categoryName, {
          categoryName: categoryName,
          icon: transaction.categoryIcon,
          totalAmount: transaction.amount,
          transactionCount: 1,
        });
      }
    });

    // Convert map values to array and sort by total amount descending
    return Array.from(spendingMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );
  }, [expenseTransactions, loading]);

  // --- Render Item for FlatList ---
  const renderCategorySpendingItem = ({ item }: { item: CategorySpending }) => {
    const isExpanded = expandedCategory === item.categoryName;

    return (
      // Wrap in a View to contain both the main item and the expanded list
      <View style={styles.itemWrapper}>
        <TouchableOpacity
          style={styles.itemContainer}
          // If the clicked category is already expanded, collapse it. Otherwise, expand it.
          onPress={() =>
            setExpandedCategory((prevExpanded) =>
              prevExpanded === item.categoryName ? null : item.categoryName
            )
          }
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={item.icon}
              size={26}
              color={styles.icon.color}
            />
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.categoryName}>{item.categoryName}</Text>
            <Text style={styles.transactionCount}>
              {item.transactionCount} transaction
              {item.transactionCount !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.amountAndChevron}>
            <Text style={styles.amountText}>
              {formatCurrency(item.totalAmount, selectedCurrency)}{" "}
              {/* Pass currency */}
            </Text>
            {/* Add a chevron icon to indicate expandability */}
            <MaterialIcons
              name={isExpanded ? "expand-less" : "expand-more"}
              size={24}
              color="#666"
              style={styles.chevronIcon}
            />
          </View>
        </TouchableOpacity>

        {/* Conditionally render the expanded list */}
        {isExpanded && (
          <ExpandedTransactionList
            categoryName={item.categoryName}
            transactions={expenseTransactions} // Pass the full list of expenses
            selectedCurrency={selectedCurrency} // <-- Pass currency down
          />
        )}
      </View>
    );
  };

  // --- Render Loading / Error / Empty / List ---
  const renderContent = () => {
    // Show message if user is not logged in (and auth check is done)
    if (!currentUser && !loading) {
      return (
        <View style={styles.centeredStateContainer}>
          <MaterialIcons name="login" size={40} color="#888" />
          <Text style={styles.centeredStateText}>
            {error || "Please log in."}
          </Text>
        </View>
      );
    }
    if (loading) {
      return (
        <View style={styles.centeredStateContainer}>
          <ActivityIndicator size="large" color="#006400" />
          <Text style={styles.centeredStateText}>Calculating Expenses...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centeredStateContainer}>
          <MaterialIcons name="error-outline" size={40} color="red" />
          <Text style={[styles.centeredStateText, styles.errorText]}>
            {error}
          </Text>
          {error.includes("index") && (
            <Text
              style={[
                styles.centeredStateText,
                styles.errorText,
                { fontSize: 12, marginTop: 5 },
              ]}
            >
              (A composite index in Firestore might be required for this query)
            </Text>
          )}
        </View>
      );
    }

    if (categorySpendingData.length === 0) {
      return (
        <View style={styles.centeredStateContainer}>
          <MaterialIcons name="bar-chart" size={40} color="#888" />
          <Text style={styles.centeredStateText}>
            No expense data found for
          </Text>
          <Text style={styles.centeredStateText}>
            {selectedMonth} {selectedYear}.
          </Text>
        </View>
      );
    }

    // Define the header component separately for clarity
    const headerComponent = (
      <View style={styles.expenseSection}>
        <View style={styles.expenseHeader}>
          <Text style={styles.expenseTitle}>Total Estimated Expenses</Text>
        </View>
        <View style={styles.expenseDetails}>
          <View style={styles.expenseRow}>
            <Text style={styles.expenseLabel}>
              Monthly ({selectedMonth} {selectedYear}):
            </Text>
            <Text style={styles.expenseValue}>
              {formatCurrency(totalMonthlyExpenses, selectedCurrency)}
            </Text>
          </View>
          <View style={styles.expenseRow}>
            <Text style={styles.expenseLabel}>Weekly (Avg):</Text>
            <Text style={styles.expenseValue}>
              {formatCurrency(totalWeeklyExpenses, selectedCurrency)}
            </Text>
          </View>
          <View style={styles.expenseRow}>
            <Text style={styles.expenseLabel}>Daily (Avg):</Text>
            <Text style={styles.expenseValue}>
              {formatCurrency(totalDailyExpenses, selectedCurrency)}
            </Text>
          </View>
        </View>
      </View>
    );

    return (
      <FlatList
        data={categorySpendingData}
        renderItem={renderCategorySpendingItem}
        keyExtractor={(item) => item.categoryName}
        style={styles.list}
        contentContainerStyle={styles.listContentContainer} // Keep this for bottom padding
        ListHeaderComponent={headerComponent}
        // Add extraData prop to ensure FlatList re-renders when expandedCategory changes
        extraData={expandedCategory}
      />
    );
  };

  // --- Main Component Return ---
  return (
    <>
      <View style={styles.container}>
        <HeaderTopNav />
        {renderContent()}
        <TouchableOpacity style={styles.fab} onPress={navigateToTransaction}>
          <MaterialIcons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>
      <BottomNavigationBar />
    </>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8", // Light background
  },
  // --- Expense Section Styles (Adapted from Accounts.tsx incomeSection) ---
  expenseSection: {
    backgroundColor: "#fdecea", // Light red background
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 15, // Match list padding
    marginTop: 15,
    marginBottom: 20, // Space before the category list
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f5c6cb", // Light red border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1b0b7", // Lighter red border bottom
  },
  expenseTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#58151c", // Dark red color
  },
  expenseDetails: {}, // Container for the rows
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  expenseLabel: {
    fontSize: 14,
    color: "#8c1c1c", // Medium red color
  },
  expenseValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc3545", // Standard expense red color
  },
  // --- List Styles ---
  list: {
    flex: 1,
  },
  listContentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 90, // Ensure space for FAB and bottom nav
  },
  // --- Expandable Item Styles ---
  itemWrapper: {
    // Wrapper for the main item and potential expanded list
    marginBottom: 12,
    backgroundColor: "#fff", // Apply background and shadow to wrapper
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden", // Important to contain the expanded list visually
  },
  itemContainer: {
    // Keep original item container styles, but remove margin/shadow
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    // Removed marginBottom, backgroundColor, shadow, elevation, borderRadius
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#e0f2e0", // Light green background for icon
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  icon: {
    color: "#006400", // Dark green icon color
  },
  detailsContainer: {
    flex: 1, // Take remaining space
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  transactionCount: {
    fontSize: 13,
    color: "#6c757d", // Grey color for count
    marginTop: 3,
  },
  amountAndChevron: {
    // Container for amount and chevron
    flexDirection: "row",
    alignItems: "center",
  },
  amountText: {
    // Keep original amountText style
    fontSize: 16,
    fontWeight: "bold",
    color: "#c0392b", // Expense red color
    marginRight: 5, // Add space before chevron
  },
  chevronIcon: {
    marginLeft: "auto", // Push chevron to the right if needed, or adjust layout
  },
  expandedListContainer: {
    paddingHorizontal: 15, // Indent the transaction list slightly
    paddingBottom: 10, // Space at the bottom of the expanded list
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#eee", // Separator line
    backgroundColor: "#fafafa", // Slightly different background for expanded area
  },
  expandedTransactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  expandedDetails: {
    flex: 1, // Allow text to take available space
    marginRight: 10,
  },
  expandedDate: {
    fontSize: 12,
    color: "#888",
  },
  expandedDescription: {
    fontSize: 14,
    color: "#444",
    marginTop: 2,
  },
  expandedAmount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#c0392b", // Match expense color
  },
  noTransactionsText: {
    paddingVertical: 15,
    textAlign: "center",
    color: "#888",
    fontStyle: "italic",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fafafa",
  },
  // --- Centered Loading/Error/Empty State ---
  centeredStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: -50, // Adjust to roughly center vertically
  },
  centeredStateText: {
    marginTop: 15,
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
  },
  errorText: {
    color: "red",
    fontWeight: "bold",
  },
  // --- FAB ---
  fab: {
    position: "absolute",
    bottom: 70, // Adjusted for bottom nav bar
    right: 20,
    backgroundColor: "#0F730C", // Dark green
    width: 56, // Standard FAB size
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
});

export default AnalysisScreen; // Export with the conventional name
