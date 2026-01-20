import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData } from '../services/gemini';
import { LiveSessionRecord } from '../types';

interface LiveSessionProps {
  history: LiveSessionRecord[];
  saveRecord: (record: LiveSessionRecord) => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ history, saveRecord }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('准备连接');
  const [volume, setVolume] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  
  // Audio & Logic Refs
  const activeRef = useRef(false); // Fix stale closure
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const startTimeRef = useRef<number>(0);
  
  // Transcription Accumulation
  const currentTranscriptRef = useRef<{ role: 'user' | 'model'; text: string }[]>([]);
  const userTextBuffer = useRef('');
  const modelTextBuffer = useRef('');

  const stopSession = () => {
    setIsActive(false);
    activeRef.current = false;
    setStatus('已断开');
    
    // Stop audio
    sourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (inputContextRef.current) { inputContextRef.current.close(); inputContextRef.current = null; }

    // Save Record
    if (currentTranscriptRef.current.length > 0) {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      saveRecord({
        id: Date.now().toString(),
        timestamp: startTimeRef.current,
        dateStr: new Date(startTimeRef.current).toLocaleString(),
        durationSeconds: duration,
        transcript: currentTranscriptRef.current
      });
    }
    
    // Reset buffers
    currentTranscriptRef.current = [];
    userTextBuffer.current = '';
    modelTextBuffer.current = '';
  };

  const appendToTranscript = (role: 'user' | 'model', text: string) => {
     currentTranscriptRef.current.push({ role, text });
  };

  const startSession = async () => {
    try {
      setIsActive(true);
      activeRef.current = true;
      setStatus('正在初始化音频...');
      currentTranscriptRef.current = [];
      startTimeRef.current = Date.now();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('正在连接 Gemini Live...');

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('已连接 - 正在聆听...');
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!activeRef.current) return; 
              const inputData = e.inputBuffer.getChannelData(0);
              
              let sum = 0;
              for(let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length) * 100);

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const content = msg.serverContent;

            // Handle Audio
            const base64Audio = content?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(base64Audio, ctx);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              source.addEventListener('ended', () => { sourcesRef.current.delete(source); });
              source.start(nextStartTimeRef.current);
              sourcesRef.current.add(source);
              nextStartTimeRef.current += audioBuffer.duration;
            }

            // Handle Text Transcription for History
            if (content?.inputTranscription?.text) {
               userTextBuffer.current += content.inputTranscription.text;
            }
            if (content?.outputTranscription?.text) {
               modelTextBuffer.current += content.outputTranscription.text;
            }
            if (content?.turnComplete) {
               if (userTextBuffer.current) {
                  appendToTranscript('user', userTextBuffer.current);
                  userTextBuffer.current = '';
               }
               if (modelTextBuffer.current) {
                  appendToTranscript('model', modelTextBuffer.current);
                  modelTextBuffer.current = '';
               }
            }
            
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
             setStatus('连接已关闭');
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
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          // ENABLE TRANSCRIPTION for recording purposes
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: "你是一个数字孪生记忆助手。请使用中文自然地对话。帮助我反思我的一天，我的决策和我的想法。保持回答简洁且像聊天一样。",
        }
      });

    } catch (err: any) {
      console.error(err);
      setStatus(`失败: ${err.message}`);
      setIsActive(false);
      activeRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  return (
    <div className="flex h-full bg-gray-50 relative overflow-hidden">
       {/* History Overlay Drawer */}
       <div className={`absolute inset-y-0 right-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 z-20 flex flex-col ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800">通话历史</h3>
            <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-800">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.length === 0 ? (
               <div className="text-center text-gray-400 text-sm mt-10">暂无通话记录</div>
            ) : (
               [...history].reverse().map(record => (
                 <div key={record.id} className="border border-gray-100 rounded-xl p-3 bg-white shadow-sm">
                    <div className="text-xs text-gray-500 mb-2 flex justify-between">
                       <span>{record.dateStr}</span>
                       <span>{record.durationSeconds}s</span>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                       {record.transcript.map((t, i) => (
                         <div key={i} className={`text-xs p-2 rounded-lg ${t.role === 'user' ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-800'}`}>
                           <span className="font-bold opacity-50 block mb-1">{t.role === 'user' ? 'Me' : 'AI'}</span>
                           {t.text}
                         </div>
                       ))}
                    </div>
                 </div>
               ))
            )}
          </div>
       </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in text-gray-800 relative">
        <button 
           onClick={() => setShowHistory(true)}
           className="absolute top-6 right-6 p-2 text-gray-400 hover:text-blue-600 transition-colors flex flex-col items-center"
        >
           <span className="text-2xl">📜</span>
           <span className="text-xs font-medium">历史记录</span>
        </button>

        <div className="relative">
          <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${
            isActive ? 'bg-blue-100 shadow-[0_0_50px_rgba(59,130,246,0.3)]' : 'bg-gray-200'
          }`}>
            {isActive ? (
              <div 
                className="w-32 h-32 bg-blue-500 rounded-full animate-pulse transition-transform duration-75 flex items-center justify-center"
                style={{ transform: `scale(${1 + volume / 50})` }}
              >
                 <span className="text-4xl">🎙️</span>
              </div>
            ) : (
              <span className="text-6xl text-gray-400">🎙️</span>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold mt-8 text-gray-900">{status}</h2>
        <p className="text-gray-500 mt-2 max-w-md text-center">
          与你的数字双胞胎对话，释放你的思绪。<br/>系统会记录对话内容，方便您随时回顾。
        </p>

        <button
          onClick={isActive ? stopSession : startSession}
          className={`mt-10 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-md ${
            isActive 
              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
          }`}
        >
          {isActive ? '结束会话' : '开始对话'}
        </button>
        
        <div className="mt-8 text-xs text-gray-400">
          Using Gemini 2.5 Flash Native Audio
        </div>
      </div>
    </div>
  );
};

export default LiveSession;