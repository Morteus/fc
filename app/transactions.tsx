// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\transactions.tsx
import React, { useState, useEffect, useCallback } from "react"; // Import useCallback
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Keyboard, // Import Keyboard
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { Stack, useNavigation } from "expo-router";
import AddIncomeCategoryModal from "../components/AddIncomeModal";
import AddExpenseCategoryModal from "../components/AddExpenseModal";
import {
  // getFirestore, // No longer needed here
  collection,
  addDoc,
  doc,
  runTransaction,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth"; // Keep needed auth imports
import { db, auth } from "../app/firebase"; // Import initialized db and auth
// Import debounce (optional but recommended for better performance)
// You might need to install lodash: npm install lodash @types/lodash
// import { debounce } from 'lodash';

// --- Interfaces ---
interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string | null;
  isDefault?: boolean;
}

interface Account {
  id: string;
  title: string;
  iconName: string;
}

// --- Account Icon Data ---
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

// --- Initial Categories ---
const initialIncomeCategories: Category[] = [
  // ... (keep existing income categories)
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
  // ... (keep existing expense categories)
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

// --- Helper function to get ImageSourcePropType from icon name ---
const getIconSourceFromName = (
  iconName: string | undefined
): ImageSourcePropType => {
  const foundOption = accountIconOptions.find(
    (option) => option.name === iconName
  );
  return foundOption ? foundOption.source : WalletSource; // Default to Wallet
};

// --- Simple Rule-Based Classification Function ---
const suggestCategory = (
  description: string,
  categories: Category[]
): Category | null => {
  if (!description) return null;

  const lowerDesc = description.toLowerCase();

  // Define rules (expand these significantly in a real app)
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
    salary: "Salary", // Example for income
    refund: "Refunds", // Example for income
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

  return null; // No suggestion found
};
// --- End Classification Function ---

function TransactionScreen() {
  // Changed from export default function
  const navigation = useNavigation();
  const [transactionType, setTransactionType] = useState<"Expenses" | "Income">(
    "Expenses"
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null); // State for the current user
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
  const [transactionDescription, setTransactionDescription] = useState(""); // <-- State for description
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(
    null
  ); // <-- State for suggestion highlight

  // --- State for Accounts ---
  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [errorAccounts, setErrorAccounts] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );

  // --- Listen for Auth State Changes ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        // Handle user not logged in (e.g., show message, disable saving)
        console.log("Transactions: No user logged in.");
        setErrorAccounts("Login required to add transactions."); // Use existing error state
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- Fetch Categories from Firestore ---
  useEffect(() => {
    if (!currentUser) return; // Don't fetch if no user

    // Fetch Income Categories
    const incomeCollectionRef = collection(
      db,
      "Accounts",
      currentUser.uid, // Use actual user UID
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
        setIncomeCategories(initialIncomeCategories); // Fallback
      }
    );

    // Fetch Expense Categories
    const expenseCollectionRef = collection(
      db,
      "Accounts",
      currentUser.uid, // Use actual user UID
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
        setExpenseCategories(initialExpenseCategories); // Fallback
      }
    );

    // Cleanup Firestore listeners
    return () => {
      unsubscribeIncome(); // Unsubscribe income listener
      unsubscribeExpenses();
    };
  }, [currentUser]); // Re-run if user changes

  // --- Fetch Accounts ---
  useEffect(() => {
    if (!currentUser) return; // Don't fetch if no user

    setIsLoadingAccounts(true);
    setErrorAccounts(null);

    const accountsCollectionRef = collection(
      db,
      "Accounts",
      currentUser.uid, // Use actual user UID
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
  }, [currentUser]); // Re-run if user changes

  // --- handleAddCategory ---
  const handleAddCategory = (newCategoryData: {
    name: string;
    icon: string;
    description?: string | null;
  }) => {
    setIsAddCategoryModalVisible(false);
    // Firestore listener will update the state automatically
  };

  // Update currentCategories based on transactionType
  const currentCategories =
    transactionType === "Expenses" ? expenseCategories : incomeCategories;

  // --- Handlers for Amount Input Modal ---
  const handleCategoryPress = (category: Category) => {
    setSelectedCategoryForAmount(category);
    setAmount("");
    setTransactionDescription(""); // Clear description when category is manually selected
    setSuggestedCategoryId(null); // Clear suggestion highlight
    setIsAmountModalVisible(true);
  };

  const handleCloseAmountModal = () => {
    setIsAmountModalVisible(false);
    setSelectedCategoryForAmount(null);
    setAmount("");
    setTransactionDescription(""); // Clear description on close
    setSuggestedCategoryId(null); // Clear suggestion highlight
  };

  // --- Function to handle suggestion logic ---
  const handleDescriptionChange = (text: string) => {
    setTransactionDescription(text);
    // Simple trigger on change (debounce is better for performance)
    const suggestion = suggestCategory(text, currentCategories);
    setSuggestedCategoryId(suggestion ? suggestion.id : null);
    // Optional: Automatically select if no category is chosen yet
    // if (suggestion && !selectedCategoryForAmount) {
    //   setSelectedCategoryForAmount(suggestion);
    // }
  };

  // --- handleSaveAmount (Updated to include description) ---
  const handleSaveAmount = async () => {
    if (!currentUser) {
      Alert.alert(
        "Login Required",
        "You must be logged in to save transactions."
      );
      return;
    }
    const userId = currentUser.uid; // Use the actual user ID
    const transactionAmount = parseFloat(amount);

    // --- Input Validations ---
    if (!amount || isNaN(transactionAmount) || transactionAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive amount.");
      return;
    }
    let categoryToSave = selectedCategoryForAmount; // Start with manually selected

    // If no category was manually selected, check if there's a suggestion
    if (!categoryToSave && suggestedCategoryId) {
      const suggested = currentCategories.find(
        (cat) => cat.id === suggestedCategoryId
      );
      if (suggested) {
        categoryToSave = suggested; // Use the suggestion
      }
    }

    // Final check: If still no category, prompt the user
    if (!categoryToSave) {
      Alert.alert("Category Required", "Please select or suggest a category.");
      return;
    }

    // --- Prepare Data ---
    const selectedAccountInfo = accountsList.find(
      (acc) => acc.id === selectedAccountId
    );
    const accountName = selectedAccountInfo
      ? selectedAccountInfo.title
      : "Unknown Account";
    // Account ID will be null if none is selected
    const newTransactionData = {
      type: transactionType,
      categoryName: categoryToSave.name, // Use categoryToSave
      categoryIcon: categoryToSave.icon, // Use categoryToSave
      amount: transactionAmount,
      accountId: selectedAccountId,
      accountName: accountName,
      description: transactionDescription.trim() || null, // <-- Add description, save null if empty
      timestamp: serverTimestamp(),
    };

    // --- Firestore Save Logic ---
    try {
      // --- Case 1: Account IS Selected - Use Transaction ---
      if (selectedAccountId) {
        await runTransaction(db, async (transaction) => {
          // 1. Define references
          const accountDocRef = doc(
            db,
            "Accounts",
            userId,
            "accounts",
            selectedAccountId // Use the selected ID
          );
          const newTransactionRef = doc(
            collection(db, "Accounts", userId, "transactions")
          );

          // 2. Read the current account balance
          const accountDoc = await transaction.get(accountDocRef);
          if (!accountDoc.exists()) {
            throw new Error("Selected account document does not exist!");
          }

          const currentBalance = accountDoc.data()?.balance ?? 0;

          // 3. Calculate the new balance based on transaction type
          let newBalance;
          if (transactionType === "Income") {
            newBalance = currentBalance + transactionAmount;
          } else {
            newBalance = currentBalance - transactionAmount;
          }

          // 4. Perform writes
          transaction.update(accountDocRef, { balance: newBalance });
          transaction.set(newTransactionRef, newTransactionData);
        });
        console.log("Transaction committed (with account update).");
      }
      // --- Case 2: Account is NOT Selected - Add Transaction Only ---
      else {
        // Directly add the transaction document without updating any account balance
        await addDoc(
          collection(db, "Accounts", userId, "transactions"),
          newTransactionData
        );
        console.log("Transaction added (without account update).");
      }
      // --- End Firestore Save Logic ---

      // --- Success ---
      console.log("Transaction successfully committed!");
      Alert.alert("Success", "Record Saved"); // Simple success popup
      handleCloseAmountModal(); // Close the modal first
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error: any) {
      // --- Error Handling ---
      console.error("Transaction failed: ", error);
      Alert.alert(
        "Save Error",
        `Could not save the transaction and update balance. ${
          error.message || "Please try again."
        }`
      );
    }
  };

  // --- Header Button Handlers ---
  const handleCancel = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleSaveHeader = () => {
    // This header button doesn't perform the save directly.
    // The save happens in the modal via handleSaveAmount.
    // We could potentially trigger the modal save from here if needed,
    // but the current flow seems fine.
    // If the modal is open, maybe trigger its save?
    if (isAmountModalVisible) {
      handleSaveAmount();
    } else {
      // If modal isn't open, maybe prompt user to select category first?
      Alert.alert("Select Category", "Please select a category first.");
    }
  };

  // --- JSX ---
  return (
    <View style={styles.container}>
      {/* --- Stack Screen Options --- */}
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCancel}
            >
              <Text style={styles.headerButtonText}>Cancel</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleSaveHeader} // Use the new handler
            >
              <Text style={styles.headerButtonText}>Save</Text>
            </TouchableOpacity>
          ),
          title: "Add Transaction",
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: "#006400" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />

      {/* --- Type Selector --- */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            transactionType === "Expenses" && styles.activeTypeButton,
          ]}
          onPress={() => setTransactionType("Expenses")}
        >
          <Text
            style={[
              styles.typeButtonText,
              transactionType === "Expenses" && styles.activeTypeButtonText,
            ]}
          >
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            transactionType === "Income" && styles.activeTypeButton,
          ]}
          onPress={() => setTransactionType("Income")}
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

      {/* --- ScrollView Content --- */}
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoriesGrid}>
          {currentCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                // Highlight if selected OR suggested
                (selectedCategoryForAmount?.id === category.id ||
                  suggestedCategoryId === category.id) &&
                  styles.categoryItemSelected,
              ]}
              onPress={() => handleCategoryPress(category)}
            >
              <View
                style={[
                  styles.categoryIcon,
                  // Highlight icon background if selected OR suggested
                  (selectedCategoryForAmount?.id === category.id ||
                    suggestedCategoryId === category.id) &&
                    styles.categoryIconSelected,
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    category.icon as keyof typeof MaterialCommunityIcons.glyphMap
                  }
                  size={24}
                  color={
                    selectedCategoryForAmount?.id === category.id ||
                    suggestedCategoryId === category.id
                      ? "#006400"
                      : "white"
                  } // Change icon color when selected/suggested
                />
              </View>
              <Text
                style={[
                  styles.categoryText,
                  // Highlight text if selected OR suggested
                  (selectedCategoryForAmount?.id === category.id ||
                    suggestedCategoryId === category.id) &&
                    styles.categoryTextSelected,
                ]}
              >
                {category.name}
              </Text>
              {/* Show 'Suggested' label */}
              {suggestedCategoryId === category.id &&
                !selectedCategoryForAmount && (
                  <Text style={styles.suggestionLabel}>Suggested</Text>
                )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addNewButton}
            onPress={() => setIsAddCategoryModalVisible(true)}
          >
            <Text style={styles.addNewButtonText}>+ Add New Category</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- Conditionally Render Add Category Modals --- */}
      {transactionType === "Income" ? (
        <AddIncomeCategoryModal
          visible={isAddCategoryModalVisible}
          onClose={() => setIsAddCategoryModalVisible(false)}
          onSave={handleAddCategory} // Pass user ID to modal if needed
        />
      ) : (
        <AddExpenseCategoryModal
          visible={isAddCategoryModalVisible}
          onClose={() => setIsAddCategoryModalVisible(false)} // Pass user ID to modal if needed
          onSave={handleAddCategory}
        />
      )}

      {/* --- Amount Input Modal (Updated) --- */}
      <Modal
        visible={isAmountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAmountModal}
      >
        <View style={styles.amountModalContainer}>
          {/* Wrap modal content in ScrollView for keyboard avoidance */}
          <ScrollView
            contentContainerStyle={styles.amountModalScrollContent}
            keyboardShouldPersistTaps="handled" // Allow taps inside ScrollView
          >
            <View style={styles.amountModalContent}>
              <Text style={styles.amountModalTitle}>
                Enter {transactionType === "Income" ? "Income" : "Expense"}{" "}
                Details
              </Text>

              {/* Category Info */}
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

              {/* Amount Input */}
              <Text style={styles.amountLabel}>Amount:</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                placeholderTextColor="#999"
                autoFocus={!selectedCategoryForAmount} // Autofocus amount if category was pre-selected
              />

              {/* Description Input <-- ADDED */}
              <Text style={styles.amountLabel}>Description (Optional):</Text>
              <TextInput
                style={styles.descriptionInput} // Use a potentially different style
                placeholder="e.g., Coffee, Groceries, Gas Station"
                value={transactionDescription}
                onChangeText={handleDescriptionChange} // Use the handler
                placeholderTextColor="#999"
                autoFocus={!!selectedCategoryForAmount} // Autofocus description if category was pre-selected
                // onBlur={handleDescriptionBlur} // Alternative trigger point
              />
              {/* --- End Description Input --- */}

              {/* Account Selection */}
              <Text style={styles.amountLabel}>Account:</Text>
              {isLoadingAccounts ? (
                <ActivityIndicator
                  color="#006400"
                  style={styles.accountLoader}
                />
              ) : errorAccounts ? (
                <Text style={styles.errorTextSmall}>{errorAccounts}</Text>
              ) : accountsList.length === 0 ? (
                <Text style={styles.infoTextSmall}>
                  No accounts found. Please add an account first.
                </Text>
              ) : (
                <View style={styles.accountSelectorContainer}>
                  {/* Wrap account list in ScrollView if it might exceed maxHeight */}
                  <ScrollView nestedScrollEnabled={true}>
                    {accountsList.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        style={[
                          styles.accountSelectItem,
                          selectedAccountId === account.id &&
                            styles.accountSelectItemActive,
                        ]}
                        onPress={() => setSelectedAccountId(account.id)}
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
              {/* --- End Account Selection --- */}

              {/* Modal Buttons */}
              <View style={styles.amountModalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCloseAmountModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    // Disable save if no user, loading, or no category selected/suggested
                    ((!selectedCategoryForAmount && !suggestedCategoryId) || // Need a category
                      !currentUser) &&
                      styles.saveButtonDisabled,
                  ]}
                  onPress={handleSaveAmount}
                  disabled={
                    !currentUser || // Disable if no user
                    (!selectedCategoryForAmount && !suggestedCategoryId) // Disable if no category
                  }
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// --- Styles (Updated) ---
const styles = StyleSheet.create({
  // ... (keep existing styles for container, header, typeSelector, content, sectionTitle) ...
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  headerButton: { paddingHorizontal: 15, paddingVertical: 10 },
  headerButtonText: { fontSize: 16, color: "#fff", fontWeight: "500" },
  typeSelector: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTypeButton: { borderBottomColor: "#006400" },
  typeButtonText: { fontSize: 16, color: "#6c757d" },
  activeTypeButtonText: { color: "#006400", fontWeight: "bold" },
  content: { flex: 1, padding: 15 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#DAA520",
    marginBottom: 15,
    paddingLeft: 5,
  },

  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginHorizontal: -5, // Counteract padding on items
  },
  categoryItem: {
    width: "25%", // Adjust for desired number of columns
    alignItems: "center",
    marginBottom: 25,
    paddingHorizontal: 5, // Add padding for spacing
    position: "relative", // Needed for absolute positioning of label
  },
  categoryItemSelected: {
    // Style for selected/suggested item container (optional)
    // backgroundColor: '#e8f5e9', // Example background highlight
    // borderRadius: 8,
  },
  categoryIcon: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: "#006400", // Default background
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 2, // Add border for selection highlight
    borderColor: "transparent", // Default transparent border
  },
  categoryIconSelected: {
    backgroundColor: "#DAA520", // Gold background when selected/suggested
    borderColor: "#006400", // Green border when selected/suggested
  },
  categoryText: {
    fontSize: 12,
    textAlign: "center",
    color: "#495057",
    fontWeight: "500",
    marginTop: 2,
  },
  categoryTextSelected: {
    fontWeight: "bold",
    color: "#006400", // Darker text when selected/suggested
  },
  suggestionLabel: {
    position: "absolute",
    top: -8,
    right: 0,
    backgroundColor: "#DAA520",
    color: "white",
    fontSize: 9,
    fontWeight: "bold",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: "hidden", // Ensure text stays within bounds
  },
  addNewButton: {
    width: "100%", // Span full width within the grid container
    paddingVertical: 12,
    backgroundColor: "#DAA520",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    // Ensure it's placed correctly if grid items wrap
    marginLeft: 5, // Align with grid item padding
    marginRight: 5,
  },
  addNewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  amountModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  amountModalScrollContent: {
    // Ensure content can scroll and center
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20, // Add padding for top/bottom spacing
    width: "100%", // Ensure ScrollView takes width
  },
  amountModalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 25,
    width: "90%", // Use percentage width
    maxWidth: 380, // Max width for larger screens
    alignItems: "stretch", // Stretch children like inputs
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  amountModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#006400",
    marginBottom: 20,
    textAlign: "center",
  },
  categoryInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#f8f9fa",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  categoryIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#006400",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryInfoName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#343a40",
  },
  categoryInfoDesc: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 3,
  },
  amountLabel: {
    fontSize: 16,
    color: "#495057",
    marginBottom: 8,
    alignSelf: "flex-start", // Align label to the left
    width: "100%",
    fontWeight: "500",
  },
  amountInput: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 20, // Larger font for amount
    width: "100%",
    textAlign: "left", // Changed to left-align amount
    backgroundColor: "#fff",
    color: "#212529",
  },
  descriptionInput: {
    // Style for description input
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16, // Standard font size
    width: "100%",
    backgroundColor: "#fff",
    color: "#212529",
    minHeight: 40, // Ensure decent height
  },
  accountSelectorContainer: {
    width: "100%",
    marginBottom: 25,
    maxHeight: 150, // Limit height for scrolling
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    overflow: "hidden", // Clip the ScrollView inside
  },
  accountSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  accountSelectItemActive: {
    backgroundColor: "#006400", // Dark green background for active
  },
  accountSelectIconImage: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  accountSelectText: {
    fontSize: 16,
    color: "#333",
  },
  accountSelectTextActive: {
    color: "#fff", // White text for active
    fontWeight: "bold",
  },
  accountLoader: {
    marginVertical: 20,
  },
  errorTextSmall: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 15,
  },
  infoTextSmall: {
    color: "#6c757d",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 15,
  },
  amountModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10, // Add some space above buttons
  },
  modalButton: {
    flex: 1, // Make buttons take equal width
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 6, // Add space between buttons
    alignItems: "center",
    justifyContent: "center", // Center text vertically
    minHeight: 48, // Ensure consistent height
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ced4da",
  },
  saveButton: {
    backgroundColor: "#DAA520",
    borderWidth: 1,
    borderColor: "#DAA520",
  },
  saveButtonDisabled: {
    // Style for disabled save button
    backgroundColor: "#e9d8a1",
    borderColor: "#e9d8a1",
    opacity: 0.7,
  },
  cancelButtonText: {
    color: "#495057",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default TransactionScreen; // Add the default export
