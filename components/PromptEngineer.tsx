import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/gemini';
import { ChatMessage, MessageRole, PromptSession } from '../types';

interface PromptEngineerProps {
  sessions: PromptSession[];
  saveSession: (session: PromptSession) => void;
  deleteSession: (id: string) => void;
  restoreSession: (id: string) => void;
  emptyRecycleBin: () => void;
  initialPrompt?: string | null;
  onPromptConsumed?: () => void;
}

const PROMPT_ENGINEER_SYSTEM_PROMPT = `
# 提示词工程 v2.3 (专家版 - 透明思维)

你是一个专家级任务解决协作伙伴，集成了动词驱动、反思闭环与高级提示词工程逻辑。你的核心目标是帮助用户完成任务。
**核心原则：你必须“显式”地展示你的思考过程。**

你的工作流程分为三个阶段，必须严格按顺序执行。

---

## 全局输出规范 (CRITICAL)

在回复任何稍微复杂的请求时（除了简单的问候），你必须**首先**输出你的深度思考过程，并使用 XML 标签 \`<thinking>\` 包裹。

格式示例：
\`\`\`xml
<thinking>
【意图解析】用户想要... 核心难点在于...
【架构推演】考虑到... 我决定采用... 策略。
【风险预判】可能存在... 问题，我需要...
</thinking>

(这里是展示给用户的最终内容，如摘要、方案或提示词)
\`\`\`

---

## 阶段一：意图理解与信息采集

### 步骤1：快速意图确认
当用户提出需求时：
1. 用自己的话复述用户的核心意图。
2. 初步识别任务类型（创意/分析/执行/混合）和规模。

### 步骤2：分层信息采集

**第一层：启动必需（必须在开始前明确）**
- **核心目标**：解决什么问题？
- **使用场景**：给谁用？在哪用？
- **复用性质**：一次性 vs 长期复用？
- **成败判断**：做好了能干嘛？

**第二层：过程中补充（按需）**
- 发散程度、准确性要求、交付形式等。

### 步骤3：输出意图确认摘要
整理为简洁摘要。

---

## 阶段二：路径判断与选择

基于信息判断任务属性。

### 判断逻辑
1. **一次性任务** vs **复杂/可复用任务**
2. **单一提示词** vs **多角色/多阶段工作流**

### 路径选择
向用户提供选项：
- **A. 直接执行**：直接给结果。
- **B. 单提示词方案**：给一个可复用的 Prompt。
- **C. 工作流方案**：设计多角色/多阶段协作流。

---

## 阶段三：提示词工程构建

### 1. 深度架构规划（显式思维链）
**必须在 \`<thinking>\` 标签中详细展示此步骤：**
- **解析**：提取核心意图与领域知识映射。
- **分解**：将任务拆解为线性执行步骤。
- **推演**：预判 AI 执行时的幻觉或歧义，设计防错机制。
- **策略**：确定驱动模式（创意发散 vs 逻辑收敛）。

### 2. 模块选择决策
根据复杂度选择模块组合：
- **简单**：角色 + 执行流
- **中等**：角色 + 执行流 + 约束
- **复杂**：全模块（角色+先想后答+执行流+约束+自检+意外处理）

### 3. 提示词组件构建
使用以下模块组装提示词：
- 模块一：角色与思维方式（Describe the persona & thinking style）
- 模块二：先想后答机制（Chain of Thought instruction）
- 模块三：分步执行指令（Step-by-step actions）
- 模块四：约束条件清单（Negative constraints & format）
- 模块五：自我检查指令（Quality check）
- 模块六：意外情况处理（Error handling）
- 模块七：工作流接口（Input/Output definition for workflows）

### 4. 交付清单
根据产出形态，提供：
- **提示词完整文本**（Markdown 代码块）
- **使用说明**
- **测试建议**

---

## 【直接执行模式】

**仅在用户明确选择"直接帮我完成"时激活。**

### 执行流程
1. **显式思考**：在 \`<thinking>\` 标签中进行分析。
2. **直接交付**：给出最终产出物。

---

## 全局行为准则
- 语气：平等、专业、协作。
- 响应：灵活应对变更，优先满足用户当下意图。
- 质量：提示词必须是成品，不要半成品。
- **透明性：永远让用户看到你的思考过程（通过 thinking 标签）。**
`;

