// c:\Users\scubo\OneDrive\Documents\FC_proj\FinClassify\FinClassifyApp\app\Budgets.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList, // Keep using FlatList
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  Timestamp, // Import Timestamp
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth"; // Import Firebase Auth

// Import components and config
import HeaderTopNav from "../components/headertopnav";
import BotNavigationBar from "../components/botnavigationbar"; // Corrected import name
import { app } from "../app/firebase"; // Adjust path if needed
import { useDateContext } from "./context/DateContext"; // Import the context hook
import { formatCurrency } from "../utils/formatting"; // Import shared function

// --- Firestore Initialization ---
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Auth

// --- Hardcoded Predefined Expense Categories (Base List) ---
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
  // Add other desired default categories here
];

// --- Interfaces ---
interface BudgetDefinition {
  id: string;
  categoryName: string;
  limit: number;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

// Re-using Transaction interface structure (ensure consistency)
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
  currentSpending: number; // Add current spending
}

// --- Helper Functions ---
// formatCurrency moved to utils/formatting.ts
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
// --- End Helper Functions ---

const BudgetsScreen = () => {
  const navigation = useNavigation();
  // Get date and filter from context
  const { selectedYear, selectedMonth, selectedFilter, selectedCurrency } =
    useDateContext(); // <-- Get selectedCurrency

  const [currentUser, setCurrentUser] = useState<User | null>(null); // State for the current user
  // State for budget limits fetched from 'budgets' collection
  const [budgetDefinitions, setBudgetDefinitions] = useState<
    BudgetDefinition[]
  >([]);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(true);
  const [errorBudgets, setErrorBudgets] = useState<string | null>(null);

  // State for user-defined categories fetched from 'Expenses' collection
  const [userExpenseCategories, setUserExpenseCategories] = useState<
    UserCategory[]
  >([]);
  const [isLoadingUserCategories, setIsLoadingUserCategories] = useState(true);
  const [errorUserCategories, setErrorUserCategories] = useState<string | null>(
    null
  );

  // State for the Add/Edit Budget Modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<
    string | null
  >(null);
  const [budgetLimit, setBudgetLimit] = useState<string>(""); // Input is string

  // State for fetched expense transactions
  const [expenseTransactions, setExpenseTransactions] = useState<Transaction[]>(
    []
  );
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [errorTransactions, setErrorTransactions] = useState<string | null>(
    null
  );

  // State to track already notified exceeded budgets for the current period
  const [notifiedExceededCategories, setNotifiedExceededCategories] = useState<
    Set<string>
  >(new Set());

  // --- Navigation Handler for FAB ---
  const navigateToTransaction = () => {
    navigation.navigate("transactions" as never); // Navigate to the transaction screen
  };

  // --- Listen for Auth State Changes ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        console.log("Budgets: No user logged in.");
        setIsLoadingBudgets(false);
        setIsLoadingUserCategories(false);
        setIsLoadingTransactions(false); // Stop transaction loading
        setErrorBudgets("Please log in to view budgets.");
        setBudgetDefinitions([]); // Clear data on logout
        setUserExpenseCategories([]);
        setExpenseTransactions([]); // Clear transactions
        setNotifiedExceededCategories(new Set()); // Reset notifications
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- Fetch User-Defined Expense Categories ('Expenses' collection) ---
  useEffect(() => {
    if (!currentUser) return; // Don't fetch if no user
    setIsLoadingUserCategories(true);
    setErrorUserCategories(null);
    const userCategoriesColRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "Expenses"
    ); // Use actual UID
    const qUser = query(userCategoriesColRef, orderBy("name"));

    const unsubscribeUserCats = onSnapshot(
      qUser,
      (snapshot) => {
        const fetchedUserCats: UserCategory[] = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              name: doc.data().name,
              icon: doc.data().icon || "help-circle-outline", // Ensure icon exists
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
  }, [currentUser]); // Re-run if user changes

  // --- Fetch Budget Definitions (Limits from 'budgets' collection) ---
  useEffect(() => {
    if (!currentUser || isLoadingUserCategories) {
      // Also check for user
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
    ); // Use actual UID

    // Firestore 'in' query limit is 30 as of latest check
    const categoryFilter =
      allCategoryNames.length > 0
        ? allCategoryNames.slice(0, 30)
        : ["__EMPTY_PLACEHOLDER__"]; // Use placeholder if no categories

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
  }, [currentUser, userExpenseCategories, isLoadingUserCategories]); // Add currentUser dependency

  // --- Fetch Expense Transactions based on Date Context and Filter ---
  useEffect(() => {
    if (!currentUser) return; // Don't fetch if user is not logged in

    setIsLoadingTransactions(true);
    setErrorTransactions(null);
    setExpenseTransactions([]); // Clear previous data
    setNotifiedExceededCategories(new Set()); // Reset notifications on period change

    // --- Calculate Date Range based on Filter ---
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
      const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
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
      // Monthly (default)
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
    // --- End Date Range Calculation ---

    const transactionsColRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "transactions"
    );

    // Query for EXPENSE transactions within the date range
    const q = query(
      transactionsColRef,
      where("type", "==", "Expenses"),
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<", endTimestamp)
      // No specific order needed for summing
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

    return () => unsubscribe(); // Cleanup listener
  }, [currentUser, selectedYear, selectedMonth, selectedFilter]); // Re-run when filter changes too

  // --- Calculate Display Items using useMemo ---
  const displayItems = useMemo(() => {
    // Wait for all data to load
    if (isLoadingBudgets || isLoadingUserCategories || isLoadingTransactions) {
      return [];
    }

    const combinedCategoriesMap = new Map<
      string,
      { name: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
    >();

    PREDEFINED_EXPENSE_CATEGORIES.forEach((cat) => {
      combinedCategoriesMap.set(cat.name, cat);
    });

    userExpenseCategories.forEach((userCat) => {
      if (!combinedCategoriesMap.has(userCat.name)) {
        combinedCategoriesMap.set(userCat.name, {
          name: userCat.name,
          icon: userCat.icon || "help-circle-outline",
        });
      }
    });

    const allCategories = Array.from(combinedCategoriesMap.values());

    // Calculate current spending per category for the period
    const spendingMap = new Map<string, number>();
    expenseTransactions.forEach((tx) => {
      if (tx.type === "Expenses") {
        const current = spendingMap.get(tx.categoryName) ?? 0;
        spendingMap.set(tx.categoryName, current + tx.amount);
      }
    });

    // Combine category info, budget limit, and current spending
    return allCategories
      .map((category) => {
        const budgetDef = budgetDefinitions.find(
          (b) => b.categoryName === category.name
        );
        const limit = budgetDef?.limit ?? 0;
        const budgetId = budgetDef?.id ?? null;
        const currentSpending = spendingMap.get(category.name) ?? 0; // Get spending
        return {
          categoryName: category.name,
          icon: category.icon,
          limit: limit,
          currentSpending: currentSpending, // Add spending to display data
          budgetId: budgetId,
        };
      })
      .sort((a, b) => {
        // Sort budgeted items first, then alphabetically
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
    expenseTransactions, // Depend on transactions
    isLoadingUserCategories,
    isLoadingTransactions, // Depend on transaction loading state
  ]);

  // --- Find the index of the first item without a budget ---
  // This is used to know where to place the "Not Budgeted" header
  const firstUnbudgetedIndex = useMemo(() => {
    return displayItems.findIndex(
      (item) => !(item.limit > 0 && item.budgetId !== null)
    );
  }, [displayItems]);

  // --- Effect to Check for Exceeded Budgets and Alert ---
  useEffect(() => {
    if (
      isLoadingBudgets ||
      isLoadingUserCategories ||
      isLoadingTransactions ||
      displayItems.length === 0
    ) {
      return; // Don't check if loading or no items
    }

    const newlyExceeded = displayItems.filter(
      (item) =>
        item.limit > 0 && // Must have a limit set
        item.currentSpending > item.limit && // Spending exceeds limit
        !notifiedExceededCategories.has(item.categoryName) // Not already notified in this period
    );

    if (newlyExceeded.length > 0) {
      const categoryNames = newlyExceeded
        .map((item) => item.categoryName)
        .join(", ");
      Alert.alert(
        "Budget Exceeded!",
        `You've exceeded your budget for: ${categoryNames}`
      );
      // Update the set of notified categories
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

  // --- Modal Handling ---
  const openModalForCategory = (item: BudgetDisplayData) => {
    setSelectedCategoryName(item.categoryName);
    setIsEditMode(!!item.budgetId);
    setEditingBudgetId(item.budgetId);
    setBudgetLimit(item.limit > 0 ? String(item.limit) : "");
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setIsEditMode(false);
    setEditingBudgetId(null);
    setSelectedCategoryName(null);
    setBudgetLimit("");
  };

  // --- Save/Update Budget Limit ---
  const handleSaveBudget = async () => {
    if (!currentUser) {
      Alert.alert("Login Required", "You must be logged in to save budgets.");
      return;
    }

    const limitValue = parseFloat(budgetLimit);

    if (!selectedCategoryName) {
      Alert.alert("Error", "Category not selected. Please try again.");
      return;
    }
    if (isNaN(limitValue) || limitValue <= 0) {
      Alert.alert(
        "Validation Error",
        "Please enter a valid positive number for the budget limit."
      );
      return;
    }

    // Find category info (icon) from combined list
    const allCategoriesMap = new Map<
      string,
      { name: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
    >();
    PREDEFINED_EXPENSE_CATEGORIES.forEach((cat) =>
      allCategoriesMap.set(cat.name, cat)
    );
    userExpenseCategories.forEach((userCat) => {
      if (!allCategoriesMap.has(userCat.name)) {
        allCategoriesMap.set(userCat.name, {
          name: userCat.name,
          icon: userCat.icon || "help-circle-outline",
        });
      }
    });

    const categoryInfo = allCategoriesMap.get(selectedCategoryName);

    if (!categoryInfo) {
      Alert.alert("Error", "Internal error: Category details not found.");
      return;
    }

    const budgetData = {
      categoryName: selectedCategoryName,
      limit: limitValue,
      icon: categoryInfo.icon, // Include icon for consistency
    };

    const budgetsColRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "budgets"
    ); // Use actual UID

    try {
      if (isEditMode && editingBudgetId) {
        // Update existing budget document
        const budgetDocRef = doc(budgetsColRef, editingBudgetId);
        await updateDoc(budgetDocRef, budgetData);
        Alert.alert(
          "Success",
          `Budget limit for "${selectedCategoryName}" updated.`
        );
      } else {
        // Check if a budget doc already exists for this category (shouldn't happen if editingBudgetId is null, but good practice)
        const existingBudget = budgetDefinitions.find(
          (b) => b.categoryName === selectedCategoryName
        );
        if (existingBudget) {
          // Update if found unexpectedly
          Alert.alert(
            "Info",
            `Budget for "${selectedCategoryName}" already exists. Updating limit.`
          );
          const budgetDocRef = doc(budgetsColRef, existingBudget.id);
          await updateDoc(budgetDocRef, budgetData);
        } else {
          // Add new budget document
          await addDoc(budgetsColRef, budgetData);
          Alert.alert(
            "Success",
            `Budget limit for "${selectedCategoryName}" set.`
          );
        }
      }
      closeModal(); // Close modal on success
    } catch (err: any) {
      console.error("Error saving budget:", err);
      Alert.alert(
        "Error",
        `Could not save budget limit. ${err.message || "Please try again."}`
      );
    }
  };

  // --- Delete Budget Limit ---
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
              currentUser.uid, // Use actual UID
              "budgets",
              budgetId
            );
            try {
              await deleteDoc(budgetDocRef);
              Alert.alert(
                "Success",
                `Budget limit for "${categoryName}" removed.`
              );
              // Firestore listener will update the UI
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

  // --- Rendering Logic ---

  // Renders a single budget item in the FlatList, potentially with a header
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

    // Check if this is the first item AND it has a budget
    if (index === 0 && hasBudgetSet) {
      header = (
        <Text style={styles.listSectionHeader}>Categories Budgeted</Text>
      );
    }
    // Check if this is the first item WITHOUT a budget
    else if (index === firstUnbudgetedIndex) {
      header = <Text style={styles.listSectionHeader}>Not Budgeted</Text>;
    }

    return (
      <>
        {/* Render the header if it exists */}
        {header}
        {/* Render the actual budget item */}
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
              {hasBudgetSet ? ( // Display spending vs limit if budget is set
                <View>
                  <Text
                    style={[
                      styles.budgetInfoText,
                      isOverBudget && styles.overBudgetAmount,
                    ]}
                  >
                    Spent:{" "}
                    {formatCurrency(item.currentSpending, selectedCurrency)} /{" "}
                    {/* Pass currency */}
                    {formatCurrency(item.limit, selectedCurrency)}{" "}
                    {/* Pass currency */}
                  </Text>
                  {/* Simple Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(spendingPercentage, 100)}%` }, // Cap at 100% width
                        isOverBudget && styles.overBudgetProgress, // Red color if over budget
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
                    // Prevent the parent TouchableOpacity from firing
                    e.stopPropagation();
                    handleDeleteBudget(item.budgetId, item.categoryName);
                  }}
                  style={styles.actionButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increase touch area
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={22}
                    color="#D32F2F" // Red color for delete
                  />
                </TouchableOpacity>
              ) : (
                // Render a placeholder to maintain layout consistency
                <View style={styles.actionButtonPlaceholder} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </>
    );
  };

  // Renders the main content area (Loading, Error, or List)
  const renderContent = () => {
    // Show message if user is not logged in (and auth check is done)
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

    const combinedError = [errorBudgets, errorUserCategories, errorTransactions] // Include transaction errors
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

    // Render the FlatList with the combined budget items
    return (
      <FlatList
        data={displayItems} // Use the sorted array
        renderItem={renderBudgetItem} // Use the updated render function
        keyExtractor={(item) => item.categoryName}
        style={styles.budgetList}
        contentContainerStyle={styles.budgetListContent}
        // Remove ListHeaderComponent, headers are now rendered inline
      />
    );
  };

  // --- Component Return JSX ---
  return (
    <>
      <View style={styles.container}>
        <HeaderTopNav />
        <View style={styles.content}>{renderContent()}</View>

        {/* --- Modal for Setting/Editing Budget Limit --- */}
        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeModal}
        >
          <View style={styles.modalBackdrop}>
            {/* Use ScrollView to help with keyboard covering input */}
            <ScrollView
              contentContainerStyle={styles.modalScrollViewContainer}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>
                  {isEditMode ? "Edit Budget Limit" : "Set Budget Limit"}
                </Text>
                {selectedCategoryName && (
                  <View style={styles.modalCategoryDisplay}>
                    <Text style={styles.modalLabel}>For Category:</Text>
                    <Text style={styles.modalCategoryName}>
                      {selectedCategoryName}
                    </Text>
                  </View>
                )}
                <Text style={styles.modalLabel}>Budget Limit (₱):</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., 5000"
                  keyboardType="numeric"
                  value={budgetLimit}
                  onChangeText={setBudgetLimit}
                  placeholderTextColor="#999"
                  autoFocus={true}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={closeModal}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalSaveButton,
                      // Disable if no user or invalid limit
                      (!currentUser ||
                        !budgetLimit ||
                        parseFloat(budgetLimit) <= 0) &&
                        styles.modalSaveButtonDisabled,
                    ]}
                    onPress={handleSaveBudget}
                    disabled={
                      !currentUser ||
                      !budgetLimit ||
                      parseFloat(budgetLimit) <= 0
                    }
                  >
                    <Text style={styles.modalSaveButtonText}>
                      {isEditMode ? "Update Limit" : "Set Limit"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        <TouchableOpacity style={styles.fab} onPress={navigateToTransaction}>
          <MaterialIcons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>
      <BotNavigationBar />
    </>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0", // Light grey background
  },
  content: {
    // This View wraps the FlatList or loading/error states
    flex: 1,
  },
  // Removed sectionTitle style as it's replaced by listSectionHeader
  listSectionHeader: {
    // Style for the new inline headers
    fontSize: 16,
    fontWeight: "bold",
    color: "#444", // Slightly darker than sectionTitle
    backgroundColor: "#f0f0f0", // Match list background
    paddingVertical: 8,
    paddingHorizontal: 15, // Match list padding
    marginTop: 10, // Add some space above the header
    marginBottom: 5, // Space between header and first item
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  budgetList: {
    flex: 1,
  },
  budgetListContent: {
    paddingHorizontal: 15, // Keep padding for items
    paddingBottom: 90, // Space for FAB and bottom nav
  },
  touchableItem: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#fff", // White background for items
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    // Remove marginHorizontal if list padding handles it
  },
  budgetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingLeft: 15,
    paddingRight: 10, // Reduced right padding to bring delete icon closer
    borderRadius: 8, // Match touchableItem
  },
  budgetIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#e0f2e0", // Light green background
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  budgetIcon: {
    color: "#006400", // Dark green icon
  },
  budgetDetails: {
    flex: 1, // Take available space
    marginRight: 10, // Space before action button
    justifyContent: "center", // Vertically center text
  },
  budgetCategoryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  budgetInfoText: {
    fontSize: 13, // Slightly smaller
    color: "#006400", // Green for set limit
    fontWeight: "500",
    marginTop: 2,
  },
  overBudgetAmount: {
    color: "#D32F2F", // Red color when over budget
    fontWeight: "bold",
  },
  budgetInfoTextMuted: {
    fontSize: 13,
    color: "#888", // Grey for placeholder text
    marginTop: 2,
    fontStyle: "italic",
  },
  progressBarContainer: {
    height: 6, // Thin progress bar
    backgroundColor: "#e0e0e0", // Light grey background
    borderRadius: 3,
    marginTop: 5, // Space above progress bar
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4CAF50", // Green fill
    borderRadius: 3,
  },
  budgetActions: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 38, // Ensure space for the button
  },
  actionButton: {
    padding: 8, // Make touch area slightly larger
  },
  actionButtonPlaceholder: {
    // To maintain layout when delete button isn't shown
    width: 38, // Match approx width of the icon + padding
    height: 38,
  },
  overBudgetProgress: {
    backgroundColor: "#D32F2F", // Red fill when over budget
  },
  centeredStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: -50, // Adjust to roughly center vertically
  },
  centeredStateText: {
    fontSize: 17,
    color: "#6c757d",
    marginTop: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  errorText: {
    color: "red",
    fontWeight: "bold",
  },
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
  // --- Modal Styles ---
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalScrollViewContainer: {
    // Allows modal content to scroll if keyboard appears
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40, // Add padding for spacing
    width: "100%",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 25,
    alignItems: "stretch", // Stretch children like input
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#006400", // Dark green title
    marginBottom: 20,
    textAlign: "center",
  },
  modalCategoryDisplay: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f8f9fa", // Light background for category display
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  modalCategoryName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
    fontWeight: "500",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 25,
    fontSize: 18, // Slightly larger for input
    backgroundColor: "#f9f9f9", // Light background for input
    color: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  modalButton: {
    flex: 1, // Equal width
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5, // Space between buttons
  },
  modalCancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ced4da",
  },
  modalSaveButton: {
    backgroundColor: "#DAA520", // Gold color
    borderWidth: 1,
    borderColor: "#DAA520",
  },
  modalSaveButtonDisabled: {
    backgroundColor: "#e9d8a1", // Lighter gold when disabled
    borderColor: "#e9d8a1",
    opacity: 0.7,
  },
  modalCancelButtonText: {
    color: "#495057",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalSaveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default BudgetsScreen;
