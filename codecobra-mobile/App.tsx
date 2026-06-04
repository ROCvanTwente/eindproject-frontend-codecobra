import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "react-native";
import { AppProvider } from "./src/context/AppContext";
import { StartScreen } from "./src/screens/StartScreen";
import { QRScannerScreen } from "./src/screens/QRScannerScreen";
import { StopDetailScreen } from "./src/screens/StopDetailScreen";
import { RouteOverviewScreen } from "./src/screens/RouteOverviewScreen";
import { FloorPlanScreen } from "./src/screens/FloorPlanScreen";
import { AdminScreen } from "./src/screens/AdminScreen";
import { Language } from "./src/types";

export type RootStackParamList = {
  Start: undefined;
  Scanner: { language: Language };
  StopDetail: { stopId: number; language: Language };
  RouteOverview: { language: Language };
  FloorPlan: { language: Language };
  Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" />
        <Stack.Navigator
          initialRouteName="Start"
          screenOptions={{ headerShown: false, animation: "slide_from_right" }}
        >
          <Stack.Screen name="Start" component={StartScreen} />
          <Stack.Screen name="Scanner" component={QRScannerScreen} />
          <Stack.Screen name="StopDetail" component={StopDetailScreen} />
          <Stack.Screen name="RouteOverview" component={RouteOverviewScreen} />
          <Stack.Screen name="FloorPlan" component={FloorPlanScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
}
