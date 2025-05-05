import * as React from "react";
import { View, Image, Text, StyleSheet } from "react-native";

function Footer() {
  return (
    <View style={styles.footerContainer}>
      <FooterIcon
        uri="https://cdn.builder.io/api/v1/image/assets/2bc8b84e650441428ea44707d50e6da2/7ebe28d4c1204522f797ec93bc9e5938e41716f1?apiKey=2bc8b84e650441428ea44707d50e6da2&"
        text="Records"
      />
      <View style={styles.analysisContainer}>
        <FooterIcon
          uri="https://cdn.builder.io/api/v1/image/assets/2bc8b84e650441428ea44707d50e6da2/9a5152045eded4844c6f54edb9dd2d3f02c98bcb?apiKey=2bc8b84e650441428ea44707d50e6da2&"
          text="Analysis"
        />
        <FooterIcon
          uri="https://cdn.builder.io/api/v1/image/assets/2bc8b84e650441428ea44707d50e6da2/c37e3e4db0bf0c9d38ff7311107b5da332fd55e4?apiKey=2bc8b84e650441428ea44707d50e6da2&"
          text="Budgets"
        />
        <FooterIcon
          uri="https://cdn.builder.io/api/v1/image/assets/2bc8b84e650441428ea44707d50e6da2/c64447f510231329575cebdbd14325683619e371?apiKey=2bc8b84e650441428ea44707d50e6da2&"
          text="Categories"
        />
      </View>
      <View style={styles.accountsContainer}>
        <FooterIcon uri="http://b.io/ext_14-" text="Accounts" />
      </View>
    </View>
  );
}

function FooterIcon({ uri, text }) {
  return (
    <View style={styles.footerIconContainer}>
      <Image resizeMode="contain" source={{ uri }} style={styles.footerIcon} />
      <Text style={styles.footerIconText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  footerIconContainer: {
    alignItems: "center",
  },
  footerIcon: {
    width: 28,
    height: 28,
  },
  footerIconText: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: "700",
  },
  analysisContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "60%",
  },
  accountsContainer: {
    alignItems: "center",
  },
});

export default Footer;
