import * as React from "react";
import { View, Image, Text, StyleSheet } from "react-native";

export default function AccountEntry({ iconUri, title, amount }) {
  return (
    <View style={styles.container}>
      <Image
        resizeMode="contain"
        source={{ uri: iconUri }}
        style={styles.icon}
      />
      <View style={styles.textContainer}>
        <Text>{title}</Text>
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
    flexDirection: "column",
    alignSelf: "stretch",
    fontFamily: "Montserrat, sans-serif",
    color: "rgba(255, 255, 255, 1)",
  },
  icon: {
    position: "relative",
    display: "flex",
    width: 18,
    aspectRatio: "1",
  },
  textContainer: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 19,
    marginLeft: 15,
  },
  amountContainer: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 15,
  },
  amount: {
    color: "rgba(242, 4, 8, 1)",
  },
});
