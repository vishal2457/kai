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
import { sql as drizzleSql } from "drizzle-orm";
import { db } from "../lib/db";
const PERIODS = ["Day", "Week", "Month"];

export default function FinancialScreen() {
  const [selected, setSelected] = useState(0);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [spent, setSpent] = useState(0);

  // AiInput state
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [modelStatus, setModelStatus] = useState(
    llamaService.getModelStatusSync()
  );
  const [provider, setProvider] = useState(modelStatus.provider || "local");
  useEffect(() => {
    setProvider(modelStatus.provider || "local");
  }, [modelStatus]);

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

  // Add schema string for LLM context
  const schemaString = `Tables sqlite:
transaction (amount|date INTEGER|category_id|type)
category (type|name)
budget (category_id|amount|period)`;

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
      const intent = await llamaService.classifyIntentMessage(input);
      if (intent === "add") {
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
      } else if (intent === "report") {
        // Step 1: Ask LLM to generate an SQL query from the user query and schema
        let sql;
        try {
          sql = await llamaService.generateSQLQuery(input, schemaString);
        } catch (e) {
          console.log(e);

          setMessages([
            {
              _id: Date.now() + 1,
              text: "Sorry, I couldn't generate a query for your request.",
              createdAt: new Date(),
              user: { _id: 2 },
            },
            userMsg,
          ]);
          return;
        }
        // Step 2: Execute the SQL query on the DB using expo-sqlite
        let data;
        try {
          console.log(sql);

          data = await db.run(drizzleSql`${sql}`);
        } catch (e) {
          console.log(e);
          setMessages([
            {
              _id: Date.now() + 1,
              text: "Failed to execute the generated SQL query.",
              createdAt: new Date(),
              user: { _id: 2 },
            },
            userMsg,
          ]);
          return;
        }
        if (!data || (Array.isArray(data) && !data.length)) {
          setMessages([
            {
              _id: Date.now() + 1,
              text: "No data found for your query.",
              createdAt: new Date(),
              user: { _id: 2 },
            },
            userMsg,
          ]);
        } else {
          // Step 3: Ask LLM to generate a conversational report from SQL and data
          let answer;
          try {
            answer = await llamaService.conversationalReportFromSQL(
              input,
              sql,
              data
            );
          } catch (e) {
            setMessages([
              {
                _id: Date.now() + 1,
                text: "Failed to generate a report.",
                createdAt: new Date(),
                user: { _id: 2 },
              },
              userMsg,
            ]);
            return;
          }
          const aiMsg: IMessage = {
            _id: Date.now() + 1,
            text: answer,
            createdAt: new Date(),
            user: { _id: 2 },
          };
          setMessages([aiMsg, userMsg]);
        }
      }
    } catch (e: any) {
      const aiMsg: IMessage = {
        _id: Date.now() + 1,
        text: e?.message || "Failed to process input",
        createdAt: new Date(),
        user: { _id: 2 },
      };
      setMessages([aiMsg, userMsg]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  // Compute period status label
  let periodStatus = "";
  if (current === 0) {
    periodStatus = `Current ${PERIODS[selected]}`;
  } else if (current < 0) {
    periodStatus = `Previous ${PERIODS[selected]}`;
    if (Math.abs(current) > 1) {
      periodStatus = `${Math.abs(current)} ${PERIODS[selected]}s Ago`;
    }
  } else if (current > 0) {
    periodStatus = `Next ${PERIODS[selected]}`;
    if (current > 1) {
      periodStatus = `In ${current} ${PERIODS[selected]}s`;
    }
  }

  return (
    <Container>
      <View className="flex-1">
        {/* Upper section: only takes as much height as its content */}
        <View className="px-6 pt-12">
          <View className="flex-row mb-8 justify-center items-center rounded-full  overflow-hidden">
            {PERIODS.map((period, idx) => (
              <Button
                key={period}
                className={` py-2 flex-1 border border-gray-200 dark:border-gray-700 ${
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
            <View className="items-center">
              <Text className="text-lg font-medium text-muted-foreground">
                {displayLabel}
              </Text>
              <Text className="text-xs text-primary mt-1">{periodStatus}</Text>
            </View>
            <Button
              className={`bg-transparent p-2${
                current === 0 ? " opacity-40" : ""
              }`}
              onPress={() => setCurrent((c) => c + 1)}
              iconComponent={
                <FontAwesome name="chevron-right" size={20} color="#888" />
              }
              disabled={current === 0}
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
