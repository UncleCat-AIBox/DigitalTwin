import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, analyzeProfile, extractTasksFromText } from '../services/gemini';
import { UserMemoryProfile, ChatMessage, MessageRole, ChatSessionRecord } from '../types';

interface ChatSessionProps {
  profile: UserMemoryProfile;
  updateProfile: (p: UserMemoryProfile) => void;
  sessions: ChatSessionRecord[];
  saveSession: (session: ChatSessionRecord) => void;
  onAddTodos: (tasks: string[]) => void;
}

const ChatSession: React.FC<ChatSessionProps> = ({ profile, updateProfile, sessions, saveSession, onAddTodos }) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  
  // File Attachment State (Generic)
  const [attachment, setAttachment] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null); // Keep for UI preview of images

  const scrollRef = useRef<HTMLDivElement>(null);

  // Init logic
  useEffect(() => {
    if (!currentSessionId) {
      if (sessions.length > 0) {
        const sorted = [...sessions].sort((a, b) => b.timestamp - a.timestamp);
        loadSession(sorted[0]);
      } else {
        initNewSession();
      }
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const initNewSession = () => {
    const newId = Date.now().toString();
    const initialMsg: ChatMessage = {
      id: 'welcome',
      role: MessageRole.SYSTEM,
      content: "你好，我是你的数字孪生助手。我们的每一次对话，我都会根据内容自动提取并优化你的【数字画像】（价值观、决策偏好等）。\n\n请畅所欲言，聊得越多，我越像你。"
    };
    setMessages([initialMsg]);
    setCurrentSessionId(newId);
    saveSession({
      id: newId,
      title: '新对话',
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString(),
      messages: [initialMsg]
    });
  };

  const loadSession = (session: ChatSessionRecord) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setImagePreview(null);
    setAttachment(null);
    setAnalysisSuccess(false);
  };

  const handleSave = (updatedMessages: ChatMessage[]) => {
    if (!currentSessionId) return;
    
    // Find title from first user message
    const firstUser = updatedMessages.find(m => m.role === MessageRole.USER);
    const title = firstUser 
      ? (firstUser.content.slice(0, 15) + (firstUser.content.length > 15 ? '...' : '')) 
      : '新对话';

    saveSession({
      id: currentSessionId,
      title,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString(),
      messages: updatedMessages
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        setAttachment({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64Data
        });
        
        // If it's an image, set preview
        if (file.type.startsWith('image/')) {
           setImagePreview(reader.result as string);
        } else {
           setImagePreview(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (retryContent?: string, retryAttachment?: typeof attachment) => {
    const contentToSend = retryContent !== undefined ? retryContent : input;
    const attachmentToSend = retryAttachment !== undefined ? retryAttachment : attachment;

    if ((!contentToSend.trim() && !attachmentToSend) || isLoading || isAnalyzing) return;

    // If this is a new message (not retry), add to state
    let newMessages = [...messages];
    if (retryContent === undefined) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: MessageRole.USER,
        content: contentToSend,
        fileData: attachmentToSend || undefined,
        image: imagePreview || undefined // Backward compatibility for rendering
      };
      newMessages = [...messages, userMsg];
      setMessages(newMessages);
      handleSave(newMessages);
      setInput('');
      setAttachment(null);
      setImagePreview(null);
    }

    setIsLoading(true);

    try {
      // LIMIT CONTEXT: Only use last 20 messages to prevent timeout
      const recentMessages = newMessages.slice(-20);
      const history = recentMessages
        .filter(m => m.role !== MessageRole.SYSTEM)
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

      // Inject profile context if it's the start of context window
      if (history.length > 0) {
        history[0].parts[0].text = `[System Context: Current User Profile (Values/Traits): ${JSON.stringify(profile)}]\n\n${history[0].parts[0].text}`;
      }

      const response = await sendChatMessage(history, contentToSend, {
        useThinking,
        useSearch,
        fileData: attachmentToSend || undefined
      });

      const responseText = response.text || "No response text.";
      const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.MODEL,
        content: responseText,
        isThinking: useThinking,
        groundingUrls: grounding
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      handleSave(finalMessages);

    } catch (error: any) {
      const errMsg: ChatMessage = {
         id: Date.now().toString(),
         role: MessageRole.MODEL,
         content: `出错了: ${error.message}`
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (messages.length === 0 || isLoading) return;
    
    // Check if last message is from model (error or not liked)
    const lastMsg = messages[messages.length - 1];
    let msgsToKeep = messages;
    let userMsgToRetry: ChatMessage | undefined;

    if (lastMsg.role === MessageRole.MODEL) {
      msgsToKeep = messages.slice(0, -1); // Remove model msg
      userMsgToRetry = msgsToKeep[msgsToKeep.length - 1]; // Get previous user msg
    } else if (lastMsg.role === MessageRole.USER) {
      // If user just sent and wants to retry (maybe failed immediately)
      userMsgToRetry = lastMsg;
    }

    if (userMsgToRetry && userMsgToRetry.role === MessageRole.USER) {
      setMessages(msgsToKeep);
      handleSend(userMsgToRetry.content, userMsgToRetry.fileData);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  const runAnalysis = async () => {
    if (isLoading || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisSuccess(false);
    try {
      // Limit analysis log to last 50 messages to avoid token limit errors
      const log = messages.slice(-50).map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n');
      const newProfile = await analyzeProfile(log, profile);
      updateProfile(newProfile);
      
      const sysMsg: ChatMessage = {
        id: Date.now().toString(),
        role: MessageRole.SYSTEM,
        content: "✅ 记忆画像已根据本次会话成功更新。"
      };
      const finalMessages = [...messages, sysMsg];
      setMessages(finalMessages);
      handleSave(finalMessages);
      setAnalysisSuccess(true);
      setTimeout(() => setAnalysisSuccess(false), 3000);
    } catch (e: any) {
      alert("分析失败: " + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExtractTasks = async () => {
    if (isExtracting || messages.length < 2) return;
    setIsExtracting(true);
    try {
      const text = messages.slice(-10).map(m => m.content).join('\n'); // Last 10 messages
      const tasks = await extractTasksFromText(text);
      if (tasks.length > 0) {
        onAddTodos(tasks);
        alert(`✅ 成功提取并添加了 ${tasks.length} 条待办事项！`);
      } else {
        alert("未检测到明显的待办事项。");
      }
    } catch (e) {
      alert("提取失败");
    } finally {
      setIsExtracting(false);
    }
  };

  const sortedSessions = [...sessions].sort((a, b) => b.timestamp - a.timestamp);
  
  const isButtonDisabled = messages.length < 2 || isLoading || isAnalyzing; 
  const isButtonActive = !isLoading && !isAnalyzing && messages.length >= 2;

  // Render attachment helper
  const renderAttachment = (msg: ChatMessage) => {
    if (msg.image) {
      return <img src={msg.image} alt="User upload" className="max-h-60 rounded-lg mb-3 border border-gray-200 bg-white" />;
    }
    if (msg.fileData) {
      if (msg.fileData.mimeType.startsWith('image/')) {
        return <img src={`data:${msg.fileData.mimeType};base64,${msg.fileData.data}`} alt="User upload" className="max-h-60 rounded-lg mb-3 border border-gray-200 bg-white" />;
      }
      return (
        <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-3 border border-gray-200 w-fit">
          <div className="bg-gray-200 p-2 rounded text-gray-600">📄</div>
          <div>
            <div className="text-xs font-bold text-gray-700 truncate max-w-[150px]">{msg.fileData.name}</div>
            <div className="text-[10px] text-gray-400">{msg.fileData.mimeType}</div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar History */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
           <button 
            onClick={initNewSession}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            + 新建对话
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sortedSessions.map(session => (
            <button
              key={session.id}
              onClick={() => loadSession(session)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-all group ${
                currentSessionId === session.id 
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium truncate mb-1">{session.title}</div>
              <div className="text-xs text-gray-400">{session.dateStr.split(' ')[0]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50" ref={scrollRef}>
          {messages.map((msg, index) => (
            <div key={msg.id} className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}>
              <div className={`relative group max-w-[85%] rounded-2xl p-4 shadow-sm text-sm md:text-base selection:bg-yellow-200 selection:text-black ${
                msg.role === MessageRole.USER 
                  ? 'bg-blue-600 text-white' 
                  : msg.role === MessageRole.SYSTEM
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 text-center w-full max-w-full'
                    : 'bg-white text-gray-800 border border-gray-100'
              }`}>
                {renderAttachment(msg)}
                
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                
                {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100/50">
                    <div className="text-xs font-semibold mb-1 opacity-70">来源:</div>
                    <div className="flex flex-wrap gap-2">
                      {msg.groundingUrls.map((url, idx) => (
                        <a 
                          key={idx} 
                          href={url.uri} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-blue-200 hover:text-white underline truncate max-w-[200px]"
                        >
                          {url.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {msg.isThinking && (
                  <div className="mt-2 text-xs text-purple-500 flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-full w-fit">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Deep Thinking
                  </div>
                )}

                {/* Message Actions (Copy/Retry) */}
                {msg.role !== MessageRole.SYSTEM && (
                  <div className={`absolute -bottom-6 ${msg.role === MessageRole.USER ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10`}>
                     <button 
                        onClick={() => handleCopy(msg.content)}
                        className="bg-white border border-gray-200 shadow-sm rounded-md px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                        title="复制"
                     >
                        复制
                     </button>
                     {msg.role === MessageRole.MODEL && index === messages.length - 1 && !isLoading && (
                        <button 
                          onClick={handleRegenerate}
                          className="bg-white border border-gray-200 shadow-sm rounded-md px-2 py-1 text-xs text-gray-500 hover:text-indigo-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
                          title="重新生成"
                        >
                          <span>↻</span> 重试
                        </button>
                     )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex justify-start">
               <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                 <div className="flex items-center gap-1">
                   <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                   <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                 </div>
                 <span className="text-sm text-gray-500 font-medium">正在识别与思考...</span>
               </div>
             </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
          {/* File Preview Area */}
          {(attachment) && (
            <div className="mb-3 inline-block relative animate-fade-in bg-gray-50 border border-gray-200 rounded-lg p-2 pr-8">
              {imagePreview ? (
                 <img src={imagePreview} alt="Preview" className="h-16 rounded shadow-sm object-cover" />
              ) : (
                 <div className="flex items-center gap-2">
                    <div className="text-2xl">📄</div>
                    <div>
                       <div className="text-xs font-bold text-gray-700 truncate max-w-[200px]">{attachment.name}</div>
                       <div className="text-[10px] text-gray-400">{attachment.mimeType}</div>
                    </div>
                 </div>
              )}
              <button 
                onClick={() => { setAttachment(null); setImagePreview(null); }}
                className="absolute top-1 right-1 bg-gray-200 text-gray-500 hover:bg-red-500 hover:text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors"
              >
                ×
              </button>
            </div>
          )}
          
          <div className="flex flex-wrap gap-4 mb-3 px-1">
             <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-purple-600 transition-colors">
              <input 
                type="checkbox" 
                checked={useThinking} 
                onChange={(e) => setUseThinking(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" 
              />
              <span className={useThinking ? "font-bold text-purple-600" : ""}>深度思考 (Thinking)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-blue-600 transition-colors">
              <input 
                type="checkbox" 
                checked={useSearch} 
                onChange={(e) => setUseSearch(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
              />
              <span className={useSearch ? "font-bold text-blue-600" : ""}>联网搜索 (Search)</span>
            </label>
          </div>

          <div className="flex gap-3 items-end">
             <label className="p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors text-gray-500 border border-gray-200 hover:border-gray-300" title="上传图片或文件">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
              {/* Accept generic files */}
              <input type="file" onChange={handleFileChange} className="hidden" accept="image/*,.pdf,.txt,.csv,.json,.md" />
            </label>
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSend();
                   }
                }}
                placeholder="输入消息... (Shift+Enter 换行)"
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent transition-all resize-none max-h-32 min-h-[50px]"
                rows={1}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={isLoading || (!input.trim() && !attachment)}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-300 text-white p-3 rounded-xl font-medium transition-all shadow-sm flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
            <div className="flex flex-col gap-1">
              <button
                onClick={runAnalysis}
                disabled={isButtonDisabled}
                className={`
                  p-1.5 px-3 rounded-lg font-medium transition-all text-xs flex items-center justify-center gap-1
                  ${isAnalyzing 
                    ? 'bg-purple-50 text-purple-400 border border-purple-100 cursor-wait' 
                    : analysisSuccess
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : isButtonActive
                        ? 'bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-600'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  }
                `}
                title="根据本次对话优化数字画像"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-3 h-3 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                    更新画像
                  </>
                ) : (
                  <>🧠 更新画像</>
                )}
              </button>

              <button
                onClick={handleExtractTasks}
                disabled={isExtracting || messages.length < 2}
                className="p-1.5 px-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                title="智能提取最近对话中的待办任务"
              >
                {isExtracting ? (
                  <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                ) : (
                  <span>✨</span>
                )}
                提取待办
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSession;