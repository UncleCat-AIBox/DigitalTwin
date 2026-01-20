import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  onOpenApiKeySettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onOpenApiKeySettings }) => {
  const items = [
    { id: AppView.DASHBOARD, label: '数字画像', icon: '🧠' },
    { id: AppView.DECISION_SIM, label: '决策模拟', icon: '⚖️' },
    { id: AppView.PROMPT_ENGINEER, label: '提示词专家', icon: '⚡' },
    { id: AppView.TRANSLATOR, label: '专业翻译', icon: '㊗️' },
    { id: AppView.CHAT, label: '自由对话', icon: '💬' },
    { id: AppView.VOICE, label: '语音同步', icon: '🎙️' },
    { id: AppView.TRANSCRIPTION, label: '语音转文字', icon: '📝' },
    { id: AppView.CREATIVE, label: '创意工坊', icon: '🎨' },
    { id: AppView.GALLERY, label: '作品画廊', icon: '🖼️' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-20 shadow-sm">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-800 flex flex-col">
          <span className="text-sm font-normal text-gray-500 mb-1">MirrorAI Upgrade</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">猫叔的数字孪生</span>
        </h1>
        <p className="text-xs text-gray-400 mt-2">v2.3 万事通版</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
              currentView === item.id
                ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom Area: About & Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <button
          onClick={onOpenApiKeySettings}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium mb-2 text-gray-500 hover:text-blue-600 hover:bg-white"
        >
          <span className="text-lg">🔑</span>
          API Key 设置
        </button>

        <button
          onClick={() => setView(AppView.ABOUT)}
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium mb-3 ${
             currentView === AppView.ABOUT
             ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
             : 'text-gray-500 hover:text-indigo-600 hover:bg-white'
          }`}
        >
          <span className="text-lg">ℹ️</span>
          关于软件
        </button>

        <div className="text-xs text-gray-400 text-center">
          Powered by Gemini 3.0 Pro
        </div>
      </div>
    </div>
  );
};

export default Sidebar;