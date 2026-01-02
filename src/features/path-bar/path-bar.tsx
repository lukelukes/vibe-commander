import { createSignal, Show } from 'solid-js';

export interface PathBarProps {
  path: string;
  onNavigate: (path: string) => void;
}

export function PathBar(props: PathBarProps) {
  const [isEditing, setIsEditing] = createSignal(false);
  const [editValue, setEditValue] = createSignal('');
  // oxlint-disable-next-line no-unassigned-vars
  let inputRef!: HTMLInputElement;

  const startEdit = () => {
    setEditValue(props.path);
    setIsEditing(true);
    requestAnimationFrame(() => {
      inputRef?.focus();
      inputRef?.select();
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const submitEdit = () => {
    const value = editValue().trim();
    setIsEditing(false);
    if (value && value !== props.path) {
      props.onNavigate(value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Tab') {
      cancelEdit();
    }
  };

  return (
    <div
      class="flex items-center h-8 px-2 bg-bg-subtle border-b border-border text-sm font-mono"
      data-testid="path-bar"
    >
      <Show
        when={isEditing()}
        fallback={
          <button
            type="button"
            class="flex-1 truncate cursor-pointer hover:bg-bg-elevated px-1 py-0.5 rounded text-left bg-transparent border-none"
            onClick={startEdit}
            data-testid="path-display"
          >
            {props.path || '/'}
          </button>
        }
      >
        <input
          ref={inputRef}
          type="text"
          value={editValue()}
          onInput={(e) => setEditValue(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          onBlur={cancelEdit}
          class="flex-1 bg-bg-surface border border-border rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-accent"
          data-testid="path-input"
        />
      </Show>
    </div>
  );
}
