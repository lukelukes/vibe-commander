import './app.css';
import { initializeTheme } from '#core/theme';
import { Pane } from '#features/pane';

initializeTheme();

function App() {
  return (
    <div class="flex h-full w-full">
      <div
        class="flex-1 flex flex-col bg-bg-surface text-text overflow-hidden border-r border-border"
        data-testid="pane-left"
      >
        <Pane />
      </div>
      <div
        class="flex-1 flex flex-col bg-bg-surface text-text overflow-hidden"
        data-testid="pane-right"
      >
        <Pane />
      </div>
    </div>
  );
}

export default App;
