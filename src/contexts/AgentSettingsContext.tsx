import { createContext, useContext, useState, ReactNode } from 'react';

export interface AgentSettings {
  llm_provider: string;
  llm_model_name: string;
  llm_temperature: number;
  use_vision: boolean;
  max_steps: number;
  max_actions_per_step: number;
}

interface AgentSettingsContextType {
  settings: AgentSettings;
  updateSettings: (newSettings: Partial<AgentSettings>) => void;
}

const defaultSettings: AgentSettings = {
  llm_provider: "openai",
  llm_model_name: "gpt-4o-mini",
  llm_temperature: 0.2,
  use_vision: true,
  max_steps: 30,
  max_actions_per_step: 5,
};

const AgentSettingsContext = createContext<AgentSettingsContextType | undefined>(undefined);

export function AgentSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AgentSettings>(defaultSettings);

  const updateSettings = (newSettings: Partial<AgentSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <AgentSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AgentSettingsContext.Provider>
  );
}

export function useAgentSettings() {
  const context = useContext(AgentSettingsContext);
  if (context === undefined) {
    throw new Error('useAgentSettings must be used within an AgentSettingsProvider');
  }
  return context;
} 