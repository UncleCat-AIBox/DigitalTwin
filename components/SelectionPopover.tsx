import React, { useEffect, useState, useRef } from 'react';

interface SelectionPopoverProps {
  onAddTodo: (text: string) => void;
}

const SelectionPopover: React.FC<SelectionPopoverProps> = ({ onAddTodo }) => {
  const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      // If no selection or empty, hide
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        // Only hide if we aren't clicking inside the popover itself (which shouldn't happen due to mousedown logic, but safety first)
        return;
      }

      const text = selection.toString().trim();
      if (text.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Calculate position (centered above selection)
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10 + window.scrollY
        });
        setSelectedText(text);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
       // Allow a small timeout for selection to stabilize
       setTimeout(() => {
         const selection = window.getSelection();
         if (!selection || selection.isCollapsed) {
           setPosition(null);
         } else {
           handleSelectionChange();
         }
       }, 10);
    };

    document.addEventListener('mouseup', handleMouseUp);
    // Also listen to keyup for keyboard selection
    document.addEventListener('keyup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleMouseUp);
    };
  }, []);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clearing selection immediately
    if (selectedText) {
      onAddTodo(selectedText);
      setPosition(null);
      window.getSelection()?.removeAllRanges(); // Clear selection after adding
    }
  };

  if (!position) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed z-[9999] transform -translate-x-1/2 -translate-y-full mb-2 animate-fade-in"
      style={{ left: position.x, top: position.y }}
      onMouseDown={(e) => e.preventDefault()} // Prevent clicking the button from clearing selection
    >
      <button
        onClick={handleAddClick}
        className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 hover:bg-black transition-colors pointer-events-auto whitespace-nowrap"
      >
        <span>📝</span> 添加到待办
      </button>
      {/* Little arrow */}
      <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-900 mx-auto mt-[-1px]"></div>
    </div>
  );
};

export default SelectionPopover;