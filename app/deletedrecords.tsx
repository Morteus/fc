import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatCurrency } from "../utils/formatting";
import { useDateContext } from "./context/DateContext";
import { auth, db } from "./firebase";

interface DeletedTransaction {
  id: string;
  type: "Income" | "Expenses";
  categoryName: string;
  categoryIcon: string;
  amount: number;
  timestamp: any;
  accountId: string;
  accountName: string;
  deletedAt: any;
  description?: string;
}

export default function DeletedRecordsScreen() {
  const router = useRouter();
  const { selectedCurrency } = useDateContext();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deletedTransactions, setDeletedTransactions] = useState<
    DeletedTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) router.replace("/");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;

    const transactionsRef = collection(
      db,
      "Accounts",
      currentUser.uid,
      "transactions"
    );
    const q = query(
      transactionsRef,
      where("isDeleted", "==", true),
      orderBy("deletedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const deleted: DeletedTransaction[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as DeletedTransaction;
        deleted.push({ ...data, id: doc.id });
      });
      setDeletedTransactions(deleted);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleRestore = async (transaction: DeletedTransaction) => {
    if (!currentUser) return;

    Alert.alert(
      "Restore Transaction",
      "Are you sure you want to restore this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            try {
              const transactionRef = doc(
                db,
                "Accounts",
                currentUser.uid,
                "transactions",
                transaction.id
              );
              await updateDoc(transactionRef, {
                isDeleted: false,
                deletedAt: null,
              });
              Alert.alert("Success", "Transaction restored successfully");
            } catch (error) {
              console.error("Error restoring transaction:", error);
              Alert.alert("Error", "Failed to restore transaction");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#006400" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deleted Records</Text>
        <View style={{ width: 24 }} />
      </View>

      {deletedTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="delete-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No deleted transactions found</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {deletedTransactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={styles.categoryContainer}>
                  <MaterialCommunityIcons
                    name={transaction.categoryIcon as any}
                    size={24}
                    color="#006400"
                  />
                  <Text style={styles.categoryName}>
                    {transaction.categoryName}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.amount,
                    transaction.type === "Income"
                      ? styles.incomeAmount
                      : styles.expenseAmount,
                  ]}
                >
                  {transaction.type === "Income" ? "+" : "-"}
                  {formatCurrency(transaction.amount, selectedCurrency)}
                </Text>
              </View>

              <View style={styles.detailsContainer}>
                <Text style={styles.accountName}>
                  {transaction.accountName}
                </Text>
                <Text style={styles.date}>
                  Deleted on:{" "}
                  {transaction.deletedAt?.toDate().toLocaleDateString()}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.restoreButton}
                onPress={() => handleRestore(transaction)}
              >
                <MaterialIcons name="restore" size={20} color="#006400" />
                <Text style={styles.restoreText}>Restore Transaction</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  header: {
    backgroundColor: "#006400",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  backButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  transactionCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    color: "#333",
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  incomeAmount: {
    color: "#28a745",
  },
  expenseAmount: {
    color: "#dc3545",
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
    marginBottom: 12,
  },
  accountName: {
    fontSize: 14,
    color: "#666",
  },
  date: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
  },
  restoreText: {
    marginLeft: 8,
    color: "#006400",
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
