import axios from "axios";
import { DynamicFilters } from "./types";

const API_BASE_URL = "http://127.0.0.1:3030";

interface AgentConfig {
  agent_type?: string;
  llm_provider?: string;
  llm_model_name?: string;
  llm_temperature?: number;
  llm_base_url?: string;
  llm_api_key?: string;
  use_own_browser?: boolean;
  keep_browser_open?: boolean;
  headless?: boolean;
  disable_security?: boolean;
  window_w?: number;
  window_h?: number;
  save_recording_path?: string | null;
  save_agent_history_path?: string | null;
  save_trace_path?: string | null;
  enable_recording?: boolean;
  task: string;
  add_infos?: string | null;
  max_steps?: number;
  use_vision?: boolean;
  max_actions_per_step?: number;
  tool_calling_method?: string;
}

interface AgentStatus {
  is_running: boolean;
  current_step: number;
  max_steps: number;
  screenshot: string | null;
  memory: string;
  task_progress: string;
  future_plans: string;
  last_update: string | null;
  task: string | null;
  errors: string | null;
}

interface AgentHistory {
  history: Array<{
    prefix: string;
    content: string;
    timestamp: string;
  }>;
  is_running: boolean;
  current_step: number;
  max_steps: number;
}

interface AgentRunResponse {
  message: string;
  client_id: string;
  run_id: string;
  status: string;
  task: string;
  dynamic_filters: DynamicFilters;
}

interface AgentIdResponse {
  agent_id: string;
  status: string;
}

interface AgentErrorResponse {
  error: string;
  detail: string;
}

interface AgentRun {
  _id: string;
  clerk_id: string;
  task: string;
  start_time: string;
  end_time?: string;
  status: string;
  // Add other fields as needed
}

interface AgentRunsResponse {
  agent_runs: AgentRun[];
  total: number;
}

interface AgentRunDetails {
  _id: string;
  clerk_id: string;
  task: string;
  start_time: string;
  end_time?: string;
  status: string;
  // Add other fields as needed
}

export const runAgent = async (
  task: string,
  clerkId: string
): Promise<AgentRunResponse> => {
  const config: AgentConfig = {
    task,
    agent_type: "custom",
    llm_provider: "openai",
    llm_model_name: "gpt-4o-mini",
    llm_temperature: 0.2,
    use_vision: true,
    max_steps: 2,
    max_actions_per_step: 3,
    headless: true,
    tool_calling_method: "function_call",
  };

  try {
    const response = await axios.post<AgentRunResponse>(
      `${API_BASE_URL}/agent/run`,
      {
        ...config,
        clerk_id: clerkId,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      // Extract the error details from the response
      const errorData = error.response.data as AgentErrorResponse;
      throw {
        type: "VALIDATION_ERROR",
        error: errorData.error,
        detail: errorData.detail,
      };
    }
    console.error("Error running agent:", error);
    throw error;
  }
};

export const stopAgent = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/agent/stop`);
    return response.data;
  } catch (error) {
    console.error("Error stopping agent:", error);
    throw error;
  }
};

export const getAgentStatus = async (): Promise<AgentStatus> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/agent/status`);
    return response.data;
  } catch (error) {
    console.error("Error getting agent status:", error);
    throw error;
  }
};

export const getAgentHistory = async (
  agent_id: string
): Promise<AgentHistory> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/agent/history/${agent_id}`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting agent history:", error);
    throw error;
  }
};

export const getAgentId = async (
  clientId: string
): Promise<AgentIdResponse> => {
  try {
    const response = await axios.get<AgentIdResponse>(
      `${API_BASE_URL}/agent/id/${clientId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting agent ID:", error);
    throw error;
  }
};

export const getAgentRuns = async (
  clerkId: string
): Promise<AgentRunsResponse> => {
  try {
    const response = await axios.get<AgentRunsResponse>(
      `${API_BASE_URL}/agent-runs/get/${clerkId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting agent runs:", error);
    throw error;
  }
};

export const getAgentRun = async (
  agentRunId: string
): Promise<AgentRunDetails> => {
  try {
    const response = await axios.get<AgentRunDetails>(
      `${API_BASE_URL}/agent-run/get/${agentRunId}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error(`Agent run with ID ${agentRunId} not found`);
    }
    console.error("Error fetching agent run:", error);
    throw error;
  }
};
