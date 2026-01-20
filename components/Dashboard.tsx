import React, { useRef, useState } from 'react';
import { UserMemoryProfile, TodoItem } from '../types';

interface DashboardProps {
  profile: UserMemoryProfile;
  isUpdating: boolean;
  onImportProfile: (profile: UserMemoryProfile) => void;
  todos: TodoItem[];
  openTodoPanel: () => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  onAnalyzeTodo: (text: string) => void;
}

interface CardProps {
  title: string;
  items: string[];
  color: string;
  isEditing: boolean;
  onUpdate: (newItems: string[]) => void;
}

const Card: React.FC<CardProps> = ({ title, items, color, isEditing, onUpdate }) => {
  const [newItem, setNewItem] = useState('');
  
  // Safety check for items
  const safeItems = Array.isArray(items) ? items : [];

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    // Check for duplicates
    if (!safeItems.includes(newItem.trim())) {
       onUpdate([...safeItems, newItem.trim()]);
    }
    setNewItem('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...safeItems];
    newItems.splice(index, 1);
    onUpdate(newItems);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-6 h-full flex flex-col shadow-sm hover:shadow-md transition-all duration-300 ${isEditing ? 'ring-2 ring-indigo-100 border-indigo-300' : ''}`}>
      <h3 className={`text-lg font-bold uppercase tracking-wider mb-5 ${color} flex justify-between items-center`}>
        {title}
        {isEditing && <span className="text-xs text-gray-400 font-normal normal-case">编辑中...</span>}
      </h3>
      
      <div className="flex-1">
        {safeItems.length === 0 && !isEditing ? (
          <div className="text-gray-400 text-base italic py-4">暂无数据，请多与我互动。</div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {safeItems.map((item, i) => (
              <div 
                key={i} 
                className={`relative group px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-base text-gray-700 shadow-sm leading-relaxed transition-all ${isEditing ? 'pr-8 hover:bg-red-50 hover:border-red-200' : ''}`}
              >
                {item}
                {isEditing && (
                  <button
                    onClick={() => handleRemoveItem(i)}
                    className="absolute -top-2 -right-2 bg-white text-red-500 border border-gray-200 hover:bg-red-500 hover:text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm transition-colors z-10"
                    title="删除"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="mt-5 pt-4 border-t border-gray-100 flex gap-2 animate-fade-in">
          <input 
            type="text" 
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            placeholder="添加新条目..."
            className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button 
            onClick={handleAddItem}
            disabled={!newItem.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            添加
          </button>
        </div>
      )}
    </div>
  );
};

const TodoListCard: React.FC<{ 
  todos: TodoItem[]; 
  toggleTodo: (id: string) => void; 
  deleteTodo: (id: string) => void; 
  openPanel: () => void;
  onAnalyze: (text: string) => void;
}> = ({ todos, toggleTodo, deleteTodo, openPanel, onAnalyze }) => {
  const activeTodos = todos.filter(t => !t.completed).sort((a, b) => b.timestamp - a.timestamp);
  
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-0 flex flex-col shadow-sm hover:shadow-md transition-shadow overflow-hidden min-h-[300px]">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
         <h3 className="text-base font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
           <span>📝</span> 待办事项 ({activeTodos.length})
         </h3>
         <button onClick={openPanel} className="text-sm text-blue-500 hover:text-blue-700 font-medium">
           管理全部 &rarr;
         </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
         {activeTodos.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
             <span className="text-3xl mb-2">☕</span>
             <p>暂无待办，享受当下</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
             {activeTodos.map(todo => (
               <div key={todo.id} className="group flex items-start gap-3 p-3 bg-gray-50 hover:bg-white border border-transparent hover:border-blue-100 rounded-xl transition-all shadow-sm">
                 <input 
                   type="checkbox" 
                   checked={todo.completed} 
                   onChange={() => toggleTodo(todo.id)}
                   className="mt-1.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                 />
                 <span className="text-base text-gray-700 leading-snug flex-1 break-words py-0.5">{todo.text}</span>
                 
                 <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                   <button 
                      onClick={() => onAnalyze(todo.text)}
                      className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      title="转至提示词专家进行分析"
                   >
                     ⚡
                   </button>
                   <button 
                      onClick={() => deleteTodo(todo.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded"
                      title="删除"
                   >
                     ×
                   </button>
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>
      
      <div className="p-3 border-t border-gray-100 bg-gray-50 text-xs text-center text-gray-400">
        在任意界面划选文字可快速添加
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ profile, isUpdating, onImportProfile, todos, openTodoPanel, toggleTodo, deleteTodo, onAnalyzeTodo }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleExport = () => {
    const dataStr = JSON.stringify(profile, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `mirror_ai_profile_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Robustness: Construct a safe profile object, defaulting missing arrays to empty
        const sanitizedProfile: UserMemoryProfile = {
            values: Array.isArray(json.values) ? json.values : [],
            personalityTraits: Array.isArray(json.personalityTraits) ? json.personalityTraits : [],
            mentalModels: Array.isArray(json.mentalModels) ? json.mentalModels : [],
            workHabits: Array.isArray(json.workHabits) ? json.workHabits : [],
            decisionPrinciples: Array.isArray(json.decisionPrinciples) ? json.decisionPrinciples : [],
            interests: Array.isArray(json.interests) ? json.interests : [],
            lastUpdated: json.lastUpdated || new Date().toLocaleString()
        };

        const confirmLoad = window.confirm(`准备导入画像数据？\n这将覆盖当前的数据。`);
        if (confirmLoad) {
           onImportProfile(sanitizedProfile);
           alert("✅ 数字画像导入成功！");
        }
      } catch (err: any) {
        alert("导入失败: 文件格式错误或损坏。");
        console.error(err);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const updateProfileSection = (key: keyof UserMemoryProfile, newItems: string[]) => {
    const newProfile = { ...profile, [key]: newItems };
    onImportProfile(newProfile);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in text-gray-800 h-full overflow-y-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-6 gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">数字灵魂</h2>
          <p className="text-lg text-gray-500 mt-2">
            实时映射你的价值观、思维模式与行为原则。
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3">
             <button
               onClick={() => setIsEditing(!isEditing)}
               className={`text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-lg border transition-all shadow-sm ${
                 isEditing 
                   ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' 
                   : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500 hover:text-indigo-600'
               }`}
             >
               {isEditing ? (
                 <><span>✓</span> 完成调整</>
               ) : (
                 <><span>✏️</span> 调整画像</>
               )}
             </button>

            <div className="h-6 w-px bg-gray-300 mx-1"></div>

            <button 
              onClick={handleImportClick}
              disabled={isUpdating || isEditing}
              className="text-sm flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              📥 载入
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".json" 
              className="hidden" 
            />

            <button 
              onClick={handleExport}
              disabled={isEditing}
              className="text-sm flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              📤 导出
            </button>
          </div>

          <div>
             <div className="text-xs text-gray-400 uppercase tracking-widest mb-1 text-right">状态</div>
             <div className={`text-sm font-medium flex items-center justify-end gap-2 ${isUpdating ? 'text-blue-600' : 'text-emerald-600'}`}>
               <span className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-blue-600 animate-pulse' : 'bg-emerald-500'}`}></span>
               {isUpdating ? '正在分析对话...' : '已同步'}
             </div>
             <div className="text-xs text-gray-400 mt-1 text-right">上次更新: {profile.lastUpdated || '从未'}</div>
          </div>
        </div>
      </header>
      
      {/* Main Layout: Vertical Stack */}
      <div className="flex flex-col gap-8 pb-10">
         
         {/* Profile Cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card 
                title="核心价值观" 
                items={profile.values} 
                color="text-purple-600" 
                isEditing={isEditing}
                onUpdate={(items) => updateProfileSection('values', items)}
             />
             <Card 
                title="心智模式" 
                items={profile.mentalModels} 
                color="text-blue-600" 
                isEditing={isEditing}
                onUpdate={(items) => updateProfileSection('mentalModels', items)}
             />
             <Card 
                title="决策原则" 
                items={profile.decisionPrinciples} 
                color="text-emerald-600" 
                isEditing={isEditing}
                onUpdate={(items) => updateProfileSection('decisionPrinciples', items)}
             />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card 
                title="工作习惯" 
                items={profile.workHabits} 
                color="text-amber-600" 
                isEditing={isEditing}
                onUpdate={(items) => updateProfileSection('workHabits', items)}
             />
             <Card 
                title="性格特征" 
                items={profile.personalityTraits} 
                color="text-pink-600" 
                isEditing={isEditing}
                onUpdate={(items) => updateProfileSection('personalityTraits', items)}
             />
             <Card 
                title="兴趣焦点" 
                items={profile.interests} 
                color="text-cyan-600" 
                isEditing={isEditing}
                onUpdate={(items) => updateProfileSection('interests', items)}
             />
         </div>

         {/* System Insight */}
         <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-6">
             <h3 className="text-blue-900 font-bold text-lg mb-2">系统洞察</h3>
             <p className="text-gray-700 text-base leading-relaxed">
               记忆系统正在持续观察您的聊天记录、语音会话和创意指令。
               所有提取的特征值都将用于“决策模拟”模块，以提供更符合您直觉的建议。
             </p>
         </div>

         {/* Todo List at the bottom */}
         <div className="w-full">
            <TodoListCard 
              todos={todos} 
              toggleTodo={toggleTodo} 
              deleteTodo={deleteTodo} 
              openPanel={openTodoPanel}
              onAnalyze={onAnalyzeTodo}
            />
         </div>

      </div>
    </div>
  );
};

export default Dashboard;