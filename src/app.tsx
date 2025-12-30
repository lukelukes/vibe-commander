import './app.css';
import { Pane } from '#features/pane';

function App() {
  return (
    <div class="app">
      <div class="pane left-pane" data-testid="pane-left">
        <Pane />
      </div>
      <div class="pane right-pane" data-testid="pane-right">
        <Pane />
      </div>
    </div>
  );
}

export default App;
