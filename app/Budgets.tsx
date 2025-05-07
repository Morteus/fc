// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\Budgets.tsx
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Import SafeAreaView

import { auth, db } from "../app/firebase";
import BotNavigationBar from "../components/botnavigationbar";
import HeaderTopNav from "../components/headertopnav";
import { formatCurrency } from "../utils/formatting"; // Import CURRENCY_SYMBOLS
import { useDateContext } from "./context/DateContext";

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

interface BudgetDefinition {
  id: string;
  categoryName: string;
  limit: number;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  resetPeriod: "Daily" | "Weekly" | "Monthly"; // Add reset period
  lastResetDate: Timestamp; // Track last reset
}

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

interface UserCategory {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description?: string | null;
}

interface BudgetDisplayData {
  categoryName: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  limit: number;
  budgetId: string | null;
  currentSpending: number;
  resetPeriod?: "Daily" | "Weekly" | "Monthly"; // Add this field
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

type NavigationProps = {
  navigate: (screen: string, params?: any) => void;
};

const BudgetsScreen = () => {
  const navigation = useNavigation<NavigationProps>();
  const { selectedYear, selectedMonth, selectedFilter, selectedCurrency } =
    useDateContext();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [budgetDefinitions, setBudgetDefinitions] = useState<
    BudgetDefinition[]
  >([]);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(true);
  const [errorBudgets, setErrorBudgets] = useState<string | null>(null);

  const [userExpenseCategories, setUserExpenseCategories] = useState<
    UserCategory[]
  >([]);
  const [isLoadingUserCategories, setIsLoadingUserCategories] = useState(true);
  const [errorUserCategories, setErrorUserCategories] = useState<string | null>(
    null
  );

  const [expenseTransactions, setExpenseTransactions] = useState<Transaction[]>(
    []
  );
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [errorTransactions, setErrorTransactions] = useState<string | null>(
    null
  );

  const [notifiedExceededCategories, setNotifiedExceededCategories] = useState<
    Set<string>
  >(new Set());

  const navigateToTransaction = () => {
    navigation.navigate("transactions" as never);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        console.log("Budgets: No user logged in.");
        setIsLoadingBudgets(false);
        setIsLoadingUserCategories(false);
        setIsLoadingTransactions(false);
        setErrorBudgets("Please log in to view budgets.");
        setBudgetDefinitions([]);
        setUserExpenseCategories([]);
        setExpenseTransactions([]);
        setNotifiedExceededCategories(new Set());
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setIsLoadingUserCategories(true);
    setErrorUserCategories(null);
    const userCategoriesColRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "Expenses"
    );
    const qUser = query(userCategoriesColRef, orderBy("name"));

    const unsubscribeUserCats = onSnapshot(
      qUser,
      (snapshot) => {
        const fetchedUserCats: UserCategory[] = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              name: doc.data().name,
              icon: doc.data().icon || "help-circle-outline",
              description: doc.data().description,
            } as UserCategory)
        );
        setUserExpenseCategories(fetchedUserCats);
        setIsLoadingUserCategories(false);
      },
      (err) => {
        console.error("Error fetching user expense categories:", err);
        setErrorUserCategories(
          `Failed to load custom categories. ${
            err.code === "permission-denied" ? "Check Firestore rules." : ""
          }`
        );
        setIsLoadingUserCategories(false);
      }
    );
    return () => unsubscribeUserCats();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || isLoadingUserCategories) {
      setIsLoadingBudgets(true);
      return;
    }
    setIsLoadingBudgets(true);
    setErrorBudgets(null);

    const predefinedNames = PREDEFINED_EXPENSE_CATEGORIES.map((c) => c.name);
    const userNames = userExpenseCategories.map((c) => c.name);
    const allCategoryNames = [...new Set([...predefinedNames, ...userNames])];
    const budgetsColRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "budgets"
    );
    const categoryFilter =
      allCategoryNames.length > 0
        ? allCategoryNames.slice(0, 30)
        : ["__EMPTY_PLACEHOLDER__"];

    if (allCategoryNames.length > 30) {
      console.warn(
        "Warning: More than 30 expense categories detected. Budget fetching might be incomplete due to Firestore 'in' query limits."
      );
    }

    const qBudget = query(
      budgetsColRef,
      where("categoryName", "in", categoryFilter)
    );

    const unsubscribeBudgets = onSnapshot(
      qBudget,
      (snapshot) => {
        const fetchedBudgets: BudgetDefinition[] = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as BudgetDefinition)
        );
        setBudgetDefinitions(fetchedBudgets);
        setIsLoadingBudgets(false);
      },
      (err) => {
        console.error("Error fetching budget definitions:", err);
        setErrorBudgets(
          `Failed to load budget limits. ${
            err.code === "permission-denied" ? "Check Firestore rules." : ""
          }`
        );
        setIsLoadingBudgets(false);
      }
    );
    return () => unsubscribeBudgets();
  }, [currentUser, userExpenseCategories, isLoadingUserCategories]);

  useEffect(() => {
    if (!currentUser) return;

    setIsLoadingTransactions(true);
    setErrorTransactions(null);
    setExpenseTransactions([]);
    setNotifiedExceededCategories(new Set());

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
      if (monthNumber < 0) {
        setErrorTransactions("Invalid month selected.");
        setIsLoadingTransactions(false);
        return;
      }
      startDate = new Date(selectedYear, monthNumber, 1, 0, 0, 0);
      endDate = new Date(selectedYear, monthNumber + 1, 1, 0, 0, 0);
    }
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const transactionsColRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "transactions"
    );
    const q = query(
      transactionsColRef,
      where("type", "==", "Expenses"),
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<", endTimestamp)
    );

    console.log(
      `Budgets: Fetching expenses from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedExpenses: Transaction[] = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Transaction)
        );
        setExpenseTransactions(fetchedExpenses);
        setIsLoadingTransactions(false);
      },
      (err) => {
        console.error("Budgets: Error fetching expense transactions:", err);
        setErrorTransactions(
          `Failed to load spending data. ${
            err.code === "permission-denied" ? "Check Firestore rules." : ""
          }`
        );
        setIsLoadingTransactions(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser, selectedYear, selectedMonth, selectedFilter]);

  const displayItems = useMemo(() => {
    if (isLoadingBudgets || isLoadingUserCategories || isLoadingTransactions)
      return [];

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
    expenseTransactions.forEach((tx) => {
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
          resetPeriod: budgetDef?.resetPeriod ?? "Monthly", // Add this line
        };
      })
      .sort((a, b) => {
        const aHasBudget = a.limit > 0 && a.budgetId !== null;
        const bHasBudget = b.limit > 0 && b.budgetId !== null;
        if (aHasBudget && !bHasBudget) return -1;
        if (!aHasBudget && bHasBudget) return 1;
        return a.categoryName.localeCompare(b.categoryName);
      });
  }, [
    budgetDefinitions,
    isLoadingBudgets,
    userExpenseCategories,
    expenseTransactions,
    isLoadingUserCategories,
    isLoadingTransactions,
  ]);

  const firstUnbudgetedIndex = useMemo(() => {
    return displayItems.findIndex(
      (item) => !(item.limit > 0 && item.budgetId !== null)
    );
  }, [displayItems]);

  useEffect(() => {
    if (
      isLoadingBudgets ||
      isLoadingUserCategories ||
      isLoadingTransactions ||
      displayItems.length === 0
    )
      return;

    const newlyExceeded = displayItems.filter(
      (item) =>
        item.limit > 0 &&
        item.currentSpending > item.limit &&
        !notifiedExceededCategories.has(item.categoryName)
    );

    if (newlyExceeded.length > 0) {
      const categoryNames = newlyExceeded
        .map((item) => item.categoryName)
        .join(", ");
      Alert.alert(
        "Budget Exceeded!",
        `You've exceeded your budget for: ${categoryNames}`
      );
      setNotifiedExceededCategories((prev) => {
        const newSet = new Set(prev);
        newlyExceeded.forEach((item) => newSet.add(item.categoryName));
        return newSet;
      });
    }
  }, [
    displayItems,
    isLoadingBudgets,
    isLoadingUserCategories,
    isLoadingTransactions,
    notifiedExceededCategories,
  ]);

  const checkBudgetAlert = (spending: number, limit: number) => {
    const percentage = (spending / limit) * 100;
    if (percentage >= 100) {
      Alert.alert("Budget Exceeded!", "You have exceeded your budget limit.");
    } else if (percentage >= 90) {
      Alert.alert("Budget Alert", "You are at 90% of your budget limit!");
    } else if (percentage >= 75) {
      Alert.alert("Budget Warning", "You are at 75% of your budget limit.");
    }
  };

  const openModalForCategory = (item: BudgetDisplayData) => {
    navigation.navigate("setbudget", {
      categoryName: item.categoryName,
      icon: item.icon,
      budgetId: item.budgetId,
      currentLimit: item.limit,
      resetPeriod: item.resetPeriod || "Monthly", // Add default value
    });
  };

  const handleDeleteBudget = (
    budgetId: string | null,
    categoryName: string
  ) => {
    if (!currentUser) {
      Alert.alert("Login Required", "You must be logged in to delete budgets.");
      return;
    }
    if (!budgetId) {
      Alert.alert(
        "Info",
        `No budget limit is currently set for "${categoryName}".`
      );
      return;
    }

    Alert.alert(
      "Delete Budget Limit",
      `Are you sure you want to remove the budget limit for "${categoryName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Limit",
          style: "destructive",
          onPress: async () => {
            const budgetDocRef = doc(
              db,
              "Accounts",
              currentUser.uid,
              "budgets",
              budgetId
            );
            try {
              await deleteDoc(budgetDocRef);
              Alert.alert(
                "Success",
                `Budget limit for "${categoryName}" removed.`
              );
            } catch (err: any) {
              console.error("Error deleting budget limit:", err);
              Alert.alert(
                "Error",
                `Could not remove budget limit. ${
                  err.message || "Please try again."
                }`
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderBudgetItem = ({
    item,
    index,
  }: {
    item: BudgetDisplayData;
    index: number;
  }) => {
    const hasBudgetSet = item.limit > 0 && item.budgetId !== null;
    const isOverBudget = hasBudgetSet && item.currentSpending > item.limit;
    const spendingPercentage = hasBudgetSet
      ? (item.currentSpending / item.limit) * 100
      : 0;
    let header = null;

    if (index === 0 && hasBudgetSet) {
      header = (
        <Text style={styles.listSectionHeader}>Categories Budgeted</Text>
      );
    } else if (index === firstUnbudgetedIndex) {
      header = <Text style={styles.listSectionHeader}>Not Budgeted</Text>;
    }

    return (
      <>
        {header}
        <TouchableOpacity
          onPress={() => openModalForCategory(item)}
          activeOpacity={0.7}
          style={styles.touchableItem}
        >
          <View style={styles.budgetItem}>
            <View style={styles.budgetIconContainer}>
              <MaterialCommunityIcons
                name={item.icon}
                size={26}
                color={styles.budgetIcon.color}
              />
            </View>
            <View style={styles.budgetDetails}>
              <Text style={styles.budgetCategoryTitle}>
                {item.categoryName}
              </Text>
              {hasBudgetSet ? (
                <View>
                  <Text
                    style={[
                      styles.budgetInfoText,
                      isOverBudget && styles.overBudgetAmount,
                    ]}
                  >
                    Spent:{" "}
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
              ) : (
                <Text style={styles.budgetInfoTextMuted}>
                  Tap to set budget limit
                </Text>
              )}
            </View>
            <View style={styles.budgetActions}>
              {hasBudgetSet ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteBudget(item.budgetId, item.categoryName);
                  }}
                  style={styles.actionButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={22}
                    color="#D32F2F"
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.actionButtonPlaceholder} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </>
    );
  };

  const renderContent = () => {
    if (
      !currentUser &&
      !isLoadingBudgets &&
      !isLoadingUserCategories &&
      !isLoadingTransactions
    ) {
      return (
        <View style={styles.centeredStateContainer}>
          <MaterialIcons name="login" size={40} color="#888" />
          <Text style={styles.centeredStateText}>
            {errorBudgets || "Please log in."}
          </Text>
        </View>
      );
    }
    if (isLoadingBudgets || isLoadingUserCategories || isLoadingTransactions) {
      return (
        <View style={styles.centeredStateContainer}>
          <ActivityIndicator size="large" color="#006400" />
          <Text style={styles.centeredStateText}>Loading Budgets...</Text>
        </View>
      );
    }

    const combinedError = [errorBudgets, errorUserCategories, errorTransactions]
      .filter(Boolean)
      .join("\n");
    if (combinedError) {
      return (
        <View style={styles.centeredStateContainer}>
          <MaterialIcons name="error-outline" size={40} color="red" />
          <Text style={[styles.centeredStateText, styles.errorText]}>
            {combinedError}
          </Text>
        </View>
      );
    }

    if (displayItems.length === 0) {
      return (
        <View style={styles.centeredStateContainer}>
          <MaterialIcons name="list-alt" size={60} color="#ccc" />
          <Text style={styles.centeredStateText}>
            No budget categories found.
          </Text>
          <Text style={styles.centeredStateText}>
            Add categories in Transactions.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={displayItems}
        renderItem={renderBudgetItem}
        keyExtractor={(item) => item.categoryName}
        style={styles.budgetList}
        contentContainerStyle={styles.budgetListContent}
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
        {/* Content area */}
        <View style={styles.content}>
          {renderContent()}
          {/* FAB */}
          {currentUser &&
            !isLoadingBudgets &&
            !isLoadingUserCategories &&
            !isLoadingTransactions && (
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
      <BotNavigationBar />
    </>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#f0f0f0", // Match background
  },
  // container style removed
  headerContainer: {
    // Removed paddingTop
    backgroundColor: "#006400",
  },
  content: {
    flex: 1, // Takes remaining space
  },
  listSectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#444",
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginTop: 10,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  budgetList: { flex: 1 },
  budgetListContent: { paddingHorizontal: 15, paddingBottom: 90 },
  touchableItem: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  budgetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingLeft: 15,
    paddingRight: 10,
    borderRadius: 8,
  },
  budgetIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#e0f2e0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  budgetIcon: { color: "#006400" },
  budgetDetails: { flex: 1, marginRight: 10, justifyContent: "center" },
  budgetCategoryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  budgetInfoText: {
    fontSize: 13,
    color: "#006400",
    fontWeight: "500",
    marginTop: 2,
  },
  overBudgetAmount: { color: "#D32F2F", fontWeight: "bold" },
  budgetInfoTextMuted: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
    fontStyle: "italic",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    marginTop: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 3,
  },
  budgetActions: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 38,
  },
  actionButton: { padding: 8 },
  actionButtonPlaceholder: { width: 38, height: 38 },
  overBudgetProgress: { backgroundColor: "#D32F2F" },
  centeredStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: -50,
  },
  centeredStateText: {
    fontSize: 17,
    color: "#6c757d",
    marginTop: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  errorText: { color: "red", fontWeight: "bold" },
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
});

export default BudgetsScreen;
