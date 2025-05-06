import type { MaterialCommunityIcons as IconType } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth"; // Import getAuth
import { doc, getFirestore, setDoc } from "firebase/firestore"; // Keep setDoc
import { useState } from "react";
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { app } from "../app/firebase"; // Adjust path as needed

// Hardcoded User ID

//
const HARDCODED_USER_ID = "User";

// --- Default Icons (remain the same) ---
const DEFAULT_ICONS: {
  name: keyof typeof IconType.glyphMap;
  key: string;
}[] = [
  { name: "file-document-outline", key: "document" },
  { name: "car", key: "car" },
  { name: "tshirt-crew", key: "clothing" },
  { name: "school", key: "education" },
  { name: "food", key: "food" },
  { name: "heart-pulse", key: "health" },
  { name: "home", key: "home" },
  { name: "movie", key: "leisure" },
  { name: "paw", key: "pets" },
  { name: "cart", key: "shopping" },
  { name: "basketball", key: "sports" },
  { name: "train", key: "travel" },
  { name: "cellphone", key: "technology" },
  { name: "beer", key: "drinks" },
  { name: "coffee", key: "coffee" },
];

// Initialize Firestore & Auth
const db = getFirestore(app);
const auth = getAuth(app);

// --- Interface (userId prop is now less relevant but kept for structure) ---
interface AddCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (category: {
    name: string;
    icon: string;
    description?: string | null;
  }) => void;
  // userId prop is no longer needed
}

export default function AddCategoryModal({
  visible,
  onClose,
  onSave,
}: AddCategoryModalProps) {
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_ICONS[0].name);
  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");

  // --- Updated handleSave to use hardcoded userId ---
  const handleSave = async () => {
    // Get current user ID
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to save a category.");
      return;
    }
    const userId = currentUser.uid;

    const trimmedName = categoryName.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      Alert.alert("Validation Error", "Please enter a category name.");
      return;
    }

    const categoryData = {
      name: trimmedName,
      icon: selectedIcon,
      description: trimmedDescription || null,
    };

    try {
      // Use the nested path with the actual userId
      const categoryDocRef = doc(
        db,
        "Accounts",
        userId,
        "Expenses",
        trimmedName
      );

      await setDoc(categoryDocRef, categoryData);

      onSave(categoryData); // Callback to parent

      // Reset form state
      setCategoryName("");
      setDescription("");
      setSelectedIcon(DEFAULT_ICONS[0].name);
    } catch (error: any) {
      console.error("Error saving expense category to Firestore:", error);
      if (error.code === "permission-denied") {
        Alert.alert(
          "Permission Error",
          "You don't have permission to save this expense category."
        );
      } else {
        Alert.alert("Error", "Could not save the category. Please try again.");
      }
    }
  };

  // --- handleClose (remains the same) ---
  const handleClose = () => {
    setCategoryName("");
    setDescription("");
    setSelectedIcon(DEFAULT_ICONS[0].name);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Add New Expense Category</Text>

          <Text style={styles.label}>Category Name:</Text>
          <TextInput
            style={styles.input}
            value={categoryName}
            onChangeText={setCategoryName}
            placeholder="Enter category name"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Description: (Optional)</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter description"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Choose Icon:</Text>
          <View style={styles.iconScrollContainer}>
            <ScrollView
              style={styles.iconScrollView}
              contentContainerStyle={styles.iconScrollContent}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.iconGrid}>
                {DEFAULT_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon.key}
                    style={[
                      styles.iconButton,
                      selectedIcon === icon.name && styles.selectedIconButton,
                    ]}
                    onPress={() => setSelectedIcon(icon.name)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={icon.name}
                      size={24}
                      color={selectedIcon === icon.name ? "#006400" : "white"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 350,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    alignSelf: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#B58900",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 15,
    color: "#444",
    marginBottom: 6,
    marginTop: 4,
    fontWeight: "600",
    letterSpacing: 0.2,
    alignSelf: "flex-start",
  },
  iconScrollContainer: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#eee",
    borderRadius: 15,
    marginBottom: 20,
    backgroundColor: "#f8f9fa",
    alignSelf: "center",
  },
  iconScrollView: {
    maxHeight: 180,
  },
  iconScrollContent: {
    padding: 12,
    paddingBottom: 4,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#006400",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedIconButton: {
    backgroundColor: "#B58900",
    borderWidth: 2,
    borderColor: "#006400",
    transform: [{ scale: 1.05 }],
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#212529",
    width: "100%",
    alignSelf: "center",
  },
  descriptionInput: {
    height: 70,
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    width: "100%",
    alignSelf: "center",
  },
  button: {
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
});
