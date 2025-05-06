// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\analysis.tsx
import BottomNavigationBar from "@/components/botnavigationbar";
import HeaderTopNav from "@/components/headertopnav";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getAuth, onAuthStateChanged, User } from "firebase/auth"; // Import getAuth
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Import SafeAreaView
import { app } from "../app/firebase";
import SummaryModal from "../components/SummaryModal"; // Import the new modal
import { formatCurrency } from "../utils/formatting";
import { useDateContext } from "./context/DateContext";

const db = getFirestore(app);
const auth = getAuth(app);

interface Transaction {
  id: string;
  type: "Income" | "Expenses";
  categoryName: string;
  categoryIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  amount: number;
  timestamp: Timestamp;
  accountId: string | null;
  accountName?: string;
  description?: string;
}

interface CategorySpending {
  categoryName: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  totalAmount: number;
  transactionCount: number;
}

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

const ExpandedTransactionList = ({
  categoryName,
  transactions,
  selectedCurrency,
}: {
  categoryName: string;
  transactions: Transaction[];
  selectedCurrency: string;
}) => {
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
            {formatCurrency(transaction.amount, selectedCurrency)}
          </Text>
        </View>
      ))}
    </View>
  );
};

function AnalysisScreen() {
  const navigation = useNavigation();
  const { selectedYear, selectedMonth, selectedFilter, selectedCurrency } =
    useDateContext(); // Add selectedFilter

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [expenseTransactions, setExpenseTransactions] = useState<Transaction[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [totalMonthlyExpenses, setTotalMonthlyExpenses] = useState<number>(0);
  const [totalWeeklyExpenses, setTotalWeeklyExpenses] = useState<number>(0);
  const [totalDailyExpenses, setTotalDailyExpenses] = useState<number>(0);
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false); // State for modal

  const navigateToTransaction = () => {
    navigation.navigate("transactions" as never);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        console.log("Analysis: No user logged in.");
        setLoading(false);
        setError("Please log in to view analysis.");
        setExpenseTransactions([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);
    setExpenseTransactions([]);
    setExpandedCategory(null);

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
        setError("Invalid month selected.");
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
      where("type", "==", "Expenses"),
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<", endTimestamp),
      orderBy("timestamp", "desc")
    );

    console.log(
      // Updated log message
      `Analysis: Fetching expenses from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedExpenses: Transaction[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (
            data &&
            data.type === "Expenses" &&
            typeof data.categoryName === "string" &&
            typeof data.categoryIcon === "string" &&
            typeof data.amount === "number" &&
            data.timestamp instanceof Timestamp &&
            (typeof data.accountId === "string" || data.accountId === null)
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
              accountId: data.accountId,
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

    return () => unsubscribe();
  }, [currentUser, selectedYear, selectedMonth, selectedFilter]); // Add selectedFilter dependency

  useEffect(() => {
    if (loading || expenseTransactions.length === 0) {
      setTotalMonthlyExpenses(0);
      setTotalWeeklyExpenses(0);
      setTotalDailyExpenses(0);
      return;
    }

    // Calculate total expenses for the specific selected period
    const totalExpensesForPeriod: number = expenseTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0
    );

    // Update state based on the filter
    if (selectedFilter === "Daily") {
      setTotalDailyExpenses(totalExpensesForPeriod);
      setTotalWeeklyExpenses(0); // Reset others
      setTotalMonthlyExpenses(0);
    } else if (selectedFilter === "Weekly") {
      setTotalDailyExpenses(0);
      setTotalWeeklyExpenses(totalExpensesForPeriod);
      setTotalMonthlyExpenses(0);
    } else {
      // Monthly
      setTotalDailyExpenses(0);
      setTotalWeeklyExpenses(0);
      setTotalMonthlyExpenses(totalExpensesForPeriod);

      // Optional: Calculate averages if needed elsewhere, but not displayed here anymore
      const monthNumber = getMonthNumber(selectedMonth);
      if (monthNumber >= 0) {
        const daysInMonth = new Date(
          selectedYear,
          monthNumber + 1,
          0
        ).getDate();
        // const dailyAverage = daysInMonth > 0 ? totalExpensesForPeriod / daysInMonth : 0;
      }
    } // Added closing brace for the 'else' block
  }, [
    expenseTransactions,
    loading,
    selectedYear,
    selectedMonth,
    selectedFilter,
  ]); // Added selectedFilter dependency

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

    return Array.from(spendingMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );
  }, [expenseTransactions, loading]);

  const renderCategorySpendingItem = ({ item }: { item: CategorySpending }) => {
    const isExpanded = expandedCategory === item.categoryName;

    return (
      <View style={styles.itemWrapper}>
        <TouchableOpacity
          style={styles.itemContainer}
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
              {formatCurrency(item.totalAmount, selectedCurrency)}
            </Text>
            <MaterialIcons
              name={isExpanded ? "expand-less" : "expand-more"}
              size={24}
              color="#666"
              style={styles.chevronIcon}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <ExpandedTransactionList
            categoryName={item.categoryName}
            transactions={expenseTransactions}
            selectedCurrency={selectedCurrency}
          />
        )}
      </View>
    );
  };

  const renderContent = () => {
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

    // Header component now only contains the "View Summary" button
    const headerComponent = (
      <View style={styles.summaryButtonContainer}>
        <TouchableOpacity
          style={styles.summaryButton}
          onPress={() => setIsSummaryModalVisible(true)}
          disabled={loading || !currentUser}
        >
          <Text style={styles.summaryButtonText}>
            View {selectedFilter} Summary
          </Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <FlatList
        data={categorySpendingData}
        renderItem={renderCategorySpendingItem}
        keyExtractor={(item) => item.categoryName}
        style={styles.list}
        contentContainerStyle={styles.listContentContainer}
        ListHeaderComponent={headerComponent}
        extraData={expandedCategory}
      />
    );
  };

  return (
    <>
      {/* Use SafeAreaView for the main screen content area, excluding the bottom nav */}
      <SafeAreaView style={styles.safeAreaContainer}>
        {/* Header remains outside SafeAreaView */}
        <View style={styles.headerContainer}>
          <HeaderTopNav />
        </View>
        {/* Summary Modal */}
        <SummaryModal
          visible={isSummaryModalVisible}
          onClose={() => setIsSummaryModalVisible(false)}
          selectedFilter={selectedFilter}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedCurrency={selectedCurrency}
          currentUser={currentUser}
        />
        {/* Content area */}
        <View style={styles.mainContentContainer}>
          {renderContent()}
          {/* FAB */}
          {currentUser &&
            !loading && ( // Render FAB only if user is logged in and not loading
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
  headerContainer: {
    // Removed paddingTop
    backgroundColor: "#006400",
  },
  summaryButtonContainer: {
    // Container for the summary button
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 20,
  },
  summaryButton: {
    // Style for the summary button
    backgroundColor: "#DAA520", // Gold color
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    elevation: 3,
  },
  summaryButtonText: {
    // Text style for the summary button
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  list: {
    flex: 1,
  },
  listContentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 90,
  },
  itemWrapper: {
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#e0f2e0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  icon: {
    color: "#006400",
  },
  detailsContainer: {
    flex: 1,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  transactionCount: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 3,
  },
  amountAndChevron: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#c0392b",
    marginRight: 5,
  },
  chevronIcon: {
    marginLeft: "auto",
  },
  expandedListContainer: {
    paddingHorizontal: 15,
    paddingBottom: 10,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fafafa",
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
    flex: 1,
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
    color: "#c0392b",
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
  centeredStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: -50,
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
  fab: {
    position: "absolute",
    bottom: 20, // Adjusted bottom position
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
});

export default AnalysisScreen;
