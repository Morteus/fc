// c:\Users\scubo\Downloads\FinClassify-dea0c4be4da0318ed62b8b3aa713817c40b0002f\FinClassifyApp\components\headertopnav.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal, // Keep Modal for pickers
  Dimensions,
  FlatList,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback, // <-- Add TouchableWithoutFeedback
  Alert, // Added for ProfilePage
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "../app/firebase";
import { useDateContext } from "../app/context/DateContext"; // Import the context hook
import { useRouter } from "expo-router";
import { formatCurrency } from "../utils/formatting"; // <-- Import shared function

const { width, height } = Dimensions.get("window");
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Auth

// --- Interfaces ---
interface AccountForIncome {
  id: string;
  incomeAmount?: number | null;
  incomeFrequency?: "Daily" | "Weekly" | "Monthly" | null;
}

// --- Helper Functions ---
// formatCurrency moved to utils/formatting.ts

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
    selectedCurrency, // Get currency from context
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

  // Local state for UI control (pickers)
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
  const router = useRouter(); // Get router instance

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
  }, []); // Removed isProfileModalVisible dependency

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
      // Only validate month if filter is Monthly
      setErrorTotals("Invalid month selected.");
      setIsLoadingTotals(false);
      return;
    }

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
        {" "}
        {/* Wrap in a View */}
        <Text
          style={styles.categoryAmount}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {formatCurrency(totalExpenses, selectedCurrency)}{" "}
          {/* Pass selectedCurrency */}
        </Text>
        <Text
          style={styles.categoryAmount}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {formatCurrency(totalIncome, selectedCurrency)}{" "}
          {/* Pass selectedCurrency */}
        </Text>
        <Text
          style={styles.categoryAmount}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {formatCurrency(netTotal, selectedCurrency)}{" "}
          {/* Pass selectedCurrency */}
        </Text>
      </View>
    );
  };

  // --- JSX ---
  return (
    <View style={styles.container}>
      {/* Header Content */}
      <View style={styles.headerWrapper}>
        {/* Top Row */}
        <View style={styles.headerTop}>
          {/* Menu Icon navigates to Profile Screen */}
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={navigateToProfile} // <-- Updated onPress
          >
            <Ionicons name="menu-outline" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>FinClassify</Text>
          </View>
          <View style={styles.rightIconsContainer}>
            {/* Moved Filter Icon Here */}
            <TouchableOpacity onPress={() => setIsFilterModalVisible(true)}>
              <Ionicons name="options-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Middle Row */}
        <View style={styles.headerBottom}>
          <View style={styles.dateAndFilterContainer}>
            {/* Month/Year Picker (Always Visible, Disabled if not Monthly) */}
            <View style={styles.dateContainer}>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={showDatePicker}
                disabled={selectedFilter !== "Monthly"} // Disable if not Monthly filter
              >
                <Text
                  style={[
                    styles.dateText,
                    selectedFilter !== "Monthly" && styles.dateTextDisabled, // Style when disabled
                  ]}
                >
                  {selectedDateString} {/* Always show Month/Year */}
                </Text>
                {/* Only show chevron if Monthly filter is active */}
                {selectedFilter === "Monthly" && (
                  <Ionicons
                    name="chevron-down-outline"
                    size={16}
                    color="white"
                  />
                )}
              </TouchableOpacity>
            </View>
            {/* Filter Type Display (Not Clickable) */}
            <View style={styles.filterTypeDisplay}>
              <Text style={styles.filterTypeText}>{selectedFilter}</Text>
            </View>
          </View>
        </View>
        {/* Bottom Row */}
        <View style={styles.dataContainer}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryHeaderText}>Expenses</Text>
            <Text style={styles.categoryHeaderText}>Income</Text>
            <Text style={styles.categoryHeaderText}>Total</Text>
          </View>
          <View style={styles.categoryItem}>{renderTotals()}</View>
        </View>
      </View>

      {/* --- Removed Profile Modal --- */}

      {/* Year Picker Modal */}
      {showYearPicker && (
        <Modal transparent animationType="fade" onRequestClose={hideDatePicker}>
          <TouchableWithoutFeedback onPress={hideDatePicker}>
            <View style={styles.pickerModalContainer}>
              <View
                style={styles.pickerContent}
                onStartShouldSetResponder={() => true}
              >
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
                >
                  <Text style={styles.pickerButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <Modal transparent animationType="fade" onRequestClose={hideDatePicker}>
          <TouchableWithoutFeedback onPress={hideDatePicker}>
            <View style={styles.pickerModalContainer}>
              <View
                style={styles.pickerContent}
                onStartShouldSetResponder={() => true}
              >
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
                >
                  <Text style={styles.pickerButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
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
              <View
                style={styles.pickerContent}
                onStartShouldSetResponder={() => true}
              >
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
                >
                  <Text style={styles.pickerButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
      {/* --- Removed Currency Modal --- */}
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  // --- Header Styles ---
  container: {
    backgroundColor: "#006400",
    paddingHorizontal: 8,
    paddingBottom: 8,
    ...Platform.select({
      ios: { paddingTop: 40 },
      android: { paddingTop: 10 },
    }),
  },
  headerWrapper: {},
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 5,
  },
  headerBottom: { flexDirection: "row", alignItems: "center", width: "100%" },
  titleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  iconContainer: { padding: 4, zIndex: 2 },
  title: { color: "white", fontSize: 18, fontWeight: "bold" },
  dateContainer: { alignItems: "flex-start" },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dateText: { color: "white", marginRight: 4, fontSize: 14, fontWeight: "500" },
  dateTextDisabled: { color: "#cccccc" },
  dateAndFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 5, // Add some horizontal padding
  },
  filterTypeDisplay: {
    // Style for the D/W/M display text container
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    // Removed background color, adjust as needed
  },
  filterTypeText: {
    color: "white",
    marginRight: 4,
    fontSize: 14,
    fontWeight: "500",
  },

  dataContainer: {
    marginTop: 10,
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 6,
    paddingVertical: 8,
    minHeight: 50,
    justifyContent: "center",
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  categoryHeaderText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 10,
    alignItems: "center",
  },
  categoryAmount: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
    paddingHorizontal: 2,
  },
  totalsLoader: { marginVertical: 5 },
  categoryItemContent: {
    // Style for the new wrapper inside categoryItem
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  errorText: { color: "#ffdddd", fontSize: 11, textAlign: "center" },
  rightIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  // Removed searchIcon and volumeSliderIcon styles as they are implicitly handled or not needed

  // --- Picker Modal Styles ---
  pickerModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  pickerContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: width * 0.8,
    maxHeight: height * 0.6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  pickerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  pickerItemSelected: { backgroundColor: "#e0f2e0" },
  pickerText: { fontSize: 16, color: "#006400" },
  pickerTextSelected: { fontWeight: "bold" },
  pickerButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    alignSelf: "center",
  },
  pickerButtonText: { fontSize: 16, color: "#555", fontWeight: "500" },
});

export default Header;
