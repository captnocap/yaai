export interface AIModel {
    id: string;
    name: string;
    provider: {
        id: string;
        name: string;
        iconUrl?: string; // Optional path/to/logo.svg
    };
    group: string; // "Coding", "Multimodal", "Creative", "Research Models"
    capabilities: {
        vision: boolean;
        research: boolean;
        imageGen: boolean;
        coding: boolean;
    };
    contextWindow: number; // Raw number
    formattedContext: string; // Display e.g. "128k"
    description?: string;
    isPinned?: boolean; // Initial pinned state
}

export interface ModelSelectorProps {
    models: AIModel[];
    selectedModelIds: string[];
    onSelect: (modelIds: string[]) => void;
    multiSelect?: boolean;
    className?: string; // For custom positioning/sizing
    placeholder?: string;
}