const PromptEngineer: React.FC<PromptEngineerProps> = ({ 
  sessions, 
  saveSession, 
  deleteSession,
  restoreSession,
  emptyRecycleBin,
  initialPrompt, 
  onPromptConsumed 
}) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper to render message content with special styling for <thinking> blocks
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(<thinking>[\s\S]*?<\/thinking>)/g);

    return parts.map((part, index) => {
      if (part.startsWith('<thinking>') && part.endsWith('</thinking>')) {
        const thoughtContent = part.replace(/<\/?thinking>/g, '').trim();
        return (
          <div key={index} className="mb-4 bg-indigo-50/60 border-l-4 border-indigo-400 p-4 rounded-r-xl text-sm text-slate-700 font-mono shadow-sm animate-fade-in my-2">
            <div className="font-bold text-indigo-600 mb-2 flex items-center gap-2 border-b border-indigo-100 pb-2 uppercase tracking-wider text-xs">
              <span>🧠</span> 专家思维链 (Expert Thinking Process)
            </div>
            <div className="whitespace-pre-wrap leading-relaxed opacity-90">{thoughtContent}</div>
          </div>
        );
      }
      if (!part.trim()) return null;
      return <div key={index} className="whitespace-pre-wrap leading-relaxed">{part}</div>;
    });
  };

  const startNewSession = async (autoSendPrompt?: string) => {
    setShowTrash(false); // Switch to active view
    const newId = Date.now().toString();
    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      role: MessageRole.MODEL,
      content: "你好，我是你的提示词工程协作伙伴 v2.3 (专家版)。\n我会在每次回答前展示我的**深度思考过程**，帮助你理清思路。\n\n请告诉我你想完成什么任务？"
    };
    
    let initialMessages = [welcomeMsg];
    
    if (autoSendPrompt) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: MessageRole.USER,
        content: autoSendPrompt
      };
      initialMessages.push(userMsg);
    }
    
    setMessages(initialMessages);
    setCurrentSessionId(newId);
    
    saveSession({
      id: newId,
      title: autoSendPrompt ? autoSendPrompt.slice(0, 15) + '...' : '新对话',
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString(),
      messages: initialMessages,
      isDeleted: false
    });

    if (autoSendPrompt) {
      await processAIResponse(initialMessages, autoSendPrompt, newId);
    }
  };

  const processAIResponse = async (currentMsgs: ChatMessage[], prompt: string, sessionId: string) => {
    setIsLoading(true);
    try {
       const history = currentMsgs.map(m => ({
         role: m.role,
         parts: [{ text: m.content }]
       }));
       
       const response = await sendChatMessage(history, prompt, {
         useThinking: true,
         useSearch: useSearch,
         systemInstruction: PROMPT_ENGINEER_SYSTEM_PROMPT
       });
       
       const responseText = response.text || "无法生成回复";
       const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean);

       const aiMsg: ChatMessage = {
         id: (Date.now() + 1).toString(),
         role: MessageRole.MODEL,
         content: responseText,
         isThinking: true,
         groundingUrls: grounding
       };
       
       const finalMessages = [...currentMsgs, aiMsg];
       setMessages(finalMessages);
       
       // Need to fetch title again just in case (though passed in arg is simpler)
       const firstUserMsg = finalMessages.find(m => m.role === MessageRole.USER);
       const title = firstUserMsg 
        ? (firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')) 
        : '新对话';

       saveSession({
          id: sessionId,
          title: title,
          timestamp: Date.now(),
          dateStr: new Date().toLocaleString(),
          messages: finalMessages,
          isDeleted: false
       });
    } catch (e: any) {
      const errorMsg = {
         id: Date.now().toString(),
         role: MessageRole.MODEL,
         content: `出错了: ${e.message}`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialPrompt) {
      startNewSession(initialPrompt);
      if (onPromptConsumed) onPromptConsumed();
    } else if (!currentSessionId) {
       // Load first active session by default
       const activeSessions = sessions.filter(s => !s.isDeleted).sort((a, b) => b.timestamp - a.timestamp);
       if (activeSessions.length > 0) {
         loadSession(activeSessions[0]);
       } else {
         startNewSession();
       }
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadSession = (session: PromptSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return;

    // Guard against sending in deleted session
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (currentSession?.isDeleted) {
        alert("该会话已在回收站中，请先还原后再继续对话。");
        return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      content: input,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    
    // Save user message immediately
    const firstUserMsg = newMessages.find(m => m.role === MessageRole.USER);
    const title = firstUserMsg ? (firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')) : '新对话';
    
    saveSession({
      id: currentSessionId,
      title: title,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString(),
      messages: newMessages,
      isDeleted: false
    });

    await processAIResponse(newMessages, userMsg.content, currentSessionId);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("确定要移至回收站吗？")) {
        deleteSession(id);
        if (currentSessionId === id) {
             const remaining = sessions.filter(s => !s.isDeleted && s.id !== id).sort((a, b) => b.timestamp - a.timestamp);
             if (remaining.length > 0) loadSession(remaining[0]);
             else startNewSession();
        }
    }
  };

  const handleRestore = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      restoreSession(id);
      // Optional: switch to active view
  };

  // Determine which sessions to show
  const displaySessions = sessions
    .filter(s => showTrash ? s.isDeleted : !s.isDeleted)
    .sort((a, b) => b.timestamp - a.timestamp);
  
  const currentSessionIsDeleted = sessions.find(s => s.id === currentSessionId)?.isDeleted;

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar History */}
      <div className="w-72 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
        {/* Toggle View Header */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <button 
            onClick={() => startNewSession()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <span>+</span> 新建工程任务
          </button>
          
          <div className="flex bg-gray-200 p-1 rounded-lg text-xs font-medium">
             <button 
                onClick={() => setShowTrash(false)}
                className={`flex-1 py-1.5 rounded-md transition-all ${!showTrash ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                任务列表
             </button>
             <button 
                onClick={() => setShowTrash(true)}
                className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${showTrash ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <span>🗑️</span> 回收站
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {displaySessions.length === 0 && (
              <div className="text-center text-gray-400 text-xs mt-10">
                  {showTrash ? "回收站为空" : "暂无任务"}
              </div>
          )}
          {displaySessions.map(session => (
            <div
              key={session.id}
              onClick={() => loadSession(session)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-all group relative cursor-pointer ${
                currentSessionId === session.id 
                  ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-gray-200' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium truncate mb-1 pr-6">{session.title}</div>
              <div className="text-xs text-gray-400 flex justify-between">
                <span>{session.dateStr.split(' ')[0]}</span>
                <span>{session.messages.length} 条</span>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                 {showTrash ? (
                    <button 
                        onClick={(e) => handleRestore(e, session.id)}
                        className="p-1 hover:bg-emerald-100 text-emerald-500 rounded"
                        title="还原"
                    >
                        ↩️
                    </button>
                 ) : (
                    <button 
                        onClick={(e) => handleDelete(e, session.id)}
                        className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded"
                        title="移至回收站"
                    >
                        ×
                    </button>
                 )}
              </div>
            </div>
          ))}
        </div>
        
        {showTrash && displaySessions.length > 0 && (
            <div className="p-4 border-t border-gray-200">
                <button 
                    onClick={emptyRecycleBin}
                    className="w-full py-2 text-xs text-red-500 hover:bg-red-50 border border-red-100 rounded-lg transition-colors"
                >
                    清空回收站
                </button>
            </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Recycle Bin Warning Banner */}
        {currentSessionIsDeleted && (
             <div className="absolute top-16 inset-x-0 bg-red-50 border-b border-red-100 text-red-600 px-4 py-2 text-sm flex justify-between items-center z-20">
                 <span>⚠️ 此会话位于回收站中，仅供查看。</span>
                 <button 
                    onClick={() => restoreSession(currentSessionId!)}
                    className="text-xs bg-white border border-red-200 px-3 py-1 rounded hover:bg-red-100 font-medium"
                 >
                    立即还原
                 </button>
             </div>
        )}

        <div className="border-b border-gray-200 p-4 bg-white flex justify-between items-center shadow-sm z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">提示词工程专家</h2>
            <p className="text-xs text-gray-500">v2.3 (透明思维版) | 意图理解 to 架构推演 to 构建交付</p>
          </div>
          <div className="flex items-center gap-3">
             <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-blue-600 transition-colors">
              <input 
                type="checkbox" 
                checked={useSearch} 
                onChange={(e) => setUseSearch(e.target.checked)}
                className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
              />
              <span className={useSearch ? "font-bold text-blue-600" : ""}>联网搜索</span>
            </label>
            <div className="px-3 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium border border-amber-200 flex items-center gap-1">
              <span>🧠</span> Transparent Thinking
            </div>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 ${currentSessionIsDeleted ? 'pt-14 opacity-80' : ''}`} ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm text-sm md:text-base ${
                msg.role === MessageRole.USER 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}>
                {renderMessageContent(msg.content)}
                
                {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100/50">
                    <div className="text-xs font-semibold mb-1 opacity-70">参考来源:</div>
                    <div className="flex flex-wrap gap-2">
                      {msg.groundingUrls.map((url, idx) => (
                        <a 
                          key={idx} 
                          href={url.uri} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-blue-400 hover:underline truncate max-w-[200px]"
                        >
                          {url.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {msg.isThinking && (
                  <div className="mt-2 pt-2 border-t border-gray-100/20 text-xs opacity-70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    Gemini 3.0 Pro Active
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-2">
                <span className="text-xs text-gray-400 mr-2">正在进行深度架构推演...</span>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={currentSessionIsDeleted ? "需还原会话后才能继续发送..." : "描述你的任务需求..."}
              disabled={isLoading || !!currentSessionIsDeleted}
              className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input || !!currentSessionIsDeleted}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-sm disabled:cursor-not-allowed"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptEngineer;