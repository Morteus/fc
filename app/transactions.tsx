// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\transactions.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useNavigation } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../app/firebase";
import AddExpenseCategoryModal from "../components/AddExpenseModal";
import AddIncomeCategoryModal from "../components/AddIncomeModal";
import { formatCurrency } from "../utils/formatting";
import { useDateContext } from "./context/DateContext";

// --- Interfaces ---
interface Category {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description?: string | null;
  isDefault?: boolean;
}

interface Account {
  id: string;
  title: string;
  iconName: string;
}

interface AccountImageOption {
  id: string;
  source: ImageSourcePropType;
  name: string;
}
const CardsSource = require("../assets/CAImages/Cards.png");
const MoneySource = require("../assets/CAImages/Money.png");
const PiggybankSource = require("../assets/CAImages/Piggybank.png");
const StoreSource = require("../assets/CAImages/Store.png");
const WalletSource = require("../assets/CAImages/Wallet.png");

const accountIconOptions: AccountImageOption[] = [
  { id: "1", source: CardsSource, name: "Cards" },
  { id: "2", source: MoneySource, name: "Money" },
  { id: "3", source: PiggybankSource, name: "Piggybank" },
  { id: "4", source: StoreSource, name: "Store" },
  { id: "5", source: WalletSource, name: "Wallet" },
];

const initialIncomeCategories: Category[] = [
  {
    id: "inc1",
    name: "Awards",
    icon: "trophy",
    description: "Prize money or awards received",
    isDefault: true,
  },
  {
    id: "inc2",
    name: "Lottery",
    icon: "ticket",
    description: "Winnings from lottery",
    isDefault: true,
  },
  {
    id: "inc3",
    name: "Refunds",
    icon: "credit-card-refund",
    description: "Money received as a refund",
    isDefault: true,
  },
  {
    id: "inc4",
    name: "Rental",
    icon: "home-city",
    description: "Income from rental properties",
    isDefault: true,
  },
  {
    id: "inc5",
    name: "Salary",
    icon: "cash",
    description: "Regular salary or wages",
    isDefault: true,
  },
  {
    id: "inc6",
    name: "Sale",
    icon: "tag",
    description: "Income from selling items",
    isDefault: true,
  },
];

const initialExpenseCategories: Category[] = [
  {
    id: "exp1",
    name: "Bills",
    icon: "file-document-outline",
    description: "Utility bills, subscriptions, etc.",
    isDefault: true,
  },
  {
    id: "exp2",
    name: "Car",
    icon: "car",
    description: "Fuel, maintenance, insurance",
    isDefault: true,
  },
  {
    id: "exp3",
    name: "Clothing",
    icon: "tshirt-crew",
    description: "Apparel purchases",
    isDefault: true,
  },
  {
    id: "exp4",
    name: "Education",
    icon: "school",
    description: "Tuition, books, courses",
    isDefault: true,
  },
  {
    id: "exp5",
    name: "Foods",
    icon: "food",
    description: "Groceries, dining out",
    isDefault: true,
  },
  {
    id: "exp6",
    name: "Health",
    icon: "heart-pulse",
    description: "Medical expenses, pharmacy",
    isDefault: true,
  },
  {
    id: "exp7",
    name: "House",
    icon: "home",
    description: "Rent, mortgage, repairs",
    isDefault: true,
  },
  {
    id: "exp8",
    name: "Leisure",
    icon: "movie",
    description: "Entertainment, hobbies",
    isDefault: true,
  },
  {
    id: "exp9",
    name: "Pets",
    icon: "paw",
    description: "Pet food, vet visits",
    isDefault: true,
  },
  {
    id: "exp10",
    name: "Shopping",
    icon: "cart",
    description: "General shopping",
    isDefault: true,
  },
  {
    id: "exp11",
    name: "Sports",
    icon: "basketball",
    description: "Gym, sports equipment",
    isDefault: true,
  },
  {
    id: "exp12",
    name: "Travel",
    icon: "train",
    description: "Transportation, accommodation",
    isDefault: true,
  },
];

const getIconSourceFromName = (
  iconName: string | undefined
): ImageSourcePropType => {
  const foundOption = accountIconOptions.find(
    (option) => option.name === iconName
  );
  return foundOption ? foundOption.source : WalletSource;
};

