/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
import { useState, useRef, useEffect, JSX } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { stopAgent, getAgentRun, runAgent } from "../api";
import {
  TimelineItem,
  AgentLog,
  AgentAction,
  AgentUpdate,
  WebSocketMessage,
  DynamicFilters,
} from "../types";
import { useUser } from "@clerk/clerk-react";

// Add proper type for getAgentRun response
type AgentRunResponse = {
  status?: string;
  task: string;
  history_gif_url?: string;
  recording_url?: string;
  generated_ui?: string;
  agent_history?: {
    history: Array<{
      model_output: {
        current_state: {
          summary?: string;
          thought?: string;
          important_contents?: string;
          task_progress?: string;
          future_plans?: string;
        };
        action: any[];
      };
      result: Array<{
        extracted_content: string;
      }>;
    }>;
  };
};

export default function SessionPage() {
  const { runId } = useParams<{ runId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isStoppingTask, setIsStoppingTask] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const [dynamicFilters, setDynamicFilters] = useState<DynamicFilters>({});
  const [activeTaskPrompt, setActiveTaskPrompt] = useState<string | null>(null);

  // Add task state to store the original task
  const [task, setTask] = useState<string>("");

  // Add new state for tracking collapsed steps
  const [collapsedSteps, setCollapsedSteps] = useState<Record<string, boolean>>(
    {}
  );

  // Add new state for active tab
  const [activeTab, setActiveTab] = useState<"screenshot" | "recording">(
    "screenshot"
  );
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const [generatedUi, setGeneratedUi] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Add new state for agent status
  const [agentStatus, setAgentStatus] = useState<string>("");

  const { user } = useUser();

  const navigate = useNavigate();

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
        const agentRun: AgentRunResponse = await getAgentRun(runId);
        console.log("Agent run data:", agentRun);

        // Set the agent status
        if (agentRun.status) {
          setAgentStatus(agentRun.status);
        }

        // Set the task from the agent run data
        setTask(agentRun.task);

        // Handle history GIF URL if available and not empty
        if (
          agentRun.history_gif_url &&
          agentRun.history_gif_url.trim() !== ""
        ) {
          setScreenshot(agentRun.history_gif_url);
        }

        // Handle recording URL if available
        if (agentRun.recording_url && agentRun.recording_url.trim() !== "") {
          setRecordingUrl(agentRun.recording_url);
        }

        // Handle generated UI if available
        if (agentRun.generated_ui && agentRun.generated_ui.trim() !== "") {
          setGeneratedUi(agentRun.generated_ui);
          console.log("generatedUi:L  mount :::", agentRun.generated_ui);
        }

        // Process agent history if available
        if (
          agentRun.agent_history?.history &&
          agentRun.agent_history.history.length > 0
        ) {
          // Transform agent history to timeline items
          const timelineItems: TimelineItem[] =
            agentRun.agent_history.history.flatMap(
              (
                historyItem: {
                  model_output: { current_state: any; action: any[] };
                  result: any[];
                },
                index: any
              ) => {
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
                    (action: any, actionIndex: number) => {
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
                  historyItem.result.forEach(
                    (result: { extracted_content: never }) => {
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
                    }
                  );
                }

                return items;
              }
            );

          setTimeline(timelineItems);
        }
      } catch (error) {
        console.error("Error fetching agent run:", error);
        // You might want to show an error message to the user here
      }
    };

    fetchAgentRun();
  }, [runId]);

  const handleAgentFinished = async () => {
    if (!runId) return;

    try {
      const agentRun: AgentRunResponse = await getAgentRun(runId);
      console.log("Final agent run data:", agentRun);

      // Update screenshot/GIF if available
      if (agentRun.history_gif_url && agentRun.history_gif_url.trim() !== "") {
        setScreenshot(agentRun.history_gif_url);
      }

      // Update recording URL if available
      if (agentRun.recording_url && agentRun.recording_url.trim() !== "") {
        setRecordingUrl(agentRun.recording_url);
      }

      // Handle generated UI if available
      if (agentRun.generated_ui && agentRun.generated_ui.trim() !== "") {
        setGeneratedUi(agentRun.generated_ui);
      }

      // Process final agent history
      if (
        agentRun.agent_history?.history &&
        agentRun.agent_history.history.length > 0
      ) {
        const timelineItems: TimelineItem[] =
          agentRun.agent_history.history.flatMap(
            (
              historyItem: {
                model_output: { current_state: any; action: any[] };
                result: any[];
              },
              index: any
            ) => {
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
                  (action: any, actionIndex: number) => {
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
                historyItem.result.forEach(
                  (result: { extracted_content: never }) => {
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
                  }
                );
              }

              return items;
            }
          );

        setTimeline(timelineItems);
      }
    } catch (error) {
      console.error("Error fetching final agent run state:", error);
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
        if (data.data?.status) {
          setAgentStatus(data.data.status);
        }
        if (
          data.data?.status === "completed" ||
          data.data?.status === "failed"
        ) {
          setIsLoading(false);
          setIsStoppingTask(false);
          setLoadingResults(true);
          console.log("Agent run completed with status:", data.data?.status);
        }
        break;

      case "agent_finished":
        setIsLoading(false);
        setLoadingResults(false);
        console.log("Agent run finished");
        handleAgentFinished();
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
    if (timeline.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin mb-4"></div>
          <div className="text-gray-600 font-medium">Loading Session</div>
        </div>
      );
    }

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
      const taskText = task;
      const filterWords = Object.keys(dynamicFilters);

      // Create an array of all matches with their positions
      const matches = filterWords.reduce(
        (acc: { word: string; start: number; end: number }[], word) => {
          let pos = 0;
          const wordLower = word.toLowerCase();
          const textLower = taskText.toLowerCase();

          while ((pos = textLower.indexOf(wordLower, pos)) !== -1) {
            acc.push({
              word,
              start: pos,
              end: pos + word.length,
            });
            pos += 1;
          }
          return acc;
        },
        []
      );

      // Sort matches by position and length (longer matches first for same position)
      matches.sort((a, b) => {
        if (a.start === b.start) {
          return b.end - b.end; // Longer match first
        }
        return a.start - b.start;
      });

      // Filter out overlapping matches
      const filteredMatches = matches.reduce((acc: typeof matches, match) => {
        const hasOverlap = acc.some(
          (m) =>
            (match.start >= m.start && match.start < m.end) ||
            (match.end > m.start && match.end <= m.end)
        );
        if (!hasOverlap) {
          acc.push(match);
        }
        return acc;
      }, []);

      // Sort by position
      filteredMatches.sort((a, b) => a.start - b.start);

      // Build segments
      const segments: JSX.Element[] = [];
      let lastIndex = 0;

      filteredMatches.forEach((match) => {
        // Add text before the match
        if (match.start > lastIndex) {
          segments.push(
            <span key={`text-${lastIndex}`}>
              {taskText.slice(lastIndex, match.start)}
            </span>
          );
        }

        // Add the interactive word
        const actualWord = taskText.slice(match.start, match.end);
        segments.push(
          <div
            key={`filter-${match.start}`}
            className="relative inline-block group"
          >
            <span
              className="cursor-pointer px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100
                         hover:bg-blue-100 transition-colors duration-150"
            >
              {actualWord}
            </span>
            <div
              className="absolute left-0 bottom-full mb-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 
                        opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50"
            >
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 mb-1 px-2">
                  Replace with:
                </div>
                {dynamicFilters[match.word].map((option) => (
                  <button
                    key={option}
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50 rounded-md
                             hover:text-blue-700 transition-colors duration-150"
                    onClick={() => {
                      const newPrompt = task.replace(
                        new RegExp(match.word, "i"),
                        option
                      );
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

        lastIndex = match.end;
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
              <button
                className="mt-2 w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 
                           text-white text-sm font-medium rounded-md transition-colors 
                           duration-150 flex items-center justify-center"
                onClick={async () => {
                  if (!activeTaskPrompt || !user) return;

                  // First stop the current agent
                  setIsStoppingTask(true);
                  try {
                    await stopAgent();
                    setIsLoading(false);
                    cleanupWebSocket();

                    // Then start new task with modified prompt
                    const response = await runAgent(activeTaskPrompt, user.id);

                    // Store new session data
                    localStorage.setItem("lastClientId", response.client_id);
                    localStorage.setItem(
                      "dynamicFilters",
                      JSON.stringify(response.dynamic_filters)
                    );
                    localStorage.setItem("lastTask", activeTaskPrompt);
                    console.log(
                      "about to navigate to new session",
                      response.run_id
                    );
                    // Navigate to new session
                    navigate(`/session/${response.run_id}`);
                  } catch (error: any) {
                    console.error("Error:", error);
                  } finally {
                    setIsStoppingTask(false);
                  }
                }}
              >
                Run new task
              </button>
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
            className={`w-full px-5 py-2.5 rounded-lg text-sm
              transition-colors duration-200 shadow-sm hover:shadow-md
              ${
                agentStatus === "completed"
                  ? "bg-green-50 text-green-600 hover:bg-green-100 cursor-not-allowed"
                  : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
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
            disabled={isStoppingTask || agentStatus === "completed"}
          >
            {agentStatus === "completed" ? (
              "Agent has completed the task"
            ) : isStoppingTask ? (
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
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            {/* Browser Chrome UI */}
            <div className="bg-gray-100 border-b border-gray-200">
              {/* Window Controls */}
              <div className="flex items-center px-4 py-2">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>

                {/* Browser Tabs */}
                <div className="flex ml-6 space-x-2">
                  <button
                    onClick={() => setActiveTab("screenshot")}
                    className={`px-4 py-1 text-sm rounded-t-lg transition-colors flex items-center gap-2
                      ${
                        activeTab === "screenshot"
                          ? "bg-white text-gray-800"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                  >
                    {screenshot?.startsWith("http") ? (
                      "Stepwise Summary"
                    ) : (
                      <>
                        Live Session
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      </>
                    )}
                  </button>

                  {recordingUrl && (
                    <button
                      onClick={() => setActiveTab("recording")}
                      className={`px-4 py-1 text-sm rounded-t-lg transition-colors
                        ${
                          activeTab === "recording"
                            ? "bg-white text-gray-800"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                    >
                      Recording
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-white p-4">
              {activeTab === "screenshot" && screenshot && (
                <img
                  src={
                    screenshot.startsWith("http")
                      ? screenshot
                      : `data:image/png;base64,${screenshot}`
                  }
                  alt="Browser Screenshot"
                  className="w-full rounded-lg"
                />
              )}

              {activeTab === "recording" && recordingUrl && (
                <video
                  controls
                  className="w-full rounded-lg"
                  src={recordingUrl}
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          </div>
          {/* Results */}
          {(loadingResults || generatedUi) && (
            <div className="mt-40 border-t border-gray-200 pt-6">
              {loadingResults ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin mb-4"></div>
                  <div className="text-gray-600 font-medium">
                    Loading Results...
                  </div>
                </div>
              ) : generatedUi ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: generatedUi }}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
