import { UserButton, useUser } from "@clerk/clerk-react";
import { useState, useRef, useEffect } from "react";
import { runAgent, stopAgent } from "../api";

interface WebSocketMessage {
  type: string;
  agent_id?: string;
  data?: {
    screenshot?: string;
    [key: string]: any;
  };
  timestamp: string;
}

interface AgentLog {
  prefix: string;
  content: string;
  timestamp: string;
  step?: number;
}

interface AgentAction {
  action: string;
  action_number: number;
  total_actions: number;
  timestamp: string;
  step?: number;
}

interface AgentUpdate {
  future_plans: string;
  memory: string;
  step: number;
  task_progress: string;
  timestamp: string;
}

interface TimelineItem {
  type: "log" | "action" | "update";
  step?: number;
  timestamp: string;
  data: AgentLog | AgentAction | AgentUpdate;
}

interface DynamicFilters {
  [key: string]: string[];
}

interface AgentRunResponse {
  client_id: string;
  dynamic_filters?: DynamicFilters;
}

interface ApiError {
  type?: string;
  error?: string;
  detail?: string;
  message?: string;
}

const MODEL_OPTIONS = ["gpt-4o-mini", "gpt-4", "o3-mini"];

export default function DashboardPage() {
  const { user } = useUser();
  const [task, setTask] = useState("");
  const [activeTaskPrompt, setActiveTaskPrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTaskActive, setIsTaskActive] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [agentProgress] = useState({
    memory: "",
    taskProgress: "",
    futurePlans: "",
    step: 0,
  });

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<{
    message: string;
    detail: string;
  } | null>(null);

  const [isStoppingTask, setIsStoppingTask] = useState(false);

  const [dynamicFilters, setDynamicFilters] = useState<DynamicFilters>({});
  const [modifiedPrompt, setModifiedPrompt] = useState<string>("");

  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const setupWebSocket = (clientId: string) => {
    const ws = new WebSocket(`ws://localhost:3030/ws/${clientId}`);

    ws.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
      console.log("WebSocket message received:", data);

      handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      cleanupWebSocket();
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      wsRef.current = null;
    };

    wsRef.current = ws;
  };

  const cleanupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case "browser_screenshot":
        if (data.data?.screenshot) {
          setScreenshot(data.data.screenshot);
        }
        break;

      case "agent_log":
        if (data.data?.prefix && data.data?.content) {
          const logItem: TimelineItem = {
            type: "log",
            step: data.data.step,
            timestamp: data.timestamp,
            data: {
              prefix: data.data.prefix,
              content: data.data.content,
              timestamp: data.timestamp,
              step: data.data.step,
            },
          };
          setTimeline((prev) => [...prev, logItem]);
        }
        break;

      case "agent_action":
        if (data.data?.action) {
          const actionItem: TimelineItem = {
            type: "action",
            step: data.data.step,
            timestamp: data.timestamp,
            data: {
              action: data.data.action,
              action_number: data.data.action_number,
              total_actions: data.data.total_actions,
              timestamp: data.timestamp,
              step: data.data.step,
            },
          };
          setTimeline((prev) => [...prev, actionItem]);
        }
        break;

      case "agent_update":
        if (data.data) {
          const updateItem: TimelineItem = {
            type: "update",
            step: data.data.step,
            timestamp: data.timestamp,
            data: {
              future_plans: data.data.future_plans,
              memory: data.data.memory,
              step: data.data.step,
              task_progress: data.data.task_progress,
              timestamp: data.timestamp,
            },
          };
          setTimeline((prev) => [...prev, updateItem]);
        }
        break;

      case "agent_status":
        if (data.data?.status === "completed") {
          setIsLoading(false);
          setIsTaskActive(true);
        }
        break;

      default:
        console.log("Unhandled message type:", data.type);
    }
  };

  const handleStartTask = async () => {
    if (!task.trim() || !user) return;

    setIsLoading(true);
    setIsTaskActive(true);
    setError(null);
    setActiveTaskPrompt(task);
    setModifiedPrompt(task);
    setTask("");

    try {
      const response = (await runAgent(task, user.id)) as AgentRunResponse;

      if (response.client_id) {
        setupWebSocket(response.client_id);
        setDynamicFilters(response.dynamic_filters || {});
      }
    } catch (error) {
      console.error("Error:", error);
      const apiError = error as ApiError;
      setIsLoading(false);
      setIsTaskActive(false);
      setActiveTaskPrompt(null);

      if (apiError.type === "VALIDATION_ERROR") {
        setError({
          message: apiError.error || "An error occurred",
          detail: apiError.detail || "Please try again",
        });
      } else {
        setError({
          message: "An unexpected error occurred",
          detail: "Please try again later",
        });
      }
    }
  };

  const handleStopTask = async () => {
    setIsStoppingTask(true);
    try {
      await stopAgent();
      setIsLoading(false);
      setIsTaskActive(false);
      setActiveTaskPrompt(null);
      cleanupWebSocket();
    } catch (error) {
      console.error("Error stopping task:", error);
    } finally {
      setIsStoppingTask(false);
    }
  };

  const handleClosePromptCard = () => {
    setActiveTaskPrompt(null);
  };

  useEffect(() => {
    return () => {
      cleanupWebSocket();
    };
  }, []);

  useEffect(() => {
    if (timelineContainerRef.current) {
      timelineContainerRef.current.scrollTo({
        top: timelineContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [timeline]);

  const formatActionContent = (actionStr: string) => {
    try {
      const actionObj = JSON.parse(actionStr);
      const actionEntries = Object.entries(actionObj);
      if (!actionEntries.length)
        return <div className="text-gray-600">{actionStr}</div>;
      const [actionType, actionData] = actionEntries[0] as [string, any];

      switch (actionType) {
        case "go_to_url":
          return (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                Navigate
              </span>
              <span className="text-blue-600 underline">{actionData.url}</span>
            </div>
          );

        case "input_text":
          return (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-sm font-medium">
                Input Text
              </span>
              <span>"{actionData.text}"</span>
              <span className="text-gray-500 text-sm">
                at index {actionData.index}
              </span>
            </div>
          );

        case "click_element":
          return (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                Click
              </span>
              <span className="text-gray-600">
                element at index {actionData.index}
              </span>
            </div>
          );

        case "copy_to_clipboard":
          return (
            <div className="flex flex-col gap-1">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium inline-block w-fit">
                Copy to Clipboard
              </span>
              <span className="text-gray-600 pl-2 border-l-2 border-yellow-200 mt-1">
                {actionData.text}
              </span>
            </div>
          );

        case "done":
          return (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-sm font-medium">
                Complete
              </span>
              <span className="text-gray-600">{actionData.text}</span>
            </div>
          );

        default:
          return (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-sm font-medium">
                {actionType}
              </span>
              <span className="text-gray-600">
                {JSON.stringify(actionData)}
              </span>
            </div>
          );
      }
    } catch (e) {
      return <div className="text-gray-600">{actionStr}</div>;
    }
  };

  const renderTimelineItem = (item: TimelineItem) => {
    switch (item.type) {
      case "log": {
        const log = item.data as AgentLog;
        return (
          <div className="pl-6 mb-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="font-medium text-gray-700">{log.prefix}</div>
              <div className="text-gray-600 mt-1">{log.content}</div>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        );
      }

      case "action": {
        const action = item.data as AgentAction;
        return (
          <div className="mb-4">
            <div className="bg-blue-50 rounded-lg p-4 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-blue-700">
                  Action {action.action_number}/{action.total_actions}
                </div>
                <div className="text-xs text-blue-400">
                  {new Date(action.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div className="mt-2">{formatActionContent(action.action)}</div>
            </div>
          </div>
        );
      }

      case "update": {
        const update = item.data as AgentUpdate;
        return (
          <div className="mb-4">
            <div className="bg-green-50 rounded-lg p-4 shadow-sm border border-green-100">
              <div className="font-medium text-green-700">Status Update</div>
              {update.memory && (
                <div className="text-green-600 mt-1">
                  <strong>Memory:</strong> {update.memory}
                </div>
              )}
              {update.task_progress && (
                <div className="text-green-600 mt-1">
                  <strong>Progress:</strong> {update.task_progress}
                </div>
              )}
              {update.future_plans && (
                <div className="text-green-600 mt-1">
                  <strong>Next Steps:</strong> {update.future_plans}
                </div>
              )}
              <div className="text-xs text-green-400 mt-2">
                {new Date(update.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        );
      }
    }
  };

  const renderGroupedTimeline = () => {
    const groupedByStep = timeline.reduce((acc, item) => {
      const step = item.step || 0;
      if (!acc[step]) acc[step] = [];
      acc[step].push(item);
      return acc;
    }, {} as Record<number, TimelineItem[]>);

    return Object.entries(groupedByStep).map(([step, items]) => {
      const summaryItem = items.find(
        (item) =>
          item.type === "log" &&
          (item.data as AgentLog).prefix.toLowerCase().includes("summary")
      );
      const summaryContent = summaryItem
        ? (summaryItem.data as AgentLog).content
        : "";

      return (
        <div key={step} className="mb-6">
          {step !== "0" && (
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold">
                {step}
              </div>
              <div className="ml-3">
                <div className="font-bold text-xl text-gray-700">
                  Step {step}
                  {summaryContent && (
                    <span className="ml-2 font-normal text-gray-600">
                      - {summaryContent}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="ml-4">
            {items
              .filter(
                (item) =>
                  !(
                    item.type === "log" &&
                    (item.data as AgentLog).prefix
                      .toLowerCase()
                      .includes("summary")
                  )
              )
              .map((item, index) => (
                <div key={index}>{renderTimelineItem(item)}</div>
              ))}
          </div>
        </div>
      );
    });
  };

  const InteractivePrompt: React.FC<{
    prompt: string;
    filters: DynamicFilters;
    onChange: (newPrompt: string) => void;
  }> = ({ prompt, filters, onChange }) => {
    const words = prompt.split(" ");

    const handleFilterChange = (originalWord: string, newValue: string) => {
      const newWords = words.map((w) => (w === originalWord ? newValue : w));
      onChange(newWords.join(" "));
    };

    return (
      <div className="flex flex-wrap gap-2 items-center">
        {words.map((word, index) => {
          const filterOptions = Object.entries(filters).find(
            ([key]) => key.toLowerCase() === word.toLowerCase()
          );

          if (filterOptions) {
            return (
              <select
                key={index}
                value={word}
                onChange={(e) => handleFilterChange(word, e.target.value)}
                className="px-2 py-1 rounded border border-blue-300 bg-blue-50 text-blue-700 cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value={filterOptions[0]}>{filterOptions[0]}</option>
                {filterOptions[1].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            );
          }

          return (
            <span key={index} className="text-gray-700">
              {word}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {error && (
        <div
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 
                      animate-[slideDown_0.3s_ease-out]"
        >
          <div
            className="bg-white border border-red-200 rounded-lg shadow-lg p-4 
                        max-w-md mx-auto"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="font-medium text-red-600 mb-1">
                  {error.message}
                </div>
                <div className="text-sm text-gray-600">{error.detail}</div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white border-b border-gray-200 h-14 flex items-center px-6 fixed w-full z-10">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <span className="text-lg font-medium text-gray-800">
              Shoperator v1.0
            </span>
          </div>
          <div className="flex items-center gap-6">
            <UserButton afterSignOutUrl="/" />
            <span className="text-sm text-gray-600 truncate max-w-[200px]">
              {user?.primaryEmailAddress?.emailAddress &&
              user.primaryEmailAddress.emailAddress.length > 40
                ? `${user.primaryEmailAddress.emailAddress.substring(0, 17)}...`
                : user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>
        </div>
      </nav>

      <div className="flex-1 pt-14 px-6">
        {isTaskActive ? (
          <div className="flex h-[calc(100vh-3.5rem)]">
            <div className="w-1/3 relative flex flex-col h-full border-r border-gray-200 bg-white">
              <div
                ref={timelineContainerRef}
                className="h-[calc(100vh-14rem)] overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
              >
                {renderGroupedTimeline()}
              </div>

              <div className="p-6 border-t border-gray-200 bg-white">
                {activeTaskPrompt && (
                  <div
                    className="absolute bottom-[70%+0.5rem] left-0 right-0 
                              bg-white rounded-lg p-4 shadow-lg border border-gray-200 
                              w-[calc(100%-4rem)]
                              mx-auto
                              animate-[slideDown_0.3s_ease-out] z-10"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <div className="text-sm text-gray-500 mb-1">
                          Current Task:
                        </div>
                        <div className="text-gray-700">
                          <InteractivePrompt
                            prompt={modifiedPrompt}
                            filters={dynamicFilters}
                            onChange={(newPrompt) =>
                              setModifiedPrompt(newPrompt)
                            }
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleClosePromptCard}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                <textarea
                  className="w-full h-28 p-4 rounded-lg border border-gray-200 
                  shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-200
                  resize-none bg-white text-sm"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                />
                <div className="flex gap-2">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="px-2 py-1 text-xs rounded border border-gray-200 bg-white text-gray-700 
                               hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-200"
                  >
                    {MODEL_OPTIONS.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 mt-3">
                  <button
                    className={`flex-1 px-5 py-2.5 rounded-lg text-sm
                    ${
                      !task.trim() || isLoading
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-900 hover:bg-gray-800 text-white"
                    }
                    transition-colors duration-200`}
                    onClick={handleStartTask}
                    disabled={!task.trim() || isLoading}
                  >
                    {isLoading ? "Agent is at work..." : "Run Shoperator Agent"}
                  </button>
                  {isLoading && (
                    <button
                      className="flex-1 px-5 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm
                      transition-colors duration-200"
                      onClick={handleStopTask}
                      disabled={isStoppingTask}
                    >
                      {isStoppingTask ? "Stopping Agent..." : "Stop Agent"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="w-2/3 h-full overflow-y-auto p-6 bg-gray-50">
              {screenshot && (
                <img
                  src={`data:image/png;base64,${screenshot}`}
                  alt="Browser Screenshot"
                  className="w-full rounded-lg shadow-sm border border-gray-200"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full items-center justify-center p-8">
            <div className="w-full max-w-2xl relative px-4">
              {activeTaskPrompt && (
                <div
                  className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 
                              bg-white rounded-lg p-4 shadow-lg border border-gray-200 
                              animate-[slideDown_0.3s_ease-out] z-10"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <div className="text-sm text-gray-500 mb-1">
                        Current Task:
                      </div>
                      <div className="text-gray-700">
                        <InteractivePrompt
                          prompt={modifiedPrompt}
                          filters={dynamicFilters}
                          onChange={(newPrompt) => setModifiedPrompt(newPrompt)}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleClosePromptCard}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              <div className="relative">
                <div className="h-full">
                  <div className=" grid grid-cols-3 gap-4 mb-4">
                    <div
                      onClick={() =>
                        setTask(
                          "Go to Flipkart and find me the cheapest laptop from Dell under INR 35000"
                        )
                      }
                      className="cursor-pointer group p-4 bg-white rounded-xl border border-gray-100
                        shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)]
                        transition-all duration-300"
                    >
                      <h3 className="font-bold text-gray-800 mb-2 text-lg group-hover:text-blue-600 transition-colors">
                        Find Budget Laptop
                      </h3>
                      <p className="text-sm text-gray-600">
                        Go to Flipkart and find me the cheapest laptop from Dell
                        under INR 35000
                      </p>
                    </div>

                    <div
                      onClick={() =>
                        setTask(
                          "Find me black shirt in medium size from Meesho, Myntra and Fab India"
                        )
                      }
                      className="cursor-pointer group p-4 bg-white rounded-xl border border-gray-100
                        shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)]
                        transition-all duration-300"
                    >
                      <h3 className="font-bold text-gray-800 mb-2 text-lg group-hover:text-blue-600 transition-colors">
                        Compare Clothing
                      </h3>
                      <p className="text-sm text-gray-600">
                        Find me black shirt in medium size from Meesho, Myntra
                        and Fab India
                      </p>
                    </div>

                    <div
                      onClick={() =>
                        setTask(
                          "Search for wireless noise cancelling headphones under INR 5000 on Amazon and Flipkart"
                        )
                      }
                      className="cursor-pointer group p-4 bg-white rounded-xl border border-gray-100
                        shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)]
                        transition-all duration-300"
                    >
                      <h3 className="font-bold text-gray-800 mb-2 text-lg group-hover:text-blue-600 transition-colors">
                        Compare Electronics
                      </h3>
                      <p className="text-sm text-gray-600">
                        Search for wireless noise cancelling headphones under
                        INR 5000 on Amazon and Flipkart
                      </p>
                    </div>
                  </div>
                </div>

                <textarea
                  className="w-full h-36 p-5 rounded-lg border border-gray-200 
                  shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-200
                  resize-none bg-white text-sm backdrop-blur-sm
                  shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1),0_0_8px_0_rgba(59,130,246,0.1)]"
                  placeholder="Enter your task description..."
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-md border border-gray-200 bg-white text-gray-700 
                             hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-200
                             shadow-sm backdrop-blur-sm"
                  >
                    {MODEL_OPTIONS.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  className={`flex-1 px-5 py-2.5 rounded-lg text-sm
                  transition-colors duration-200 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1),0_0_8px_0_rgba(59,130,246,0.1)]
                  ${
                    !task.trim() || isLoading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                  onClick={handleStartTask}
                  disabled={!task.trim() || isLoading}
                >
                  {isLoading ? "Agent is at work..." : "Run Shoperator Agent"}
                </button>
                {isLoading && (
                  <button
                    className="flex-1 px-5 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm
                    transition-colors duration-200 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1),0_0_8px_0_rgba(239,68,68,0.1)]"
                    onClick={handleStopTask}
                    disabled={isStoppingTask}
                  >
                    {isStoppingTask ? "Stopping Agent..." : "Stop Agent"}
                  </button>
                )}
              </div>

              {screenshot && (
                <div className="mt-8">
                  <img
                    src={`data:image/png;base64,${screenshot}`}
                    alt="Agent Screenshot"
                    className="w-full rounded-lg shadow-lg"
                  />
                </div>
              )}

              {isLoading && (
                <div className="mt-8 w-full">
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">Progress</h3>
                      <p className="text-gray-600">Step {agentProgress.step}</p>
                      <p className="text-gray-600">
                        {agentProgress.taskProgress}
                      </p>
                    </div>

                    {agentProgress.memory && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2">Memory</h3>
                        <p className="text-gray-600">{agentProgress.memory}</p>
                      </div>
                    )}

                    {agentProgress.futurePlans && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Next Steps
                        </h3>
                        <p className="text-gray-600">
                          {agentProgress.futurePlans}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="text-center text-gray-500 text-xs p-4 border-t border-gray-200">
          Shoperator v1.0 | All rights reserved by{" "}
          <a
            href="https://www.trynarrative.com"
            target="_blank"
            className="text-gray-800"
          >
            Narrative AI
          </a>{" "}
          | @copyright 2025
        </footer>
      </div>
    </div>
  );
}

const styles = `
  @keyframes slideDown {
    from {
      transform: translate(-50%, -100%);
      opacity: 0;
    }
    to {
      transform: translate(-50%, 0);
      opacity: 1;
    }
  }
`;

if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
