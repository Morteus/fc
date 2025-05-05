import * as React from "react";
import { ScrollView, View, Image, Text, StyleSheet } from "react-native";
import Header from "./Header";
import StatCard from "./StatCard";
import ExpenseCategory from "./ExpenseCategory";
import Footer from "./Footer";

function FinanceTracker() {
  const categories = [
    {
      iconUri:
        "https://cdn.builder.io/api/v1/image/assets/2bc8b84e650441428ea44707d50e6da2/72b58de33d4bdc1b862fff9fab36ad74896359eb?apiKey=2bc8b84e650441428ea44707d50e6da2&",
      name: "Bills",
      amount: "-₱ 2500.00",
      percentage: "52.63%",
    },
    {
      iconUri:
        "https://cdn.builder.io/api/v1/image/assets/2bc8b84e650441428ea44707d50e6da2/b23f745e5006ec433d9f4e524f6bfbef5c50cebc?apiKey=2bc8b84e650441428ea44707d50e6da2&",
      name: "Car",
      amount: "-₱ 1500.00",
      percentage: "31.58%",
    },
    {
      iconUri:
        "https://cdn.builder.io/api/v1/image/assets/2bc8b84e650441428ea44707d50e6da2/7e2dac4fe0e9bf389805575466a821b7c5575c2a?apiKey=2bc8b84e650441428ea44707d50e6da2&",
      name: "Clothing",
      amount: "-₱ 550.00",
      percentage: "11.58%",
    },
    {
      iconUri:
        "https://cdn.builder.io/api/v1/image/assets/2bc8b84e650441428ea44707d50e6da2/a6aa7a593fd44eded583ba0d40080090fcb8ad93?apiKey=2bc8b84e650441428ea44707d50e6da2&",
      name: "Education",
      amount: "-₱ 200.00",
      percentage: "4.21%",
    },
  ];

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView>
        <View style={styles.statCardsContainer}>
          <StatCard title="Income" amount="₱ 0.00" />
          <StatCard title="Expenses" amount="₱ 0.00" />
          <StatCard title="Total" amount="₱ 0.00" />
        </View>
        {categories.map((category, index) => (
          <View key={index} style={styles.categoryContainer}>
            <Image
              resizeMode="contain"
              source={{
                uri: "https://cdn.builder.io/api/v1/image/assets/2bc8b84e650441428ea44707d50e6da2/46ed9b54c677f371c3b4c006aaef7eebff36a565?apiKey=2bc8b84e650441428ea44707d50e6da2&",
              }}
              style={styles.separatorImage}
            />
            <ExpenseCategory
              iconUri={category.iconUri}
              name={category.name}
              amount={category.amount}
              percentage={category.percentage}
            />
          </View>
        ))}
      </ScrollView>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  statCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    width: "100%",
  },
  categoryContainer: {
    marginVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  separatorImage: {
    width: "100%",
    height: 2,
    marginVertical: 10,
  },
});

export default FinanceTracker;
