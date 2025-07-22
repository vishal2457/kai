import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ToastifyProps = {
  type: string;
  text1?: string;
  text2?: string;
  isDarkColorScheme: boolean;
};

export default function CustomToast({
  type,
  text1,
  text2,
  isDarkColorScheme,
}: ToastifyProps) {
  // Material Design colors
  let bgColor = isDarkColorScheme ? "#23272f" : "#fff";
  let titleColor = isDarkColorScheme ? "#fff" : "#222";
  let messageColor = isDarkColorScheme ? "#b0b0b0" : "#444";

  // Icon and color based on type
  let iconName = "alert-circle-outline";
  let iconColor = isDarkColorScheme ? "#b0b0b0" : "#888";
  switch (type) {
    case "success":
      iconName = "checkmark-circle-outline";
      iconColor = "#22c55e"; // green-500
      break;
    case "error":
      iconName = "close-circle-outline";
      iconColor = "#ef4444"; // red-500
      break;
    case "info":
      iconName = "information-circle-outline";
      iconColor = "#3b82f6"; // blue-500
      break;
    case "warning":
      iconName = "warning-outline";
      iconColor = "#f59e42"; // orange-400
      break;
  }

  return (
    <View
      style={[
        styles.toast,
        {
          backgroundColor: bgColor,
          flexDirection: "row",
          alignItems: "center",
        },
      ]}
    >
      <Ionicons
        name={iconName as any}
        size={28}
        color={iconColor}
        style={{ marginRight: 12 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.text1, { color: titleColor }]}>{text1}</Text>
        {!!text2 && (
          <Text style={[styles.text2, { color: messageColor }]}>{text2}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    minWidth: 200,
    maxWidth: 350,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
    flexDirection: "column",
    justifyContent: "center",
  },
  text1: {
    fontWeight: "500",
    fontSize: 16,
    marginBottom: 2,
  },
  text2: {
    fontSize: 15,
    marginTop: 2,
  },
});
