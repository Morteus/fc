// c:\Users\scubo\Downloads\FinClassify-dea0c4be4da0318ed62b8b3aa713817c40b0002f\FinClassifyApp\components\headertopnav.tsx
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns/format";
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
import CalendarRangeModal from "./CalendarRangeModal";

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
    selectedFilter,
    setSelectedFilter,
    selectedCurrency,
    startDate,
    endDate,
    updateDateRange,
    selectedDateString, // Make sure this is included
  } = useDateContext();

  // Remove unused state and variables
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
  const [showCalendar, setShowCalendar] = useState(false);

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

    // Calculate date range based on filter
    let startTimestamp = Timestamp.fromDate(startDate);
    let endTimestamp = Timestamp.fromDate(
      new Date(endDate.getTime() + 86400000)
    );

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
      where("isDeleted", "!=", true), // Add this condition
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
  }, [currentUser, accountIncomeData, isLoadingAccounts, startDate, endDate]);

  useEffect(() => {
    if (!currentUser) return;

    const startTime = new Date(startDate);
    startTime.setHours(0, 0, 0, 0);

    const endTime = new Date(endDate);
    endTime.setHours(23, 59, 59, 999);

    const transactionsRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "transactions"
    );

    // Create queries for income and expenses separately
    const qIncome = query(
      transactionsRef,
      where("type", "==", "Income"),
      where("isDeleted", "!=", true),
      where("timestamp", ">=", Timestamp.fromDate(startTime)),
      where("timestamp", "<=", Timestamp.fromDate(endTime))
    );

    const qExpenses = query(
      transactionsRef,
      where("type", "==", "Expenses"),
      where("isDeleted", "!=", true),
      where("timestamp", ">=", Timestamp.fromDate(startTime)),
      where("timestamp", "<=", Timestamp.fromDate(endTime))
    );

    const unsubIncome = onSnapshot(qIncome, (snapshot) => {
      const income = snapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );
      setTotalIncome(income);
    });

    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const expenses = snapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );
      setTotalExpenses(expenses);
    });

    return () => {
      unsubIncome();
      unsubExpenses();
    };
  }, [currentUser, startDate, endDate]);

  const handleDateRangeSelect = (start: Date, end: Date) => {
    // Calculate the time range type based on selected dates
    const diffDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    let newFilter: TimeFilter;
    if (diffDays <= 1) {
      newFilter = "Daily";
    } else if (diffDays <= 7) {
      newFilter = "Weekly";
    } else {
      newFilter = "Monthly";
    }

    setSelectedFilter(newFilter);
    updateDateRange(start, end);
    setShowCalendar(false);
  };

  const getDateRangeString = () => {
    if (startDate && endDate) {
      return `${format(startDate, "MMM d")} - ${format(
        endDate,
        "MMM d, yyyy"
      )}`;
    }
    return selectedDateString;
  };

  // --- Filter Modal Logic ---
  const handleFilterSelect = (filter: TimeFilter) => {
    const now = new Date();
    let newStartDate: Date;
    let newEndDate: Date;

    switch (filter) {
      case "Daily":
        newStartDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        newEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "Weekly":
        const dayOfWeek = now.getDay();
        newStartDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - dayOfWeek
        );
        newEndDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + (6 - dayOfWeek)
        );
        break;
      case "Monthly":
        newStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        newEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      default:
        return;
    }

    setSelectedFilter(filter);
    updateDateRange(newStartDate, newEndDate);
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#006400" />
      <View style={styles.headerWrapper}>
        <View style={styles.headerTop}>
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

        <View style={styles.headerBottom}>
          <View style={styles.dateAndFilterContainer}>
            <View style={styles.dateContainer}>
              <TouchableOpacity
                style={[styles.dateSelector]}
                onPress={() => setShowCalendar(true)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color="white"
                  style={styles.calendarIcon}
                />
                <Text style={styles.dateText}>{getDateRangeString()}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterTypeDisplay}>
              <Text style={styles.filterTypeText}>{selectedFilter}</Text>
            </View>
          </View>
        </View>

        <View style={styles.dataContainer}>{renderTotals()}</View>
      </View>

      <CalendarRangeModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={handleDateRangeSelect}
        startDate={startDate}
        endDate={endDate}
      />

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
              <View style={styles.pickerContent}>
                <Text style={styles.pickerTitle}>Select Time Filter</Text>
                {(["Daily", "Weekly", "Monthly"] as TimeFilter[]).map(
                  (filter) => (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.pickerItem,
                        selectedFilter === filter && styles.pickerItemSelected,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    minWidth: 180, // Add this to accommodate longer date ranges
  },
  dateSelectorDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  dateText: {
    color: "white",
    marginHorizontal: 6,
    fontSize: 14,
    fontWeight: "600",
  },
  calendarIcon: {
    marginRight: 2,
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
    fontSize: 13,
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
