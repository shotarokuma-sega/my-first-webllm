import {
  useRef,
  useState,
  type FormEvent,
  type SetStateAction,
} from "react";
import type {
  InitProgressCallback,
  InitProgressReport,
  MLCEngineInterface,
} from "@mlc-ai/web-llm";
import { createLocalAppConfig, LOCAL_MODELS } from "./localModels";

export type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export type EngineType = MLCEngineInterface;

export type ModelOption = {
  id: string;
  label: string;
  vramRequiredMB?: number;
};

export const initProgressCallback: InitProgressCallback = (report) => {
  console.log(`Model loading progress: ${report.progress * 100}%`);
};

function isInvalidCachedJson(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("Unexpected token '<'") ||
      error.message.includes("<!doctype"))
  );
}

function useWebLLM(
  initialMessages: Message[] = [],
  onMessagesChange?: (messages: Message[]) => void,
) {
  const [messages, updateMessages] = useState<Message[]>(initialMessages);
  const messagesRef = useRef(initialMessages);
  const onMessagesChangeRef = useRef(onMessagesChange);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>(() =>
    LOCAL_MODELS.map((model) => ({
      id: model.id,
      label: model.label,
      vramRequiredMB: model.vramRequiredMB,
    })),
  );
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const [isModelListLoading, setIsModelListLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] =
    useState<InitProgressReport | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [input, setInput] = useState("");
  const engineRef = useRef<EngineType | null>(null);
  const messageId = useRef(
    initialMessages.reduce((largestId, message) => {
      return Math.max(largestId, message.id);
    }, 0),
  );
  const generatingRef = useRef(false);
  const stopRequestedRef = useRef(false);

  const setMessages = (action: SetStateAction<Message[]>) => {
    const next =
      typeof action === "function" ? action(messagesRef.current) : action;
    messagesRef.current = next;
    messageId.current = next.reduce((largestId, message) => {
      return Math.max(largestId, message.id);
    }, messageId.current);
    updateMessages(next);
    onMessagesChangeRef.current?.(next);
  };

  const loadAvailableModels = async () => {
    if (availableModels.length > 0 || isModelListLoading) return;

    setIsModelListLoading(true);
    setModelError(null);
    setAvailableModels(
      LOCAL_MODELS.map((model) => ({
        id: model.id,
        label: model.label,
        vramRequiredMB: model.vramRequiredMB,
      })),
    );
    setIsModelListLoading(false);
  };

  const selectModel = async (modelId: string) => {
    if (loadingModelId || generatingRef.current || modelId === selectedModelId)
      return false;

    setLoadingModelId(modelId);
    setLoadingProgress(null);
    setModelError(null);

    const handleProgress: InitProgressCallback = (report) => {
      initProgressCallback(report);
      setLoadingProgress(report);
    };

    try {
      const webllm = await import("@mlc-ai/web-llm");
      const appConfig = createLocalAppConfig();
      const loadModel = async () => {
        if (engineRef.current) {
          engineRef.current.setInitProgressCallback(handleProgress);
          await engineRef.current.reload(modelId);
          return;
        }

        engineRef.current = await webllm.CreateMLCEngine(modelId, {
          appConfig,
          initProgressCallback: handleProgress,
        });
      };

      try {
        await loadModel();
      } catch (error) {
        if (!isInvalidCachedJson(error)) throw error;

        setLoadingProgress({
          progress: 0,
          timeElapsed: 0,
          text: "壊れたモデルキャッシュを修復しています",
        });
        await webllm.deleteModelAllInfoInCache(modelId, appConfig);
        await loadModel();
      }
      setSelectedModelId(modelId);
      return true;
    } catch (error) {
      setModelError(
        error instanceof Error ? error.message : "モデルを読み込めませんでした",
      );
      return false;
    } finally {
      setLoadingModelId(null);
    }
  };

  const submitMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = input.trim();
    if (!content || generatingRef.current) return;
    if (!engineRef.current || !selectedModelId) {
      setGenerationError("先にヘッダーからモデルを選択してください。");
      return;
    }

    const userMessage: Message = {
      id: ++messageId.current,
      role: "user",
      content,
    };

    const assistantMessage: Message = {
      id: ++messageId.current,
      role: "assistant",
      content: "",
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
    setGenerationError(null);
    setIsGenerating(true);
    generatingRef.current = true;
    stopRequestedRef.current = false;

    const requestMessages = [
      {
        role: "system" as const,
        content:
          "あなたは正確で親切なAIアシスタントです。ユーザーの質問と同じ言語で、質問へ直接かつ具体的に回答してください。",
      },
      ...[...messages, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    try {
      const stream = await engineRef.current.chat.completions.create({
        model: selectedModelId,
        messages: requestMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 512,
        extra_body: selectedModelId.startsWith("Qwen3-")
          ? { enable_thinking: false }
          : undefined,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta.content;
        if (!delta) continue;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: message.content + delta }
              : message,
          ),
        );
      }
    } catch (error) {
      if (!stopRequestedRef.current) {
        setGenerationError(
          error instanceof Error
            ? error.message
            : "応答を生成できませんでした。",
        );
        setMessages((current) =>
          current.filter(
            (message) =>
              message.id !== assistantMessage.id || message.content.length > 0,
          ),
        );
      }
    } finally {
      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !== assistantMessage.id || message.content.length > 0,
        ),
      );
      generatingRef.current = false;
      setIsGenerating(false);
    }
  };

  const stopGenerating = () => {
    if (!generatingRef.current) return;
    stopRequestedRef.current = true;
    engineRef.current?.interruptGenerate();
  };

  return {
    messages,
    setMessages,
    input,
    setInput,
    availableModels,
    selectedModelId,
    loadingModelId,
    isModelListLoading,
    loadingProgress,
    modelError,
    generationError,
    isGenerating,
    loadAvailableModels,
    selectModel,
    submitMessage,
    stopGenerating,
  };
}

export default useWebLLM;
