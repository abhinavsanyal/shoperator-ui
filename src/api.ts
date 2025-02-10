import axios from "axios";

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

export const runAgent = async (task: string) => {
  const config: AgentConfig = {
    task,
    agent_type: "custom",
    llm_provider: "openai",
    llm_model_name: "gpt-4o-mini",
    llm_temperature: 0.2,
    use_vision: true,
    max_steps: 20,
    max_actions_per_step: 3,
    headless: false,
    tool_calling_method: "function_call",
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/agent/run`, config);
    return response.data;
  } catch (error) {
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
