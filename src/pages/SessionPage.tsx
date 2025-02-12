import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { stopAgent, getAgentRun } from "../api";
import {
  TimelineItem,
  AgentLog,
  AgentAction,
  AgentUpdate,
  WebSocketMessage,
  DynamicFilters,
} from "../types";

export default function SessionPage() {
  const { runId } = useParams<{ runId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isStoppingTask, setIsStoppingTask] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Track agent progress state
  const [agentProgress, setAgentProgress] = useState({
    memory: "",
    taskProgress: "",
    futurePlans: "",
    step: 0,
  });

  const [dynamicFilters, setDynamicFilters] = useState<DynamicFilters>({});
  const [modifiedPrompt, setModifiedPrompt] = useState<string>("");
  const [activeTaskPrompt, setActiveTaskPrompt] = useState<string | null>(null);

  // Add task state to store the original task
  const [task, setTask] = useState<string>("");

  // Add new state for tracking collapsed steps
  const [collapsedSteps, setCollapsedSteps] = useState<Record<string, boolean>>(
    {}
  );

  const setupWebSocket = (clientId: string) => {
    const ws = new WebSocket(`ws://localhost:3030/ws/${clientId}`);

    ws.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
      console.log("WebSocket message received:", {
        type: data.type,
        data: data.data,
        timestamp: data.timestamp,
      });
      handleWebSocketMessage(data);
    };

    ws.onopen = () => {
      console.log("WebSocket connection established");
      setIsLoading(false);
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

  useEffect(() => {
    // Get clientId from localStorage or state management
    const clientId = localStorage.getItem("lastClientId");
    if (clientId) {
      setupWebSocket(clientId);
    }

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

  useEffect(() => {
    const filtersStr = localStorage.getItem("dynamicFilters");
    const taskStr = localStorage.getItem("lastTask"); // We'll store this in NewSessionPage

    if (filtersStr) {
      try {
        const filters = JSON.parse(filtersStr);
        setDynamicFilters(filters);
      } catch (error) {
        console.error("Error parsing dynamic filters:", error);
      }
    }

    if (taskStr) {
      setTask(taskStr);
    }
  }, []);

  // Add useEffect to auto-collapse previous steps when new ones appear
  useEffect(() => {
    const steps = Object.keys(
      timeline.reduce((acc, item) => {
        const step = item.step || 0;
        acc[step] = true;
        return acc;
      }, {} as Record<number, boolean>)
    );

    if (steps.length > 1) {
      const lastStep = Math.max(...steps.map(Number));
      setCollapsedSteps(
        steps.reduce(
          (acc, step) => ({
            ...acc,
            [step]: Number(step) !== lastStep, // Collapse all except the last step
          }),
          {}
        )
      );
    }
  }, [timeline]);

  // Add new useEffect to fetch agent run data when component mounts
  useEffect(() => {
    const fetchAgentRun = async () => {
      if (!runId) return;

      try {
        const agentRun = await getAgentRun(runId);
        console.log("Agent run data:", agentRun);

        // Set the task from the agent run data
        setTask(agentRun.task);

        // Handle history GIF URL if available and not empty
        if (
          agentRun.history_gif_url &&
          agentRun.history_gif_url.trim() !== ""
        ) {
          setScreenshot(agentRun.history_gif_url);
        }

        // Process agent history if available
        if (
          agentRun.agent_history?.history &&
          agentRun.agent_history.history.length > 0
        ) {
          // Transform agent history to timeline items
          const timelineItems: TimelineItem[] =
            agentRun.agent_history.history.flatMap((historyItem, index) => {
              const items: TimelineItem[] = [];
              const timestamp = new Date().toISOString(); // You may want to use a timestamp from the data if available

              // Add log item for model output if available
              if (historyItem.model_output?.current_state) {
                const state = historyItem.model_output.current_state;

                // Add thought/summary log
                items.push({
                  type: "log",
                  step: index,
                  timestamp,
                  data: {
                    prefix: "Summary",
                    content: state.summary || state.thought,
                    timestamp,
                    step: index,
                  },
                });

                // Add progress update
                items.push({
                  type: "update",
                  step: index,
                  timestamp,
                  data: {
                    memory: state.important_contents || "",
                    task_progress: state.task_progress || "",
                    future_plans: state.future_plans || "",
                    step: index,
                    timestamp,
                  },
                });
              }

              // Add action items if available
              if (historyItem.model_output?.action) {
                historyItem.model_output.action.forEach(
                  (action, actionIndex) => {
                    items.push({
                      type: "action",
                      step: index,
                      timestamp,
                      data: {
                        action: JSON.stringify(action),
                        action_number: actionIndex + 1,
                        total_actions:
                          historyItem.model_output?.action.length || 1,
                        timestamp,
                        step: index,
                      },
                    });
                  }
                );
              }

              // Add result logs if available
              if (historyItem.result) {
                historyItem.result.forEach((result) => {
                  if (result.extracted_content) {
                    items.push({
                      type: "log",
                      step: index,
                      timestamp,
                      data: {
                        prefix: "Result",
                        content: result.extracted_content,
                        timestamp,
                        step: index,
                      },
                    });
                  }
                });
              }

              return items;
            });

          setTimeline(timelineItems);
        }
      } catch (error) {
        console.error("Error fetching agent run:", error);
        // You might want to show an error message to the user here
      }
    };

    fetchAgentRun();
  }, [runId]);

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

          // Update agent progress
          setAgentProgress({
            memory: data.data.memory || "",
            taskProgress: data.data.task_progress || "",
            futurePlans: data.data.future_plans || "",
            step: data.data.step || 0,
          });
        }
        break;

      case "agent_status":
        if (data.data?.status === "completed") {
          setIsLoading(false);
        }
        break;

      default:
        console.log("Unhandled message type:", data.type);
    }
  };

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
      case "log":
        const logData = item.data as AgentLog;
        return (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-20 text-xs font-medium text-gray-500">
              {logData.prefix}
            </div>
            <div className="flex-1 text-sm text-gray-700">
              {logData.content}
            </div>
          </div>
        );

      case "action":
        return (
          <div className="flex items-center gap-2">
            {formatActionContent((item.data as AgentAction).action)}
          </div>
        );

      case "update":
        const updateData = item.data as AgentUpdate;
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Memory
                </div>
                <div className="text-sm text-gray-700">{updateData.memory}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Progress
                </div>
                <div className="text-sm text-gray-700">
                  {updateData.task_progress}
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">
                Next Steps
              </div>
              <div className="text-sm text-gray-700">
                {updateData.future_plans}
              </div>
            </div>
          </div>
        );

      default:
        return null;
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
      const isCollapsed = collapsedSteps[step];

      return (
        <div key={step} className="relative pl-8 pb-8 last:pb-0">
          {/* Timeline connector line */}
          <div className="absolute left-[15px] top-8 bottom-0 w-[2px] bg-gray-200 last:hidden" />

          {/* Step indicator and header */}
          <div
            className="relative flex items-start mb-3 group cursor-pointer"
            onClick={() => {
              setCollapsedSteps((prev) => ({
                ...prev,
                [step]: !isCollapsed,
              }));
            }}
          >
            <div className="absolute left-[-30px] flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-gray-800 to-gray-700 text-white text-sm font-semibold shadow-md">
              {step}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                    isCollapsed ? "-rotate-90" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                <div className="font-medium text-gray-700">Step {step}</div>
              </div>
              {summaryContent && (
                <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                  <div className="text-sm font-medium text-gray-800">
                    {summaryContent}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline items with collapse animation */}
          <div
            className={`space-y-2 overflow-hidden transition-all duration-300 ease-in-out ${
              isCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
            }`}
          >
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
                <div
                  key={index}
                  className={`bg-white rounded-lg border border-gray-100 p-3 shadow-sm
                           hover:shadow-md transition-all duration-200
                           ${isCollapsed ? "scale-95" : "scale-100"}`}
                >
                  {renderTimelineItem(item)}
                </div>
              ))}
          </div>
        </div>
      );
    });
  };

  const PromptCard = () => {
    if (!Object.keys(dynamicFilters).length) return null;

    const renderInteractiveText = () => {
      let taskText = task;
      const filterWords = Object.keys(dynamicFilters);

      // Sort by length in descending order to handle longer phrases first
      filterWords.sort((a, b) => b.length - a.length);

      // Create segments with interactive spans
      const segments: JSX.Element[] = [];
      let lastIndex = 0;

      filterWords.forEach((word) => {
        const wordIndex = taskText.toLowerCase().indexOf(word.toLowerCase());
        if (wordIndex !== -1) {
          // Add text before the word
          if (wordIndex > lastIndex) {
            segments.push(
              <span key={`text-${lastIndex}`}>
                {taskText.slice(lastIndex, wordIndex)}
              </span>
            );
          }

          // Add the interactive word
          const actualWord = taskText.slice(wordIndex, wordIndex + word.length);
          segments.push(
            <div key={`filter-${word}`} className="relative inline-block group">
              <span
                className="cursor-pointer px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100
                           hover:bg-blue-100 transition-colors duration-150"
              >
                {actualWord}
              </span>
              {/* Dropdown */}
              <div
                className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 
                            opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50"
              >
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 mb-1 px-2">
                    Replace with:
                  </div>
                  {dynamicFilters[word].map((option) => (
                    <button
                      key={option}
                      className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50 rounded-md
                               hover:text-blue-700 transition-colors duration-150"
                      onClick={() => {
                        const newPrompt = task.replace(
                          new RegExp(word, "i"),
                          option
                        );
                        setModifiedPrompt(newPrompt);
                        setActiveTaskPrompt(newPrompt);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );

          lastIndex = wordIndex + word.length;
        }
      });

      // Add remaining text
      if (lastIndex < taskText.length) {
        segments.push(
          <span key={`text-${lastIndex}`}>{taskText.slice(lastIndex)}</span>
        );
      }

      return segments;
    };

    return (
      <div className="absolute bottom-[4.5rem] left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="p-4">
          {activeTaskPrompt && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="text-sm text-blue-700">{activeTaskPrompt}</div>
            </div>
          )}

          <div className="text-sm leading-relaxed">
            <div className="font-medium flex items-center text-gray-700 mb-2 italic">
              <button className="ml-2 text-black bg-gray-200 mr-1 rounded-full w-5 h-5 flex items-center justify-center">
                i
              </button>
              Hover over highlighted words to modify:
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-100">
              {renderInteractiveText()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-1/3 relative flex flex-col h-full border-r border-gray-200 bg-white">
        <div
          ref={timelineContainerRef}
          className="flex-1 overflow-y-auto px-6 py-8  mb-60 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading session data...</div>
            </div>
          ) : (
            renderGroupedTimeline()
          )}
        </div>

        <PromptCard />

        <div className="p-4 border-t border-gray-200 bg-white relative z-20">
          <button
            className="w-full px-5 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm
              transition-colors duration-200 shadow-sm hover:shadow-md"
            onClick={async () => {
              setIsStoppingTask(true);
              try {
                await stopAgent();
                setIsLoading(false);
                cleanupWebSocket();
              } catch (error) {
                console.error("Error stopping task:", error);
              } finally {
                setIsStoppingTask(false);
              }
            }}
            disabled={isStoppingTask}
          >
            {isStoppingTask ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                <span>Stopping Agent...</span>
              </div>
            ) : (
              "Stop Agent"
            )}
          </button>
        </div>
      </div>

      <div className="w-2/3 h-full overflow-y-auto p-6 bg-gray-50">
        {screenshot && (
          <img
            src={
              screenshot.startsWith("http")
                ? screenshot
                : `data:image/png;base64,${screenshot}`
            }
            alt="Browser Screenshot"
            className="w-full rounded-lg shadow-sm border border-gray-200"
          />
        )}
      </div>
    </div>
  );
}
