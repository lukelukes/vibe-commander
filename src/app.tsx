import './app.css';
import { initializeTheme } from '#core/theme';
import { createDirectoryService } from '#features/pane/directory-service';
import { createKeyboardHandler } from '#features/pane/keyboard';
import { Pane } from '#features/pane/pane';
import { createPaneStore } from '#features/pane/store';
import { logger } from '#lib/logger';
import { Show, createSignal, onCleanup, onMount } from 'solid-js';
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

  const [errorState, setErrorState] = createStore({
    left: null as string | null,
    right: null as string | null
  });

  const leftHandler = createKeyboardHandler({
    state: leftState,
    actions: leftActions,
    service: leftService,
    setError: (error: string | null) => {
      setErrorState('left', error);
    }
  });

  const rightHandler = createKeyboardHandler({
    state: rightState,
    actions: rightActions,
    service: rightService,
    setError: (error: string | null) => {
      setErrorState('right', error);
    }
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

    const handler = activePane() === 'left' ? leftHandler : rightHandler;
    await handler(e);
  };

  const keyDownListener = (e: KeyboardEvent) => {
    handleKeyDown(e).catch((error: unknown) => {
      logger.error('Keyboard handler failed:', error);
    });
  };

  onMount(() => {
    Promise.all([leftActions.initialize(), rightActions.initialize()]).catch((error: unknown) => {
      logger.error('Failed to initialize panes:', error);
      const message = error instanceof Error ? error.message : 'Initialization failed';
      setErrorState('left', message);
      setErrorState('right', message);
    });
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
        <Show
          when={errorState.left}
          fallback={
            <Pane
              store={leftStore}
              isActive={activePane() === 'left'}
              onActivate={() => setActivePane('left')}
            />
          }
        >
          <div class="flex items-center justify-center h-full p-4">
            <div class="text-error">{errorState.left}</div>
          </div>
        </Show>
      </div>
      <div
        class="flex-1 flex flex-col bg-bg-surface text-text overflow-hidden"
        data-testid="pane-right"
      >
        <Show
          when={errorState.right}
          fallback={
            <Pane
              store={rightStore}
              isActive={activePane() === 'right'}
              onActivate={() => setActivePane('right')}
            />
          }
        >
          <div class="flex items-center justify-center h-full p-4">
            <div class="text-error">{errorState.right}</div>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default App;
