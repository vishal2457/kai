import { useState, useEffect } from "react";
import {
  GiftedChat,
  Bubble,
  InputToolbar,
  IMessage,
} from "react-native-gifted-chat";
import {
  View,
  TextInput,
  Platform,
  Keyboard,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import llamaService from "@/lib/llama-service";
import { AiInput } from "../../components/ai-input";

export default function ChatPage() {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelStatusLoaded, setModelStatusLoaded] = useState(false);
  const [modelStatusData, setModelStatusData] = useState(
    llamaService.getModelStatusSync()
  );
  const [provider, setProvider] = useState(modelStatusData.provider || "local");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardOpen(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const checkModelStatus = async () => {
    setRefreshing(true);
    try {
      const status = await llamaService.checkModelStatus();
      setModelStatusData(status);
      setModelStatusLoaded(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkModelStatus();
  }, []);

  useEffect(() => {
    setProvider(modelStatusData.provider || "local");
  }, [modelStatusData]);

  useEffect(() => {
    const loadModelFromStatus = async () => {
      if (
        modelStatusData?.isLoaded &&
        modelStatusData.modelPath &&
        !llamaService.getLlamaContext() &&
        modelStatusData.provider === "local"
      ) {
        setLoadingModel(true);
        try {
          await llamaService.loadModel();
        } catch (e: any) {
          setError(e?.message || "Failed to load model from status");
        } finally {
          setLoadingModel(false);
        }
      }
    };
    if (modelStatusLoaded) {
      loadModelFromStatus();
    }
  }, [modelStatusLoaded, modelStatusData]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setMessages((previous) =>
      GiftedChat.append(previous, [
        {
          _id: Date.now(),
          text: input,
          createdAt: new Date(),
          user: { _id: 1 },
        } as IMessage,
      ])
    );
    if (llamaService.getLlamaContext()) {
      setMessages((previous) =>
        GiftedChat.append(previous, [
          {
            _id: Date.now() + 1,
            text: "...",
            createdAt: new Date(),
            user: { _id: 2 },
            system: true,
          } as IMessage,
        ])
      );
      setInput("");
      setIsGenerating(true);
      try {
        const result = await llamaService.chatWithModel(input);
        setMessages((previous) => {
          let filtered = previous;
          if (filtered.length > 0 && filtered[0].text === "...") {
            filtered = filtered.slice(1);
          }
          const newMessages = GiftedChat.append(filtered, [
            {
              _id: Date.now() + Math.random(),
              text: result,
              createdAt: new Date(),
              user: { _id: 2 },
            } as IMessage,
          ]);
          return newMessages;
        });
      } catch (e: any) {
        setError(e?.message || "Failed to generate response");
      } finally {
        setIsGenerating(false);
        setInput("");
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Removed provider/model display */}
      {provider === "local" && !llamaService.getLlamaContext() ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Text style={{ color: "#2563eb", textAlign: "center", margin: 8 }}>
            Loading model...
          </Text>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <>
          {error && (
            <Text style={{ color: "#f87171", textAlign: "center", margin: 8 }}>
              {error}
            </Text>
          )}
          <AiInput
            messages={messages}
            onSend={handleSend}
            input={input}
            setInput={setInput}
            isGenerating={isGenerating}
            user={{ _id: 1 }}
            isFocused={isFocused}
            setIsFocused={setIsFocused}
            keyboardOpen={keyboardOpen}
            loadingModel={loadingModel}
          />
        </>
      )}
    </View>
  );
}
