// c:\Users\scubo\OneDrive\Documents\putangina\fc\components\SummaryModal.tsx
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../app/firebase";
import { formatCurrency } from "../utils/formatting";

// Interfaces (can be moved to a types file later)
interface Transaction {
  id: string;
  type: "Income" | "Expenses";
  categoryName: string;
  categoryIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  amount: number;
  timestamp: Timestamp;
}

interface BudgetDefinition {
  id: string;
  categoryName: string;
  limit: number;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

interface UserCategory {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

interface BudgetDisplayData {
  categoryName: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  limit: number;
  budgetId: string | null;
  currentSpending: number;
}

interface SummaryModalProps {
  visible: boolean;
  onClose: () => void;
  selectedFilter: "Daily" | "Weekly" | "Monthly";
  selectedYear: number;
  selectedMonth: string;
  selectedCurrency: string;
  currentUser: User | null;
}

const PREDEFINED_EXPENSE_CATEGORIES: Array<{
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { name: "Bills", icon: "file-document-outline" },
  { name: "Car", icon: "car" },
  { name: "Clothing", icon: "tshirt-crew" },
  { name: "Education", icon: "school" },
  { name: "Foods", icon: "food" },
  { name: "Health", icon: "heart-pulse" },
  { name: "House", icon: "home" },
  { name: "Leisure", icon: "movie" },
  { name: "Pets", icon: "paw" },
  { name: "Shopping", icon: "cart" },
  { name: "Sports", icon: "basketball" },
  { name: "Travel", icon: "train" },
];

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

const SummaryModal: React.FC<SummaryModalProps> = ({
  visible,
  onClose,
  selectedFilter,
  selectedYear,
  selectedMonth,
  selectedCurrency,
  currentUser,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetDefinitions, setBudgetDefinitions] = useState<
    BudgetDefinition[]
  >([]);
  const [userExpenseCategories, setUserExpenseCategories] = useState<
    UserCategory[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !currentUser) {
      // Reset state when modal is hidden or user logs out
      setTransactions([]);
      setBudgetDefinitions([]);
      setUserExpenseCategories([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const userId = currentUser.uid;

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
      const dayOfWeek = now.getDay();
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - dayOfWeek,
        0,
        0,
        0
      );
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + (7 - dayOfWeek),
        0,
        0,
        0
      );
    } else {
      // Monthly
      if (monthNumber < 0) {
        setError("Invalid month selected.");
        setIsLoading(false);
        return;
      }
      startDate = new Date(selectedYear, monthNumber, 1, 0, 0, 0);
      endDate = new Date(selectedYear, monthNumber + 1, 1, 0, 0, 0);
    }
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // --- Firestore Listeners ---
    const unsubscribers: (() => void)[] = [];
    let activeError: string | null = null;

    // 1. Fetch Transactions (Income & Expenses)
    const transactionsColRef = collection(
      db,
      "Accounts",
      userId,
      "transactions"
    );
    const qTransactions = query(
      transactionsColRef,
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<", endTimestamp)
    );
    unsubscribers.push(
      onSnapshot(
        qTransactions,
        (snapshot) => {
          const fetched: Transaction[] = snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              } as Transaction)
          );
          setTransactions(fetched);
        },
        (err) => {
          console.error("Error fetching transactions for summary:", err);
          activeError = "Failed to load transaction data.";
          setError(activeError);
        }
      )
    );

    // 2. Fetch User Expense Categories
    const userCategoriesColRef = collection(db, "Accounts", userId, "Expenses");
    unsubscribers.push(
      onSnapshot(
        userCategoriesColRef,
        (snapshot) => {
          const fetchedUserCats: UserCategory[] = snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                name: doc.data().name,
                icon: doc.data().icon || "help-circle-outline",
              } as UserCategory)
          );
          setUserExpenseCategories(fetchedUserCats);
        },
        (err) => {
          console.error("Error fetching user categories for summary:", err);
          activeError = "Failed to load category data.";
          setError(activeError);
        }
      )
    );

    // 3. Fetch Budget Definitions (dependent on categories)
    // We need to wait for categories to fetch first to build the 'in' query filter
    const unsubscribeUserCats = onSnapshot(
      userCategoriesColRef, // Listen again or use the state from above? Using state is simpler here.
      () => {
        // This runs whenever categories change, re-fetching budgets
        const predefinedNames = PREDEFINED_EXPENSE_CATEGORIES.map(
          (c) => c.name
        );
        const userNames = userExpenseCategories.map((c) => c.name); // Use state here
        const allCategoryNames = [
          ...new Set([...predefinedNames, ...userNames]),
        ];
        const budgetsColRef = collection(db, "Accounts", userId, "budgets");

        // Batch into groups of 10 for Firestore 'in' query
        const batches: string[][] = [];
        for (let i = 0; i < allCategoryNames.length; i += 10) {
          batches.push(allCategoryNames.slice(i, i + 10));
        }

        if (allCategoryNames.length > 10) {
          console.warn(
            "SummaryModal: More than 10 expense categories. Budget fetching will be batched due to Firestore 'in' query limits."
          );
        }

        let allBudgets: BudgetDefinition[] = [];
        let completed = 0;
        let hasError = false;
        const batchUnsubs: (() => void)[] = [];

        if (allCategoryNames.length === 0) {
          setBudgetDefinitions([]);
          if (!activeError) setIsLoading(false);
          return;
        }

        batches.forEach((categoryFilter) => {
          const qBudget = query(
            budgetsColRef,
            where("categoryName", "in", categoryFilter)
          );
          const unsub = onSnapshot(
            qBudget,
            (snapshot) => {
              if (hasError) return;
              const fetchedBudgets: BudgetDefinition[] = snapshot.docs.map(
                (doc) =>
                  ({
                    id: doc.id,
                    ...doc.data(),
                  } as BudgetDefinition)
              );
              allBudgets = [...allBudgets, ...fetchedBudgets];
              completed += 1;
              if (completed === batches.length) {
                // Deduplicate by categoryName
                const uniqueBudgets = new Map<string, BudgetDefinition>();
                allBudgets.forEach((b) => {
                  uniqueBudgets.set(b.categoryName, b);
                });
                setBudgetDefinitions(Array.from(uniqueBudgets.values()));
                if (!activeError) setIsLoading(false);
              }
            },
            (err) => {
              if (hasError) return;
              hasError = true;
              console.error(
                "Error fetching budget definitions for summary:",
                err
              );
              activeError = "Failed to load budget limits.";
              setError(activeError);
              setIsLoading(false);
            }
          );
          batchUnsubs.push(unsub);
        });

        unsubscribers.push(() => batchUnsubs.forEach((u) => u()));
      },
      (err) => {
        // Error fetching categories initially
        console.error("Error fetching user categories for budget query:", err);
        activeError = "Failed to load category data for budgets.";
        setError(activeError);
        setIsLoading(false);
      }
    );
    unsubscribers.push(unsubscribeUserCats); // Add category listener to unsub list

    // Cleanup function
    return () => {
      console.log("SummaryModal: Unsubscribing listeners.");
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [visible, currentUser, selectedFilter, selectedYear, selectedMonth]); // Re-run when modal visibility or context changes

  // --- Calculations ---
  const totalIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "Income")
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const totalExpenses = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "Expenses")
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const netIncome = useMemo(
    () => totalIncome - totalExpenses,
    [totalIncome, totalExpenses]
  );

  const budgetDisplayItems = useMemo(() => {
    const combinedCategoriesMap = new Map<
      string,
      { name: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
    >();
    PREDEFINED_EXPENSE_CATEGORIES.forEach((cat) =>
      combinedCategoriesMap.set(cat.name, cat)
    );
    userExpenseCategories.forEach((userCat) => {
      if (!combinedCategoriesMap.has(userCat.name)) {
        combinedCategoriesMap.set(userCat.name, {
          name: userCat.name,
          icon: userCat.icon || "help-circle-outline",
        });
      }
    });
    const allCategories = Array.from(combinedCategoriesMap.values());

    const spendingMap = new Map<string, number>();
    transactions.forEach((tx) => {
      if (tx.type === "Expenses") {
        const current = spendingMap.get(tx.categoryName) ?? 0;
        spendingMap.set(tx.categoryName, current + tx.amount);
      }
    });

    return allCategories
      .map((category) => {
        const budgetDef = budgetDefinitions.find(
          (b) => b.categoryName === category.name
        );
        const limit = budgetDef?.limit ?? 0;
        const budgetId = budgetDef?.id ?? null;
        const currentSpending = spendingMap.get(category.name) ?? 0;
        return {
          categoryName: category.name,
          icon: category.icon,
          limit: limit,
          currentSpending: currentSpending,
          budgetId: budgetId,
        };
      })
      .filter((item) => item.limit > 0) // Only show items with a set budget
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [budgetDefinitions, userExpenseCategories, transactions]);

  const getPeriodLabel = () => {
    switch (selectedFilter) {
      case "Daily":
        return "Today";
      case "Weekly":
        return "This Week";
      case "Monthly":
        return `${selectedMonth} ${selectedYear}`;
      default:
        return "";
    }
  };

  const renderBudgetSection = () => {
    if (budgetDisplayItems.length === 0) {
      return <Text style={styles.noDataText}>No budgets set.</Text>;
    }

    return budgetDisplayItems.map((item) => {
      const isOverBudget = item.currentSpending > item.limit;
      const spendingPercentage = (item.currentSpending / item.limit) * 100;

      return (
        <View key={item.budgetId} style={styles.budgetItem}>
          <MaterialCommunityIcons
            name={item.icon}
            size={22}
            color="#006400"
            style={styles.budgetIcon}
          />
          <View style={styles.budgetDetails}>
            <Text style={styles.budgetCategoryTitle}>{item.categoryName}</Text>
            <Text
              style={[
                styles.budgetInfoText,
                isOverBudget && styles.overBudgetAmount,
              ]}
            >
              {formatCurrency(item.currentSpending, selectedCurrency)} /{" "}
              {formatCurrency(item.limit, selectedCurrency)}
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(spendingPercentage, 100)}%` },
                  isOverBudget && styles.overBudgetProgress,
                ]}
              />
            </View>
          </View>
        </View>
      );
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafeArea}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedFilter} Summary</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView}>
            {isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#006400" />
                <Text style={styles.loadingText}>Loading Summary...</Text>
              </View>
            ) : error ? (
              <View style={styles.centered}>
                <MaterialIcons name="error-outline" size={40} color="red" />
                <Text style={[styles.loadingText, styles.errorText]}>
                  {error}
                </Text>
              </View>
            ) : (
              <>
                {/* --- Income/Expense Summary --- */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>
                    Overview for {getPeriodLabel()}
                  </Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Income:</Text>
                    <Text style={[styles.summaryValue, styles.incomeValue]}>
                      {formatCurrency(totalIncome, selectedCurrency)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Expenses:</Text>
                    <Text style={[styles.summaryValue, styles.expenseValue]}>
                      {formatCurrency(totalExpenses, selectedCurrency)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.netRow]}>
                    <Text style={[styles.summaryLabel, styles.netLabel]}>
                      Net ({netIncome >= 0 ? "Saved" : "Overspent"}):
                    </Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        styles.netValue,
                        netIncome < 0 && styles.expenseValue, // Red if negative
                      ]}
                    >
                      {formatCurrency(netIncome, selectedCurrency)}
                    </Text>
                  </View>
                </View>

                {/* --- Budget Summary --- */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Budget Progress</Text>
                  {renderBudgetSection()}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalSafeArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end", // Slide up from bottom
  },
  modalContainer: {
    backgroundColor: "#f8f9fa",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 0, // Remove padding, header/scrollview handle it
    maxHeight: "85%", // Limit height
    minHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "center", // Center title
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    position: "absolute",
    right: 15,
    top: 10,
    padding: 5,
  },
  modalScrollView: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30, // Add padding at the bottom
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  summarySection: {
    marginBottom: 25,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#006400",
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#555",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  incomeValue: {
    color: "#28a745", // Green for income
  },
  expenseValue: {
    color: "#dc3545", // Red for expenses
  },
  netRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  netLabel: {
    fontWeight: "bold",
  },
  netValue: {
    fontSize: 17,
    fontWeight: "bold",
  },
  noDataText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    paddingVertical: 10,
    fontStyle: "italic",
  },
  // Budget Item Styles (copied from Budgets.tsx, adjust as needed)
  budgetItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  budgetIcon: {
    marginRight: 12,
  },
  budgetDetails: {
    flex: 1,
  },
  budgetCategoryTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 3,
  },
  budgetInfoText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
  },
  overBudgetAmount: {
    color: "#D32F2F",
    fontWeight: "bold",
  },
  progressBarContainer: {
    height: 5,
    backgroundColor: "#e0e0e0",
    borderRadius: 2.5,
    marginTop: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 2.5,
  },
  overBudgetProgress: {
    backgroundColor: "#D32F2F",
  },
});

export default SummaryModal;
