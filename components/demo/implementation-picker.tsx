import {
  PICKER_IDS,
  IMPLEMENTATIONS,
  type ChatAppId,
} from "@/lib/chat-implementations"
import { ChevronDown } from "lucide-react"

export function ImplementationPicker({
  value,
  open,
  disabled,
  onToggle,
  onChange,
}: {
  value: ChatAppId
  open: boolean
  disabled: boolean
  onToggle: () => void
  onChange: (mode: ChatAppId) => void
}) {
  const selected = IMPLEMENTATIONS[value]
  return (
    <div
      className={`bench-picker ${open ? "is-open" : ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="bench-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={onToggle}
      >
        <span className="bench-picker-value">{selected.label}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      <div className="bench-picker-menu" role="listbox" aria-label="Method">
        {PICKER_IDS.map((id) => {
          const item = IMPLEMENTATIONS[id]
          const isSelected = id === value
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={disabled}
              onClick={() => onChange(id)}
            >
              <span className="bench-picker-item-label">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
