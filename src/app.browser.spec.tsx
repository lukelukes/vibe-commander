import {
  createMockIPC,
  createMockFileEntry,
  createAppError,
  pendingForever
} from '#testing/mock-ipc-factory';
import { render } from '#vitest-browser-solid/pure';
import { mockWindows, clearMocks } from '@tauri-apps/api/mocks';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import App from './app.tsx';

describe('App', () => {
  beforeEach(() => {
    mockWindows('main');
  });

  afterEach(() => {
    clearMocks();
  });

  it('renders two independent panes', async () => {
    createMockIPC({
      listDirectoryResponses: [
        [createMockFileEntry('File', { name: 'left-only.txt', path: '/home/test/left-only.txt' })],
        [
          createMockFileEntry('File', {
            name: 'right-only.txt',
            path: '/home/test/right-only.txt',
            size: 2048
          })
        ]
      ]
    });

    const screen = render(() => <App />);

    const leftPane = screen.getByTestId('pane-left');
    const rightPane = screen.getByTestId('pane-right');

    await expect.element(leftPane).toBeVisible();
    await expect.element(rightPane).toBeVisible();
    await expect.element(leftPane.getByText('left-only.txt')).toBeVisible();
    await expect.element(rightPane.getByText('right-only.txt')).toBeVisible();
  });

  it('displays file content in both panes with different content', async () => {
    createMockIPC({
      listDirectoryResponses: [
        [
          createMockFileEntry('Directory', {
            name: 'documents',
            path: '/home/test/documents'
          })
        ],
        [
          createMockFileEntry('Directory', {
            name: 'downloads',
            path: '/home/test/downloads'
          })
        ]
      ]
    });

    const screen = render(() => <App />);

    await expect.element(screen.getByTestId('pane-left').getByText('documents')).toBeVisible();
    await expect.element(screen.getByTestId('pane-right').getByText('downloads')).toBeVisible();

    await expect.element(screen.getByTestId('pane-left').getByText('Name')).toBeVisible();
    await expect.element(screen.getByTestId('pane-right').getByText('Name')).toBeVisible();
  });

  it('shows loading state while fetching directory contents', () => {
    createMockIPC({
      listDirectoryResponses: [pendingForever]
    });

    const screen = render(() => <App />);

    const loadingIndicators = screen.getByText('Loading...').elements();
    expect(loadingIndicators.length).toBe(2);
  });

  it('displays error state when directory fails to load', async () => {
    createMockIPC({
      listDirectoryResponses: [createAppError('PermissionDenied', { path: '/home/test' })]
    });

    const screen = render(() => <App />);

    await expect
      .element(screen.getByTestId('pane-left').getByText(/Permission denied/))
      .toBeVisible();
    await expect
      .element(screen.getByTestId('pane-right').getByText(/Permission denied/))
      .toBeVisible();
  });

  it('handles mixed states: one pane loading, one error', async () => {
    createMockIPC({
      listDirectoryResponses: [pendingForever, createAppError('NotFound', { path: '/nonexistent' })]
    });

    const screen = render(() => <App />);

    const leftPane = screen.getByTestId('pane-left');
    const rightPane = screen.getByTestId('pane-right');

    expect(leftPane.getByText('Loading...').element()).toBeVisible();
    await expect.element(rightPane.getByText(/Not found/)).toBeVisible();
  });

  it('handles mixed states: one pane success, one error', async () => {
    createMockIPC({
      listDirectoryResponses: [
        [createMockFileEntry('File', { name: 'success.txt', path: '/home/test/success.txt' })],
        createAppError('PermissionDenied', { path: '/restricted' })
      ]
    });

    const screen = render(() => <App />);

    await expect.element(screen.getByTestId('pane-left').getByText('success.txt')).toBeVisible();
    await expect
      .element(screen.getByTestId('pane-right').getByText(/Permission denied/))
      .toBeVisible();
  });
});
