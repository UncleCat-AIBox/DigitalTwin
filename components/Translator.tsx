import React, { useState } from 'react';
import { translateContent } from '../services/gemini';

const Translator: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Language State
  const [targetLang, setTargetLang] = useState('简体中文');
  
  const languages = [
    '简体中文', 'English', '日本語', 'Français', 'Deutsch', 'Español', '한국어', 'Русский', 'Italiano'
  ];

  const handleTranslate = async () => {
    if (!input.trim() || isTranslating) return;
    setIsTranslating(true);
    setOutput('');
    
    try {
      const result = await translateContent(input, targetLang);
      setOutput(result);
    } catch (e: any) {
      setOutput(`翻译出错: ${e.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwap = () => {
    // Logic: If target is Chinese, swap to English. If target is NOT Chinese, swap BACK to Chinese.
    // This supports the user's "Input Chinese -> Other" vs "Input Other -> Chinese" flow.
    if (targetLang === '简体中文') {
      setTargetLang('English');
    } else {
      setTargetLang('简体中文');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 text-gray-800">
      <header className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>㊗️</span> 专业技术翻译
          </h2>
          <p className="text-xs text-gray-500 mt-1">严谨术语 · 格式保留 · 难点解析</p>
        </div>

        {/* Language Controls */}
        <div className="flex items-center gap-4 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
          <div className="px-3 py-1.5 text-sm font-medium text-gray-500 bg-white rounded-lg shadow-sm border border-gray-100">
            自动检测 (Auto)
          </div>
          
          <button 
             onClick={handleSwap}
             className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
             title="切换翻译方向"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
             </svg>
          </button>

          <div className="relative group">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="appearance-none bg-white border border-indigo-200 text-indigo-700 font-bold py-1.5 pl-3 pr-8 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm hover:border-indigo-300 transition-all"
            >
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setInput(''); setOutput(''); }}
            className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm transition-colors"
          >
            清空
          </button>
          <button
            onClick={handleTranslate}
            disabled={!input.trim() || isTranslating}
            className={`px-6 py-2 rounded-lg font-bold text-sm text-white transition-all shadow-md flex items-center gap-2 ${
              !input.trim() || isTranslating
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isTranslating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                正在翻译...
              </>
            ) : (
              '开始翻译'
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Input Area */}
        <div className="flex-1 p-4 flex flex-col border-r border-gray-200 bg-white">
          <label className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">原文 (支持Markdown)</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-mono text-sm leading-relaxed"
            placeholder={`请粘贴需要翻译为【${targetLang}】的技术文章、文档或段落...`}
          />
        </div>

        {/* Output Area */}
        <div className="flex-1 p-4 flex flex-col bg-indigo-50/20">
          <div className="flex justify-between items-center mb-2">
             <label className="text-xs font-bold text-indigo-600 uppercase tracking-wider">译文 & 解析 ({targetLang})</label>
             <button 
                onClick={() => navigator.clipboard.writeText(output)}
                disabled={!output}
                className="text-xs text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded transition-colors disabled:opacity-0"
             >
                复制结果
             </button>
          </div>
          <div className="flex-1 w-full p-6 bg-white border border-indigo-100 rounded-xl overflow-y-auto shadow-sm">
            {output ? (
              <div className="prose prose-sm prose-indigo max-w-none whitespace-pre-wrap">
                {output}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                <span className="text-4xl mb-2">📖</span>
                <p>等待翻译...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Translator;