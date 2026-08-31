import { useEffect, useRef, useState } from "react";
import useWebLLM, { type Message } from "./useWebLLM";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Cpu,
  LoaderCircle,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Search,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import "./App.css";

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

const CONVERSATIONS_KEY = "web-llm-conversations";
const ACTIVE_CONVERSATION_KEY = "web-llm-active-conversation";

const suggestions = [
  { title: "週末の旅行を計画", detail: "予算3万円で楽しめるプラン" },
  { title: "アイデアを整理", detail: "新しいサービスの企画を手伝って" },
  { title: "文章をブラッシュアップ", detail: "読みやすく自然な表現にする" },
  { title: "コードについて相談", detail: "Reactの設計をレビューして" },
];

const loadConversations = (): Conversation[] => {
  try {
    const stored = localStorage.getItem(CONVERSATIONS_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is Conversation => {
      if (!item || typeof item !== "object") return false;
      const conversation = item as Partial<Conversation>;
      return (
        typeof conversation.id === "string" &&
        typeof conversation.title === "string" &&
        typeof conversation.updatedAt === "number" &&
        Array.isArray(conversation.messages)
      );
    });
  } catch {
    return [];
  }
};

const createTitle = (messages: Message[]) => {
  const content =
    messages.find((message) => message.role === "user")?.content.trim() ??
    "新しいチャット";
  const title = content.replace(/\s+/g, " ");
  return title.length > 32 ? `${title.slice(0, 32)}...` : title;
};

