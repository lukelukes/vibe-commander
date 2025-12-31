import { Show, onMount } from 'solid-js';

import { FileList } from './file-list.tsx';
import { createPaneStore } from './store';

export function Pane() {
  const [state, actions] = createPaneStore();

  onMount(() => {
    void actions.initialize();
  });

  return (
    <div class="w-full h-full flex flex-col overflow-hidden">
      <Show when={state.loading}>
        <div
          class="flex items-center justify-center h-full text-text-muted text-sm"
          data-testid="pane-loading"
        >
          Loading...
        </div>
      </Show>
      <Show when={state.error}>
        <div
          class="flex items-center justify-center h-full text-error text-sm"
          data-testid="pane-error"
        >
          {state.error}
        </div>
      </Show>
      <Show when={!state.loading && !state.error}>
        <FileList entries={state.entries} />
      </Show>
    </div>
  );
}
