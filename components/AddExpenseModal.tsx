import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MaterialCommunityIcons as IconType } from "@expo/vector-icons";
import { getFirestore, doc, setDoc } from "firebase/firestore"; // Keep setDoc
import { getAuth } from "firebase/auth"; // Import getAuth
import { app } from "../app/firebase"; // Adjust path as needed

// Hardcoded User ID
const HARDCODED_USER_ID = "User";

// --- Default Icons (remain the same) ---
const DEFAULT_ICONS: Array<{
  name: keyof typeof IconType.glyphMap;
  key: string;
}> = [
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
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Add New Expense Category</Text>

          {/* Inputs and Icon Picker remain the same */}
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
          <ScrollView style={styles.iconScrollView} nestedScrollEnabled={true}>
            <View style={styles.iconGrid}>
              {DEFAULT_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon.key}
                  style={[
                    styles.iconButton,
                    selectedIcon === icon.name && styles.selectedIconButton,
                  ]}
                  onPress={() => setSelectedIcon(icon.name)}
                >
                  <MaterialCommunityIcons
                    name={icon.name}
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave} // Use updated save handler
              // Removed disabled prop
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  // Removed disabledButtonText style
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 25,
    width: "90%",
    maxWidth: 400,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#006400", // Theme color
    marginBottom: 25,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
    fontWeight: "500",
  },
  iconScrollView: {
    maxHeight: 180, // Adjust height
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 5,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center", // Center icons
    gap: 12, // Spacing
  },
  iconButton: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: "#006400",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedIconButton: {
    backgroundColor: "#004d00",
    borderWidth: 2,
    borderColor: "#DAA520",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
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
  // Removed disabledSaveButton style
  cancelButtonText: {
    color: "#495057",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButtonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
});
