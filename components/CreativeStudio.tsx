import React, { useState } from 'react';
import { generateImage, editImage, generateVideo } from '../services/gemini';
import { GalleryItem, GalleryItemType } from '../types';

interface CreativeStudioProps {
  points: number;
  deductPoints: (amount: number) => void;
  addToGallery: (item: GalleryItem) => void;
}

const COSTS = {
  GEN_IMAGE: 10,
  EDIT_IMAGE: 5,
  GEN_VIDEO: 50
};

const CreativeStudio: React.FC<CreativeStudioProps> = ({ points, deductPoints, addToGallery }) => {
  const [activeTab, setActiveTab] = useState<'gen' | 'edit' | 'video'>('gen');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [sourceImage, setSourceImage] = useState<string | null>(null);

  const getCurrentCost = () => {
    switch (activeTab) {
      case 'gen': return COSTS.GEN_IMAGE;
      case 'edit': return COSTS.EDIT_IMAGE;
      case 'video': return COSTS.GEN_VIDEO;
      default: return 0;
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setSourceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const execute = async () => {
    const cost = getCurrentCost();
    if (points < cost) {
      alert(`AI 点数不足！需要 ${cost} 点，当前剩余 ${points} 点。`);
      return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      let url = null;
      let type: GalleryItemType = 'image';

      if (activeTab === 'gen') {
        url = await generateImage(prompt, aspectRatio, imageSize);
      } else if (activeTab === 'edit') {
        if (!sourceImage) throw new Error("请先上传一张图片");
        const base64 = sourceImage.split(',')[1];
        url = await editImage(base64, prompt);
      } else if (activeTab === 'video') {
        type = 'video';
        const aistudio = (window as any).aistudio;
        if (aistudio && aistudio.openSelectKey) {
             const hasKey = await aistudio.hasSelectedApiKey();
             if (!hasKey) {
                 await aistudio.openSelectKey();
             }
        }
        
        let base64 = null;
        if (sourceImage) base64 = sourceImage.split(',')[1];
        const vidAr = (aspectRatio === '9:16' || aspectRatio === '16:9') ? aspectRatio : '16:9';
        url = await generateVideo(prompt, base64, vidAr);
      }

      if (url) {
        setResult(url);
        deductPoints(cost);
        
        // Save to Gallery
        addToGallery({
          id: Date.now().toString(),
          type: type,
          content: url,
          prompt: prompt,
          timestamp: Date.now(),
          createdAt: new Date().toLocaleString(),
          cost: cost
        });
      }

    } catch (e: any) {
      alert("错误: " + e.message);
      const aistudio = (window as any).aistudio;
      if (e.message.includes("Requested entity was not found") && aistudio) {
          await aistudio.openSelectKey();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full p-8 max-w-5xl mx-auto overflow-y-auto bg-gray-50 text-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">创意工坊</h2>
        
        {/* Points Display */}
        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-amber-200 flex items-center gap-2">
          <span className="text-xl">🪙</span>
          <div>
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">AI Points</div>
            <div className={`font-mono font-bold text-lg ${points < 50 ? 'text-red-500' : 'text-gray-900'}`}>
              {points}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-4 mb-8 border-b border-gray-200 pb-4">
        {[
          { id: 'gen', label: `生成图片 (${COSTS.GEN_IMAGE} pts)` },
          { id: 'edit', label: `编辑图片 (${COSTS.EDIT_IMAGE} pts)` },
          { id: 'video', label: `生成视频 (${COSTS.GEN_VIDEO} pts)` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setResult(null); setSourceImage(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {activeTab !== 'gen' && (
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <label className="block text-sm font-medium text-gray-600 mb-2">源图片</label>
              {sourceImage ? (
                <div className="relative">
                  <img src={sourceImage} alt="Source" className="rounded-lg max-h-48 object-cover border border-gray-100" />
                  <button onClick={() => setSourceImage(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 p-1 rounded-full text-white transition-colors">✕</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <span className="text-gray-400 text-sm">点击上传</span>
                  <input type="file" onChange={handleFile} accept="image/*" className="hidden" />
                </label>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">提示词 (Prompt)</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="w-full h-32 bg-white border border-gray-300 rounded-xl p-4 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-400 shadow-sm"
              placeholder={
                activeTab === 'gen' ? "描述你想生成的画面..." :
                activeTab === 'edit' ? "描述你想如何修改这张图..." :
                "描述你想生成的视频内容..."
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {activeTab !== 'edit' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">长宽比</label>
                <select 
                  value={aspectRatio} 
                  onChange={e => setAspectRatio(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="1:1">1:1 (正方形)</option>
                  <option value="16:9">16:9 (横向)</option>
                  <option value="9:16">9:16 (竖向)</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
                  {activeTab === 'gen' && (
                    <>
                      <option value="2:3">2:3</option>
                      <option value="3:2">3:2</option>
                      <option value="21:9">21:9</option>
                    </>
                  )}
                </select>
              </div>
            )}
            
            {activeTab === 'gen' && (
               <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">尺寸 (Pro)</label>
                <select 
                  value={imageSize} 
                  onChange={e => setImageSize(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="1K">1K</option>
                  <option value="2K">2K</option>
                  <option value="4K">4K</option>
                </select>
              </div>
            )}
          </div>
          
          {activeTab === 'video' && (
             <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
               注意: 视频生成 (Veo) 需要付费的 API Key。如果尚未设置，系统将提示您选择。
               <br/><a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline hover:text-amber-800">查看计费文档</a>
             </div>
          )}

          <button
            onClick={execute}
            disabled={isLoading || !prompt}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl disabled:opacity-50 transition-all shadow-md flex justify-center items-center gap-2"
          >
            {isLoading ? '生成中...' : (
              <>
                <span>执行消耗</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-sm">-{getCurrentCost()} pts</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 flex items-center justify-center p-4 min-h-[400px] shadow-sm">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 text-sm animate-pulse">正在创作...</p>
            </div>
          ) : result ? (
            activeTab === 'video' ? (
              <video src={result} controls autoPlay loop className="max-w-full rounded-lg shadow-lg border border-gray-100" />
            ) : (
              <img src={result} alt="Result" className="max-w-full rounded-lg shadow-lg border border-gray-100" />
            )
          ) : (
            <div className="text-gray-400 text-center">
              <span className="text-4xl block mb-2 opacity-50">✨</span>
              生成结果将显示在这里<br/>会自动保存到画廊
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreativeStudio;