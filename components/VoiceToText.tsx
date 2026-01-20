import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, polishText, extractTasksFromText } from '../services/gemini';
import { apiKeyManager } from '../services/apiKeyManager';

interface VoiceToTextProps {
  onAddTodos: (tasks: string[]) => void;
}

const VoiceToText: React.FC<VoiceToTextProps> = ({ onAddTodos }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('准备就绪');
  const [fullTranscript, setFullTranscript] = useState('');
  const [polishedText, setPolishedText] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  
  // Refs for State (to avoid stale closures in callbacks)
  const activeRef = useRef(false);
  
  // Audio Refs
  const inputContextRef = useRef<AudioContext | null>(null);

  // Transcription Accumulators
  const userTextRef = useRef('');

  // Auto-scroll the textarea
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const polishedRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
    }
  }, [fullTranscript]);

  const appendText = (text: string) => {
    setFullTranscript(prev => prev + text);
  };

  const stopSession = () => {
    setIsActive(false);
    activeRef.current = false;
    setStatus('已停止');
    
    // Close contexts
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
  };

  const startSession = async () => {
    try {
      setIsActive(true);
      activeRef.current = true;
      setStatus('正在初始化...');
      userTextRef.current = '';

      const apiKey = apiKeyManager.getApiKey();
      if (!apiKey) {
        throw new Error('API Key 未设置');
      }

      const ai = new GoogleGenAI({ apiKey });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      inputContextRef.current = inputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('正在连接服务...');

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('🎙️ 正在听写中...');
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            // Critical: Create a GainNode with 0 gain to prevent microphone feedback loop
            const gainNode = inputCtx.createGain();
            gainNode.gain.value = 0;

            scriptProcessor.onaudioprocess = (e) => {
              if (!activeRef.current) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(scriptProcessor);
            // Route through mute gain node before destination to prevent speakers feedback
            scriptProcessor.connect(gainNode);
            gainNode.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const content = msg.serverContent;
            
            // STRATEGY REVERT: Use inputTranscription (Direct User Speech).
            // This is more stable than the "Echo" strategy, even if it might output Traditional Chinese sometimes.
            if (content?.inputTranscription) {
              const text = content.inputTranscription.text;
              if (text) {
                userTextRef.current += text;
                appendText(text);
              }
            }
            
            if (content?.turnComplete) {
               if (userTextRef.current.length > 0) {
                 // Add a natural break after a turn
                 appendText(' '); 
                 userTextRef.current = '';
               }
            }
          },
          onclose: () => {
            setStatus('连接已断开');
            setIsActive(false);
            activeRef.current = false;
          },
          onerror: (err) => {
            console.error(err);
            setStatus('发生错误');
            setIsActive(false);
            activeRef.current = false;
          }
        },
        config: {
          responseModalities: [Modality.AUDIO], 
          // Re-enable input transcription for direct Speech-to-Text
          inputAudioTranscription: {},
          // Remove system instruction that forced echoing
        }
      });

    } catch (e: any) {
      console.error(e);
      setStatus(`错误: ${e.message}`);
      setIsActive(false);
      activeRef.current = false;
    }
  };

  const handlePolish = async () => {
    if (!fullTranscript.trim()) return;
    setIsPolishing(true);
    setPolishedText(''); // Clear previous
    try {
      const result = await polishText(fullTranscript);
      setPolishedText(result);
    } catch (e: any) {
      alert("润色失败: " + e.message);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleExtractTasks = async () => {
    if (!fullTranscript.trim()) return;
    setIsExtracting(true);
    try {
      const tasks = await extractTasksFromText(fullTranscript);
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

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm z-10 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span>📝</span> 语音转文字 & 智能润色
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></span>
             <p className="text-xs text-gray-500">{status}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button
             onClick={() => { setFullTranscript(''); setPolishedText(''); }}
             className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
           >
             清空全部
           </button>
           <button
            onClick={isActive ? stopSession : startSession}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
              isActive 
              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
            }`}
          >
            {isActive ? '⏹ 停止录音' : '🎙️ 开始录音'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top: Raw Transcription */}
        <div className="flex-1 p-4 bg-gray-50 flex flex-col border-b border-gray-200 min-h-[30%]">
          <div className="flex justify-between items-center mb-2 px-1">
             <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">原始语音转录</span>
             <span className="text-xs text-gray-400">{fullTranscript.length} 字</span>
          </div>
          <textarea
             ref={textAreaRef}
             value={fullTranscript}
             onChange={(e) => setFullTranscript(e.target.value)}
             className="flex-1 w-full p-4 text-base leading-relaxed text-gray-800 resize-none outline-none font-mono bg-white rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-100 transition-all selection:bg-yellow-200 selection:text-black"
             placeholder="点击右上角“开始录音”，您的中文语音将直接转换为文字显示在这里..."
           />
        </div>

        {/* Middle: Actions */}
        <div className="p-2 bg-white flex justify-center items-center gap-4 z-10 shadow-sm border-b border-gray-100">
           <button 
             onClick={handlePolish}
             disabled={isPolishing || !fullTranscript}
             className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full font-bold shadow-md transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isPolishing ? (
               <>
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 正在润色...
               </>
             ) : (
               <>
                 <span>✨</span> 一键智能润色
               </>
             )}
           </button>
           
           <button
              onClick={handleExtractTasks}
              disabled={isExtracting || !fullTranscript}
              className="flex items-center gap-2 px-6 py-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-full font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
              {isExtracting ? (
                 <>
                   <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                   分析中...
                 </>
              ) : (
                 <>
                   <span>📋</span> 提取待办事项
                 </>
              )}
           </button>
        </div>

        {/* Bottom: Polished Text */}
        <div className="flex-1 p-4 bg-emerald-50/30 flex flex-col min-h-[30%]">
           <div className="flex justify-between items-center mb-2 px-1">
             <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">AI 润色结果 (可编辑)</span>
             <div className="flex gap-2">
                <button 
                  onClick={() => navigator.clipboard.writeText(polishedText)}
                  disabled={!polishedText}
                  className="text-xs text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded transition-colors disabled:opacity-0"
                >
                  复制内容
                </button>
             </div>
           </div>
           <div className="flex-1 relative">
             <textarea
               ref={polishedRef}
               value={polishedText}
               onChange={(e) => setPolishedText(e.target.value)}
               className="absolute inset-0 w-full h-full p-4 text-base leading-relaxed text-gray-800 resize-none outline-none font-sans bg-white rounded-xl border border-emerald-100 shadow-sm focus:ring-2 focus:ring-emerald-200 transition-all selection:bg-yellow-200 selection:text-black"
               placeholder="润色后的文本将显示在这里... (结果可直接编辑)"
             />
             {!polishedText && !isPolishing && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                 <span className="text-4xl">✨</span>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceToText;