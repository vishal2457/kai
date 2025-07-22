import React from "react";
import { Pressable, Text, View, PressableProps } from "react-native";

interface ButtonProps extends PressableProps {
  children?: React.ReactNode;
  className?: string;
  iconComponent?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = ({
  children,
  className = "bg-primary rounded-lg px-4 py-2 flex-row items-center justify-center",
  iconComponent,
  iconPosition = "left",
  ...props
}: ButtonProps) => {
  if (!children && iconComponent) {
    // Icon-only button: center icon
    return (
      <Pressable className={className} {...props}>
        {iconComponent}
      </Pressable>
    );
  }
  return (
    <Pressable className={className} {...props}>
      <View className="flex-row items-center justify-center">
        {iconComponent && iconPosition === "left" && iconComponent}
        {children && (
          <Text className="text-primary-foreground font-medium text-base">
            {children}
          </Text>
        )}
        {iconComponent && iconPosition === "right" && iconComponent}
      </View>
    </Pressable>
  );
};
