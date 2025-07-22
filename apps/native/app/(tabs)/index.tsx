import { Container } from "@/components/container";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

export default function TabOne() {
  const router = useRouter();
  return (
    <Container>
      <ScrollView className="flex-1 p-6">
        <View className="py-8">
          <Text className="text-3xl font-bold text-foreground mb-2">Apps</Text>
          <Text className="text-lg text-muted-foreground mb-4">
            Select an app to get started
          </Text>
          <View>
            {/* Financial Intelligence Card */}
            <Pressable
              className="bg-card rounded-xl shadow-lg p-0 border border-border dark:border-gray-700 mb-4 flex-row items-center overflow-hidden max-h-24"
              onPress={() => router.push("/financial")}
            >
              <View className="bg-yellow-100 dark:bg-yellow-900 px-4 h-full justify-center items-center w-16">
                <FontAwesome name="dollar" size={26} color="#eab308" />
              </View>
              <View className="flex-1 p-6">
                <Text className="text-xl font-semibold text-foreground mb-1">
                  Financial Intelligence
                </Text>
                <Text className="text-muted-foreground">
                  Manage your finances and grow your wealth.
                </Text>
              </View>
            </Pressable>
            {/* Health and Wellness Card */}
            <Pressable className="bg-card rounded-xl shadow-lg p-0 border border-border dark:border-gray-700 mb-4 flex-row items-center overflow-hidden max-h-24">
              <View className="bg-green-100 dark:bg-green-900 px-4 h-full justify-center items-center w-16">
                <FontAwesome name="heartbeat" size={26} color="#22c55e" />
              </View>
              <View className="flex-1 p-6">
                <Text className="text-xl font-semibold text-foreground mb-1">
                  Health and Wellness
                </Text>
                <Text className="text-muted-foreground">
                  Track your health and improve your wellbeing.
                </Text>
              </View>
            </Pressable>
            {/* Personal Assistant Card */}
            <Pressable className="bg-card rounded-xl shadow-lg p-0 border border-border dark:border-gray-700 mb-4 flex-row items-center overflow-hidden max-h-24">
              <View className="bg-blue-100 dark:bg-blue-900 px-4 h-full justify-center items-center w-16">
                <FontAwesome name="tasks" size={26} color="#3b82f6" />
              </View>
              <View className="flex-1 p-6">
                <Text className="text-xl font-semibold text-foreground mb-1">
                  Personal Assistant
                </Text>
                <Text className="text-muted-foreground">
                  Organize your tasks and schedule efficiently.
                </Text>
              </View>
            </Pressable>
            {/* Wardrobe Assistant Card */}
            <Pressable className="bg-card rounded-xl shadow-lg p-0 border border-border dark:border-gray-700 mb-4 flex-row items-center overflow-hidden max-h-24">
              <View className="bg-pink-100 dark:bg-pink-900 px-4 h-full justify-center items-center w-16">
                <FontAwesome name="shopping-bag" size={26} color="#ec4899" />
              </View>
              <View className="flex-1 p-6">
                <Text className="text-xl font-semibold text-foreground mb-1">
                  Wardrobe Assistant
                </Text>
                <Text className="text-muted-foreground">
                  Plan your outfits and manage your wardrobe.
                </Text>
              </View>
            </Pressable>
            {/* Smart Communication Card */}
            <Pressable className="bg-card rounded-xl shadow-lg p-0 border border-border dark:border-gray-700 mb-4 flex-row items-center overflow-hidden max-h-24">
              <View className="bg-purple-100 dark:bg-purple-900 px-4 h-full justify-center items-center w-16">
                <FontAwesome name="comments" size={26} color="#a21caf" />
              </View>
              <View className="flex-1 p-6">
                <Text className="text-xl font-semibold text-foreground mb-1">
                  Smart Communication
                </Text>
                <Text className="text-muted-foreground">
                  Manage contacts, organize SMS, and streamline communication.
                </Text>
              </View>
            </Pressable>
            {/* Travel Planner Card */}
            <Pressable className="bg-card rounded-xl shadow-lg p-0 border border-border dark:border-gray-700 mb-4 flex-row items-center overflow-hidden max-h-24">
              <View className="bg-orange-100 dark:bg-orange-900 px-4 h-full justify-center items-center w-16">
                <FontAwesome name="plane" size={26} color="#f59e42" />
              </View>
              <View className="flex-1 p-6">
                <Text className="text-xl font-semibold text-foreground mb-1">
                  Travel Planner
                </Text>
                <Text className="text-muted-foreground">
                  Plan trips, manage itineraries, and keep travel essentials
                  handy.
                </Text>
              </View>
            </Pressable>
            {/* Kitchen Essentials Card */}
            <Pressable className="bg-card rounded-xl shadow-lg p-0 border border-border dark:border-gray-700 mb-4 flex-row items-center overflow-hidden max-h-24">
              <View className="bg-red-100 dark:bg-red-900 px-4 h-full justify-center items-center w-16">
                <FontAwesome name="cutlery" size={26} color="#ef4444" />
              </View>
              <View className="flex-1 p-6">
                <Text className="text-xl font-semibold text-foreground mb-1">
                  Kitchen Essentials
                </Text>
                <Text className="text-muted-foreground">
                  Organize recipes, track pantry inventory, and plan meals.
                </Text>
              </View>
            </Pressable>
            {/* Personal Journal Card */}
            <Pressable className="bg-card rounded-xl shadow-lg p-0 border border-border dark:border-gray-700 flex-row items-center overflow-hidden max-h-24">
              <View className="bg-indigo-100 dark:bg-indigo-900 px-4 h-full justify-center items-center w-16">
                <FontAwesome name="book" size={26} color="#6366f1" />
              </View>
              <View className="flex-1 p-6">
                <Text className="text-xl font-semibold text-foreground mb-1">
                  Personal Journal
                </Text>
                <Text className="text-muted-foreground">
                  Capture thoughts, memories, and daily reflections securely.
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Container>
  );
}
