import { View, Text, Pressable } from "react-native";
import { useColorScheme } from "@/lib/use-color-scheme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Container } from "@/components/container";
import { useEffect, useState } from "react";
import { ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import llamaService from "@/lib/llama-service";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { getMigrationStatus } from "@/lib/db";

export default function ProfilePage() {
  const { isDarkColorScheme, toggleColorScheme } = useColorScheme();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(llamaService.getModelStatusSync());
  const [migrationStatus, setMigrationStatus] = useState(getMigrationStatus());

  const loadStatus = async () => {
    const s = await llamaService.checkModelStatus();
    setStatus(s);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Pick and save model file, then load it
  const pickModelFile = async () => {
    setLoading(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/octet-stream",
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]?.uri) {
        setLoading(false);
        return;
      }
      let uri = res.assets[0].uri;
      if (!uri.startsWith("file://")) {
        const dest = FileSystem.cacheDirectory + "model.gguf";
        await FileSystem.copyAsync({ from: uri, to: dest });
        uri = dest;
      }
      await llamaService.loadModel(uri);
      await loadStatus();
      Alert.alert("Model loaded", "Model file loaded and status saved.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load model");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <View className="flex-1 p-6">
        <View className="flex-row items-center justify-between mb-8">
          <Text className="text-2xl font-bold text-foreground">Profile</Text>
          <Pressable
            onPress={toggleColorScheme}
            className="p-2 rounded-full bg-secondary/50"
            accessibilityLabel="Toggle dark mode"
          >
            <FontAwesome
              name={isDarkColorScheme ? "sun-o" : "moon-o"}
              size={22}
              color={isDarkColorScheme ? "#fde68a" : "#334155"}
            />
          </Pressable>
        </View>
        <View className="items-center mt-12">
          <FontAwesome name="user-circle" size={80} color="#64748b" />
          <Text className="text-xl font-semibold text-foreground mt-4">
            User Name
          </Text>
          <Text className="text-muted-foreground mt-2">user@email.com</Text>
        </View>
        <View className="mt-12 items-center">
          <Text className="text-lg font-semibold mb-2">Model Status</Text>
          {status?.isLoaded ? (
            <Text className="text-green-600 mb-2">Model loaded</Text>
          ) : (
            <View className="flex-row items-center">
              <Text className="text-red-600 mb-2">No model loaded</Text>
              <TouchableOpacity
                onPress={loadStatus}
                className="p-2 rounded-full bg-secondary/50"
              >
                <FontAwesome name="refresh" size={20} color="#2563eb" />
              </TouchableOpacity>
            </View>
          )}
          {status?.modelPath && (
            <Text
              className="text-xs text-muted-foreground mb-2"
              numberOfLines={1}
            >
              {status.modelPath}
            </Text>
          )}
          <TouchableOpacity
            onPress={pickModelFile}
            style={{
              backgroundColor: "#2563eb",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
            }}
            disabled={loading}
          >
            <FontAwesome
              name="folder-open"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {loading ? "Loading model..." : "Pick Model File"}
            </Text>
            {loading && (
              <ActivityIndicator color="#fff" style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>
        </View>
        {/* DB Migration Status */}
        <View className="mt-8 items-center">
          <Text className="text-lg font-semibold mb-2">
            DB Migration Status
          </Text>
          {migrationStatus.allApplied ? (
            <Text className="text-green-600 mb-2">All migrations applied</Text>
          ) : (
            <View className="items-center">
              <Text className="text-red-600 mb-2">Pending migrations:</Text>
              {migrationStatus.pending.map((tag) => (
                <Text key={tag} className="text-xs text-red-500 mb-1">
                  {tag}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    </Container>
  );
}
