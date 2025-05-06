// c:\Users\scubo\OneDrive\Documents\FC_proj\FinClassify\FinClassifyApp\components\botnavigationbar.tsx
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Global navigation cooldown state
const navigationCooldown = {
  isNavigating: false,
  lastNavigationTime: 0,
};

const BottomNavigationBar = () => {
  const currentPath = usePathname();

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        <NavItem
          icon="reader-outline"
          label="Records"
          href="/record"
          isActive={currentPath === "/record"}
        />
        <NavItem
          icon="pie-chart-outline"
          label="Analysis"
          href="/analysis"
          isActive={currentPath === "/analysis"}
        />
        <NavItem
          icon="calculator-outline"
          label="Budgets"
          href="/Budgets"
          isActive={currentPath === "/Budgets"}
        />
        <NavItem
          icon="wallet-outline"
          label="Accounts"
          href="/Accounts"
          isActive={currentPath === "/Accounts"}
        />
      </View>
    </SafeAreaView>
  );
};

// NavItem Component with Link and animated state
const NavItem = ({
  icon,
  label,
  href,
  isActive,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  href: `/record` | `/analysis` | `/Budgets` | `/Accounts`;
  isActive: boolean;
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const activeValue = useSharedValue(isActive ? 1 : 0);
  const router = useRouter();

  // Update activeValue when isActive changes
  useEffect(() => {
    activeValue.value = withSpring(isActive ? 1 : 0);
  }, [isActive, activeValue]);

  // Animations for press feedback
  const onPressIn = () => {
    scale.value = withSpring(0.92);
  };

  const onPressOut = () => {
    scale.value = withSpring(1);
  };

  // Handler to prevent rapid navigation
  const handleNavigation = () => {
    const now = Date.now();
    // If we're already navigating or it's been less than 1000ms since last navigation, prevent the navigation
    if (
      navigationCooldown.isNavigating ||
      now - navigationCooldown.lastNavigationTime < 1000
    ) {
      return false; // Prevent navigation
    }

    // Set navigating state
    navigationCooldown.isNavigating = true;
    navigationCooldown.lastNavigationTime = now;

    // Navigate with router instead of using Link's default behavior
    router.push(href);

    // Reset navigating state after a delay
    setTimeout(() => {
      navigationCooldown.isNavigating = false;
    }, 1000);

    return true;
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        activeValue.value,
        [0, 1],
        ["#666", "#B58900"]
      ) as string,
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        activeValue.value,
        [0, 1],
        ["#666", "#B58900"]
      ) as string,
      fontWeight: isActive ? "600" : ("normal" as any),
    };
  });

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handleNavigation}
      style={styles.linkWrapper}
    >
      <Animated.View style={[styles.navItemContent, animatedStyle]}>
        {isActive && <View style={styles.activeIndicator} />}
        <Animated.View>
          <Ionicons name={icon} size={24} style={animatedIconStyle} />
        </Animated.View>
        <Animated.Text style={[styles.navLabel, animatedLabelStyle]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
};

// --- Enhanced Styles ---
const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 10,
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "white",
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 0 : 6,
  },
  linkWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    position: "relative",
  },
  navItemContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    top: -12,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#B58900",
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default BottomNavigationBar;
