// c:\Users\scubo\OneDrive\Documents\FC_proj\FinClassify\FinClassifyApp\app\_layout.tsx
import React from "react";
import { Stack } from "expo-router";
// Path relative from app/_layout.tsx to app/context/DateContext.tsx
import { DateProvider } from "./context/DateContext";

export default function RootLayout() {
  return (
    // DateProvider wraps the entire navigation stack
    <DateProvider>
      <Stack
        screenOptions={{
          animation: "none", // Disable animations for all screens in this stack
        }}
      >
        {/* All screens within this Stack can now use useDateContext */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="record" options={{ headerShown: false }} />
        {/* Note: 'modal' presentation might still have its own default animation */}
        <Stack.Screen name="transactions" options={{ presentation: "modal" }} />
        <Stack.Screen name="Accounts" options={{ headerShown: false }} />
        <Stack.Screen name="CreateAccounts" />
        <Stack.Screen name="Budgets" options={{ headerShown: false }} />
        <Stack.Screen name="forgotpassword" />{" "}
        <Stack.Screen name="analysis" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />{" "}
        {/* <-- Add this line */}
        {/* Add other screens as needed */}
      </Stack>
    </DateProvider>
  );
}
