import React, { useState, useMemo, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import {
    Search,
    X,
    Check,
    ChevronDown,
    Eye,
    BookOpen,
    Palette,
    Code,
    Pin
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { Badge } from '../atoms/Badge';
import { AIModel, ModelSelectorProps } from './types';

// Feature icons map
const FEATURE_ICONS: Record<string, React.ElementType> = {
    vision: Eye,
    research: BookOpen,
    imageGen: Palette,
    coding: Code,
};

export function ModelSelectorDropdown({
    models,
    selectedModelIds,
    onSelect,
    multiSelect = false,
    className,
    placeholder = "Select Model"
}: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

    // Initialize pinned state from models
    useEffect(() => {
        const initialPinned = new Set(models.filter(m => m.isPinned).map(m => m.id));
        if (initialPinned.size > 0) {
            setPinnedIds(prev => {
                const next = new Set(prev);
                initialPinned.forEach(id => next.add(id));
                return next;
            });
        }
    }, [models]);

    const togglePin = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPinnedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        // Ideally persist to localStorage here
    };

    const handleSelect = (id: string) => {
        if (multiSelect) {
            const newSelected = selectedModelIds.includes(id)
                ? selectedModelIds.filter(mid => mid !== id)
                : [...selectedModelIds, id];
            onSelect(newSelected);
        } else {
            onSelect([id]);
            setIsOpen(false);
        }
    };

    const clearSelection = () => onSelect([]);

    // Filtering Logic
    const filteredModels = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return models;
        return models.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.provider.name.toLowerCase().includes(q) ||
            Object.entries(m.capabilities).some(([k, v]) => v && k.toLowerCase().includes(q))
        );
    }, [models, searchQuery]);

    // Grouping Logic
    const groupedModels = useMemo(() => {
        const pinned: AIModel[] = [];
        const groups: Record<string, AIModel[]> = {};

        filteredModels.forEach(m => {
            if (pinnedIds.has(m.id)) {
                pinned.push(m);
            } else {
                const g = m.group || "Other";
                if (!groups[g]) groups[g] = [];
                groups[g].push(m);
            }
        });

        return { pinned, groups };
    }, [filteredModels, pinnedIds]);

    // UI Helper for Model Row
    const ModelRow = ({ model }: { model: AIModel }) => {
        const isSelected = selectedModelIds.includes(model.id);
        const isPinned = pinnedIds.has(model.id);

        return (
            <div
                className={cn(
                    "group flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                    "hover:bg-slate-800",
                    isSelected ? "bg-slate-800/50" : "transparent"
                )}
                onClick={() => handleSelect(model.id)}
            >
                {/* Selection Control */}
                <div className={cn(
                    "flex items-center justify-center w-5 h-5 rounded border transition-colors",
                    multiSelect
                        ? (isSelected ? "bg-blue-600 border-blue-600" : "border-slate-600 group-hover:border-slate-500")
                        : "border-transparent" // Radio styling could go here, or just highlight
                )}>
                    {multiSelect && isSelected && <Check size={14} className="text-white" />}
                    {!multiSelect && isSelected && <Check size={16} className="text-blue-500" />}
                </div>

                {/* Provider Icon */}
                <div className="w-5 h-5 flex-shrink-0 bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
                    {model.provider.iconUrl ? (
                        <img src={model.provider.iconUrl} alt={model.provider.name} className="w-full h-full object-cover" />
                    ) : (
                        // Fallback text icon
                        <span className="text-[10px] font-bold text-slate-300">{model.provider.name[0]}</span>
                    )}
                </div>

                {/* Model Identity */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-slate-200 truncate">{model.name}</span>
                        <span className="text-xs text-slate-500 truncate">({model.provider.name})</span>
                    </div>
                </div>

                {/* Features & Context & Pin */}
                <div className="flex items-center gap-3">
                    {/* Active Features */}
                    <div className="flex gap-1">
                        {Object.entries(model.capabilities).map(([cap, active]) => {
                            if (!active) return null;
                            const Icon = FEATURE_ICONS[cap];
                            if (!Icon) return null;
                            return (
                                <div key={cap} className="text-slate-500 group-hover:text-slate-400" title={cap}>
                                    <Icon size={14} />
                                </div>
                            );
                        })}
                    </div>

                    {/* Context Window */}
                    <span className="font-mono text-xs text-slate-500">{model.formattedContext}</span>

                    {/* Pin Action */}
                    <button
                        onClick={(e) => togglePin(e, model.id)}
                        className={cn(
                            "p-1 rounded hover:bg-slate-700 transition-colors",
                            isPinned ? "text-slate-200" : "text-slate-600 opacity-0 group-hover:opacity-100"
                        )}
                    >
                        <Pin size={14} fill={isPinned ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>
        );
    };

    // Trigger Label
    const triggerLabel = useMemo(() => {
        if (selectedModelIds.length === 0) return placeholder;
        if (selectedModelIds.length === 1) {
            const m = models.find(x => x.id === selectedModelIds[0]);
            return m ? `${m.name} (${m.provider.name})` : placeholder;
        }
        return `${selectedModelIds.length} models selected`;
    }, [selectedModelIds, models, placeholder]);

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>
                <button className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md hover:border-slate-600 transition-colors text-sm text-slate-200 w-full md:w-auto min-w-[200px]",
                    className
                )}>
                    <div className="flex items-center gap-2 truncate">
                        {/* Show Icon of first selected if single select? */}
                        <span className="truncate">{triggerLabel}</span>
                    </div>
                    <ChevronDown size={14} className="text-slate-400" />
                </button>
            </Popover.Trigger>

            <Popover.Content
                className="z-50 w-[500px] max-w-[95vw] bg-[#0f172a] border border-slate-700 rounded-lg shadow-xl flex flex-col overflow-hidden text-slate-200 anim-scale-in"
                sideOffset={5}
                align="start"
            >
                {/* Header Zone: Search & Filter */}
                <div className="p-3 border-b border-slate-800 space-y-3 bg-[#0f172a]">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 text-slate-500" size={16} />
                        <input
                            type="text"
                            className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-8 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Fuzzy search models..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                onMouseDown={() => setSearchQuery("")} // MouseDown to avoid losing focus
                                className="absolute right-2 top-2 p-0.5 text-slate-500 hover:text-slate-300"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Basic Filter Row (Visual implementation of pills) */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        <Badge variant="default" className="cursor-pointer bg-transparent hover:bg-slate-800 border border-dashed border-slate-600 text-slate-400 font-normal">
                            Org Filters
                        </Badge>
                        {/* Could add actionable filters here if state was managed */}
                    </div>
                </div>

                {/* Scrollable List Body */}
                <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

                    {filteredModels.length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            No models found matching "{searchQuery}"
                        </div>
                    )}

                    {/* Pinned Section */}
                    {groupedModels.pinned.length > 0 && (
                        <div className="space-y-1">
                            <div className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pinned Models</div>
                            {groupedModels.pinned.map(m => (
                                <ModelRow key={m.id} model={m} />
                            ))}
                        </div>
                    )}

                    {/* Groups */}
                    {Object.entries(groupedModels.groups).map(([groupName, groupModels]) => {
                        if (groupModels.length === 0) return null;
                        return (
                            <div key={groupName} className="space-y-1">
                                <div className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider my-2">{groupName}</div>
                                {groupModels.map(m => (
                                    <ModelRow key={m.id} model={m} />
                                ))}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                {multiSelect && selectedModelIds.length > 0 && (
                    <div className="p-2 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                        <span className="text-xs text-slate-400 px-2">{selectedModelIds.length} models selected</span>
                        <button
                            onClick={clearSelection}
                            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                        >
                            Clear selection
                        </button>
                    </div>
                )}
            </Popover.Content>
        </Popover.Root>
    );
}
