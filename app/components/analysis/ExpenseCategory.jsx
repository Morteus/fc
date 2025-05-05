import * as React from "react";
import { View, Text, StyleSheet } from "react-native";

function ExpenseCategory({ iconUri, name, amount, percentage }) {
  return (
    <View style={styles.expenseCategoryContainer}>
      <View style={styles.iconTextContainer}>
        <Image
          resizeMode="contain"
          source={{ uri: iconUri }}
          style={styles.categoryIcon}
        />
        <Text>{name}</Text>
      </View>
      <View style={styles.amountPercentageContainer}>
        <Text style={styles.amountText}>{amount}</Text>
        <Text style={styles.percentageText}>{percentage}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  expenseCategoryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    marginTop: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
  },
  iconTextContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 27,
    height: 27,
    marginRight: 10,
  },
  amountPercentageContainer: {
    alignItems: "flex-end",
  },
  amountText: {
    color: "rgba(242, 4, 8, 1)",
  },
  percentageText: {
    color: "rgba(19, 98, 7, 1)",
  },
});

export default ExpenseCategory;
