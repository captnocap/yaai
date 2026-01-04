import React, { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib'
import { ModelSelectorDropdown } from '../model-selector/ModelSelectorDropdown'
import type { AIModel } from '../model-selector/types'

export interface ModelBadgeSelectorProps {
  availableModels: AIModel[]
  selectedModels: AIModel[]
  onModelsChange: (models: AIModel[]) => void
  className?: string
}

/**
 * Component for selecting and displaying model badges
 * Shows selected models as removable badges and integrates with ModelSelectorDropdown
 */
export function ModelBadgeSelector({
  availableModels,
  selectedModels,
  onModelsChange,
  className,
}: ModelBadgeSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleSelect = (modelIds: string[]) => {
    const models = modelIds
      .map(id => availableModels.find(m => m.id === id))
      .filter((m): m is AIModel => m !== undefined)
    onModelsChange(models)
  }

  const handleRemove = (modelId: string) => {
    onModelsChange(selectedModels.filter(m => m.id !== modelId))
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Selected model badges */}
      {selectedModels.map(model => (
        <div
          key={model.id}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-600 text-white text-xs font-medium"
        >
          <span>{model.name}</span>
          <button
            onClick={() => handleRemove(model.id)}
            className="ml-1 hover:opacity-70 transition-opacity"
            title="Remove model"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {/* Model selector dropdown */}
      <ModelSelectorDropdown
        models={availableModels}
        selectedModelIds={selectedModels.map(m => m.id)}
        onSelect={handleSelect}
        multiSelect
        placeholder={selectedModels.length === 0 ? 'Select models...' : 'Add model...'}
        className="min-w-[120px]"
      />
    </div>
  )
}
