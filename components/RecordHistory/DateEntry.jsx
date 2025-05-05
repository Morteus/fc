import * as React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

export default function DateEntry({ date, dayIndicator }) {
  return (
    <View>
      <Text style={styles.dateText}>{date}</Text>
      <View style={styles.lineSeparator} />
      {dayIndicator && (
        <Image
          resizeMode="contain"
          source={{ uri: dayIndicator }}
          style={styles.dayIndicator}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dateText: {
    color: "rgba(204, 154, 2, 1)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 59,
  },
  lineSeparator: {
    borderColor: "rgba(19, 98, 7, 1)",
    borderStyle: "solid",
    borderWidth: 1,
    marginTop: 7,
    width: 318,
    flexShrink: "0",
    maxWidth: "100%",
    height: 1,
  },
  dayIndicator: {
    position: "relative",
    display: "flex",
    marginTop: 7,
    width: "100%",
    maxWidth: 320,
    aspectRatio: "333.33",
  },
});
