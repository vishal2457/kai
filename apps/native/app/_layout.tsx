import { setAndroidNavigationBar } from "@/lib/android-navigation-bar";
import { NAV_THEME } from "@/lib/constants";
import { db } from "@/lib/db";
import llamaService from "@/lib/llama-service";
import { useColorScheme } from "@/lib/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  type Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef } from "react";
import { Platform, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ToastManager from "toastify-react-native";
import CustomToast, { type ToastifyProps } from "../components/custom-toast";
import migrations from "../drizzle/migrations";
import "../global.css";

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const hasMounted = useRef(false);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);

  const { success, error } = useMigrations(db, migrations);

  React.useEffect(() => {
    (async () => {
      try {
        const status = await llamaService.checkModelStatus();
        if (status.isLoaded && status.modelPath) {
          console.log("Loading model", status);

          await llamaService.loadModel();
        }
      } catch (error) {
        console.log(error);
      }
    })();
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === "web") {
      document.documentElement.classList.add("bg-background");
    }
    setAndroidNavigationBar(colorScheme);
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Migration error: {error.message}</Text>
      </View>
    );
  }
  if (!success) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Migration is in progress...</Text>
      </View>
    );
  }
  if (!isColorSchemeLoaded) {
    return null;
  }
  return (
    <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
      <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="financial" options={{ headerShown: false }} />
        </Stack>
      </GestureHandlerRootView>
      <ToastManager
        config={{
          success: (props: ToastifyProps) => (
            <CustomToast {...props} isDarkColorScheme={isDarkColorScheme} />
          ),
          error: (props: ToastifyProps) => (
            <CustomToast {...props} isDarkColorScheme={isDarkColorScheme} />
          ),
          info: (props: ToastifyProps) => (
            <CustomToast {...props} isDarkColorScheme={isDarkColorScheme} />
          ),
          warn: (props: ToastifyProps) => (
            <CustomToast {...props} isDarkColorScheme={isDarkColorScheme} />
          ),
          default: (props: ToastifyProps) => (
            <CustomToast {...props} isDarkColorScheme={isDarkColorScheme} />
          ),
        }}
      />
    </ThemeProvider>
  );
}

const useIsomorphicLayoutEffect =
  Platform.OS === "web" && typeof window === "undefined"
    ? React.useEffect
    : React.useLayoutEffect;
