import './app.css';
import { initializeTheme } from '#core/theme';
import { createDirectoryService } from '#features/pane/directory-service';
import { createKeyboardHandler } from '#features/pane/keyboard';
import { Pane } from '#features/pane/pane';
import { createPaneStore } from '#features/pane/store';
import { createSignal, onCleanup, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';

initializeTheme();

function App() {
  const [activePane, setActivePane] = createSignal<'left' | 'right'>('left');

  const leftService = createDirectoryService();
  const rightService = createDirectoryService();

  const leftStore = createPaneStore({ directoryService: leftService });
  const rightStore = createPaneStore({ directoryService: rightService });

  const [leftState, leftActions] = leftStore;
  const [rightState, rightActions] = rightStore;

  const [_errorState, setErrorState] = createStore({
    left: null as string | null,
    right: null as string | null
  });

  const handleKeyDown = async (e: KeyboardEvent) => {
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setActivePane((prev) => (prev === 'left' ? 'right' : 'left'));
        return;
      }
    }

    const isLeft = activePane() === 'left';
    const state = isLeft ? leftState : rightState;
    const actions = isLeft ? leftActions : rightActions;
    const service = isLeft ? leftService : rightService;
    const setError = (error: string | null) => {
      setErrorState(isLeft ? 'left' : 'right', error);
    };

    const handler = createKeyboardHandler({ state, actions, service, setError });
    await handler(e);
  };

  const keyDownListener = (e: KeyboardEvent) => {
    void handleKeyDown(e);
  };

  onMount(() => {
    void Promise.all([leftActions.initialize(), rightActions.initialize()]);
    window.addEventListener('keydown', keyDownListener);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', keyDownListener);
  });

  return (
    <div class="flex h-full w-full">
      <div
        class="flex-1 flex flex-col bg-bg-surface text-text overflow-hidden border-r border-border"
        data-testid="pane-left"
      >
        <Pane
          store={leftStore}
          isActive={activePane() === 'left'}
          onActivate={() => setActivePane('left')}
        />
      </div>
      <div
        class="flex-1 flex flex-col bg-bg-surface text-text overflow-hidden"
        data-testid="pane-right"
      >
        <Pane
          store={rightStore}
          isActive={activePane() === 'right'}
          onActivate={() => setActivePane('right')}
        />
      </div>
    </div>
  );
}

export default App;
