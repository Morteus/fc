// c:\Users\scubo\OneDrive\Documents\FC_proj\FinClassify\FinClassifyApp\components\botnavigationbar.tsx
import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect } from "expo-router"; // Import Link and useFocusEffect
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const BottomNavigationBar = () => {
  const [disabled, setDisabled] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      // Set disabled to true when the BottomNavigationBar comes into focus
      setDisabled(true);

      // Simulate a loading period (replace with your actual loading logic)
      const timeout = setTimeout(() => {
        setDisabled(false);
      }, 2000);

      // Clear the timeout if the component unmounts or loses focus
      return () => clearTimeout(timeout);
    }, []) // Empty dependency array ensures this runs only when the component mounts/unmounts or gains/loses focus
  );

  return (
    <View style={styles.container}>
      <NavItem
        icon="reader-outline"
        label="Records"
        href="/record"
        disabled={disabled}
      />
      <NavItem
        icon="pie-chart-outline"
        label="Analysis"
        href="/analysis"
        disabled={disabled}
      />
      <NavItem
        icon="calculator-outline"
        label="Budgets"
        href="/Budgets"
        disabled={disabled}
      />
      <NavItem
        icon="wallet-outline"
        label="Accounts"
        href="/Accounts"
        disabled={disabled}
      />
    </View>
  );
};

// NavItem Component with Link and disabled state
const NavItem = ({
  icon,
  label,
  href,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  href: `/record` | `/analysis` | `/Budgets` | `/Accounts`; // Explicitly define possible paths
  disabled: boolean;
}) => {
  return (
    <Link
      href={href}
      style={styles.linkWrapper}
      {...(disabled && { onPress: () => null, disabled: true })}
    >
      <View style={[styles.navItemContent, disabled && styles.disabledItem]}>
        <Ionicons name={icon} size={25} color={disabled ? "#ccc" : "#2E8B57"} />
        <Text style={[styles.navLabel, disabled && styles.disabledLabel]}>
          {label}
        </Text>
      </View>
    </Link>
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
  disabledItem: {
    opacity: 0.5,
  },
  disabledLabel: {
    color: "#ccc",
  },
});

export default BottomNavigationBar;
