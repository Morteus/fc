// c:\Users\scubo\Downloads\FinClassify-dea0c4be4da0318ed62b8b3aa713817c40b0002f\FinClassifyApp\components\headertopnav.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  getFirestore,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useDateContext } from "../app/context/DateContext";
import { app } from "../app/firebase";
import { formatCurrency } from "../utils/formatting";

const { width, height } = Dimensions.get("window");
const db = getFirestore(app);
const auth = getAuth(app);

// --- Interfaces ---
interface AccountForIncome {
  id: string;
  incomeAmount?: number | null;
  incomeFrequency?: "Daily" | "Weekly" | "Monthly" | null;
}

// --- Helper Functions ---
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

type TimeFilter = "Daily" | "Weekly" | "Monthly";

const Header = () => {
  const {
    selectedYear,
    selectedMonth,
    setSelectedYear,
    setSelectedMonth,
    selectedFilter,
    setSelectedFilter,
    selectedDateString,
    selectedCurrency,
  } = useDateContext();

  const currentYear = new Date().getFullYear();
  const monthsArray = [
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

  // Local state for UI control
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netTotal, setNetTotal] = useState(0);
  const [isLoadingTotals, setIsLoadingTotals] = useState(true);
  const [errorTotals, setErrorTotals] = useState<string | null>(null);
  const [accountIncomeData, setAccountIncomeData] = useState<
    AccountForIncome[]
  >([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  const router = useRouter();

  // --- Listen for Auth State Changes ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        console.log("Header: No user logged in.");
        setErrorTotals("Please log in to view totals.");
        setIsLoadingTotals(false);
        setIsLoadingAccounts(false);
        setAccountIncomeData([]);
        setTotalIncome(0);
        setTotalExpenses(0);
        setNetTotal(0);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- Fetch Accounts ---
  useEffect(() => {
    if (!currentUser) {
      setIsLoadingAccounts(false);
      setAccountIncomeData([]);
      return;
    }

    setIsLoadingAccounts(true);
    const accountsCollectionRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "accounts"
    );

    const q = query(accountsCollectionRef);
    const unsubscribeAccounts = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedAccounts: AccountForIncome[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (
            data &&
            typeof data.incomeAmount === "number" &&
            data.incomeAmount > 0 &&
            data.incomeFrequency
          ) {
            fetchedAccounts.push({
              id: doc.id,
              incomeAmount: data.incomeAmount,
              incomeFrequency: data.incomeFrequency,
            });
          }
        });
        setAccountIncomeData(fetchedAccounts);
        setIsLoadingAccounts(false);
      },
      (err) => {
        console.error("Error fetching accounts for income calculation: ", err);
        setErrorTotals("Failed to load account income data.");
        setIsLoadingAccounts(false);
      }
    );

    return () => {
      console.log(
        `HeaderTopNav: Unsubscribing from accounts listener for ${currentUser?.uid}`
      );
      unsubscribeAccounts();
    };
  }, [currentUser]);

  // --- Fetch Totals & Calculate ---
  useEffect(() => {
    if (isLoadingAccounts || !currentUser) {
      setIsLoadingTotals(true);
      return;
    }

    setIsLoadingTotals(true);
    setErrorTotals(null);
    setTotalIncome(0);
    setTotalExpenses(0);
    setNetTotal(0);

    if (!currentUser.uid) {
      setErrorTotals("User not identified.");
      setIsLoadingTotals(false);
      return;
    }

    const monthNumber = getMonthNumber(selectedMonth);
    if (monthNumber < 0 && selectedFilter === "Monthly") {
      setErrorTotals("Invalid month selected.");
      setIsLoadingTotals(false);
      return;
    }

    // Calculate date range based on filter
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

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
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to start on Monday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
      endDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + 7,
        0,
        0,
        0
      );
    } else {
      // Monthly
      startDate = new Date(selectedYear, monthNumber, 1, 0, 0, 0);
      endDate = new Date(selectedYear, monthNumber + 1, 1, 0, 0, 0);
    }

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // Calculate estimated recurring income
    let estimatedRecurringIncome = 0;
    const daysInFilterPeriod =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const approxDaysInMonth = 365.25 / 12;
    const approxDaysInWeek = 7;

    accountIncomeData.forEach((account) => {
      const income = account.incomeAmount;
      const freq = account.incomeFrequency;
      if (typeof income === "number" && income > 0 && freq) {
        switch (freq) {
          case "Daily":
            estimatedRecurringIncome += income * daysInFilterPeriod;
            break;
          case "Weekly":
            estimatedRecurringIncome +=
              income * (daysInFilterPeriod / approxDaysInWeek);
            break;
          case "Monthly":
            estimatedRecurringIncome +=
              income * (daysInFilterPeriod / approxDaysInMonth);
            break;
        }
      }
    });

    // Fetch transactions
    const transactionsCollectionRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "transactions"
    );

    const q = query(
      transactionsCollectionRef,
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<", endTimestamp)
    );

    const unsubscribeTransactions = onSnapshot(
      q,
      (querySnapshot) => {
        let incomeFromTransactions = 0;
        let expensesFromTransactions = 0;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data && typeof data.amount === "number" && data.type) {
            if (data.type === "Income") incomeFromTransactions += data.amount;
            else if (data.type === "Expenses")
              expensesFromTransactions += data.amount;
          }
        });

        const combinedTotalIncome =
          estimatedRecurringIncome + incomeFromTransactions;
        setTotalIncome(combinedTotalIncome);
        setTotalExpenses(expensesFromTransactions);
        setNetTotal(combinedTotalIncome - expensesFromTransactions);
        setIsLoadingTotals(false);
      },
      (err) => {
        console.error("Error fetching transaction totals: ", err);
        setErrorTotals("Failed to load transaction totals.");
        setTotalIncome(estimatedRecurringIncome);
        setTotalExpenses(0);
        setNetTotal(estimatedRecurringIncome);
        setIsLoadingTotals(false);
      }
    );

    return () => {
      console.log(
        `HeaderTopNav: Unsubscribing from transaction totals listener for ${currentUser?.uid}`
      );
      unsubscribeTransactions();
    };
  }, [
    currentUser,
    selectedYear,
    selectedMonth,
    accountIncomeData,
    isLoadingAccounts,
    selectedFilter,
  ]);

  // --- Date Picker Logic ---
  const showDatePicker = () => setShowYearPicker(true);

  const hideDatePicker = () => {
    setShowYearPicker(false);
    setShowMonthPicker(false);
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setShowYearPicker(false);
    setShowMonthPicker(true);
  };

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setShowMonthPicker(false);
  };

  // --- Filter Modal Logic ---
  const handleFilterSelect = (filter: TimeFilter) => {
    setSelectedFilter(filter);
    setIsFilterModalVisible(false);
  };

  // --- Navigate to Profile Screen ---
  const navigateToProfile = () => {
    router.push("/profile");
  };

  // --- Render Totals ---
  const renderTotals = () => {
    if (isLoadingTotals || isLoadingAccounts || !currentUser) {
      return (
        <ActivityIndicator
          size="small"
          color="white"
          style={styles.totalsLoader}
        />
      );
    }

    if (errorTotals && !isLoadingTotals) {
      const errorLines = errorTotals.split("\n").map((line, index) => (
        <Text key={index} style={styles.errorText} numberOfLines={1}>
          {line}
        </Text>
      ));
      return <View style={styles.errorContainer}>{errorLines}</View>;
    }

    return (
      <View style={styles.categoryItemContent}>
        <View style={styles.totalCard}>
          <Text style={styles.categoryLabel}>Expenses</Text>
          <Text
            style={[styles.categoryAmount, styles.expenseAmount]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {formatCurrency(totalExpenses, selectedCurrency)}
          </Text>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.categoryLabel}>Income</Text>
          <Text
            style={[styles.categoryAmount, styles.incomeAmount]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {formatCurrency(totalIncome, selectedCurrency)}
          </Text>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.categoryLabel}>Balance</Text>
          <Text
            style={[
              styles.categoryAmount,
              netTotal >= 0 ? styles.incomeAmount : styles.expenseAmount,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {formatCurrency(netTotal, selectedCurrency)}
          </Text>
        </View>
      </View>
    );
  };

  // --- JSX ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#006400" />

      {/* Header Content */}
      <View style={styles.headerWrapper}>
        {/* Top Row */}
        <View style={styles.headerTop}>
          {/* Menu Icon navigates to Profile Screen */}
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={navigateToProfile}
            activeOpacity={0.7}
          >
            <Ionicons name="menu-outline" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>FinClassify</Text>
          </View>

          <View style={styles.rightIconsContainer}>
            <TouchableOpacity
              onPress={() => setIsFilterModalVisible(true)}
              activeOpacity={0.7}
              style={styles.filterButton}
            >
              <Ionicons name="options-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Middle Row */}
        <View style={styles.headerBottom}>
          <View style={styles.dateAndFilterContainer}>
            {/* Month/Year Picker */}
            <View style={styles.dateContainer}>
              <TouchableOpacity
                style={[
                  styles.dateSelector,
                  selectedFilter !== "Monthly" && styles.dateSelectorDisabled,
                ]}
                onPress={showDatePicker}
                disabled={selectedFilter !== "Monthly"}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateText,
                    selectedFilter !== "Monthly" && styles.dateTextDisabled,
                  ]}
                >
                  {selectedDateString}
                </Text>
                {selectedFilter === "Monthly" && (
                  <Ionicons
                    name="chevron-down-outline"
                    size={16}
                    color="white"
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Filter Type Display */}
            <View style={styles.filterTypeDisplay}>
              <Text style={styles.filterTypeText}>{selectedFilter}</Text>
            </View>
          </View>
        </View>

        {/* Bottom Row - Summary Cards */}
        <View style={styles.dataContainer}>{renderTotals()}</View>
      </View>

      {/* Year Picker Modal */}
      {showYearPicker && (
        <Modal transparent animationType="fade" onRequestClose={hideDatePicker}>
          <TouchableWithoutFeedback onPress={hideDatePicker}>
            <View style={styles.pickerModalContainer}>
              <TouchableWithoutFeedback>
                <View style={styles.pickerContent}>
                  <Text style={styles.pickerTitle}>Select Year</Text>
                  <FlatList
                    data={years.map(String)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.pickerItem,
                          selectedYear === parseInt(item, 10) &&
                            styles.pickerItemSelected,
                        ]}
                        onPress={() => handleYearSelect(parseInt(item, 10))}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            selectedYear === parseInt(item, 10) &&
                              styles.pickerTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item}
                  />
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={hideDatePicker}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <Modal transparent animationType="fade" onRequestClose={hideDatePicker}>
          <TouchableWithoutFeedback onPress={hideDatePicker}>
            <View style={styles.pickerModalContainer}>
              <TouchableWithoutFeedback>
                <View style={styles.pickerContent}>
                  <Text style={styles.pickerTitle}>Select Month</Text>
                  <FlatList
                    data={monthsArray}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.pickerItem,
                          selectedMonth === item && styles.pickerItemSelected,
                        ]}
                        onPress={() => handleMonthSelect(item)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            selectedMonth === item && styles.pickerTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item}
                  />
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={hideDatePicker}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Filter Selection Modal */}
      {isFilterModalVisible && (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => setIsFilterModalVisible(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setIsFilterModalVisible(false)}
          >
            <View style={styles.pickerModalContainer}>
              <TouchableWithoutFeedback>
                <View style={styles.pickerContent}>
                  <Text style={styles.pickerTitle}>Select Time Filter</Text>
                  {(["Daily", "Weekly", "Monthly"] as TimeFilter[]).map(
                    (filter) => (
                      <TouchableOpacity
                        key={filter}
                        style={[
                          styles.pickerItem,
                          selectedFilter === filter &&
                            styles.pickerItemSelected,
                        ]}
                        onPress={() => handleFilterSelect(filter)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            selectedFilter === filter &&
                              styles.pickerTextSelected,
                          ]}
                        >
                          {filter}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setIsFilterModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#006400",
    paddingHorizontal: 16,
    paddingBottom: 16,
    ...Platform.select({
      ios: { paddingTop: 50 },
      android: { paddingTop: 16 },
    }),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerWrapper: {
    width: "100%",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  headerBottom: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  titleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  iconContainer: {
    padding: 8,
    zIndex: 2,
    borderRadius: 20,
  },
  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  dateContainer: {
    alignItems: "flex-start",
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  dateSelectorDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dateText: {
    color: "white",
    marginRight: 6,
    fontSize: 14,
    fontWeight: "600",
  },
  dateTextDisabled: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  dateAndFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  filterTypeDisplay: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  filterTypeText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
  },
  dataContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  categoryItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    width: "100%",
    gap: 8,
  },
  totalCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  categoryLabel: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  incomeAmount: {
    color: "#8AFF8A",
  },
  expenseAmount: {
    color: "#FF8A8A",
  },
  totalsLoader: {
    marginVertical: 20,
    alignSelf: "center",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  errorText: {
    color: "#ffdddd",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 4,
  },
  rightIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  pickerContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    width: width * 0.85,
    maxHeight: height * 0.7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  pickerItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  pickerItemSelected: {
    backgroundColor: "#f0f8f0",
  },
  pickerText: {
    fontSize: 16,
    color: "#444",
  },
  pickerTextSelected: {
    fontWeight: "bold",
    color: "#B58900",
  },
  pickerButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    alignSelf: "center",
  },
  pickerButtonText: {
    fontSize: 16,
    color: "#444",
    fontWeight: "600",
  },
});

export default Header;
