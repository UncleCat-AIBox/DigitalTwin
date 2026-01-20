import React, { useState } from 'react';
import { TodoItem } from '../types';

interface TodoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  todos: TodoItem[];
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  addTodo: (text: string) => void;
  onAnalyzeTodo?: (text: string) => void; // Optional if not provided
}

const TodoPanel: React.FC<TodoPanelProps> = ({ isOpen, onClose, todos, toggleTodo, deleteTodo, addTodo, onAnalyzeTodo }) => {
  const [newTodo, setNewTodo] = useState('');

  const handleAdd = () => {
    if (!newTodo.trim()) return;
    addTodo(newTodo);
    setNewTodo('');
  };

  const activeTodos = todos.filter(t => !t.completed).sort((a, b) => b.timestamp - a.timestamp);
  const completedTodos = todos.filter(t => t.completed).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center shadow-md">
        <h2 className="font-bold flex items-center gap-2">
          <span>📝</span> 待办清单
        </h2>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="添加新任务..."
            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button 
            onClick={handleAdd}
            disabled={!newTodo.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-3 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {todos.length === 0 && (
          <div className="text-center text-gray-400 mt-10 text-sm">
            <p className="mb-2">👋 空空如也</p>
            <p>在任意界面划选文字即可快速添加待办</p>
          </div>
        )}

        {activeTodos.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">待完成 ({activeTodos.length})</h3>
            {activeTodos.map(todo => (
              <div key={todo.id} className="group flex items-start gap-2 bg-white border border-gray-100 p-2 rounded-lg hover:shadow-sm transition-all">
                <input 
                  type="checkbox" 
                  checked={todo.completed} 
                  onChange={() => toggleTodo(todo.id)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm text-gray-800 leading-snug flex-1 break-words">{todo.text}</span>
                
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                   {onAnalyzeTodo && (
                     <button
                        onClick={() => onAnalyzeTodo(todo.text)}
                        className="text-gray-300 hover:text-indigo-600 p-1"
                        title="专家分析"
                     >
                       ⚡
                     </button>
                   )}
                   <button 
                      onClick={() => deleteTodo(todo.id)}
                      className="text-gray-300 hover:text-red-500 p-1"
                   >
                     ×
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {completedTodos.length > 0 && (
          <div className="space-y-2 opacity-60">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">已完成 ({completedTodos.length})</h3>
            {completedTodos.map(todo => (
              <div key={todo.id} className="flex items-start gap-2 p-2">
                 <input 
                  type="checkbox" 
                  checked={todo.completed} 
                  onChange={() => toggleTodo(todo.id)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <span className="text-sm text-gray-500 line-through flex-1">{todo.text}</span>
                <button 
                   onClick={() => deleteTodo(todo.id)}
                   className="text-gray-300 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoPanel;