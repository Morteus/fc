import * as React from "react";
import { View, Image, Text, StyleSheet } from "react-native";

function Header() {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.logoContainer}>
        <Image
          resizeMode="contain"
          source={{
            uri: "https://cdn.builder.io/api/v1/image/assets/2bc8b84e650441428ea44707d50e6da2/e00a9b8256a3e8ff3a8b9958674c74c75b3cdff1?apiKey=2bc8b84e650441428ea44707d50e6da2&",
          }}
          style={styles.logo}
        />
        <Text style={styles.logoText}>FinClassify</Text>
      </View>
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>2025{"\n"}Mar</Text>
        <Image
          resizeMode="contain"
          source={{
            uri: "https://cdn.builder.io/api/v1/image/assets/2bc8b84e650441428ea44707d50e6da2/ac101352f387719dc2fb9924a657a11b3b6a1f7b?apiKey=2bc8b84e650441428ea44707d50e6da2&",
          }}
          style={styles.calendarIcon}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 24,
    height: 24,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 10,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "500",
  },
  calendarIcon: {
    width: 24,
    height: 24,
    marginLeft: 10,
  },
});

export default Header;
