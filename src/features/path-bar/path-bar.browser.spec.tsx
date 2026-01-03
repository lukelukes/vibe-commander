import { render } from '#vitest-browser-solid/pure';
import { describe, it, expect, vi } from 'vitest';

import { PathBar } from './path-bar';

describe('PathBar', () => {
  describe('rendering', () => {
    it('displays the current path', async () => {
      const screen = render(() => <PathBar path="/home/user/documents" onNavigate={() => {}} />);

      await expect.element(screen.getByText('/home/user/documents')).toBeVisible();
    });

    it('shows path-display button initially', async () => {
      const screen = render(() => <PathBar path="/home/user" onNavigate={() => {}} />);

      await expect.element(screen.getByTestId('path-display')).toBeVisible();
    });
  });

  describe('edit mode', () => {
    it('clicking path-display enters edit mode and shows input', async () => {
      const screen = render(() => <PathBar path="/home/user/documents" onNavigate={() => {}} />);

      await screen.getByTestId('path-display').click();
      await expect.element(screen.getByTestId('path-input')).toBeVisible();
    });

    it('input contains current path value when editing', async () => {
      const screen = render(() => <PathBar path="/home/user/documents" onNavigate={() => {}} />);

      await screen.getByTestId('path-display').click();
      const input = screen.getByTestId('path-input');
      await expect.element(input).toHaveValue('/home/user/documents');
    });

    it('Escape cancels edit and returns to display mode', async () => {
      const onNavigate = vi.fn();
      const screen = render(() => <PathBar path="/home/user" onNavigate={onNavigate} />);

      await screen.getByTestId('path-display').click();
      await expect.element(screen.getByTestId('path-input')).toBeVisible();

      const inputEl = screen.getByTestId('path-input').element() as HTMLInputElement;
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      await expect.element(screen.getByTestId('path-display')).toBeVisible();
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('blur cancels edit', async () => {
      const onNavigate = vi.fn();
      const screen = render(() => <PathBar path="/home/user" onNavigate={onNavigate} />);

      await screen.getByTestId('path-display').click();
      await expect.element(screen.getByTestId('path-input')).toBeVisible();

      const inputEl = screen.getByTestId('path-input').element() as HTMLInputElement;
      inputEl.blur();

      await expect.element(screen.getByTestId('path-display')).toBeVisible();
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('Enter on same path does not trigger navigation', async () => {
      const onNavigate = vi.fn();
      const screen = render(() => <PathBar path="/home/user" onNavigate={onNavigate} />);

      await screen.getByTestId('path-display').click();
      await expect.element(screen.getByTestId('path-input')).toBeVisible();

      const inputEl = screen.getByTestId('path-input').element() as HTMLInputElement;
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      await expect.element(screen.getByTestId('path-display')).toBeVisible();
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });
});
