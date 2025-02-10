import { UserButton, useUser } from "@clerk/clerk-react";
import { useState, useRef, useEffect } from "react";
import { runAgent, getAgentStatus } from "../api";

export default function DashboardPage() {
  const { user } = useUser();
  const [task, setTask] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  // Add WebSocket ref and additional states
  const wsRef = useRef<WebSocket | null>(null);
  const [agentProgress, setAgentProgress] = useState({
    memory: "",
    taskProgress: "",
    futurePlans: "",
    step: 0,
  });

  // Replace the polling-related code with WebSocket handling
  const setupWebSocket = (clientId: string) => {
    const ws = new WebSocket(`ws://localhost:3030/ws/${clientId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);

      if (data.type === "agent_update") {
        setAgentProgress({
          memory: data.memory,
          taskProgress: data.task_progress,
          futurePlans: data.future_plans,
          step: data.step,
        });

        // Still update screenshot through the status endpoint since
        // it's not included in WebSocket updates
        getAgentStatus().then((status) => {
          if (status.screenshot) {
            setScreenshot(status.screenshot);
          }

          if (!status.is_running || status.task_progress === "Completed") {
            cleanupWebSocket();
            setIsLoading(false);
          }
        });
      } else if (data.type === "error") {
        console.error("Agent error:", data.message);
        cleanupWebSocket();
        setIsLoading(false);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      cleanupWebSocket();
      setIsLoading(false);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      wsRef.current = null;
    };

    wsRef.current = ws;
  };

  // Cleanup function for WebSocket
  const cleanupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Update handleStartTask to use WebSocket
  const handleStartTask = async () => {
    if (!task.trim()) return;

    setIsLoading(true);
    try {
      const response = await runAgent(task);
      if (response.client_id) {
        setupWebSocket(response.client_id);
      }
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
    }
  };

  // Update cleanup effect
  useEffect(() => {
    return () => cleanupWebSocket();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Container */}
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between">
          <div>
            <div className="p-4 text-xl font-semibold text-gray-800">
              Shoperator v1.0
            </div>
            <button className="bg-gray-900 text-white px-4 py-2 rounded-lg mx-4 mt-4 flex items-center hover:bg-gray-800 transition-colors">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Session
            </button>
            <div className="text-gray-500 text-sm px-4 mt-6">
              Recent Sessions
            </div>
          </div>

          <div className="mb-4">
            <button className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-50 w-full">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
              Settings
            </button>
            <div className="flex items-center px-4 py-2 w-full">
              <UserButton afterSignOutUrl="/" />
              <span className="ml-2 text-gray-600 truncate">
                {user?.primaryEmailAddress?.emailAddress &&
                user.primaryEmailAddress.emailAddress.length > 20
                  ? `${user.primaryEmailAddress.emailAddress.substring(
                      0,
                      17
                    )}...`
                  : user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-2xl">
              <textarea
                className="w-full h-40 p-4 mb-4 rounded-lg border border-gray-200 
                shadow-[0_0_10px_rgba(0,0,0,0.1)] 
                focus:outline-none focus:ring-2 focus:ring-gray-200
                resize-none bg-white"
                placeholder="Enter your task description..."
                value={task}
                onChange={(e) => setTask(e.target.value)}
              />
              <button
                className={`w-full px-6 py-3 rounded-lg 
                shadow-[0_2px_4px_rgba(0,0,0,0.1)]
                transition-colors
                ${
                  !task.trim() || isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gray-900 hover:bg-gray-800"
                }
                text-white`}
                onClick={handleStartTask}
                disabled={!task.trim() || isLoading}
              >
                {isLoading ? "Processing..." : "Start Task"}
              </button>

              {/* Add screenshot display */}
              {screenshot && (
                <div className="mt-8">
                  <img
                    src={`data:image/png;base64,${screenshot}`}
                    alt="Agent Screenshot"
                    className="w-full rounded-lg shadow-lg"
                  />
                </div>
              )}

              {/* Add this inside the main content area, after the screenshot display */}
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

          {/* Footer */}
          <footer className="text-center text-gray-500 text-sm p-4 border-t border-gray-200">
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
    </div>
  );
}
