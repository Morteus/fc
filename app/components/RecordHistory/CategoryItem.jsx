import * as React from "react";
import { View, Image, Text, StyleSheet } from "react-native";

export default function CategoryItem({ name, amount, iconUri }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Image
          resizeMode="contain"
          source={{ uri: iconUri }}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text>{name}</Text>
        </View>
      </View>
      <View style={styles.amountContainer}>
        <Text style={styles.amount}>{amount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    marginTop: 11,
    width: "100%",
    maxWidth: 308,
    alignItems: "stretch",
    gap: 20,
    justifyContent: "space-between",
  },
  iconContainer: {
    display: "flex",
    alignItems: "stretch",
    gap: 7,
    color: "rgba(19, 98, 7, 1)",
  },
  textContainer: {
    marginTop: "auto",
    marginBottom: "auto",
  },
  amountContainer: {
    color: "rgba(242, 4, 8, 1)",
    marginTop: "auto",
    marginBottom: "auto",
  },
  icon: {
    position: "relative",
    display: "flex",
    width: 27,
    flexShrink: "0",
    aspectRatio: "1",
  },
  amount: {
    color: "rgba(242, 4, 8, 1)",
  },
});
