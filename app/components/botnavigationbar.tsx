// c:\Users\scubo\OneDrive\Documents\FC_proj\FinClassify\FinClassifyApp\components\botnavigationbar.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native"; // Removed TouchableOpacity
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router"; // Import Link

const BottomNavigationBar = () => {
  return (
    <View style={styles.container}>
      {/* Link wraps NavItem, NO asChild */}
      <Link href="../../record" style={styles.linkWrapper}>
        <NavItem icon="reader-outline" label="Records" />
      </Link>

      <Link href="../../analysis" style={styles.linkWrapper}>
        <NavItem icon="pie-chart-outline" label="Analysis" />
      </Link>

      <Link href="../../Budgets" style={styles.linkWrapper}>
        <NavItem icon="calculator-outline" label="Budgets" />
      </Link>

      <Link href="../../Accounts" style={styles.linkWrapper}>
        <NavItem icon="wallet-outline" label="Accounts" />
      </Link>
    </View>
  );
};

// --- NavItem Component ---
// Simplified: It no longer needs onPress or accessibilityRole from Link
const NavItem: React.FC<{
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}> = ({ icon, label }) => {
  return (
    // This View is just for layout/styling now
    // The press handling is done by the parent Link
    <View style={styles.navItemContent}>
      <Ionicons name={icon} size={25} color="#2E8B57" />
      <Text style={styles.navLabel}>{label}</Text>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "white",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  linkWrapper: {
    justifyContent: "center", // Center the NavItem content vertically
    alignItems: "center", // Center the NavItem content horizontally
    textDecorationLine: "none", // Remove underline on web
  },
  navItemContent: {
    // Styles for the content inside the link (icon and text)
    alignItems: "center", // Center icon and text horizontally
    // Removed paddingVertical
  },
  navLabel: {
    fontSize: 12,
    color: "#2E8B57",
    marginTop: 4, // Slightly reduced margin
  },
});

export default BottomNavigationBar;
