import { Show, onMount } from 'solid-js';

import { FileList } from './file-list.tsx';
import { createPaneStore } from './store';

export function Pane() {
  const [state, actions] = createPaneStore();

  onMount(() => {
    void actions.initialize();
  });

  return (
    <div class="pane-content">
      <Show when={state.loading}>
        <div class="pane-loading" data-testid="pane-loading">
          Loading...
        </div>
      </Show>
      <Show when={state.error}>
        <div class="pane-error" data-testid="pane-error">
          {state.error}
        </div>
      </Show>
      <Show when={!state.loading && !state.error}>
        <FileList entries={state.entries} />
      </Show>
    </div>
  );
}
