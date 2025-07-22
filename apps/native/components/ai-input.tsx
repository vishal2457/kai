import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  TextInput,
  View,
} from "react-native";
import {
  Bubble,
  GiftedChat,
  IMessage,
  InputToolbar,
} from "react-native-gifted-chat";

const GRADIENT_COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#feca57",
] as const;
const BORDER_HEIGHT = 3;
const ANIMATION_DURATION = 2000;

export interface AiInputProps {
  messages: IMessage[];
  onSend: () => void;
  input: string;
  setInput: (input: string) => void;
  isGenerating: boolean;
  user: { _id: number };
  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;
  keyboardOpen: boolean;
  loadingModel: boolean;
  containerStyle?: object;
  inputStyle?: object;
}

export const AiInput = ({
  messages,
  onSend,
  input,
  setInput,
  isGenerating,
  user,
  isFocused,
  setIsFocused,
  keyboardOpen,
  loadingModel,
  containerStyle,
  inputStyle,
}: AiInputProps) => {
  // Animated running border setup
  const [runningAnim] = useState(() => new Animated.Value(0));
  const [inputWidth, setInputWidth] = React.useState(300);

  useEffect(() => {
    if (isGenerating) {
      // Create a looping animation
      const startAnimation = () => {
        runningAnim.setValue(0);
        Animated.loop(
          Animated.timing(runningAnim, {
            toValue: 1,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
          { iterations: -1 } // Infinite loop
        ).start();
      };
      startAnimation();
    } else {
      runningAnim.stopAnimation();
      runningAnim.setValue(0);
    }

    return () => {
      runningAnim.stopAnimation();
    };
  }, [isGenerating, runningAnim]);

  // Create seamless infinite scroll effect
  const translateX = runningAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, inputWidth], // Move exactly one input width
  });

  return (
    <GiftedChat
      messages={messages}
      onSend={onSend}
      user={user}
      renderBubble={(props) => (
        <Bubble
          {...props}
          wrapperStyle={{
            right: { backgroundColor: "#2563eb" },
            left: { backgroundColor: "#2563eb" },
          }}
          textStyle={{
            right: { color: "#fff" },
            left: { color: "#fff" },
          }}
        />
      )}
      renderInputToolbar={(props) => (
        <InputToolbar
          {...props}
          containerStyle={{
            borderTopWidth: 0,
            backgroundColor: "#000",
            paddingBottom: 0,
            marginBottom: 0,
          }}
        />
      )}
      renderComposer={() => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#18181b",
            borderRadius: isFocused && keyboardOpen ? 0 : 24,
            paddingLeft: 16,
            paddingRight: 8,
            borderWidth: 0,
            borderColor: "#222",
            minHeight: isFocused && keyboardOpen ? 65 : 44,
            marginBottom: 0,
            paddingBottom: 0,
            position: "relative",
            ...containerStyle,
          }}
          onLayout={(event) => {
            const { width } = event.nativeEvent.layout;
            setInputWidth(width);
          }}
        >
          {/* Animated gradient loader */}
          {isGenerating && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: BORDER_HEIGHT,
                overflow: "hidden",
                zIndex: 2,
                borderTopLeftRadius: isFocused && keyboardOpen ? 0 : 24,
                borderTopRightRadius: isFocused && keyboardOpen ? 0 : 24,
              }}
            >
              {/* First gradient bar */}
              <Animated.View
                style={{
                  position: "absolute",
                  left: 0,
                  height: BORDER_HEIGHT,
                  width: inputWidth * 2, // Make it 2x width to ensure coverage
                  transform: [{ translateX }],
                }}
              >
                <LinearGradient
                  colors={GRADIENT_COLORS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.5, y: 0 }} // Only use half the gradient width
                  style={{ flex: 1, height: BORDER_HEIGHT }}
                />
              </Animated.View>

              {/* Second gradient bar for seamless loop */}
              <Animated.View
                style={{
                  position: "absolute",
                  left: 0,
                  height: BORDER_HEIGHT,
                  width: inputWidth * 2,
                  transform: [
                    {
                      translateX: translateX.interpolate({
                        inputRange: [0, inputWidth],
                        outputRange: [-inputWidth, 0], // Start from left, move to position
                      }),
                    },
                  ],
                }}
              >
                <LinearGradient
                  colors={GRADIENT_COLORS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.5, y: 0 }}
                  style={{ flex: 1, height: BORDER_HEIGHT }}
                />
              </Animated.View>
            </View>
          )}
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            style={{
              flex: 1,
              color: "#fff",
              fontSize: 16,
              paddingVertical: Platform.OS === "ios" ? 12 : 8,
              textAlignVertical: "top",
              paddingRight: 40,
              ...inputStyle,
            }}
            multiline
            onSubmitEditing={() => {
              if (input.trim()) onSend();
            }}
            returnKeyType="send"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            editable={!loadingModel}
          />
          {isGenerating ? (
            <ActivityIndicator
              size="small"
              color="#2563eb"
              style={{
                position: "absolute",
                right: 16,
                bottom: 16,
                marginLeft: 4,
                marginRight: 4,
              }}
            />
          ) : (
            <Ionicons
              name="send"
              size={24}
              color={input.trim() ? "#2563eb" : "#888"}
              style={{
                position: "absolute",
                right: 16,
                bottom: 16,
                opacity: input.trim() ? 1 : 0.5,
                marginLeft: 4,
                marginRight: 4,
              }}
              onPress={onSend}
              accessibilityLabel="Send message"
            />
          )}
        </View>
      )}
      renderSend={() => null}
      isKeyboardInternallyHandled={true}
    />
  );
};
