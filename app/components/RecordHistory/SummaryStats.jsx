import * as React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

export default function SummaryStats({
  month,
  year,
  balance,
  totalIncome,
  totalExpense,
  logoUri,
}) {
  return (
    <View style={styles.wrapper}>
      <Image
        source={{ uri: logoUri }}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>FinClassify</Text>
      <View style={styles.dateContainer}>
        <Text style={styles.date}>{year}</Text>
        <br />
        <Text style={styles.date}>{month}</Text>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statBlock}>
          <Text style={styles.description}>Income</Text>
          <Text style={styles.value}>{totalIncome}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.description}>Expenses</Text>
          <Text style={styles.expenseValue}>{totalExpense}</Text>
        </View>
      </View>
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceDescription}>Total</Text>
        <Text style={styles.balanceValue}>{balance}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    lineHeight: "normal",
    width: "69%",
    marginLeft: 0,
  },
  logo: {
    position: "relative",
    display: "flex",
    width: 24,
    flexShrink: "0",
    aspectRatio: "1",
  },
  title: {
    flexGrow: "1",
    flexShrink: "1",
    width: 97,
  },
  dateContainer: {
    display: "flex",
    gap: 3,
    fontSize: 16,
    color: "rgba(255, 255, 255, 1)",
    fontWeight: "500",
    flex: "1",
  },
  date: {
    display: "flex",
    fontSize: 14,
    fontWeight: "500",
    alignSelf: "center",
  },
  statsContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    flex: "1",
    marginTop: 23,
    width: "100%",
    alignItems: "stretch",
    gap: 12,
  },
  statBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    flex: "1",
  },
  description: {
    color: "rgba(255, 255, 255, 1)",
    fontSize: 14,
    fontWeight: "500",
  },
  value: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 15,
  },
  expenseValue: {
    color: "rgba(242, 4, 8, 1)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
  },
  balanceContainer: {
    display: "flex",
    alignSelf: "center",
    flexDirection: "column",
    alignItems: "stretch",
  },
  balanceDescription: {
    fontSize: 14,
    fontWeight: "500",
    alignSelf: "center",
  },
  balanceValue: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 15,
  },
});
