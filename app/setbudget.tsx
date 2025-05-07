import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CURRENCY_SYMBOLS } from "../utils/formatting";
import { useDateContext } from "./context/DateContext";
import { auth, db } from "./firebase";

export default function SetBudgetScreen() {
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const { selectedCurrency } = useDateContext();
  const [budgetLimit, setBudgetLimit] = useState(
    params.currentLimit?.toString() || ""
  );
  const [selectedResetPeriod, setSelectedResetPeriod] = useState<
    "Daily" | "Weekly" | "Monthly"
  >((params.resetPeriod as any) || "Monthly");

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to set budgets");
      return;
    }

    const limitValue = parseFloat(budgetLimit);
    if (isNaN(limitValue) || limitValue <= 0) {
      Alert.alert("Error", "Please enter a valid budget amount");
      return;
    }

    if (!params.categoryName) {
      Alert.alert("Error", "Category name is required");
      return;
    }

    try {
      const budgetData = {
        categoryName: params.categoryName,
        limit: limitValue,
        icon: params.icon || "help-circle-outline",
        resetPeriod: selectedResetPeriod,
        lastResetDate: new Date(),
      };

      const budgetsColRef = collection(
        db,
        "Accounts",
        currentUser.uid,
        "budgets"
      );

      // Check if we have a valid budgetId for updating
      if (
        params.budgetId &&
        params.budgetId !== "null" &&
        params.budgetId !== "undefined"
      ) {
        console.log("Updating existing budget:", params.budgetId);
        const budgetDocRef = doc(budgetsColRef, params.budgetId as string);
        await updateDoc(budgetDocRef, budgetData);
      } else {
        // Always create new document if no valid budgetId
        console.log("Creating new budget");
        const docRef = await addDoc(budgetsColRef, budgetData);
        console.log("Created with ID:", docRef.id);
      }

      Alert.alert(
        "Success",
        `Budget ${params.budgetId ? "updated" : "created"} successfully`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error("Error saving budget:", error);
      Alert.alert(
        "Error",
        `Failed to save budget: ${error.message || "Unknown error"}`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {params.budgetId ? "Edit Budget" : "Set Budget"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.categoryInfo}>
          <MaterialCommunityIcons
            name={params.icon as any}
            size={32}
            color="#006400"
          />
          <Text style={styles.categoryName}>{params.categoryName}</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Budget Limit (
            {CURRENCY_SYMBOLS[selectedCurrency] || selectedCurrency}):
          </Text>
          <TextInput
            style={styles.input}
            value={budgetLimit}
            onChangeText={setBudgetLimit}
            keyboardType="numeric"
            placeholder="Enter amount"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.resetPeriodContainer}>
          <Text style={styles.label}>Reset Period:</Text>
          <View style={styles.resetPeriodButtons}>
            {(["Daily", "Weekly", "Monthly"] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedResetPeriod === period && styles.selectedPeriodButton,
                ]}
                onPress={() => setSelectedResetPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedResetPeriod === period && styles.selectedPeriodText,
                  ]}
                >
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Budget</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#006400",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    padding: 20,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
    color: "#333",
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  resetPeriodContainer: {
    marginBottom: 24,
  },
  resetPeriodButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  periodButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedPeriodButton: {
    backgroundColor: "#006400",
    borderColor: "#006400",
  },
  periodButtonText: {
    fontSize: 14,
    color: "#333",
  },
  selectedPeriodText: {
    color: "#fff",
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#DAA520",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
