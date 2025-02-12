export interface AgentRunResponse {
  task: string;
  dynamic_filters: DynamicFilters;
  client_id: string;
  message: string;
  status: string;
  run_id: string;
}

export interface DynamicFilters {
  [key: string]: string[];
}

export interface AgentRun {
  _id: string;
  clerk_id: string;
  task: string;
  start_time: string;
  end_time?: string;
  status: string;
  history_gif_url?: string;
}

export interface AgentRunsResponse {
  agent_runs: AgentRun[];
  total: number;
}

export interface TimelineItem {
  type: "log" | "action" | "update";
  step?: number;
  timestamp: string;
  data: AgentLog | AgentAction | AgentUpdate;
}

export interface AgentLog {
  prefix: string;
  content: string;
  timestamp: string;
  step?: number;
}

export interface AgentAction {
  action: string;
  action_number: number;
  total_actions: number;
  timestamp: string;
  step?: number;
}

export interface AgentUpdate {
  future_plans: string;
  memory: string;
  step: number;
  task_progress: string;
  timestamp: string;
}

export interface WebSocketMessage {
  type: string;
  agent_id?: string;
  data?: {
    screenshot?: string;
    [key: string]: any;
  };
  timestamp: string;
}

// ... Add other shared interfaces 