function App() {
  const [conversations, setConversations] =
    useState<Conversation[]>(loadConversations);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(() => {
    const storedId = localStorage.getItem(ACTIVE_CONVERSATION_KEY);
    return conversations.some((conversation) => conversation.id === storedId)
      ? storedId
      : (conversations[0]?.id ?? null);
  });
  const activeConversationIdRef = useRef(activeConversationId);
  const initialMessages =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    )?.messages ?? [];
  const saveMessages = (nextMessages: Message[]) => {
    if (nextMessages.length === 0) return;

    const updatedAt = Date.now();
    let conversationId = activeConversationIdRef.current;
    if (!conversationId) {
      conversationId = crypto.randomUUID();
      activeConversationIdRef.current = conversationId;
      setActiveConversationId(conversationId);
    }

    const id = conversationId;
    setConversations((current) => {
      const existing = current.find((conversation) => conversation.id === id);
      const updated: Conversation = {
        id,
        title: existing?.title ?? createTitle(nextMessages),
        messages: nextMessages,
        updatedAt,
      };
      return [
        updated,
        ...current.filter((conversation) => conversation.id !== id),
      ];
    });
  };
  const {
    input,
    setInput,
    messages,
    availableModels,
    selectedModelId,
    loadingModelId,
    isModelListLoading,
    loadingProgress,
    modelError,
    generationError,
    isGenerating,
    setMessages,
    loadAvailableModels,
    selectModel,
    submitMessage,
    stopGenerating,
  } = useWebLLM(initialMessages, saveMessages);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedModel = availableModels.find(
    (model) => model.id === selectedModelId,
  );
  const visibleConversations = conversations.filter((conversation) =>
    conversation.title.toLocaleLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem(ACTIVE_CONVERSATION_KEY, activeConversationId);
    } else {
      localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
    }
  }, [activeConversationId]);

  const toggleModelMenu = () => {
    const willOpen = !modelMenuOpen;
    setModelMenuOpen(willOpen);
    if (willOpen) void loadAvailableModels();
  };

  const handleModelSelect = async (modelId: string) => {
    const loaded = await selectModel(modelId);
    if (loaded) setModelMenuOpen(false);
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [input]);

  const startNewChat = () => {
    stopGenerating();
    activeConversationIdRef.current = null;
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setSearchQuery("");
    setSidebarOpen(false);
    textareaRef.current?.focus();
  };

  const openConversation = (conversation: Conversation) => {
    stopGenerating();
    activeConversationIdRef.current = conversation.id;
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages);
    setInput("");
    setSidebarOpen(false);
  };

  const deleteConversation = (conversationId: string) => {
    setConversations((current) =>
      current.filter((conversation) => conversation.id !== conversationId),
    );
    if (conversationId === activeConversationId) startNewChat();
  };

  const copyMessage = async (message: Message) => {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(null), 1400);
  };

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="scrim"
          aria-label="メニューを閉じる"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <button className="brand" type="button" onClick={startNewChat}>
            <span className="brand-mark">
              <Sparkles size={17} strokeWidth={2.2} />
            </span>
            <span>AI</span>
          </button>
          <button
            className="icon-button mobile-close"
            type="button"
            aria-label="メニューを閉じる"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-actions" aria-label="チャットメニュー">
          <button type="button" onClick={startNewChat}>
            <PenLine size={18} />
            <span>新しいチャット</span>
          </button>
          <button
            type="button"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((current) => !current)}
          >
            <Search size={18} />
            <span>チャットを検索</span>
          </button>
        </nav>

        <div className="history">
          <p className="history-label">最近</p>
          {searchOpen && (
            <div className="history-search">
              <Search size={15} />
              <input
                type="search"
                value={searchQuery}
                autoFocus
                aria-label="チャットを検索"
                placeholder="履歴を検索"
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          )}
          {visibleConversations.map((conversation) => (
            <div
              className={`history-row ${
                conversation.id === activeConversationId ? "is-active" : ""
              }`}
              key={conversation.id}
            >
              <button
                className="history-chat"
                type="button"
                aria-current={
                  conversation.id === activeConversationId ? "page" : undefined
                }
                onClick={() => openConversation(conversation)}
              >
                <span>{conversation.title}</span>
              </button>
              <button
                className="history-delete"
                type="button"
                aria-label={`${conversation.title}を削除`}
                title="削除"
                onClick={() => deleteConversation(conversation.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {visibleConversations.length === 0 && (
            <p className="history-empty">
              {searchQuery ? "一致するチャットはありません" : "履歴はありません"}
            </p>
          )}
        </div>

        <button className="profile" type="button">
          <span className="avatar">Y</span>
          <span className="profile-copy">
            <strong>あなた</strong>
            <small>Free</small>
          </span>
          <MoreHorizontal size={18} />
        </button>
      </aside>

      <main className="chat-main">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            type="button"
            aria-label="メニューを開く"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div className="model-selector">
            <button
              className="model-button"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={modelMenuOpen}
              onClick={toggleModelMenu}
            >
              <Cpu size={17} />
              <span className="model-name">
                {selectedModel?.label ?? "モデルを選択"}
              </span>
              <ChevronDown
                className={modelMenuOpen ? "chevron-open" : ""}
                size={16}
              />
            </button>

            {modelMenuOpen && (
              <div className="model-menu">
                <div className="model-menu-heading">
                  <strong>ローカルモデル</strong>
                  <span>事前ダウンロード済み</span>
                </div>

                {loadingModelId && (
                  <div className="model-progress" role="status">
                    <span>
                      <LoaderCircle className="spin" size={16} />
                      読み込み中{" "}
                      {Math.round((loadingProgress?.progress ?? 0) * 100)}%
                    </span>
                    <div>
                      <i
                        style={{
                          width: `${(loadingProgress?.progress ?? 0) * 100}%`,
                        }}
                      />
                    </div>
                    <small>{loadingProgress?.text ?? loadingModelId}</small>
                  </div>
                )}

                {modelError && (
                  <p className="model-error" role="alert">
                    {modelError}
                  </p>
                )}

                <div
                  className="model-list"
                  role="listbox"
                  aria-label="利用可能なモデル"
                >
                  {isModelListLoading ? (
                    <p className="model-empty">
                      <LoaderCircle className="spin" size={18} />
                      モデル一覧を取得中
                    </p>
                  ) : availableModels.length > 0 ? (
                    availableModels.map((model) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={model.id === selectedModelId}
                        disabled={Boolean(loadingModelId)}
                        key={model.id}
                        onClick={() => void handleModelSelect(model.id)}
                      >
                        <span>
                          <strong>{model.label}</strong>
                          <small>{model.id}</small>
                          {model.vramRequiredMB && (
                            <small>
                              VRAM 約{Math.ceil(model.vramRequiredMB / 1024)} GB
                            </small>
                          )}
                        </span>
                        {model.id === selectedModelId && <Check size={17} />}
                      </button>
                    ))
                  ) : (
                    <p className="model-empty">一致するモデルがありません</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <button className="share-button" type="button">
            <MessageSquare size={16} />
            <span>共有</span>
          </button>
        </header>

        <div
          className={`conversation ${messages.length === 0 ? "is-empty" : ""}`}
        >
          {messages.length === 0 ? (
            <section className="welcome">
              <div className="welcome-mark">
                <Sparkles size={26} />
              </div>
              <h1>今日は何をお手伝いしましょうか？</h1>
              <div className="suggestion-grid">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.title}
                    type="button"
                    onClick={() => {
                      setInput(`${suggestion.title}：${suggestion.detail}`);
                      textareaRef.current?.focus();
                    }}
                  >
                    <strong>{suggestion.title}</strong>
                    <span>{suggestion.detail}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="messages" aria-live="polite">
              {messages.map((message) => (
                <article
                  className={`message message-${message.role}`}
                  key={message.id}
                >
                  {message.role === "assistant" && (
                    <span className="assistant-mark">
                      <Sparkles size={16} />
                    </span>
                  )}
                  <div className="message-content">
                    {message.content ? (
                      <p>{message.content}</p>
                    ) : (
                      <span
                        className="response-loader"
                        aria-label="AIが応答を生成中"
                      >
                        <i />
                        <i />
                        <i />
                      </span>
                    )}
                    {message.role === "assistant" && message.content && (
                      <div className="message-tools">
                        <button
                          type="button"
                          aria-label="コピー"
                          onClick={() => copyMessage(message)}
                        >
                          {copiedId === message.id ? (
                            <Check size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                        <button type="button" aria-label="良い回答">
                          <ThumbsUp size={16} />
                        </button>
                        <button type="button" aria-label="良くない回答">
                          <ThumbsDown size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="composer-area">
          <form className="composer" onSubmit={submitMessage}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              aria-label="メッセージ"
              placeholder="AI にメッセージを送信"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !isGenerating) {
                  event.preventDefault();
                  void submitMessage();
                }
              }}
            />
            <div className="composer-actions">
              <button
                className="attach-button"
                type="button"
                aria-label="ファイルを添付"
              >
                <Paperclip size={19} />
              </button>
              <span className="mode-label">
                <Sparkles size={15} />
                スマート
              </span>
              {isGenerating ? (
                <button
                  className="send-button stop-button"
                  type="button"
                  aria-label="生成を停止"
                  onClick={stopGenerating}
                >
                  <Square size={13} fill="currentColor" />
                </button>
              ) : (
                <button
                  className="send-button"
                  type="submit"
                  aria-label="送信"
                  disabled={!input.trim()}
                >
                  <ArrowUp size={19} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </form>
          {!selectedModelId && !generationError && (
            <p className="composer-status">
              モデルを選択するとチャットを開始できます。
            </p>
          )}
          {generationError && (
            <p className="composer-status composer-error" role="alert">
              {generationError}
            </p>
          )}
          <p className="disclaimer">
            AIの回答は必ずしも正しいとは限りません。重要な情報は確認してください。
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
