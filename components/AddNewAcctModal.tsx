import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

interface Account {
  name: string;
  icon: string;
}

interface AddNewAcctModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: { name: string; icon: string }[];
  onSave: (newAccount: { name: string; icon: string }) => void;
}

const AddNewAcctModal: React.FC<AddNewAcctModalProps> = ({
  visible,
  onClose,
  accounts,
  onSave,
}) => {
  const [newAccountName, setNewAccountName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  const accountIcons = [
    "money-check-alt",
    "credit-card",
    "piggy-bank",
    "wallet",
    "university",
  ];

  const handleSave = () => {
    if (!newAccountName.trim() || !selectedIcon) {
      alert("Please enter an account name and select an icon.");
      return;
    }

    const newAccount: Account = {
      name: newAccountName.trim(),
      icon: selectedIcon,
    };

    onSave(newAccount);
    setNewAccountName("");
    setSelectedIcon(null);
    onClose();
  };

  return (
    <Modal animationType="none" transparent={true} visible={visible}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add New Account</Text>

          {/* Icon Selection */}
          <Text style={styles.modalLabel}>Choose Icon:</Text>
          <FlatList
            data={accountIcons}
            horizontal
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  selectedIcon === item && styles.selectedIcon,
                ]}
                onPress={() => setSelectedIcon(item)}
              >
                <FontAwesome5 name={item} size={24} color="white" />
              </TouchableOpacity>
            )}
          />

          {/* Account Name Input */}
          <Text style={styles.modalLabel}>Account Name:</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter account name"
            value={newAccountName}
            onChangeText={setNewAccountName}
          />

          {/* Action Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: 300,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalLabel: { fontSize: 14, marginVertical: 5 },
  iconButton: {
    backgroundColor: "#136207",
    padding: 16,
    borderRadius: 50,
    alignItems: "center",
    marginHorizontal: 5,
  },
  selectedIcon: {
    backgroundColor: "#0A4D02",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "grey",
    padding: 10,
    margin: 5,
    alignItems: "center",
    borderRadius: 5,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#136207",
    padding: 10,
    margin: 5,
    alignItems: "center",
    borderRadius: 5,
  },
  buttonText: { color: "white", fontWeight: "bold" },
});

export default AddNewAcctModal;
