// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\transactions.tsx
import React, { useState, useEffect, useCallback } from "react";
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
  Keyboard,
  Platform, // Import Platform for KeyboardAvoidingView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Import SafeAreaView
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { Stack, useNavigation } from "expo-router";
import AddIncomeCategoryModal from "../components/AddIncomeModal";
import AddExpenseCategoryModal from "../components/AddExpenseModal";
import {
  getFirestore,
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
import { onAuthStateChanged, User } from "firebase/auth";
import { app, db, auth } from "../app/firebase";

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

export default function TransactionScreen() {
  const navigation = useNavigation();
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
  }, [currentUser]);

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

    const selectedAccountInfo = accountsList.find(
      (acc) => acc.id === selectedAccountId
    );
    const accountName = selectedAccountInfo
      ? selectedAccountInfo.title
      : "Unknown Account";
    const newTransactionData = {
      type: transactionType,
      categoryName: categoryToSave.name,
      categoryIcon: categoryToSave.icon,
      amount: transactionAmount,
      accountId: selectedAccountId,
      accountName: accountName,
      description: transactionDescription.trim() || null,
      timestamp: serverTimestamp(),
    };

    try {
      if (selectedAccountId) {
        await runTransaction(db, async (transaction) => {
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
        console.log("Transaction committed (with account update).");
      } else {
        await addDoc(
          collection(db, "Accounts", userId, "transactions"),
          newTransactionData
        );
        console.log("Transaction added (without account update).");
      }

      console.log("Transaction successfully committed!");
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
    // Use SafeAreaView as the main container for the screen content
    <SafeAreaView style={styles.safeAreaContainer}>
      {/* Stack Screen Options remain the same */}
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
              onPress={handleSaveHeader}
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

      {/* Type Selector */}
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

      {/* ScrollView Content */}
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoriesGrid}>
          {currentCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                (selectedCategoryForAmount?.id === category.id ||
                  suggestedCategoryId === category.id) &&
                  styles.categoryItemSelected,
              ]}
              onPress={() => handleCategoryPress(category)}
            >
              <View
                style={[
                  styles.categoryIcon,
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
                  }
                />
              </View>
              <Text
                style={[
                  styles.categoryText,
                  (selectedCategoryForAmount?.id === category.id ||
                    suggestedCategoryId === category.id) &&
                    styles.categoryTextSelected,
                ]}
              >
                {category.name}
              </Text>
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

      {/* Conditionally Render Add Category Modals */}
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

      {/* Amount Input Modal */}
      <Modal
        visible={isAmountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAmountModal}
      >
        {/* Wrap modal content in SafeAreaView */}
        <SafeAreaView style={styles.amountModalSafeArea}>
          <ScrollView
            contentContainerStyle={styles.amountModalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
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
                    (isLoadingAccounts ||
                      (!selectedCategoryForAmount && !suggestedCategoryId) ||
                      !currentUser) &&
                      styles.saveButtonDisabled,
                  ]}
                  onPress={handleSaveAmount}
                  disabled={
                    !currentUser ||
                    isLoadingAccounts ||
                    (!selectedCategoryForAmount && !suggestedCategoryId)
                  }
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa", // Match background
  },
  // container style removed
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
    marginHorizontal: -5,
  },
  categoryItem: {
    width: "25%",
    alignItems: "center",
    marginBottom: 25,
    paddingHorizontal: 5,
    position: "relative",
  },
  categoryItemSelected: {},
  categoryIcon: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: "#006400",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  categoryIconSelected: {
    backgroundColor: "#DAA520",
    borderColor: "#006400",
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
    color: "#006400",
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
    overflow: "hidden",
  },
  addNewButton: {
    width: "100%",
    paddingVertical: 12,
    backgroundColor: "#DAA520",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginLeft: 5,
    marginRight: 5,
  },
  addNewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  amountModalSafeArea: {
    // Style for the modal's SafeAreaView
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  // amountModalContainer removed, replaced by amountModalSafeArea
  amountModalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    width: "100%",
  },
  amountModalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 25,
    width: "90%",
    maxWidth: 380,
    alignItems: "stretch",
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
    alignSelf: "flex-start",
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
    fontSize: 20,
    width: "100%",
    textAlign: "left",
    backgroundColor: "#fff",
    color: "#212529",
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    width: "100%",
    backgroundColor: "#fff",
    color: "#212529",
    minHeight: 40,
  },
  accountSelectorContainer: {
    width: "100%",
    marginBottom: 25,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    overflow: "hidden",
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
    backgroundColor: "#006400",
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
    color: "#fff",
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
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
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
