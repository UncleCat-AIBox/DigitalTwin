import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ChatSession from './components/ChatSession';
import LiveSession from './components/LiveSession';
import CreativeStudio from './components/CreativeStudio';
import PromptEngineer from './components/PromptEngineer';
import DecisionSimulator from './components/DecisionSimulator';
import Gallery from './components/Gallery';
import VoiceToText from './components/VoiceToText';
import Translator from './components/Translator';
import About from './components/About';
import TodoPanel from './components/TodoPanel';
import SelectionPopover from './components/SelectionPopover';
import ApiKeyModal from './components/ApiKeyModal';
import { apiKeyManager } from './services/apiKeyManager';
import { AppView, UserMemoryProfile, DecisionRecord, GalleryItem, PromptSession, ChatSessionRecord, LiveSessionRecord, TodoItem } from './types';

// Initial empty profile
const INITIAL_PROFILE: UserMemoryProfile = {
  values: [],
  personalityTraits: [],
  mentalModels: [],
  workHabits: [],
  decisionPrinciples: [],
  interests: [],
  lastUpdated: ''
};

const DraggableTodoButton: React.FC<{ onClick: () => void, count: number }> = ({ onClick, count }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: 30 });
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const buttonStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      // Keep within bounds on resize if possible, simpler reset
      setPosition(prev => ({ 
        x: Math.min(prev.x, window.innerWidth - 80), 
        y: Math.min(prev.y, window.innerHeight - 80) 
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      
      setPosition({
        x: buttonStartPos.current.x + dx,
        y: buttonStartPos.current.y + dy
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.userSelect = '';
      
      // Calculate distance moved
      const dist = Math.sqrt(
        Math.pow(e.clientX - dragStartPos.current.x, 2) + 
        Math.pow(e.clientY - dragStartPos.current.y, 2)
      );
      
      // If moved less than 5px, treat as click
      if (dist < 5) {
        onClick();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onClick]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    buttonStartPos.current = { ...position };
    document.body.style.userSelect = 'none'; // Prevent text selection while dragging
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{ left: position.x, top: position.y }}
      className="fixed z-40 cursor-grab active:cursor-grabbing touch-none"
    >
      <button
        className="bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-transform hover:scale-105 text-blue-600 border border-blue-100 flex items-center justify-center relative"
        title="打开待办清单 (可拖动)"
      >
        <span className="text-xl pointer-events-none">📝</span>
        {count > 0 && (
           <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold pointer-events-none border-2 border-white">
             {count}
           </span>
        )}
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [profile, setProfile] = useState<UserMemoryProfile>(INITIAL_PROFILE);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // API Key State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Creative Studio State
  const [points, setPoints] = useState(1000); 
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  // History States
  const [promptSessions, setPromptSessions] = useState<PromptSession[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSessionRecord[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSessionRecord[]>([]);

  // Todo State
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isTodoPanelOpen, setIsTodoPanelOpen] = useState(false);

  // Auto Analysis State
  const [pendingAnalysisPrompt, setPendingAnalysisPrompt] = useState<string | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    // Check if API Key exists
    if (!apiKeyManager.hasApiKey()) {
      setShowApiKeyModal(true);
    }

    // Load Profile
    const savedProfile = localStorage.getItem('mirror_ai_profile');
    if (savedProfile) {
      try { setProfile(JSON.parse(savedProfile)); } catch (e) { console.error(e); }
    }

    // Load Decisions
    const savedDecisions = localStorage.getItem('mirror_ai_decisions');
    if (savedDecisions) {
      try { setDecisions(JSON.parse(savedDecisions)); } catch (e) { console.error(e); }
    }

    // Load Points
    const savedPoints = localStorage.getItem('mirror_ai_points');
    if (savedPoints) {
       try { setPoints(parseInt(savedPoints)); } catch(e) { console.error(e); }
    }

    // Load Gallery
    const savedGallery = localStorage.getItem('mirror_ai_gallery');
    if (savedGallery) {
      try { setGallery(JSON.parse(savedGallery)); } catch(e) { console.error(e); }
    }

    // Load Prompt Sessions
    const savedPromptSessions = localStorage.getItem('mirror_ai_prompt_sessions');
    if (savedPromptSessions) {
      try { setPromptSessions(JSON.parse(savedPromptSessions)); } catch(e) { console.error(e); }
    }

    // Load Chat Sessions
    const savedChatSessions = localStorage.getItem('mirror_ai_chat_sessions');
    if (savedChatSessions) {
      try { setChatSessions(JSON.parse(savedChatSessions)); } catch(e) { console.error(e); }
    }

    // Load Live Sessions
    const savedLiveSessions = localStorage.getItem('mirror_ai_live_sessions');
    if (savedLiveSessions) {
      try { setLiveSessions(JSON.parse(savedLiveSessions)); } catch(e) { console.error(e); }
    }

    // Load Todos
    const savedTodos = localStorage.getItem('mirror_ai_todos');
    if (savedTodos) {
      try { setTodos(JSON.parse(savedTodos)); } catch(e) { console.error(e); }
    }
  }, []);

  const handleUpdateProfile = (newProfile: UserMemoryProfile) => {
    setIsUpdatingProfile(true);
    const updated = { ...newProfile, lastUpdated: new Date().toLocaleString() };
    setProfile(updated);
    localStorage.setItem('mirror_ai_profile', JSON.stringify(updated));
    setTimeout(() => setIsUpdatingProfile(false), 2000);
  };

  const handleApiKeySubmit = (apiKey: string) => {
    apiKeyManager.setApiKey(apiKey);
    setShowApiKeyModal(false);
  };

  const handleAddDecision = (record: DecisionRecord) => {
    const newDecisions = [...decisions, record];
    setDecisions(newDecisions);
    localStorage.setItem('mirror_ai_decisions', JSON.stringify(newDecisions));
  };

  const handleDeductPoints = (amount: number) => {
    const newPoints = Math.max(0, points - amount);
    setPoints(newPoints);
    localStorage.setItem('mirror_ai_points', newPoints.toString());
  };

  const handleAddToGallery = (item: GalleryItem) => {
    const newGallery = [item, ...gallery];
    if (newGallery.length > 20) newGallery.pop(); 
    setGallery(newGallery);
    try {
      localStorage.setItem('mirror_ai_gallery', JSON.stringify(newGallery));
    } catch (e) {
      alert("本地存储空间已满。");
    }
  };

  const handleSavePromptSession = (session: PromptSession) => {
    setPromptSessions(prev => {
      const idx = prev.findIndex(s => s.id === session.id);
      let newSessions;
      if (idx >= 0) {
        newSessions = [...prev];
        // Preserve isDeleted state if simply updating messages
        newSessions[idx] = { ...session, isDeleted: prev[idx].isDeleted };
      } else {
        newSessions = [...prev, session];
      }
      localStorage.setItem('mirror_ai_prompt_sessions', JSON.stringify(newSessions));
      return newSessions;
    });
  };

  const handleDeletePromptSession = (id: string) => {
    setPromptSessions(prev => {
      const newSessions = prev.map(s => s.id === id ? { ...s, isDeleted: true } : s);
      localStorage.setItem('mirror_ai_prompt_sessions', JSON.stringify(newSessions));
      return newSessions;
    });
  };

  const handleRestorePromptSession = (id: string) => {
    setPromptSessions(prev => {
      const newSessions = prev.map(s => s.id === id ? { ...s, isDeleted: false } : s);
      localStorage.setItem('mirror_ai_prompt_sessions', JSON.stringify(newSessions));
      return newSessions;
    });
  };

  const handleEmptyRecycleBin = () => {
    if (window.confirm("确定要永久清空回收站吗？此操作无法撤销。")) {
      setPromptSessions(prev => {
        const newSessions = prev.filter(s => !s.isDeleted);
        localStorage.setItem('mirror_ai_prompt_sessions', JSON.stringify(newSessions));
        return newSessions;
      });
    }
  };

  const handleSaveChatSession = (session: ChatSessionRecord) => {
    setChatSessions(prev => {
      const idx = prev.findIndex(s => s.id === session.id);
      let newSessions;
      if (idx >= 0) {
        newSessions = [...prev];
        newSessions[idx] = session;
      } else {
        newSessions = [...prev, session];
      }
      localStorage.setItem('mirror_ai_chat_sessions', JSON.stringify(newSessions));
      return newSessions;
    });
  };

  const handleSaveLiveSession = (record: LiveSessionRecord) => {
    const newSessions = [...liveSessions, record];
    setLiveSessions(newSessions);
    localStorage.setItem('mirror_ai_live_sessions', JSON.stringify(newSessions));
  };

  // Todo Handlers
  const handleAddTodo = (text: string) => {
    const newTodo: TodoItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      completed: false,
      timestamp: Date.now(),
    };
    const newTodos = [...todos, newTodo];
    setTodos(newTodos);
    localStorage.setItem('mirror_ai_todos', JSON.stringify(newTodos));
    setIsTodoPanelOpen(true); // Open panel to show feedback
  };

  const handleAddTodos = (tasks: string[]) => {
    const newItems = tasks.map(text => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      completed: false,
      timestamp: Date.now(),
    }));
    const newTodos = [...todos, ...newItems];
    setTodos(newTodos);
    localStorage.setItem('mirror_ai_todos', JSON.stringify(newTodos));
    setIsTodoPanelOpen(true);
  };

  const handleToggleTodo = (id: string) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(newTodos);
    localStorage.setItem('mirror_ai_todos', JSON.stringify(newTodos));
  };

  const handleDeleteTodo = (id: string) => {
    const newTodos = todos.filter(t => t.id !== id);
    setTodos(newTodos);
    localStorage.setItem('mirror_ai_todos', JSON.stringify(newTodos));
  };

  // Analyze Todo with Prompt Engineer
  const handleAnalyzeTodo = (text: string) => {
    setPendingAnalysisPrompt(`请作为提示词专家，帮我深入分析并拆解以下待办任务，给出执行策略、潜在风险以及所需的提示词：\n\n【任务】：${text}`);
    setIsTodoPanelOpen(false);
    setCurrentView(AppView.PROMPT_ENGINEER);
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard 
            profile={profile} 
            isUpdating={isUpdatingProfile} 
            onImportProfile={handleUpdateProfile} 
            todos={todos}
            openTodoPanel={() => setIsTodoPanelOpen(true)}
            toggleTodo={handleToggleTodo}
            deleteTodo={handleDeleteTodo}
            onAnalyzeTodo={handleAnalyzeTodo}
        />;
      case AppView.CHAT:
        return <ChatSession 
          profile={profile} 
          updateProfile={handleUpdateProfile} 
          sessions={chatSessions}
          saveSession={handleSaveChatSession}
          onAddTodos={handleAddTodos}
        />;
      case AppView.VOICE:
        return <LiveSession 
          history={liveSessions}
          saveRecord={handleSaveLiveSession}
        />;
      case AppView.TRANSCRIPTION:
        return <VoiceToText onAddTodos={handleAddTodos} />;
      case AppView.TRANSLATOR:
        return <Translator />;
      case AppView.CREATIVE:
        return <CreativeStudio 
          points={points} 
          deductPoints={handleDeductPoints} 
          addToGallery={handleAddToGallery}
        />;
      case AppView.PROMPT_ENGINEER:
        return <PromptEngineer 
          sessions={promptSessions}
          saveSession={handleSavePromptSession}
          deleteSession={handleDeletePromptSession}
          restoreSession={handleRestorePromptSession}
          emptyRecycleBin={handleEmptyRecycleBin}
          initialPrompt={pendingAnalysisPrompt}
          onPromptConsumed={() => setPendingAnalysisPrompt(null)}
        />;
      case AppView.DECISION_SIM:
        return <DecisionSimulator profile={profile} decisions={decisions} addDecision={handleAddDecision} />;
      case AppView.GALLERY:
        return <Gallery items={gallery} />;
      case AppView.ABOUT:
        return <About />;
      default:
        return <Dashboard 
            profile={profile} 
            isUpdating={isUpdatingProfile} 
            onImportProfile={handleUpdateProfile} 
            todos={todos}
            openTodoPanel={() => setIsTodoPanelOpen(true)}
            toggleTodo={handleToggleTodo}
            deleteTodo={handleDeleteTodo}
            onAnalyzeTodo={handleAnalyzeTodo}
        />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 relative">
      {/* API Key Modal */}
      <ApiKeyModal isOpen={showApiKeyModal} onSubmit={handleApiKeySubmit} />

      <Sidebar
        currentView={currentView}
        setView={setCurrentView}
        onOpenApiKeySettings={() => setShowApiKeyModal(true)}
      />
      
      <main className="flex-1 ml-64 h-full relative">
        {renderView()}
      </main>

      {/* Global Selection Popover */}
      <SelectionPopover onAddTodo={handleAddTodo} />

      {/* Global Draggable Todo Toggle Button */}
      {!isTodoPanelOpen && (
        <DraggableTodoButton 
          onClick={() => setIsTodoPanelOpen(true)} 
          count={todos.filter(t => !t.completed).length} 
        />
      )}

      {/* Right Sidebar Todo Panel */}
      <TodoPanel 
        isOpen={isTodoPanelOpen} 
        onClose={() => setIsTodoPanelOpen(false)}
        todos={todos}
        toggleTodo={handleToggleTodo}
        deleteTodo={handleDeleteTodo}
        addTodo={handleAddTodo}
        onAnalyzeTodo={handleAnalyzeTodo}
      />
    </div>
  );
};

export default App;