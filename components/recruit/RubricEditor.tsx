'use client'
import type { RubricDimension, RubricMode } from '@/lib/recruit-types'

interface Props {
  mode: RubricMode
  dimensions: RubricDimension[]
  onModeChange: (mode: RubricMode) => void
  onDimensionsChange: (next: RubricDimension[]) => void
  inputClassName?: string
}

const DEFAULT_INPUT_CLS =
  'w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-black placeholder-mid/60 focus:outline-none focus:border-accent/60 bg-white transition-colors'

export function RubricEditor({
  mode,
  dimensions,
  onModeChange,
  onDimensionsChange,
  inputClassName,
}: Props) {
  const inputCls = inputClassName ?? DEFAULT_INPUT_CLS

  function addDim() {
    if (dimensions.length >= 6) return
    onDimensionsChange([...dimensions, { name: '', description: '' }])
  }
  function removeDim(i: number) {
    if (dimensions.length <= 3) return
    onDimensionsChange(dimensions.filter((_, idx) => idx !== i))
  }
  function updateDim(i: number, patch: Partial<RubricDimension>) {
    onDimensionsChange(dimensions.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  }

  return (
    <div>
      <label className="block text-sm font-bold text-black mb-2">Scoring rubric</label>
      <div className="space-y-2">
        <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-bg/60 transition-colors">
          <input
            type="radio"
            name="rubricMode"
            className="mt-0.5"
            checked={mode === 'standard'}
            onChange={() => onModeChange('standard')}
          />
          <div>
            <p className="text-sm font-bold text-black">
              Use HQ.ai standard rubric{' '}
              <span className="text-mid font-normal">(recommended)</span>
            </p>
            <p className="text-xs text-mid mt-0.5">
              Clarity, relevance, specificity, structure, role fit - each scored 1-5.
            </p>
          </div>
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-bg/60 transition-colors">
          <input
            type="radio"
            name="rubricMode"
            className="mt-0.5"
            checked={mode === 'custom'}
            onChange={() => onModeChange('custom')}
          />
          <div>
            <p className="text-sm font-bold text-black">Define a custom rubric for this role</p>
            <p className="text-xs text-mid mt-0.5">3-6 dimensions, each scored 1-5.</p>
          </div>
        </label>
      </div>

      {mode === 'custom' && (
        <div className="mt-3 space-y-2">
          {dimensions.map((d, i) => (
            <div key={i} className="flex items-start gap-2 group">
              <div className="flex-1 space-y-1.5">
                <input
                  className={inputCls}
                  placeholder="Dimension name (e.g. client_communication)"
                  value={d.name}
                  onChange={e => updateDim(i, { name: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Short description of what 'strong' looks like"
                  value={d.description}
                  onChange={e => updateDim(i, { description: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeDim(i)}
                disabled={dimensions.length <= 3}
                className="text-mid hover:text-danger transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-2 disabled:opacity-0"
                title="Remove dimension"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
          {dimensions.length < 6 && (
            <button
              type="button"
              onClick={addDim}
              className="text-xs text-accent hover:text-accent2 font-bold transition-colors"
            >
              + Add dimension
            </button>
          )}
        </div>
      )}
    </div>
  )
}
