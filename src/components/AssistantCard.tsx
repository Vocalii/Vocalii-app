import React from 'react';
import { Check } from 'lucide-react';
import { TodoItem } from '../types';

interface AssistantCardProps {
  todos: TodoItem[];
  onToggleTodo: (id: string) => void;
}

export default function AssistantCard({ todos, onToggleTodo }: AssistantCardProps) {
  const completedCount = todos.filter(t => t.completed).length;

  return (
    <div
      className="bg-gradient-to-b from-[#17A9C9]/15 to-[#12141a]/90 hover:from-[#17A9C9]/22 hover:to-[#12141a]/95 border border-[#17A9C9]/30 hover:border-[#17A9C9]/50 rounded-[28px] p-5 shadow-[0_0_20px_rgba(23,169,201,0.06)] hover:shadow-[0_0_30px_rgba(23,169,201,0.12)] transition-all duration-500 flex flex-col h-auto relative overflow-hidden group select-none w-full"
      id="todos-card"
    >
      {/* Sleek top ambient glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#17A9C9]/50 to-transparent" />
      
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 bg-[#17A9C9]/15 rounded-full blur-[35px] pointer-events-none transition-all duration-500 group-hover:bg-[#17A9C9]/30 group-hover:scale-110 z-0" />

      {/* Header Panel */}
      <div className="flex items-center justify-between z-10 relative mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6.5 h-6.5 rounded-full bg-[#17A9C9]/20 border border-[#17A9C9]/40 flex items-center justify-center text-[#21e8ff] transition-all duration-300 shadow-[0_0_10px_rgba(23,169,201,0.2)]">
            <Check className="w-3.5 h-3.5" />
          </div>
        </div>
        <span className="text-[9px] font-light text-[#21e8ff] font-medium uppercase tracking-wider bg-[#17A9C9]/15 px-2.5 py-1 rounded-full border border-[#17A9C9]/30 shadow-sm">
          {completedCount} / {todos.length}
        </span>
      </div>

      {/* Tasks List - expands naturally */}
      <div className="flex-1 flex flex-col gap-3 z-10 select-none overflow-visible">
        {todos.map((todo) => {
          return (
            <div
              key={todo.id}
              onClick={() => onToggleTodo(todo.id)}
              className="flex gap-4 p-2.5 rounded-xl transition-all duration-300 border border-transparent hover:border-zinc-800/40 hover:bg-[#17A9C9]/5 cursor-pointer group/item items-start"
            >
              {/* Checkbox */}
              <div className="mt-0.5 flex-shrink-0 transition-transform duration-300 group-hover/item:scale-105">
                {todo.completed ? (
                  <div className="w-5 h-5 rounded-md bg-[#17A9C9]/30 border border-[#17A9C9]/60 flex items-center justify-center text-[#21e8ff]">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-md border border-zinc-700 bg-zinc-900/60 flex items-center justify-center text-transparent hover:border-[#17A9C9]/60" />
                )}
              </div>

              {/* Task Details */}
              <div className="flex-1 flex flex-col min-w-0">
                <span className={`text-[12px] font-normal tracking-wide transition-colors duration-200 leading-snug font-sans ${todo.completed ? 'text-zinc-500 line-through' : 'text-zinc-300 group-hover/item:text-white'}`}>
                  {todo.title}
                </span>
                <span className={`text-[9px] font-mono mt-1 ${todo.completed ? 'text-zinc-600' : 'text-zinc-500'}`}>
                  {todo.category}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
