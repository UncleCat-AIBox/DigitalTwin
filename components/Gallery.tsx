import React from 'react';
import { GalleryItem } from '../types';

interface GalleryProps {
  items: GalleryItem[];
}

const Gallery: React.FC<GalleryProps> = ({ items }) => {
  // Sort by timestamp descending (newest first)
  const sortedItems = [...items].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="h-full p-8 max-w-7xl mx-auto overflow-y-auto bg-gray-50">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">我的作品画廊</h2>
        <p className="text-gray-500 mt-2">
          按时间顺序记录的所有创意生成内容。
        </p>
      </header>

      {sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
          <span className="text-4xl mb-4">🎨</span>
          <p>暂无作品，去创意工坊创作吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedItems.map((item) => (
            <div key={item.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col">
              <div className="relative aspect-square bg-gray-100 overflow-hidden">
                {item.type === 'video' ? (
                  <video 
                    src={item.content} 
                    controls 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={item.content} 
                    alt={item.prompt} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                )}
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                   {item.type === 'video' ? '🎥 视频' : '🖼️ 图片'}
                </div>
              </div>
              
              <div className="p-4 flex-1 flex flex-col">
                <div className="text-xs text-gray-400 mb-2 flex justify-between items-center">
                  <span>{item.createdAt}</span>
                  <span className="text-amber-500 font-medium">-{item.cost} pts</span>
                </div>
                <p className="text-gray-800 text-sm line-clamp-3 leading-relaxed flex-1" title={item.prompt}>
                  {item.prompt}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;