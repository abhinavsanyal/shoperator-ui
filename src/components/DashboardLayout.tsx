import { UserButton, useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { getAgentRuns } from "../api";
import { AgentRunsResponse } from "../types";
import { useAgentSettings } from "../contexts/AgentSettingsContext";
import AgentSettings from "./AgentSettings";

export default function DashboardLayout() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAllRuns, setShowAllRuns] = useState(false);
  const [agentRuns, setAgentRuns] = useState<AgentRunsResponse | null>(null);
  const MAX_VISIBLE_RUNS = 3;
  const { settings, updateSettings } = useAgentSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const fetchAgentRuns = async () => {
      if (!user) return;
      try {
        const runs = await getAgentRuns(user.id);
        setAgentRuns(runs);
      } catch (error) {
        console.error("Error fetching agent runs:", error);
      }
    };

    fetchAgentRuns();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      running: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      default: "bg-gray-100 text-gray-800",
    };
    return colors[status as keyof typeof colors] || colors.default;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>
        </div>
      </nav>

      <div className="flex-1 pt-14 px-6 flex">
        <div
          className={`
            fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-white border-r border-gray-200
            transition-all duration-300 ease-in-out z-20
            ${isSidebarOpen ? "w-80" : "w-12"}
          `}
        >
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-1 border border-gray-200 shadow-sm"
          >
            <svg
              className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${
                isSidebarOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* New Shopping Session Button */}
          <div className={`p-4 ${isSidebarOpen ? "" : "hidden"}`}>
            <button
              onClick={() => navigate("/dashboard/new-session")}
              className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 
                       transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
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
              New Shopping Session
            </button>
          </div>

          {/* Collapsed state plus button */}
          {!isSidebarOpen && (
            <button
              onClick={() => navigate("/dashboard/new-session")}
              className="w-8 h-8 mx-auto mt-4 bg-gray-900 text-white rounded-full hover:bg-gray-800 
                       transition-colors duration-200 flex items-center justify-center"
            >
              <svg
                className="w-5 h-5"
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
            </button>
          )}

          {/* Past Sessions List */}
          {isSidebarOpen && (
            <div className="p-4 overflow-y-auto h-[calc(100%-4rem)]">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Past Sessions
              </h2>
              {!agentRuns?.agent_runs?.length ? (
                <div className="text-center text-gray-500 mt-8">
                  No previous sessions found
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {(showAllRuns
                      ? agentRuns.agent_runs
                      : agentRuns.agent_runs.slice(0, MAX_VISIBLE_RUNS)
                    ).map((run) => {
                      console.log("Agent Run:", run);
                      return (
                        <div
                          key={run._id}
                          onClick={() =>
                            navigate(`/dashboard/session/${run._id}`)
                          }
                          className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm 
                                   hover:shadow-md transition-shadow duration-200 cursor-pointer"
                        >
                          {run.history_gif_url && (
                            <div className="relative h-24 mb-2 rounded-md overflow-hidden bg-gray-100">
                              <img
                                src={run.history_gif_url}
                                alt="Session Recording"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-800 line-clamp-2">
                              {run.task}
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {formatDate(run.start_time)}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                                  run.status
                                )}`}
                              >
                                {run.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {agentRuns.agent_runs.length > MAX_VISIBLE_RUNS && (
                    <button
                      onClick={() => setShowAllRuns(!showAllRuns)}
                      className="mt-4 w-full py-2 text-sm text-blue-600 hover:text-blue-700 
                               flex items-center justify-center gap-1"
                    >
                      {showAllRuns ? (
                        <>
                          Show Less
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
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </>
                      ) : (
                        <>
                          Show More
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
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Global Settings Button */}
          {isSidebarOpen && (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-full py-2 px-4 text-gray-700 hover:bg-gray-50 rounded-lg
                         transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
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
                Global Settings
              </button>
            </div>
          )}
        </div>

        <div
          className={`transition-all duration-300 ${
            isSidebarOpen ? "ml-80" : "ml-12"
          } flex-1`}
        >
          <Outlet />
        </div>
      </div>

      {/* Settings Modal */}
      <AgentSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={updateSettings}
        isGlobal={true}
      />
    </div>
  );
}
