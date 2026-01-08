import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Bot, 
  Brain, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  RotateCcw, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Zap,
  MoreHorizontal,
  Maximize2,
  LayoutGrid,
  Rows,
  AlignJustify,
  Trash2,
  Play,
  Settings2,
  Grid3X3,
  ImagePlus,
  Download,
  Wand2,
  X,
  Code,
  Trophy,
  Activity
} from 'lucide-react';

// --- Configuration & Mock Data ---

const BASE_MODELS = [
  {
    id: 'gemini-multi',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    colorTheme: 'blue',
    icon: Sparkles,
    type: 'multimodal', // Text + Image + Text
    status: 'completed',
    timestamp: '10:42:05 AM',
    mockThought: "QUEST: Character Design\n> Retrieving style: 'Cyberpunk Oni'\n> RNG Seed: 847592\n> Drafting description...\n> Rendering asset...",
    // Data structure for mixed content
    contentSequence: [
      { type: 'text', data: "I've drafted a concept for the **Cyberpunk Oni** character you requested. I focused on blending traditional Japanese armor aesthetics with high-tech neon accents.\n\nHere is the initial render:" },
      { type: 'image', data: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=1000&auto=format&fit=crop' },
      { type: 'text', data: "As you can see, the mask features integrated HUD elements, and the lighting is set to a cool blue temperature to match the rainy street environment. Let me know if you want to adjust the horn geometry." }
    ]
  },
  {
    id: 'gpt-text',
    name: 'GPT-4o',
    provider: 'OpenAI',
    colorTheme: 'emerald',
    icon: Zap,
    type: 'text', // Text Only
    status: 'completed',
    timestamp: '10:42:03 AM',
    mockThought: "SYSTEM: Backend API Request\n> Language: Python (FastAPI)\n> Status: Drafting boilerplate\n> Models: User, Item, Order\n> Compiling...",
    contentSequence: [
      { 
        type: 'text', 
        data: "Here is the basic boilerplate for your FastAPI backend. I've included the `User` model and a protected route example.\n\n" +
              "```python\n" +
              "from fastapi import FastAPI, Depends\n" +
              "from pydantic import BaseModel\n\n" +
              "app = FastAPI()\n\n" +
              "class User(BaseModel):\n" +
              "    id: int\n" +
              "    username: str\n" +
              "    email: str\n\n" +
              "@app.post('/users/')\n" +
              "def create_user(user: User):\n" +
              "    return user\n" +
              "```\n\n" +
              "This setup assumes you have `uvicorn` installed for the server." 
      }
    ]
  },
  {
    id: 'imagen-pure',
    name: 'Imagen 3',
    provider: 'DeepMind',
    colorTheme: 'amber',
    icon: Brain,
    type: 'image', // Image Only
    status: 'loading',
    timestamp: 'Waiting...',
    mockThought: "PROCESS: Image Generation\n> Prompt: 'Neon rain reflection'\n> Seed: 12345\n> Steps: 30/30\n> Upscaling texture...",
    contentSequence: [
      { type: 'image', data: 'https://images.unsplash.com/photo-1605218427306-633ba8714286?q=80&w=1000&auto=format&fit=crop' }
    ]
  }
];

// Generate extra cards for demo
const generateDemoData = (count) => {
  const extraModels = [];
  const extraImages = [
    'https://images.unsplash.com/photo-1515630278258-407f66498911?q=80&w=1000',
    'https://images.unsplash.com/photo-1535295972055-1c762f4483e5?q=80&w=1000',
    'https://images.unsplash.com/photo-1496449903678-68ddcb189a24?q=80&w=1000'
  ];
  
  for (let i = 0; i < count; i++) {
    const template = BASE_MODELS[i % 3];
    extraModels.push({
      ...template,
      id: `${template.id}-copy-${i}`,
      name: `${template.name} (V${i+1})`,
      status: 'completed', 
      contentSequence: template.contentSequence.map(block => 
        block.type === 'image' ? { ...block, data: extraImages[i % 3] } : block
      )
    });
  }
  return [...BASE_MODELS, ...extraModels];
};

// --- Helper Components ---

const ThinkingBlock = ({ content, colorTheme, isExpanded, onToggle, isStreaming }) => {
  if (!content) return null;

  const colorStyles = {
    blue: 'bg-blue-900/20 border-blue-800 text-blue-200',
    emerald: 'bg-emerald-900/20 border-emerald-800 text-emerald-200',
    amber: 'bg-amber-900/20 border-amber-800 text-amber-200',
  };

  const themeClass = colorStyles[colorTheme] || 'bg-gray-800 border-gray-700 text-gray-200';

  return (
    <div className={`mb-4 rounded-xl border overflow-hidden transition-all duration-300 ${themeClass} ${isExpanded ? 'shadow-inner' : ''}`}>
      <button 
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-colors group"
      >
        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'group-hover:translate-x-1'}`}>
            {isExpanded ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
        </div>
        <span>Logic Stream</span>
        {isStreaming && !isExpanded && (
            <span className="flex h-2 w-2 rounded-sm bg-current animate-ping ml-1 opacity-60"></span>
        )}
        <span className="ml-auto opacity-60 normal-case font-mono text-[10px] bg-black/30 px-2 py-0.5 rounded border border-white/10">
          {isExpanded ? 'MINIMIZE' : 'EXPAND'}
        </span>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-3 pt-2 text-xs font-mono opacity-90 border-t border-dashed border-current/20 whitespace-pre-wrap animate-in slide-in-from-top-2 duration-300">
          {content}
        </div>
      )}

      {!isExpanded && content && (
        <div className="px-3 pb-2 -mt-1 cursor-pointer group" onClick={onToggle}>
            <div className="relative h-6 overflow-hidden rounded bg-black/40 shadow-inner border border-white/5">
                <div className="absolute inset-0 flex flex-col justify-end px-2 py-1">
                    <span className="text-[9px] font-mono leading-tight opacity-70 whitespace-pre-wrap break-words truncate">
                        <span className="text-green-500 font-bold">root@ai:~$</span> {content.split('\n').pop()} 
                        {isStreaming && <span className="inline-block w-2 h-3 bg-current ml-0.5 animate-pulse"/>}
                    </span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const ImageBlock = ({ url, onUseAsReference, isVisible }) => {
    if (!isVisible) return null;
    
    return (
        <div className="my-3 relative rounded-xl overflow-hidden group/image animate-in zoom-in-50 duration-500 shadow-xl border border-gray-700 ring-1 ring-black/50 transform transition-all hover:scale-[1.02]">
            <img 
                src={url} 
                alt="Generated Output" 
                className="w-full h-auto max-h-64 object-cover"
            />
            {/* Image Overlay Controls */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-[2px]">
                    <button 
                    onClick={() => onUseAsReference(url)}
                    className="bg-white hover:bg-indigo-50 text-indigo-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide shadow-lg hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all flex items-center gap-2"
                    >
                    <ImagePlus size={16} strokeWidth={3} />
                    Remix
                    </button>
            </div>
        </div>
    );
};

const ResponseCard = ({ model, layoutMode, onUseAsReference, index }) => {
  const [streamedThought, setStreamedThought] = useState('');
  const [isThoughtOpen, setIsThoughtOpen] = useState(false);
  
  // Track progress
  const [textProgress, setTextProgress] = useState({}); 
  const [blockVisibility, setBlockVisibility] = useState({});
  const [streamingPhase, setStreamingPhase] = useState('idle');

  useEffect(() => {
    if (model.status === 'loading') {
      setStreamedThought('');
      setTextProgress({});
      setBlockVisibility({});
      setStreamingPhase('idle');
    } 
    else if (model.status === 'streaming') {
      setStreamedThought('');
      setTextProgress({});
      setBlockVisibility({});
      setStreamingPhase('thought');
      
      let tIndex = 0;
      let currentBlockIndex = 0;
      let currentBlockCharIndex = 0;
      const thoughtText = model.mockThought || "";

      const interval = setInterval(() => {
         setStreamingPhase((prevPhase) => {
             // 1. Stream Thought
             if (prevPhase === 'thought') {
                 if (tIndex < thoughtText.length) {
                     setStreamedThought(thoughtText.slice(0, tIndex + 5)); 
                     tIndex += 5;
                     return 'thought';
                 } else {
                     return 'content';
                 }
             }
             // 2. Stream Content
             else if (prevPhase === 'content') {
                 if (currentBlockIndex >= model.contentSequence.length) {
                     clearInterval(interval);
                     return 'done';
                 }
                 const block = model.contentSequence[currentBlockIndex];
                 setBlockVisibility(prev => ({...prev, [currentBlockIndex]: true}));

                 if (block.type === 'text') {
                     if (currentBlockCharIndex < block.data.length) {
                         const step = 5; // Faster arcade feel
                         currentBlockCharIndex += step;
                         setTextProgress(prev => ({...prev, [currentBlockIndex]: currentBlockCharIndex}));
                         return 'content';
                     } else {
                         currentBlockIndex++;
                         currentBlockCharIndex = 0;
                         return 'content';
                     }
                 } else if (block.type === 'image') {
                     currentBlockIndex++;
                     currentBlockCharIndex = 0;
                     return 'content';
                 }
             }
             return prevPhase;
         });
      }, 10);
      return () => clearInterval(interval);
    } 
    else if (model.status === 'completed') {
      setStreamedThought(model.mockThought);
      const allVis = {};
      const allProg = {};
      model.contentSequence.forEach((block, idx) => {
          allVis[idx] = true;
          if (block.type === 'text') allProg[idx] = block.data.length;
      });
      setBlockVisibility(allVis);
      setTextProgress(allProg);
      setStreamingPhase('done');
    }
  }, [model.status, model.mockThought, model.contentSequence]);

  const theme = {
    blue: {
      wrapper: 'shadow-[0_0_0_1px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] border-blue-900/50 bg-gray-900',
      accent: 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]',
      header: 'bg-gradient-to-b from-blue-900/20 to-transparent',
      badge: 'bg-blue-600 text-white shadow-sm',
      iconBg: 'bg-gray-800 border border-blue-500/30',
      icon: 'text-blue-400',
    },
    emerald: {
      wrapper: 'shadow-[0_0_0_1px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] border-emerald-900/50 bg-gray-900',
      accent: 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]',
      header: 'bg-gradient-to-b from-emerald-900/20 to-transparent',
      badge: 'bg-emerald-600 text-white shadow-sm',
      iconBg: 'bg-gray-800 border border-emerald-500/30',
      icon: 'text-emerald-400',
    },
    amber: {
      wrapper: 'shadow-[0_0_0_1px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] border-amber-900/50 bg-gray-900',
      accent: 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]',
      header: 'bg-gradient-to-b from-amber-900/20 to-transparent',
      badge: 'bg-amber-600 text-white shadow-sm',
      iconBg: 'bg-gray-800 border border-amber-500/30',
      icon: 'text-amber-400',
    }
  }[model.colorTheme];

  const Icon = model.icon;
  const isCompact = layoutMode === 'grid' && window.innerWidth < 1600; 

  // Stagger animation delay based on index
  const delayStyle = { animationDelay: `${index * 100}ms` };

  return (
    <div 
        style={delayStyle}
        className={`flex flex-col h-full rounded-2xl border overflow-hidden relative group transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in fill-mode-backwards ${theme.wrapper}`}
    >
      {/* Power Bar Accent */}
      <div className={`h-1 w-full ${theme.accent} relative overflow-hidden`}>
         <div className="absolute inset-0 bg-white/40 animate-[shimmer_2s_infinite] skew-x-12"></div>
      </div>
      
      {/* Game-like Header */}
      <div className={`px-4 pt-4 pb-3 flex items-start justify-between border-b border-white/5 ${theme.header}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`p-2 rounded-xl shrink-0 ${theme.iconBg} shadow-sm transform group-hover:rotate-12 transition-transform duration-300`}>
            <Icon className={`w-5 h-5 ${theme.icon}`} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-gray-100 leading-tight text-sm truncate uppercase tracking-tight">{model.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${theme.badge}`}>
                LVL {model.status === 'completed' ? '99' : '1'}
              </span>
              {!isCompact && (
                <span className="text-[10px] text-gray-500 font-bold font-mono flex items-center gap-1 whitespace-nowrap bg-black/30 px-1 rounded border border-white/5">
                  <Clock size={10} />
                  {model.timestamp}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
           <button className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-90">
            <Maximize2 size={16} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto font-medium text-gray-300 text-[14px] leading-relaxed relative bg-gray-900/50 flex flex-col">
        {model.mockThought && (
          <ThinkingBlock 
            content={streamedThought} 
            colorTheme={model.colorTheme}
            isExpanded={isThoughtOpen}
            onToggle={() => setIsThoughtOpen(!isThoughtOpen)}
            isStreaming={streamingPhase === 'thought'}
          />
        )}

        <div className="space-y-2">
            {model.status === 'loading' ? (
                // Gamey Skeleton
                <div className="space-y-3 animate-pulse opacity-50">
                    <div className="h-4 bg-gray-700 rounded-md w-3/4 border-b border-gray-600"></div>
                    <div className="h-4 bg-gray-700 rounded-md w-full border-b border-gray-600"></div>
                    <div className="flex gap-2 pt-2">
                         <div className="h-2 w-2 rounded-full bg-gray-600 animate-bounce"></div>
                         <div className="h-2 w-2 rounded-full bg-gray-600 animate-bounce delay-75"></div>
                         <div className="h-2 w-2 rounded-full bg-gray-600 animate-bounce delay-150"></div>
                    </div>
                </div>
            ) : (
                model.contentSequence.map((block, idx) => {
                    if (!blockVisibility[idx]) return null;

                    if (block.type === 'text') {
                        const textToShow = block.data.slice(0, textProgress[idx] || 0);
                        return (
                            <div key={idx} className="whitespace-pre-wrap">
                                {textToShow}
                                {streamingPhase === 'content' && idx === Object.keys(blockVisibility).length - 1 && (
                                     <span className="inline-block w-2.5 h-4 align-middle ml-0.5 bg-white animate-pulse shadow-[0_0_8px_white]"></span>
                                )}
                            </div>
                        );
                    } else if (block.type === 'image') {
                        return (
                            <ImageBlock 
                                key={idx} 
                                url={block.data} 
                                isVisible={true} 
                                onUseAsReference={onUseAsReference}
                            />
                        );
                    }
                    return null;
                })
            )}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="px-4 py-2 bg-black/20 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-bold tracking-wider uppercase">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 group/stat cursor-help">
                <Trophy size={12} className="text-yellow-600 group-hover/stat:text-yellow-400 group-hover/stat:scale-125 transition-all" />
                <span>XP: 840</span>
            </div>
            <div className="flex items-center gap-1 group/stat cursor-help">
                <Activity size={12} className="text-green-600 group-hover/stat:text-green-400 group-hover/stat:scale-125 transition-all" />
                <span>Ping: 12ms</span>
            </div>
        </div>
         <div className="flex items-center gap-2">
             <button className={`p-1.5 rounded-lg hover:bg-white/10 hover:text-green-400 active:scale-90 transition-all`}>
                <ThumbsUp size={14} strokeWidth={3} />
             </button>
             <button className={`p-1.5 rounded-lg hover:bg-white/10 hover:text-red-400 active:scale-90 transition-all`}>
                <ThumbsDown size={14} strokeWidth={3} />
             </button>
         </div>
      </div>
    </div>
  );
};

// --- Control Rail Component ---

const ControlRail = ({ 
  onRerun, 
  onDelete, 
  onLayoutChange, 
  currentLayout, 
  gridColumns, 
  onGridColumnsChange 
}) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500 ease-out">
      <div className="bg-black/80 backdrop-blur-xl text-white rounded-2xl p-2 shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-white/10 flex items-center gap-3 ring-1 ring-white/10 transform hover:scale-[1.02] transition-transform">
        
        {/* Global Actions */}
        <div className="flex items-center gap-2 pl-2 pr-3 border-r border-white/10">
          <button 
            onClick={onRerun}
            className="group relative p-3 bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-xl text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] border border-emerald-500/50 hover:translate-y-[-2px] active:translate-y-[1px] transition-all"
            title="Rerun All"
          >
            <Play size={20} className="fill-white" strokeWidth={3} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-black"></span>
            </span>
          </button>
          <button 
            onClick={onDelete}
            className="p-3 hover:bg-red-900/30 text-red-500 hover:text-red-300 rounded-xl transition-all active:scale-90 active:rotate-12"
            title="Clear Thread"
          >
            <Trash2 size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* View Mode Toggles */}
        <div className="flex items-center gap-1 px-1 p-1 bg-white/5 rounded-xl border border-white/5">
          <button 
            onClick={() => onLayoutChange('stacked')}
            className={`p-2 rounded-lg transition-all duration-200 active:scale-95 ${currentLayout === 'stacked' ? 'bg-white/20 text-white shadow-sm font-bold' : 'hover:bg-white/10 text-gray-500 hover:text-white'}`}
          >
            <Rows size={18} strokeWidth={2.5} />
          </button>
          
          <button 
            onClick={() => onLayoutChange('columns')}
            className={`p-2 rounded-lg transition-all duration-200 active:scale-95 ${currentLayout === 'columns' ? 'bg-white/20 text-white shadow-sm font-bold' : 'hover:bg-white/10 text-gray-500 hover:text-white'}`}
          >
            <AlignJustify size={18} className="rotate-90" strokeWidth={2.5} />
          </button>

          <button 
            onClick={() => onLayoutChange('grid')}
            className={`p-2 rounded-lg transition-all duration-200 active:scale-95 ${currentLayout === 'grid' ? 'bg-white/20 text-white shadow-sm font-bold' : 'hover:bg-white/10 text-gray-500 hover:text-white'}`}
          >
            <Grid3X3 size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Dynamic Grid Controls */}
        <div className={`overflow-hidden transition-all duration-300 flex items-center gap-2 ${currentLayout === 'grid' ? 'w-auto px-2 opacity-100' : 'w-0 px-0 opacity-0'}`}>
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/5">
            {[2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                onClick={() => onGridColumnsChange(num)}
                className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black transition-all active:scale-90 ${gridColumns === num ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Main App Layout ---

const ParallelModelView = () => {
  const [layoutMode, setLayoutMode] = useState('columns'); 
  const [gridColumns, setGridColumns] = useState(4);
  const [models, setModels] = useState(BASE_MODELS);
  const [activeAttachment, setActiveAttachment] = useState(null);
  
  // Mouse position for grid spotlight
  const containerRef = useRef(null);
  useEffect(() => {
      const updateMousePosition = (ev) => {
          if (!containerRef.current) return;
          const { clientX, clientY } = ev;
          containerRef.current.style.setProperty('--mouse-x', `${clientX}px`);
          containerRef.current.style.setProperty('--mouse-y', `${clientY}px`);
      };
      window.addEventListener('mousemove', updateMousePosition);
      return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);

  // Initial load animation trigger
  useEffect(() => {
    setModels([]);
    setTimeout(() => setModels(BASE_MODELS), 100);
  }, []);

  const handleLayoutChange = (mode) => {
    setLayoutMode(mode);
    setModels([]); // Reset for re-entry animation
    setTimeout(() => {
        if (mode === 'grid') {
            setModels(generateDemoData(9));
        } else {
            setModels(BASE_MODELS);
        }
    }, 50);
  };

  const handleRerun = () => {
    // Game-like reset sequence
    setModels(prev => prev.map(m => ({ ...m, status: 'loading' })));
    setTimeout(() => {
        setModels(prev => prev.map(m => ({ ...m, status: 'streaming' })));
    }, 800);
  };

  const handleDelete = () => {
    setModels([]);
    // Respawn logic
    setTimeout(() => setModels(BASE_MODELS), 1200); 
  };

  const handleUseAsReference = (imgUrl) => {
      setActiveAttachment(imgUrl);
  };

  const getGridClass = () => {
    if (models.length === 0) return '';
    switch (layoutMode) {
      case 'stacked': return 'grid-cols-1 max-w-2xl mx-auto';
      case 'columns': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto';
      case 'grid':
        const colMap = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' };
        return `${colMap[gridColumns]} max-w-[1920px] mx-auto`;
      default: return 'grid-cols-3';
    }
  };

  return (
    <div 
        ref={containerRef}
        className="min-h-screen bg-black text-gray-100 font-sans relative overflow-hidden selection:bg-indigo-500 selection:text-white"
    >
      
      {/* Interactive Grid Background */}
      {/* Base Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.15]"
        style={{
             backgroundImage: `
                linear-gradient(to right, #444 1px, transparent 1px),
                linear-gradient(to bottom, #444 1px, transparent 1px)
             `,
             backgroundSize: '40px 40px'
        }}
      ></div>
      
      {/* Spotlight Overlay - Highlights grid cells near mouse */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
            background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(79, 70, 229, 0.1), transparent 40%)`,
            maskImage: `
                linear-gradient(to right, black 1px, transparent 1px),
                linear-gradient(to bottom, black 1px, transparent 1px)
            `,
            maskSize: '40px 40px',
            WebkitMaskImage: `
                linear-gradient(to right, black 1px, transparent 1px),
                linear-gradient(to bottom, black 1px, transparent 1px)
            `,
            WebkitMaskSize: '40px 40px',
            // This second layer adds the "glow" on top of the grid lines essentially
        }}
      ></div>

      {/* Mouse Glow (General Ambient) */}
      <div 
         className="absolute inset-0 pointer-events-none"
         style={{
             background: `radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), rgba(29, 78, 216, 0.05), transparent 60%)`
         }}
      ></div>

      {/* Top Navigation */}
      <header className="bg-black/50 backdrop-blur-xl border-b border-white/10 px-6 py-4 sticky top-0 z-10 shadow-lg transition-all duration-300">
        <div className={`mx-auto w-full transition-all duration-300 ${layoutMode === 'grid' ? 'max-w-[1920px]' : 'max-w-7xl'}`}>
            
            {/* Prompt Bar with Attachment Logic */}
            <div className={`bg-black/60 backdrop-blur-md rounded-2xl p-2 border border-indigo-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex flex-col gap-2 transition-all duration-500 ${models.length === 0 ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}>
                {activeAttachment && (
                    <div className="px-2 pt-2 animate-in slide-in-from-bottom-2 fade-in">
                        <div className="inline-flex items-center gap-3 bg-indigo-900/30 border border-indigo-500/30 pr-3 rounded-xl overflow-hidden group shadow-sm">
                            <div className="relative">
                                <img src={activeAttachment} alt="Ref" className="h-12 w-12 object-cover" />
                                <div className="absolute inset-0 ring-1 ring-indigo-400/50 ring-inset"></div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Target Locked</span>
                                <span className="text-xs text-gray-400 font-medium">Reference asset active</span>
                            </div>
                            <button 
                                onClick={() => setActiveAttachment(null)}
                                className="ml-2 p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                            >
                                <X size={14} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4 px-2 pb-2">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-xl w-10 h-10 flex items-center justify-center shrink-0 font-black text-xs shadow-lg transform rotate-3 border border-white/20 ring-1 ring-black">
                        P1
                    </div>
                    <div className="text-sm text-gray-300 flex-1 font-medium bg-white/5 p-3 rounded-xl border border-white/5">
                        {activeAttachment ? (
                            <span className="text-indigo-300">Generate variations of the character mask with a more organic, bone-like texture.</span>
                        ) : (
                            "Create a cyberpunk oni character concept. Provide both a visual render and a technical description of the armor."
                        )}
                    </div>
                </div>
            </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 p-6 overflow-y-auto pb-40">
        <div className={`transition-all duration-500 ease-in-out`}>
            {models.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center text-gray-500">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-10 animate-pulse"></div>
                        <Trash2 size={64} className="mb-6 text-gray-600 relative z-10" />
                    </div>
                    <p className="font-bold text-xl text-gray-400 tracking-tight">CLEARED</p>
                    <p className="text-sm text-gray-500 mt-2 font-mono bg-white/5 px-3 py-1 rounded">Waiting for input...</p>
                </div>
            ) : (
                <div className={`grid gap-6 ${getGridClass()}`}>
                    {models.map((model, idx) => (
                    <ResponseCard 
                        key={model.id} 
                        index={idx}
                        model={model} 
                        layoutMode={layoutMode}
                        onUseAsReference={handleUseAsReference}
                    />
                    ))}
                </div>
            )}
        </div>
      </main>

      <ControlRail 
        onRerun={handleRerun}
        onDelete={handleDelete}
        onLayoutChange={handleLayoutChange}
        currentLayout={layoutMode}
        gridColumns={gridColumns}
        onGridColumnsChange={setGridColumns}
      />

    </div>
  );
};

export default ParallelModelView;