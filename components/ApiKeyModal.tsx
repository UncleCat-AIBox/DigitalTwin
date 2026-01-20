import React, { useState, useEffect } from 'react';
import { apiKeyManager } from '../services/apiKeyManager';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSubmit: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSubmit }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existingKey = apiKeyManager.getApiKey();
      if (existingKey) {
        // Show masked version
        setApiKey('');
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const existingKey = apiKeyManager.getApiKey();
  const maskedKey = existingKey ? `${existingKey.substring(0, 8)}${'*'.repeat(20)}${existingKey.substring(existingKey.length - 4)}` : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      setError('请输入 API Key');
      return;
    }

    if (apiKey.trim().length < 20) {
      setError('API Key 格式不正确,请检查后重新输入');
      return;
    }

    setError('');
    onSubmit(apiKey.trim());
    setApiKey('');
  };

  const handleClearKey = () => {
    if (window.confirm('确定要清除当前保存的 API Key 吗?')) {
      apiKeyManager.clearApiKey();
      setIsEditing(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🔑</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {existingKey ? 'API Key 设置' : '欢迎使用猫叔的数字孪生'}
          </h2>
          <p className="text-gray-600 text-sm">
            {existingKey ? '管理您的 Gemini API Key' : '请输入您的 Gemini API Key 以开始使用'}
          </p>
        </div>

        {existingKey && !isEditing ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium mb-2">✅ 当前 API Key</p>
              <p className="text-xs font-mono text-gray-600 break-all">{maskedKey}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg transform active:scale-95"
              >
                修改 API Key
              </button>
              <button
                onClick={handleClearKey}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-4 rounded-lg transition-all border border-red-200"
              >
                清除
              </button>
            </div>

            {!apiKeyManager.hasApiKey() && (
              <button
                onClick={() => onSubmit(existingKey)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2 px-4 rounded-lg transition-all text-sm"
              >
                关闭
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                Gemini API Key
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError('');
                }}
                placeholder="输入您的 API Key"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  {error}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-gray-600">
              <p className="font-medium text-blue-800 mb-1">💡 提示:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>API Key 将安全保存在您的浏览器本地存储中</li>
                <li>您可以在 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a> 获取 API Key</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg transform active:scale-95"
              >
                {existingKey ? '更新 API Key' : '确认并开始使用'}
              </button>
              {existingKey && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setApiKey('');
                    setError('');
                  }}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-lg transition-all"
                >
                  取消
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ApiKeyModal;
