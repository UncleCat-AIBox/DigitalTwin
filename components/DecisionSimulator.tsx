import React, { useState } from 'react';
import { simulateHybridDecision } from '../services/gemini';
import { UserMemoryProfile, DecisionRecord } from '../types';

interface DecisionSimulatorProps {
  profile: UserMemoryProfile;
  decisions: DecisionRecord[];
  addDecision: (record: DecisionRecord) => void;
}

const DecisionSimulator: React.FC<DecisionSimulatorProps> = ({ profile, decisions, addDecision }) => {
  const [question, setQuestion] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [useExperts, setUseExperts] = useState(false);

  const handleSimulate = async () => {
    if (!question.trim() || isSimulating) return;
    
    // Check if profile has enough data
    if (profile.values.length === 0 && profile.decisionPrinciples.length === 0) {
      alert("数字画像数据不足。请先在‘对话’模块中与我互动，让我学习您的决策原则。");
      return;
    }

    setIsSimulating(true);
    try {
      const result = await simulateHybridDecision(question, profile, useExperts);
      
      const newRecord: DecisionRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        question: question,
        decision: result.decision,
        expertOpinions: result.experts, // Store experts if any
        contextProfile: JSON.parse(JSON.stringify(profile)) // Deep copy snapshot
      };

      addDecision(newRecord);
      setQuestion('');
      setSelectedRecordId(newRecord.id); // Auto select new result
    } catch (e: any) {
      alert("决策模拟失败: " + e.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const selectedRecord = decisions.find(d => d.id === selectedRecordId);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Left Sidebar: History */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-800">决策档案库</h2>
          <p className="text-xs text-gray-500 mt-1">已存储 {decisions.length} 条模拟记录</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {decisions.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-sm">
              暂无记录
            </div>
          )}
          {[...decisions].reverse().map((record) => (
            <button
              key={record.id}
              onClick={() => setSelectedRecordId(record.id)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-all relative overflow-hidden ${
                selectedRecordId === record.id 
                  ? 'bg-blue-50 border-blue-200 border text-blue-800 shadow-sm' 
                  : 'hover:bg-gray-50 text-gray-700 border border-transparent'
              }`}
            >
              <div className="font-medium truncate mb-1 pr-6">{record.question}</div>
              <div className="text-xs text-gray-400 flex justify-between">
                <span>{record.timestamp}</span>
                {record.expertOpinions && record.expertOpinions.length > 0 && (
                  <span className="text-amber-500 font-bold" title="包含专家对撞">⚔️</span>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={() => setSelectedRecordId(null)}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + 发起新模拟
          </button>
        </div>
      </div>

      {/* Right Content: Input or Result */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedRecordId && selectedRecord ? (
          // View Record Mode
          <div className="flex-1 overflow-y-auto p-8 animate-fade-in bg-gray-50">
             <div className="max-w-4xl mx-auto space-y-6">
                <button 
                  onClick={() => setSelectedRecordId(null)}
                  className="mb-4 text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1"
                >
                  ← 返回输入
                </button>
                
                {/* Question */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">问题</h3>
                  <p className="text-gray-800 text-lg leading-relaxed">{selectedRecord.question}</p>
                </div>

                {/* Digital Twin Result */}
                <div className="bg-gradient-to-br from-white to-blue-50 p-8 rounded-2xl shadow-md border border-blue-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl">⚖️</div>
                  <h3 className="text-lg font-bold text-blue-900 mb-4 border-b border-blue-200/50 pb-2">数字孪生决策</h3>
                  <div className="prose prose-blue text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.decision}
                  </div>
                  <div className="mt-8 pt-4 border-t border-blue-200/50 text-xs text-blue-400 flex flex-col gap-1">
                    <span className="font-bold">决策基于当时的画像快照：</span>
                    <span>价值观: {selectedRecord.contextProfile.values.slice(0, 3).join(', ')}...</span>
                  </div>
                </div>

                {/* Experts Collision (if exists) */}
                {selectedRecord.expertOpinions && selectedRecord.expertOpinions.length > 0 && (
                  <div className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-4 mt-8">
                       <span className="text-2xl">⚔️</span>
                       <h3 className="text-xl font-bold text-gray-800">随机专家对撞</h3>
                       <span className="text-sm text-gray-400 ml-2">引入外部互斥视角，打破思维茧房</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedRecord.expertOpinions.map((expert, idx) => {
                        const colors = [
                          'bg-red-50 border-red-100 text-red-900', 
                          'bg-amber-50 border-amber-100 text-amber-900', 
                          'bg-emerald-50 border-emerald-100 text-emerald-900'
                        ];
                        const iconColors = ['text-red-200', 'text-amber-200', 'text-emerald-200'];
                        const colorClass = colors[idx % 3];
                        
                        return (
                          <div key={idx} className={`${colorClass} p-6 rounded-2xl border relative overflow-hidden flex flex-col`}>
                            <div className={`absolute -right-4 -top-4 text-8xl opacity-20 rotate-12 ${iconColors[idx % 3]}`}>
                              {idx === 0 ? 'A' : idx === 1 ? 'B' : 'C'}
                            </div>
                            <div className="relative z-10 mb-3">
                              <h4 className="font-bold text-lg">{expert.role}</h4>
                              <p className="text-xs opacity-70 italic">{expert.style}</p>
                            </div>
                            <p className="relative z-10 text-sm leading-relaxed flex-1 font-medium">
                              "{expert.opinion}"
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
             </div>
          </div>
        ) : (
          // Input Mode
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
            <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">🐱</div>
                <h2 className="text-2xl font-bold text-gray-800">猫叔的数字大脑</h2>
                <p className="text-gray-500 mt-2">
                  输入决策困境，调取过往沉淀的价值观进行模拟。<br/>
                  可选开启专家对撞，引入外部互斥视角。
                </p>
              </div>

              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="例如：AI剧本的提示词是否需要专业化？"
                className="w-full h-40 p-4 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-800 mb-4"
              />

              <div className="mb-6 flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                 <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={useExperts}
                        onChange={(e) => setUseExperts(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </div>
                    <span className={`text-sm font-medium transition-colors ${useExperts ? 'text-indigo-700' : 'text-gray-500'}`}>
                      {useExperts ? '专家对撞模式已开启' : '开启专家对撞 (引入3位互斥专家)'}
                    </span>
                 </label>
                 {useExperts && <span className="text-xs text-amber-500 font-bold">⚔️ 推荐尝试</span>}
              </div>

              <button
                onClick={handleSimulate}
                disabled={isSimulating || !question}
                className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all shadow-md flex items-center justify-center gap-2 ${
                  isSimulating 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                }`}
              >
                {isSimulating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                    {useExperts ? '正在召集专家团...' : '正在调取神经元...'}
                  </>
                ) : (
                  useExperts ? '开始决策 + 专家对撞' : '开始决策模拟'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DecisionSimulator;