import * as React from "react";
import { View, Image, StyleSheet } from "react-native";
import SummaryStats from "./SummaryStats.js";
import DateEntry from "./DateEntry.js";
import CategoryItem from "./CategoryItem.js";
import AccountEntry from "./AccountEntry.js";

export default function Summary() {
  const categories = [
    {
      name: "Bills",
      amount: "-₱ 1500.00",
      iconUri:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/fb2d462ccb9f9f948a161083ab39a86e21e80a02?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2",
    },
    {
      name: "Car",
      amount: "-₱ 400.00",
      iconUri:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/1038e33c7c7776fe3100bb1e84d5037b2b0bc4d5?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2",
    },
    {
      name: "Clothing",
      amount: "-₱ 550.00",
      iconUri:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/7e2dac4fe0e9bf389805575466a821b7c5575c2a?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2",
    },
    {
      name: "Education",
      amount: "-₱ 2000.00",
      iconUri:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/a6aa7a593fd44eded583ba0d40080090fcb8ad93?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2",
    },
    {
      name: "Bills",
      amount: "-₱ 1500.00",
      iconUri:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/fb2d462ccb9f9f948a161083ab39a86e21e80a02?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2",
    },
    {
      name: "Car",
      amount: "-₱ 400.00",
      iconUri:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/528abd5e6ddf7e92550d032fbf40c6a1e16032e3?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2",
    },
    {
      name: "Clothing",
      amount: "-₱ 550.00",
      iconUri:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/7e2dac4fe0e9bf389805575466a821b7c5575c2a?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2",
    },
    {
      name: "Education",
      amount: "-₱ 2000.00",
      iconUri:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/a6aa7a593fd44eded583ba0d40080090fcb8ad93?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        <View style={styles.innerWrapper}>
          <SummaryStats
            month="Mar"
            year="2025"
            balance="₱ 5,550.00"
            totalIncome="₱ 10,000.00"
            totalExpense="₱ 4,450.00"
            logoUri="https://cdn.builder.io/api/v1/image/assets/TEMP/e00a9b8256a3e8ff3a8b9958674c74c75b3cdff1?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2"
          />
        </View>
        <Image
          source={{
            uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/085111b21d67176a25f87ecb67b518ea0eb7b153?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2",
          }}
          style={styles.bannerImage}
          resizeMode="contain"
        />
        <DateEntry
          date="Jan 24, Tuesday"
          dayIndicator="https://cdn.builder.io/api/v1/image/assets/TEMP/fd1e03defa125e1166d6e4c581d9cf00eaf8f55a?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2"
        />
        {categories.map((item, index) => (
          <CategoryItem
            key={index}
            name={item.name}
            amount={item.amount}
            iconUri={item.iconUri}
          />
        ))}
        <DateEntry date="Jan 25, Tuesday" />
        {categories.map((item, index) => (
          <CategoryItem
            key={`${index}-second`}
            name={item.name}
            amount={item.amount}
            iconUri={item.iconUri}
          />
        ))}
        <Image
          source={{
            uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/247d5cb8170b6599e077d212a4adb4f5d08524f7?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2",
          }}
          style={styles.finalImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.footer}>
        <AccountEntry
          iconUri="https://cdn.builder.io/api/v1/image/assets/TEMP/93d845b7048c3459ac0260e33a62443650c76dae?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2"
          title="Records"
          amount=""
        />
        <View style={styles.footerMid}>
          <Image
            resizeMode="contain"
            source={{
              uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/1cc21278e13c6d83906f3cb4e805eb81737b6c85?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2",
            }}
            style={styles.footerIcon}
          />
          <Image
            resizeMode="contain"
            source={{
              uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/c37e3e4db0bf0c9d38ff7311107b5da332fd55e4?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2",
            }}
            style={styles.footerIcon}
          />
        </View>
        <View style={styles.footerTextContainer}>
          <Text>Analysis</Text>
          <Text>Budgets</Text>
          <Text>Categories</Text>
        </View>
        <AccountEntry
          iconUri="https://cdn.builder.io/api/v1/image/assets/TEMP/c64447f510231329575cebdbd14325683619e371?placeholderIfAbsent=true&apiKey=2bc8b84e650441428ea44707d50e6da2"
          title="Accounts"
          amount=""
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    marginLeft: "auto",
    marginRight: "auto",
    maxWidth: 480,
    width: "100%",
    paddingBottom: 9,
    flexDirection: "column",
    overflow: "hidden",
    alignItems: "stretch",
  },
  wrapper: {
    width: "100%",
    paddingLeft: 17,
    paddingRight: 17,
    paddingTop: 50,
    paddingBottom: 50,
  },
  innerWrapper: {
    gap: 20,
    display: "flex",
  },
  bannerImage: {
    position: "relative",
    display: "flex",
    width: "100%",
    maxWidth: 320,
    aspectRatio: "333.33",
    marginTop: 7,
  },
  finalImage: {
    position: "relative",
    display: "flex",
    marginTop: 53,
    width: 55,
    aspectRatio: "1",
  },
  footer: {
    zIndex: "10",
    display: "flex",
    marginTop: 16,
    marginBottom: -9,
    paddingLeft: 23,
    paddingRight: 23,
    paddingTop: 7,
    paddingBottom: 7,
    gap: 20,
    justifyContent: "space-between",
  },
  footerMid: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
  },
  footerIcon: {
    position: "relative",
    display: "flex",
    width: 28,
    aspectRatio: "1",
  },
  footerTextContainer: {
    display: "flex",
    alignItems: "stretch",
    gap: 20,
    fontFamily: "Montserrat, sans-serif",
    fontSize: 10,
    color: "rgba(19, 98, 7, 1)",
    fontWeight: "700",
    justifyContent: "space-between",
  },
});
