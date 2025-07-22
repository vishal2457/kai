import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Keyboard } from "react-native";
import { Button } from "../components/button";
import { AiInput } from "@/components/ai-input";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Container } from "../components/container";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import llamaService from "@/lib/llama-service";
import {
  addTransaction as repoAddTransaction,
  getTransactions,
} from "@/lib/db/repos/expense-tracker.repo";
import { IMessage } from "react-native-gifted-chat";

const PERIODS = ["Day", "Week", "Month"];

export default function FinancialScreen() {
  const [selected, setSelected] = useState(0);
  const [current, setCurrent] = useState(0); // 0 = current, -1 = prev, 1 = next, etc.
  const [loading, setLoading] = useState(false);
  const [spent, setSpent] = useState(0);

  // AiInput state
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

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

  const now = new Date();
  let displayLabel = "";
  const { startDate, endDate } = React.useMemo(() => {
    if (selected === 0) {
      // Day
      const date = addDays(now, current);
      displayLabel = format(date, "EEEE, MMMM d, yyyy");
      return {
        startDate: new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        ).getTime(),
        endDate: new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          23,
          59,
          59,
          999
        ).getTime(),
      };
    } else if (selected === 1) {
      // Week
      const weekStart = startOfWeek(addWeeks(now, current), {
        weekStartsOn: 1,
      }); // Monday
      const weekEnd = endOfWeek(addWeeks(now, current), { weekStartsOn: 1 });
      displayLabel = `${format(weekStart, "MMM d, yyyy")} - ${format(
        weekEnd,
        "MMM d, yyyy"
      )}`;
      return {
        startDate: new Date(
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate()
        ).getTime(),
        endDate: new Date(
          weekEnd.getFullYear(),
          weekEnd.getMonth(),
          weekEnd.getDate(),
          23,
          59,
          59,
          999
        ).getTime(),
      };
    } else if (selected === 2) {
      // Month
      const date = addMonths(now, current);
      displayLabel = format(date, "MMMM yyyy");
      return {
        startDate: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
        endDate: new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        ).getTime(),
      };
    }
    // fallback
    return { startDate: 0, endDate: 0 };
  }, [selected, current, now]);

  const fetchTransactions = useCallback(async () => {
    try {
      const txns = await getTransactions({ startDate, endDate });
      const total = txns.reduce((sum, txn) => sum + (txn.amount || 0), 0);
      setSpent(total);
    } catch (e) {
      setSpent(0);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, selected, current]);

  // Handler for AiInput
  const handleAiInput = async () => {
    if (!input.trim()) return;
    setLoading(true);
    // Add user message
    const userMsg: IMessage = {
      _id: Date.now(),
      text: input,
      createdAt: new Date(),
      user: { _id: 1 },
    };
    setMessages([userMsg]);
    try {
      const parsed = await llamaService.parseExpenseMessage(input);
      await repoAddTransaction(parsed);

      await fetchTransactions();
      const aiMsg: IMessage = {
        _id: Date.now() + 1,
        text: `Transaction added! Amount: $${parsed.amount} | Category: ${parsed.category}`,
        createdAt: new Date(),
        user: { _id: 2 },
      };
      setMessages([aiMsg, userMsg]);
    } catch (e: any) {
      const aiMsg: IMessage = {
        _id: Date.now() + 1,
        text: e?.message || "Failed to add transaction",
        createdAt: new Date(),
        user: { _id: 2 },
      };
      setMessages([aiMsg, userMsg]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  return (
    <Container>
      <View className="flex-1">
        {/* Upper section: only takes as much height as its content */}
        <View className="px-6 pt-32">
          <View className="flex-row mb-8 justify-center items-center rounded-xl border border-border overflow-hidden">
            {PERIODS.map((period, idx) => (
              <Button
                key={period}
                className={` py-2 flex-1  ${
                  selected === idx
                    ? "bg-primary"
                    : "bg-gray-200 dark:bg-gray-800"
                }`}
                onPress={() => setSelected(idx)}
              >
                <Text
                  className={`text-base font-semibold ${
                    selected === idx
                      ? "text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {period}
                </Text>
              </Button>
            ))}
          </View>

          <View className="flex-row items-center justify-between mb-8">
            <Button
              className="bg-transparent p-2 "
              onPress={() => setCurrent((c) => c - 1)}
              iconComponent={
                <FontAwesome name="chevron-left" size={20} color="#888" />
              }
            />
            <Text className="text-lg font-medium text-muted-foreground">
              {displayLabel}
            </Text>
            <Button
              className="bg-transparent p-2"
              onPress={() => setCurrent((c) => c + 1)}
              iconComponent={
                <FontAwesome name="chevron-right" size={20} color="#888" />
              }
            />
          </View>
          <View className="items-center">
            <Text className="text-4xl font-bold text-foreground">
              ${spent.toFixed(2)}
            </Text>
          </View>
        </View>
        {/* Lower section: AiInput fills the rest */}
        <View style={{ flex: 1 }}>
          <AiInput
            messages={messages}
            onSend={handleAiInput}
            input={input}
            setInput={setInput}
            isGenerating={loading}
            user={{ _id: 1 }}
            isFocused={isFocused}
            setIsFocused={setIsFocused}
            keyboardOpen={keyboardOpen}
            loadingModel={loading}
            containerStyle={{
              minHeight: keyboardOpen ? 100 : 80,
            }}
            inputStyle={{
              height: keyboardOpen ? 80 : 60,
            }}
          />
        </View>
      </View>
    </Container>
  );
}
