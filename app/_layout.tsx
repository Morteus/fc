// c:\Users\scubo\OneDrive\Documents\putangina\fc\app\_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar"; // Import StatusBar
// Import SafeAreaProvider
import { SafeAreaProvider } from "react-native-safe-area-context";
// Path relative from app/_layout.tsx to app/context/DateContext.tsx
import { DateProvider } from "./context/DateContext";

export default function RootLayout() {
  return (
    // Wrap DateProvider and Stack with SafeAreaProvider
    <SafeAreaProvider>
      <StatusBar hidden /> {/* Add this line to hide the status bar */}
      <DateProvider>
        <Stack
          screenOptions={{
            animation: "none", // Disable animations for all screens in this stack
            // You can add other global screen options here
            // headerStyle: { backgroundColor: '#006400' },
            // headerTintColor: '#fff',
            // headerTitleStyle: { fontWeight: 'bold' },
            // headerTitleAlign: 'center',
          }}
        >
          {/* Define ALL your screens as direct children of Stack */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ title: "Create Account" }} />
          <Stack.Screen
            name="forgotpassword"
            options={{ title: "Reset Password" }}
          />
          <Stack.Screen name="record" options={{ headerShown: false }} />
          <Stack.Screen
            name="transactions"
            options={{ presentation: "modal", title: "Add Transaction" }}
          />
          <Stack.Screen name="Accounts" options={{ headerShown: false }} />
          {/* Title for CreateAccounts can be dynamic, set in the screen itself or here */}
          <Stack.Screen
            name="CreateAccounts"
            options={{ title: "Manage Account" }}
          />
          <Stack.Screen name="Budgets" options={{ headerShown: false }} />
          <Stack.Screen name="analysis" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen
            name="password"
            options={{ title: "Change Password" }}
          />
          <Stack.Screen
            name="deletedrecords"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="setbudget"
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          {/* Add a screen for the 404 page if you have one */}
          {/* <Stack.Screen name="+not-found" /> */}

          {/* If you have nested layouts (like tabs), define them here too */}
          {/* e.g., <Stack.Screen name="(tabs)" options={{ headerShown: false }} /> */}
        </Stack>
      </DateProvider>
    </SafeAreaProvider> // Close SafeAreaProvider
  );
}
