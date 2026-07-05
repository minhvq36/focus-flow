import type { InBagItem } from '@/types/inventory'

interface GardenTooltipProps {
  activeItem: InBagItem | null
  activeTool: string | null
}

/*
  The shared base style for both action tooltips.
  Reduced padding and centralized text layout to keep dimensions uniform.
*/
const BASE_BOX_CLASS = "absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4.5 py-2 bg-slate-900/80 backdrop-blur-md text-white text-[14px] font-medium rounded-full shadow-lg pointer-events-none flex items-center gap-3 animate-in slide-in-from-bottom-4";

export function GardenTooltip({ activeItem, activeTool }: GardenTooltipProps) {
  if (activeTool === 'shovel') {
    return (
      <div className={BASE_BOX_CLASS}>
        <div className="flex gap-1.5 items-center">
          <span className="bg-slate-700 px-2 py-0.5 rounded text-amber-400 font-mono">Click</span> Remove
        </div>
        <div className="w-1 h-1 bg-slate-500 rounded-full" />
        <div className="flex gap-1.5 items-center">
          <span className="bg-slate-700 px-2 py-0.5 rounded text-amber-400 font-mono">Shift</span> Area Remove
        </div>
        <div className="w-1 h-1 bg-slate-500 rounded-full" />
        <div className="flex gap-1.5 items-center">
          <span className="bg-slate-700 px-2 py-0.5 rounded text-amber-400 font-mono">ESC</span> Cancel
        </div>
      </div>
    );
  }

  if (activeItem) {
    return (
      <div className={BASE_BOX_CLASS}>
        <div className="flex gap-1.5 items-center">
          <span className="bg-slate-700 px-2 py-0.5 rounded text-amber-400 font-mono">R</span> Rotate
        </div>
        <div className="w-1 h-1 bg-slate-500 rounded-full" />
        <div className="flex gap-1.5 items-center">
          <span className="bg-slate-700 px-2 py-0.5 rounded text-amber-400 font-mono">ESC</span> Cancel
        </div>
        <div className="w-1 h-1 bg-slate-500 rounded-full" />
        <div className="flex gap-1.5 items-center">
          <span className="bg-slate-700 px-2 py-0.5 rounded text-amber-400 font-mono">Shift</span> Batch Place
        </div>
        <div className="ml-2 pl-3 border-l border-slate-600 font-bold text-amber-400">
          Left: {activeItem.instance_ids?.length || 0}
        </div>
      </div>
    );
  }

  return null;
}