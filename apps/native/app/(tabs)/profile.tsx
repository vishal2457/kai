import {
  View,
  Text,
  Pressable,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useColorScheme } from "@/lib/use-color-scheme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Container } from "@/components/container";
import { useEffect, useState } from "react";
import { ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import llamaService from "@/lib/llama-service";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { getMigrationStatus } from "@/lib/db";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ProfilePage() {
  const { isDarkColorScheme, toggleColorScheme } = useColorScheme();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(llamaService.getModelStatusSync());
  const [migrationStatus, setMigrationStatus] = useState(getMigrationStatus());
  const [provider, setProvider] = useState(status.provider || "local");
  const [providerConfig, setProviderConfig] = useState(
    status.providerConfig || {}
  );
  const [saving, setSaving] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  // Accordion state: 'local', 'gemini', or null
  const [openAccordion, setOpenAccordion] = useState<null | "local" | "gemini">(
    null
  );

  const handleAccordionToggle = (key: "local" | "gemini") => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenAccordion((prev) => (prev === key ? null : key));
  };

  const handleProviderConfigChange = (key: string, value: string) => {
    setProviderConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const saveProvider = async () => {
    setSaving(true);
    try {
      await llamaService.setProvider(provider, providerConfig);
      await loadStatus();
      Alert.alert("Saved", "Provider and config saved.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save provider");
    } finally {
      setSaving(false);
    }
  };

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

  // Remove model (now also unloads)
  const removeModel = async () => {
    setLoading(true);
    try {
      await llamaService.removeModel();
      await loadStatus();
      Alert.alert("Model removed", "Model file and status have been removed.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to remove model");
    } finally {
      setLoading(false);
    }
  };

  const PROVIDER_OPTIONS = [
    { key: "local", label: "Local" },
    { key: "gemini", label: "Gemini" },
    // Add more providers here in the future
  ];

  return (
    <Container>
      <View className="flex-1 p-6 bg-background">
        {/* General Card */}
        <View className="bg-card rounded-2xl shadow p-6 mb-6 border border-border dark:border-gray-700">
          <Text className="text-lg font-semibold mb-4 text-foreground">
            General
          </Text>
          {/* List item: Theme */}
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-base text-foreground">Theme</Text>
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
        </View>

        {/* Model Settings Card */}
        <View className="bg-card rounded-2xl shadow p-6 mb-6 border border-border dark:border-gray-700">
          <Text className="text-lg font-semibold mb-4 text-foreground">
            Model Settings
          </Text>
          {/* Accordion: Local Model */}
          <Pressable
            onPress={() => handleAccordionToggle("local")}
            className="flex-row items-center justify-between py-3"
          >
            <Text className="text-base text-foreground">Local Model</Text>
            <FontAwesome
              name={openAccordion === "local" ? "chevron-up" : "chevron-down"}
              size={18}
              color="#888"
            />
          </Pressable>
          {openAccordion === "local" && (
            <View className="py-3">
              {status?.isLoaded ? (
                <Text className="text-green-600 mb-2">Model loaded</Text>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-red-600 mb-2">No model loaded</Text>
                  <TouchableOpacity
                    onPress={loadStatus}
                    className="p-2 rounded-full bg-secondary/50 ml-2"
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
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={pickModelFile}
                  style={{
                    backgroundColor: "#2563eb",
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
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
                <TouchableOpacity
                  onPress={removeModel}
                  style={{
                    backgroundColor: "#ef4444",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  disabled={loading || !status?.modelPath}
                >
                  <FontAwesome
                    name="trash"
                    size={20}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {/* Accordion: Gemini */}
          <Pressable
            onPress={() => handleAccordionToggle("gemini")}
            className="flex-row items-center justify-between py-3"
          >
            <Text className="text-base text-foreground">Gemini</Text>
            <FontAwesome
              name={openAccordion === "gemini" ? "chevron-up" : "chevron-down"}
              size={18}
              color="#888"
            />
          </Pressable>
          {openAccordion === "gemini" && (
            <View className="py-3">
              <Text className="text-xs text-muted-foreground mb-1">
                Gemini API Key
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  value={providerConfig.apiKey || ""}
                  onChangeText={(v) => handleProviderConfigChange("apiKey", v)}
                  placeholder="Enter Gemini API Key"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: "#d1d5db",
                    borderRadius: 6,
                    padding: 8,
                    color: "#334155",
                    backgroundColor: "#fff",
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!saving}
                  secureTextEntry={!showGeminiKey}
                />
                <TouchableOpacity
                  onPress={() => setShowGeminiKey((v) => !v)}
                  style={{ marginLeft: 8, padding: 4 }}
                >
                  <FontAwesome
                    name={showGeminiKey ? "eye-slash" : "eye"}
                    size={18}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={saveProvider}
                style={{
                  backgroundColor: "#2563eb",
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 8,
                }}
                disabled={saving}
              >
                <FontAwesome
                  name="save"
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  {saving ? "Saving..." : "Save"}
                </Text>
                {saving && (
                  <ActivityIndicator color="#fff" style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* DB Migration Status Card (unchanged) */}
        <View className="bg-card rounded-2xl shadow p-6 items-center border border-border dark:border-gray-700">
          <Text className="text-lg font-semibold mb-2 text-foreground">
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
