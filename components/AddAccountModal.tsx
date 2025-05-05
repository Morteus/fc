import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MaterialCommunityIcons as IconType } from "@expo/vector-icons";

const DEFAULT_ICONS: Array<{
  name: keyof typeof IconType.glyphMap;
  key: string;
}> = [
  { name: "cash", key: "cash" },
  { name: "credit-card", key: "credit" },
  { name: "book-open", key: "book" },
  { name: "airplane", key: "airplane" },
];

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (account: {
    name: string;
    icon: string;
    description?: string;
  }) => void;
}

export default function AddAccountModal({
  visible,
  onClose,
  onSave,
}: AddAccountModalProps) {
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_ICONS[0].name);
  const [accountName, setAccountName] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (accountName.trim()) {
      onSave({
        name: accountName,
        icon: selectedIcon,
        description: description.trim() || undefined,
      });
      setAccountName("");
      setDescription("");
      setSelectedIcon(DEFAULT_ICONS[0].name);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Add New Account</Text>

          <Text style={styles.label}>Choose Icon:</Text>
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

          <Text style={styles.label}>Category Name:</Text>
          <TextInput
            style={styles.input}
            value={accountName}
            onChangeText={setAccountName}
            placeholder="Enter account name"
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

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#006400",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  iconGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
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
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#006400",
  },
  saveButton: {
    backgroundColor: "#DAA520",
  },
  cancelButtonText: {
    color: "#006400",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
  saveButtonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
});