const suggestCategory = (
  description: string,
  categories: Category[]
): Category | null => {
  if (!description) return null;
  const lowerDesc = description.toLowerCase();
  const rules: { [keyword: string]: string } = {
    coffee: "Foods",
    starbucks: "Foods",
    jollibee: "Foods",
    mcdonalds: "Foods",
    grocery: "Foods",
    restaurant: "Foods",
    gas: "Car",
    shell: "Car",
    petron: "Car",
    parking: "Car",
    netflix: "Bills",
    spotify: "Bills",
    utility: "Bills",
    rent: "House",
    mortgage: "House",
    movie: "Leisure",
    cinema: "Leisure",
    shirt: "Clothing",
    pants: "Clothing",
    shoes: "Clothing",
    amazon: "Shopping",
    lazada: "Shopping",
    shopee: "Shopping",
    salary: "Salary",
    refund: "Refunds",
  };
  for (const keyword in rules) {
    if (lowerDesc.includes(keyword)) {
      const categoryName = rules[keyword];
      const foundCategory = categories.find(
        (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
      );
      if (foundCategory) {
        console.log(
          `Suggested category '${foundCategory.name}' based on keyword '${keyword}'`
        );
        return foundCategory;
      }
    }
  }
  return null;
};

const checkBudgetStatus = async (
  userId: string,
  categoryName: string,
  newExpenseAmount: number,
  selectedCurrency: string // Add this parameter
) => {
  try {
    // Get the budget for this category
    const budgetsRef = collection(db, "Accounts", userId, "budgets");
    const budgetQuery = query(
      budgetsRef,
      where("categoryName", "==", categoryName)
    );
    const budgetSnap = await getDocs(budgetQuery);

    if (!budgetSnap.empty) {
      const budgetData = budgetSnap.docs[0].data();
      const budgetLimit = budgetData.limit;

      // Get current spending for this category
      const transactionsRef = collection(
        db,
        "Accounts",
        userId,
        "transactions"
      );
      const now = new Date();
      let startDate: Date;

      // Calculate start date based on reset period
      switch (budgetData.resetPeriod) {
        case "Daily":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "Weekly":
          const day = now.getDay();
          startDate = new Date(now.setDate(now.getDate() - day));
          break;
        case "Monthly":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.setHours(0, 0, 0, 0));
      }

      const spendingQuery = query(
        transactionsRef,
        where("type", "==", "Expenses"),
        where("categoryName", "==", categoryName),
        where("timestamp", ">=", startDate)
      );

      const spendingSnap = await getDocs(spendingQuery);
      const currentSpending = spendingSnap.docs.reduce(
        (sum, doc) => sum + doc.data().amount,
        0
      );

      const totalWithNew = currentSpending + newExpenseAmount;
      const percentageAfterNew = (totalWithNew / budgetLimit) * 100;

      // Return budget status with selectedCurrency parameter
      if (percentageAfterNew >= 100) {
        return {
          status: "exceeded",
          message: `This expense will exceed your ${categoryName} budget by ${formatCurrency(
            totalWithNew - budgetLimit,
            selectedCurrency
          )}!`,
        };
      } else if (percentageAfterNew >= 90) {
        return {
          status: "warning",
          message: `This expense will bring you to ${percentageAfterNew.toFixed(
            0
          )}% of your ${categoryName} budget!`,
        };
      } else if (percentageAfterNew >= 75) {
        return {
          status: "caution",
          message: `This expense will bring you to ${percentageAfterNew.toFixed(
            0
          )}% of your ${categoryName} budget.`,
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error checking budget status:", error);
    return null;
  }
};

const TransactionScreen = () => {
  const navigation = useNavigation();
  const { selectedCurrency } = useDateContext();
  const [transactionType, setTransactionType] = useState<"Expenses" | "Income">(
    "Expenses"
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>(
    initialIncomeCategories
  );
  const [expenseCategories, setExpenseCategories] = useState<Category[]>(
    initialExpenseCategories
  );
  const [isAddCategoryModalVisible, setIsAddCategoryModalVisible] =
    useState(false);
  const [isAmountModalVisible, setIsAmountModalVisible] = useState(false);
  const [selectedCategoryForAmount, setSelectedCategoryForAmount] =
    useState<Category | null>(null);
  const [amount, setAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(
    null
  );

  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [errorAccounts, setErrorAccounts] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const [showBudgetWarningModal, setShowBudgetWarningModal] = useState(false);
  const [budgetWarningMessage, setBudgetWarningMessage] = useState("");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        console.log("Transactions: No user logged in.");
        setErrorAccounts("Login required to add transactions.");
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const incomeCollectionRef = collection(
      db,
      "Accounts",
      currentUser?.uid || "__nouser__",
      "Income"
    );
    const incomeQuery = query(incomeCollectionRef, orderBy("name"));
    const unsubscribeIncome = onSnapshot(
      incomeQuery,
      (querySnapshot) => {
        const fetchedIncomeCategories: Category[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data && typeof data.name === "string") {
            fetchedIncomeCategories.push({
              id: doc.id,
              name: data.name,
              icon: data.icon || "help-circle-outline",
              description: data.description,
              isDefault: false,
            });
          }
        });
        const initialNames = new Set(
          fetchedIncomeCategories.map((cat) => cat.name)
        );
        const combinedIncome = [
          ...initialIncomeCategories.filter(
            (cat) => cat.name && !initialNames.has(cat.name)
          ),
          ...fetchedIncomeCategories,
        ];
        setIncomeCategories(combinedIncome);
      },
      (error) => {
        console.error("Error fetching income categories: ", error);
        setIncomeCategories(initialIncomeCategories);
      }
    );

    const expenseCollectionRef = collection(
      db,
      "Accounts",
      currentUser?.uid || "__nouser__",
      "Expenses"
    );
    const expenseQuery = query(expenseCollectionRef, orderBy("name"));
    const unsubscribeExpenses = onSnapshot(
      expenseQuery,
      (querySnapshot) => {
        const fetchedExpenseCategories: Category[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data && typeof data.name === "string") {
            fetchedExpenseCategories.push({
              id: doc.id,
              name: data.name,
              icon: data.icon || "help-circle-outline",
              description: data.description,
              isDefault: false,
            });
          }
        });
        const initialExpenseNames = new Set(
          fetchedExpenseCategories.map((cat) => cat.name)
        );
        const combinedExpenses = [
          ...initialExpenseCategories.filter(
            (cat) => cat.name && !initialExpenseNames.has(cat.name)
          ),
          ...fetchedExpenseCategories,
        ];
        setExpenseCategories(combinedExpenses);
      },
      (error) => {
        console.error("Error fetching expense categories: ", error);
        setExpenseCategories(initialExpenseCategories);
      }
    );

    return () => {
      unsubscribeIncome();
      unsubscribeExpenses();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    setIsLoadingAccounts(true);
    setErrorAccounts(null);

    const accountsCollectionRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "accounts"
    );
    const q = query(accountsCollectionRef, orderBy("title"));

    const unsubscribeAccounts = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedAccounts: Account[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (
            data &&
            typeof data.title === "string" &&
            typeof data.iconName === "string"
          ) {
            fetchedAccounts.push({
              id: doc.id,
              title: data.title,
              iconName: data.iconName,
            });
          } else {
            console.warn(`Invalid account data found for doc ID: ${doc.id}`);
          }
        });
        setAccountsList(fetchedAccounts);
        if (!selectedAccountId && fetchedAccounts.length > 0) {
          setSelectedAccountId(fetchedAccounts[0].id);
        }
        setIsLoadingAccounts(false);
      },
      (err) => {
        console.error("Error fetching accounts: ", err);
        setErrorAccounts("Failed to load accounts.");
        setIsLoadingAccounts(false);
      }
    );

    return () => unsubscribeAccounts();
  }, [currentUser, selectedAccountId]);

  const handleAddCategory = (newCategoryData: {
    name: string;
    icon: string;
    description?: string | null;
  }) => {
    setIsAddCategoryModalVisible(false);
  };

  const currentCategories =
    transactionType === "Expenses" ? expenseCategories : incomeCategories;

  const handleCategoryPress = (category: Category) => {
    setSelectedCategoryForAmount(category);
    setAmount("");
    setTransactionDescription("");
    setSuggestedCategoryId(null);
    setIsAmountModalVisible(true);
  };

  const handleCloseAmountModal = () => {
    setIsAmountModalVisible(false);
    setSelectedCategoryForAmount(null);
    setAmount("");
    setTransactionDescription("");
    setSuggestedCategoryId(null);
  };

  const handleDescriptionChange = (text: string) => {
    setTransactionDescription(text);
    const suggestion = suggestCategory(text, currentCategories);
    setSuggestedCategoryId(suggestion ? suggestion.id : null);
  };

  const handleSaveAmount = async () => {
    if (isSaving) return;

    if (!currentUser) {
      Alert.alert(
        "Login Required",
        "You must be logged in to save transactions."
      );
      return;
    }

    const userId = currentUser.uid;
    const transactionAmount = parseFloat(amount);

    if (!amount || isNaN(transactionAmount) || transactionAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive amount.");
      return;
    }

    let categoryToSave = selectedCategoryForAmount;
    if (!categoryToSave) {
      const suggested = currentCategories.find(
        (cat) => cat.id === suggestedCategoryId
      );
      if (suggested) {
        categoryToSave = suggested;
      } else {
        Alert.alert("Category Required", "Please select a category.");
        return;
      }
    }

    // Check budget before proceeding with save
    if (transactionType === "Expenses") {
      const budgetStatus = await checkBudgetStatus(
        userId,
        categoryToSave.name,
        transactionAmount,
        selectedCurrency
      );

      if (
        budgetStatus?.status === "exceeded" ||
        budgetStatus?.status === "warning"
      ) {
        setBudgetWarningMessage(budgetStatus.message);
        setShowBudgetWarningModal(true);
        return;
      }
    }

    // Continue with existing save logic
    setIsSaving(true);
    // ...rest of the existing handleSaveAmount function...
    saveTransaction();
  };

  const handleConfirmSaveAfterWarning = () => {
    setShowBudgetWarningModal(false);
    setIsSaving(true);
    // Continue with the save operation
    saveTransaction();
  };

  // Extract the save transaction logic to a separate function
  const saveTransaction = async () => {
    // Move the transaction saving logic here
    const userId = currentUser!.uid;
    const transactionAmount = parseFloat(amount);
    const categoryToSave =
      selectedCategoryForAmount ||
      currentCategories.find((cat) => cat.id === suggestedCategoryId)!;

    const selectedAccountInfo = accountsList.find(
      (acc) => acc.id === selectedAccountId
    );
    const accountName = selectedAccountInfo?.title || "Unknown Account";

    const newTransactionData = {
      type: transactionType,
      categoryName: categoryToSave.name,
      categoryIcon: categoryToSave.icon,
      amount: transactionAmount,
      accountId: selectedAccountId,
      accountName: accountName,
      description: transactionDescription.trim() || null,
      timestamp: serverTimestamp(),
      isDeleted: false,
      deletedAt: null,
    };

    try {
      if (selectedAccountId) {
        await runTransaction(db, async (transaction) => {
          // ...existing transaction code...
          const accountDocRef = doc(
            db,
            "Accounts",
            userId,
            "accounts",
            selectedAccountId
          );
          const newTransactionRef = doc(
            collection(db, "Accounts", userId, "transactions")
          );
          const accountDoc = await transaction.get(accountDocRef);
          if (!accountDoc.exists()) {
            throw new Error("Selected account document does not exist!");
          }
          const currentBalance = accountDoc.data()?.balance ?? 0;
          let newBalance =
            transactionType === "Income"
              ? currentBalance + transactionAmount
              : currentBalance - transactionAmount;
          transaction.update(accountDocRef, { balance: newBalance });
          transaction.set(newTransactionRef, newTransactionData);
        });
      } else {
        await addDoc(
          collection(db, "Accounts", currentUser!.uid, "transactions"),
          newTransactionData
        );
      }

      Alert.alert("Success", "Record Saved");
      handleCloseAmountModal();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error: any) {
      console.error("Transaction failed: ", error);
      Alert.alert(
        "Save Error",
        `Could not save the transaction. ${
          error.message || "Please try again."
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleSaveHeader = () => {
    /* No direct save here */
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.headerButtonText}>Cancel</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleSaveHeader}
              activeOpacity={0.7}
            >
              <Text style={styles.headerButtonText}>Save</Text>
            </TouchableOpacity>
          ),
          title: "Add Transaction",
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: "#006400" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold", fontSize: 18 },
        }}
      />

      {/* --- Income/Expense Toggle --- */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            transactionType === "Expenses" && styles.activeTypeButton,
          ]}
          onPress={() => setTransactionType("Expenses")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.typeButtonText,
              transactionType === "Expenses" && styles.activeTypeButtonText,
            ]}
          >
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            transactionType === "Income" && styles.activeTypeButton,
          ]}
          onPress={() => setTransactionType("Income")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.typeButtonText,
              transactionType === "Income" && styles.activeTypeButtonText,
            ]}
          >
            Income
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.categoryGrid}>
            {currentCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  selectedCategoryForAmount?.id === category.id &&
                    styles.selectedCategory,
                ]}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    selectedCategoryForAmount?.id === category.id &&
                      styles.selectedCategoryIcon,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={category.icon}
                    size={28}
                    color="#fff"
                  />
                </View>
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategoryForAmount?.id === category.id &&
                      styles.selectedCategoryText,
                  ]}
                  numberOfLines={1}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.addNewButton}
            onPress={() => setIsAddCategoryModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addNewButtonText}>+ Add Category</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Restore Add Category Modal */}
      {transactionType === "Income" ? (
        <AddIncomeCategoryModal
          visible={isAddCategoryModalVisible}
          onClose={() => setIsAddCategoryModalVisible(false)}
          onSave={handleAddCategory}
        />
      ) : (
        <AddExpenseCategoryModal
          visible={isAddCategoryModalVisible}
          onClose={() => setIsAddCategoryModalVisible(false)}
          onSave={handleAddCategory}
        />
      )}

      <Modal
        visible={isAmountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAmountModal}
      >
        <SafeAreaView style={styles.amountModalSafeArea}>
          <View style={styles.amountModalContent}>
            <Text style={styles.amountModalTitle}>
              Enter {transactionType === "Income" ? "Income" : "Expense"}{" "}
              Details
            </Text>

            {selectedCategoryForAmount && (
              <View style={styles.categoryInfoContainer}>
                <View style={styles.categoryIconSmall}>
                  <MaterialCommunityIcons
                    name={
                      selectedCategoryForAmount.icon as keyof typeof MaterialCommunityIcons.glyphMap
                    }
                    size={20}
                    color="white"
                  />
                </View>
                <View style={styles.categoryDetails}>
                  <Text style={styles.categoryInfoName}>
                    {selectedCategoryForAmount.name}
                  </Text>
                  {selectedCategoryForAmount.description && (
                    <Text style={styles.categoryInfoDesc}>
                      {selectedCategoryForAmount.description}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <Text style={styles.amountLabel}>Amount:</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor="#999"
              autoFocus={!selectedCategoryForAmount}
            />

            <Text style={styles.amountLabel}>Description (Optional):</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="e.g., Coffee, Groceries, Gas Station"
              value={transactionDescription}
              onChangeText={handleDescriptionChange}
              placeholderTextColor="#999"
              autoFocus={!!selectedCategoryForAmount}
            />

            <Text style={styles.amountLabel}>Account:</Text>
            {isLoadingAccounts ? (
              <ActivityIndicator color="#006400" style={styles.accountLoader} />
            ) : errorAccounts ? (
              <Text style={styles.errorTextSmall}>{errorAccounts}</Text>
            ) : accountsList.length === 0 ? (
              <Text style={styles.infoTextSmall}>
                No accounts found. Please add an account first.
              </Text>
            ) : (
              <View style={styles.accountSelectorContainer}>
                <ScrollView
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                >
                  {accountsList.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      style={[
                        styles.accountSelectItem,
                        selectedAccountId === account.id &&
                          styles.accountSelectItemActive,
                      ]}
                      onPress={() => setSelectedAccountId(account.id)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={getIconSourceFromName(account.iconName)}
                        style={styles.accountSelectIconImage}
                        resizeMode="contain"
                      />
                      <Text
                        style={[
                          styles.accountSelectText,
                          selectedAccountId === account.id &&
                            styles.accountSelectTextActive,
                        ]}
                      >
                        {account.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.amountModalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseAmountModal}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  (isLoadingAccounts ||
                    (!selectedCategoryForAmount && !suggestedCategoryId) ||
                    !currentUser ||
                    isSaving) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleSaveAmount}
                disabled={
                  !currentUser ||
                  isLoadingAccounts ||
                  (!selectedCategoryForAmount && !suggestedCategoryId) ||
                  isSaving
                }
                activeOpacity={0.7}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Budget Warning Modal */}
      <Modal
        visible={showBudgetWarningModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBudgetWarningModal(false)}
      >
        <SafeAreaView style={styles.amountModalSafeArea}>
          <View style={styles.amountModalContent}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={40}
              color="#B58900"
              style={styles.warningIcon}
            />
            <Text style={styles.warningTitle}>Budget Warning</Text>
            <Text style={styles.warningMessage}>{budgetWarningMessage}</Text>

            <View style={styles.amountModalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowBudgetWarningModal(false)}
              >
                <Text style={styles.cancelButtonText}>Edit Amount</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleConfirmSaveAfterWarning}
              >
                <Text style={styles.saveButtonText}>Continue Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  headerButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  typeSelector: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    padding: 8,
    paddingHorizontal: 12,
    marginBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginHorizontal: 6,
    flexDirection: "row",
  },
  activeTypeButton: {
    backgroundColor: "#006400",
    shadowColor: "#006400",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  activeTypeButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#B58900",
    marginBottom: 18,
    paddingLeft: 4,
    letterSpacing: 0.2,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    paddingTop: 4,
  },
  categoryItem: {
    width: "30%",
    alignItems: "center",
    marginBottom: 20,
    marginHorizontal: "1.5%",
  },
  selectedCategory: {
    transform: [{ scale: 1.05 }],
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#006400",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  selectedCategoryIcon: {
    backgroundColor: "#004d00",
  },
  categoryText: {
    fontSize: 13,
    color: "#333",
    textAlign: "center",
    marginTop: 4,
  },
  selectedCategoryText: {
    color: "#006400",
    fontWeight: "600",
  },
  addNewButton: {
    backgroundColor: "#006400",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 15,
    marginBottom: 20,
  },
  addNewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  amountModalSafeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 20,
  },
  amountModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 350,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    overflow: "hidden",
  },
  amountModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#B58900",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  categoryInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#f8f9fa",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 15,
    width: "100%",
    borderWidth: 1,
    borderColor: "#eee",
    alignSelf: "center",
  },
  categoryIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#006400",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryInfoName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    letterSpacing: 0.2,
  },
  categoryInfoDesc: {
    fontSize: 13,
    color: "#666",
    marginTop: 3,
    lineHeight: 17,
  },
  amountLabel: {
    fontSize: 15,
    color: "#444",
    marginBottom: 6,
    marginTop: 4,
    alignSelf: "flex-start",
    width: "100%",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  amountInput: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    fontSize: 20,
    width: "100%",
    textAlign: "left",
    backgroundColor: "#fff",
    color: "#212529",
    alignSelf: "center",
  },
  descriptionInput: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    fontSize: 15,
    width: "100%",
    backgroundColor: "#fff",
    color: "#212529",
    minHeight: 46,
    alignSelf: "center",
  },
  accountSelectorContainer: {
    width: "100%",
    marginBottom: 20,
    maxHeight: 140,
    borderWidth: 1.5,
    borderColor: "#eee",
    borderRadius: 15,
    overflow: "hidden",
    alignSelf: "center",
  },
  accountSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  accountSelectItemActive: {
    backgroundColor: "#006400",
  },
  accountSelectIconImage: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  accountSelectText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  accountSelectTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  accountLoader: {
    marginVertical: 20,
  },
  errorTextSmall: {
    color: "#E53935",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 12,
    lineHeight: 18,
  },
  infoTextSmall: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 12,
    lineHeight: 18,
  },
  amountModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
    alignSelf: "center",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 15,
    marginHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  saveButton: {
    backgroundColor: "#B58900",
    borderWidth: 1,
    borderColor: "#B58900",
  },
  saveButtonDisabled: {
    backgroundColor: "#e9d8a1",
    borderColor: "#e9d8a1",
    opacity: 0.7,
  },
  cancelButtonText: {
    color: "#555",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  saveButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingHorizontal: 4,
    paddingTop: 12,
  },
  categoryContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  warningIcon: {
    alignSelf: "center",
    marginBottom: 10,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#B58900",
    textAlign: "center",
    marginBottom: 10,
  },
  warningMessage: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
});

export default TransactionScreen;
