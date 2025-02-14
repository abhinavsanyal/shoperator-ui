import { useState } from 'react';
import { AgentSettings as AgentSettingsType } from '../contexts/AgentSettingsContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AgentSettingsType;
  onSave: (settings: AgentSettingsType) => void;
  isGlobal?: boolean;
}

export default function AgentSettings({ isOpen, onClose, settings: initialSettings, onSave, isGlobal = false }: Props) {
  const [settings, setSettings] = useState<AgentSettingsType>(initialSettings);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {isGlobal ? 'Global Agent Settings' : 'Session Agent Settings'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LLM Provider
            </label>
            <select
              value={settings.llm_provider}
              onChange={(e) => setSettings(prev => ({ ...prev, llm_provider: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Name
            </label>
            <select
              value={settings.llm_model_name}
              onChange={(e) => setSettings(prev => ({ ...prev, llm_model_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="o3-mini" disabled={true}>o3-mini</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature ({settings.llm_temperature})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.llm_temperature}
              onChange={(e) => setSettings(prev => ({ ...prev, llm_temperature: parseFloat(e.target.value) }))}
              className="w-full"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.use_vision}
              onChange={(e) => setSettings(prev => ({ ...prev, use_vision: e.target.checked }))}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <label className="ml-2 text-sm text-gray-700">Enable Vision</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Steps
            </label>
            <input
              type="number"
              value={settings.max_steps}
              onChange={(e) => setSettings(prev => ({ ...prev, max_steps: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Actions Per Step
            </label>
            <input
              type="number"
              value={settings.max_actions_per_step}
              onChange={(e) => setSettings(prev => ({ ...prev, max_actions_per_step: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(settings);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
} 