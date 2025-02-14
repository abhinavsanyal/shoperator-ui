import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { runAgent } from "../api";
import { useAgentSettings } from "../contexts/AgentSettingsContext";
import AgentSettings from "../components/AgentSettings";

const MODEL_OPTIONS = ["gpt-4o-mini", "gpt-4o", "o3-mini"];

export default function NewSessionPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [task, setTask] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{
    message: string;
    detail: string;
  } | null>(null);
  const { settings: globalSettings } = useAgentSettings();
  const [sessionSettings, setSessionSettings] = useState(globalSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleStartTask = async () => {
    if (!task.trim() || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await runAgent(task, user.id, sessionSettings);
      // Store clientId, dynamicFilters, and task for use in SessionPage
      localStorage.setItem("lastClientId", response.client_id);
      localStorage.setItem(
        "dynamicFilters",
        JSON.stringify(response.dynamic_filters)
      );
      localStorage.setItem("lastTask", task);
      // Navigate to the session page with the run_id
      navigate(`/session/${response.run_id}`);
    } catch (error: any) {
      console.error("Error:", error);
      setIsLoading(false);

      if (error.type === "VALIDATION_ERROR") {
        setError({
          message: error.error || "An error occurred",
          detail: error.detail || "Please try again",
        });
      } else {
        setError({
          message: "An unexpected error occurred",
          detail: "Please try again later",
        });
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full items-center justify-center p-8">
      {error && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-[slideDown_0.3s_ease-out]">
          <div className="bg-white border border-red-200 rounded-lg shadow-lg p-4 max-w-md mx-auto">
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

      <div className="w-full max-w-2xl relative px-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
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
              Go to Flipkart and find me the cheapest laptop from Dell under INR
              35000
            </p>
          </div>

          <div
            onClick={() =>
              setTask(
                "Compare black medium-sized formal shirts for men across Amazon, Flipkart, and Ajio. Find the best rated ones under INR 1500"
              )
            }
            className="cursor-pointer group p-4 bg-white rounded-xl border border-gray-100
              shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)]
              transition-all duration-300"
          >
            <h3 className="font-bold text-gray-800 mb-2 text-lg group-hover:text-blue-600 transition-colors">
              Compare Formal Shirts
            </h3>
            <p className="text-sm text-gray-600">
              Compare black medium-sized formal shirts for men across Amazon,
              Flipkart, and Ajio
            </p>
          </div>

          <div
            onClick={() =>
              setTask(
                "Find the best-selling wireless earbuds on Amazon India under INR 2000 with at least 4-star rating"
              )
            }
            className="cursor-pointer group p-4 bg-white rounded-xl border border-gray-100
              shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)]
              transition-all duration-300"
          >
            <h3 className="font-bold text-gray-800 mb-2 text-lg group-hover:text-blue-600 transition-colors">
              Best Budget Earbuds
            </h3>
            <p className="text-sm text-gray-600">
              Find the best-selling wireless earbuds on Amazon India under INR
              2000
            </p>
          </div>
        </div>

        <div className="relative">
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
              value={sessionSettings.llm_model_name}
              onChange={(e) =>
                setSessionSettings((prev) => ({
                  ...prev,
                  llm_model_name: e.target.value,
                }))
              }
              className="px-3 py-1.5 text-xs rounded-md border border-gray-200 bg-white text-gray-700 
                hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-200
                shadow-sm backdrop-blur-sm"
            >
              {MODEL_OPTIONS.map((model) => (
                <option
                  key={model}
                  value={model}
                  disabled={model === "o3-mini"}
                >
                  {model}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md
                        transition-colors duration-150"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
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
            {isLoading ? "Starting Agent..." : "Run Shoperator Agent"}
          </button>
        </div>
      </div>

      <AgentSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={sessionSettings}
        onSave={setSessionSettings}
      />
    </div>
  );
}
