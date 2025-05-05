import * as React from "react";
import { View, Text, StyleSheet } from "react-native";

function StatCard({ title, amount }) {
  return (
    <View style={styles.statCardContainer}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statAmount}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statCardContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
  },
  statTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  statAmount: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
  },
});

export default StatCard;
