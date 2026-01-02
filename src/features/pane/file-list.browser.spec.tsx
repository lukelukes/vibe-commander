import type { FileEntry } from '#tauri-bindings/index';

import { createMockFileEntry } from '#testing/mock-ipc-factory';
import { render } from '#vitest-browser-solid/pure';
import { describe, it, expect } from 'vitest';

import { FileList, ROW_HEIGHT, ROWS_PER_SCROLL } from './file-list.tsx';

const JAN_15_2024_10_30_UTC = 1705315800;
const JAN_14_2024_14_00_UTC = 1705240800;

const mockEntries: FileEntry[] = [
  createMockFileEntry('Directory', {
    name: 'documents',
    path: '/home/user/documents',
    modified: JAN_15_2024_10_30_UTC
  }),
  createMockFileEntry('Directory', {
    name: 'downloads',
    path: '/home/user/downloads',
    modified: JAN_14_2024_14_00_UTC
  }),
  createMockFileEntry('File', {
    name: 'notes.txt',
    path: '/home/user/notes.txt',
    size: 1024,
    modified: JAN_15_2024_10_30_UTC
  }),
  createMockFileEntry('File', {
    name: 'photo.jpg',
    path: '/home/user/photo.jpg',
    size: 2621440,
    modified: JAN_14_2024_14_00_UTC
  })
];

describe('FileList', () => {
  it('renders all entries with header columns', async () => {
    const screen = render(() => <FileList entries={mockEntries} cursor={0} />);

    await expect.element(screen.getByText('documents')).toBeVisible();
    await expect.element(screen.getByText('downloads')).toBeVisible();
    await expect.element(screen.getByText('notes.txt')).toBeVisible();
    await expect.element(screen.getByText('photo.jpg')).toBeVisible();

    await expect.element(screen.getByText('Name')).toBeVisible();
    await expect.element(screen.getByText('Size')).toBeVisible();
    await expect.element(screen.getByText('Modified')).toBeVisible();
  });

  it('displays formatted file sizes', async () => {
    const screen = render(() => <FileList entries={mockEntries} cursor={0} />);

    await expect.element(screen.getByText('1.0 KB')).toBeVisible();
    await expect.element(screen.getByText('2.5 MB')).toBeVisible();
  });

  it('displays dash for directory sizes', async () => {
    const directoryOnly: FileEntry[] = [
      createMockFileEntry('Directory', {
        name: 'my-folder',
        path: '/home/user/my-folder',
        modified: JAN_15_2024_10_30_UTC
      })
    ];

    const screen = render(() => <FileList entries={directoryOnly} cursor={0} />);

    await expect.element(screen.getByText('my-folder')).toBeVisible();
    await expect.element(screen.getByText('—')).toBeVisible();
  });

  it('displays zero bytes correctly', async () => {
    const emptyFile = createMockFileEntry('File', {
      name: 'empty.txt',
      path: '/home/user/empty.txt',
      size: 0,
      modified: JAN_15_2024_10_30_UTC
    });

    const screen = render(() => <FileList entries={[emptyFile]} cursor={0} />);

    await expect.element(screen.getByText('0 B')).toBeVisible();
  });

  it('displays folder and file icons', async () => {
    const screen = render(() => <FileList entries={mockEntries} cursor={0} />);

    await expect.element(screen.getByText('📁').first()).toBeVisible();
    await expect.element(screen.getByText('📄').first()).toBeVisible();
  });

  it('displays warning icon for unreadable entries', async () => {
    const unreadableEntry = createMockFileEntry('Unreadable', {
      name: 'unreadable.txt',
      path: '/home/user/unreadable.txt',
      reason: 'Permission denied'
    });

    const screen = render(() => <FileList entries={[unreadableEntry]} cursor={0} />);

    await expect.element(screen.getByText('unreadable.txt')).toBeVisible();
    await expect.element(screen.getByText('⚠️')).toBeVisible();
  });

  it('displays file icon for normal files', async () => {
    const normalEntry = createMockFileEntry('File', {
      name: 'normal.txt',
      path: '/home/user/normal.txt',
      size: 1024,
      modified: JAN_15_2024_10_30_UTC
    });

    const screen = render(() => <FileList entries={[normalEntry]} cursor={0} />);

    await expect.element(screen.getByText('normal.txt')).toBeVisible();
    await expect.element(screen.getByText('📄')).toBeVisible();
  });

  it('renders header with empty message when no entries', async () => {
    const screen = render(() => <FileList entries={[]} cursor={-1} />);

    await expect.element(screen.getByText('Name')).toBeVisible();
    await expect.element(screen.getByText('Size')).toBeVisible();
    await expect.element(screen.getByText('Modified')).toBeVisible();
    await expect.element(screen.getByText('Directory is empty')).toBeVisible();
  });

  it('scrolls by fixed amount on wheel down', () => {
    const manyEntries = Array.from({ length: 50 }, (_, i) =>
      createMockFileEntry('File', {
        name: `file${i}.txt`,
        path: `/home/user/file${i}.txt`,
        size: 1024,
        modified: JAN_15_2024_10_30_UTC
      })
    );

    const screen = render(() => <FileList entries={manyEntries} cursor={0} />);

    const body = screen.getByTestId('file-list-body');
    const bodyElement = body.element() as HTMLElement;

    bodyElement.style.height = '100px';
    bodyElement.style.overflow = 'auto';

    bodyElement.scrollTop = 0;

    const wheelEvent = new WheelEvent('wheel', { deltaY: 100, bubbles: true });
    bodyElement.dispatchEvent(wheelEvent);

    expect(bodyElement.scrollTop).toBe(ROW_HEIGHT * ROWS_PER_SCROLL);
  });

  it('scrolls by fixed amount on wheel up', () => {
    const manyEntries = Array.from({ length: 50 }, (_, i) =>
      createMockFileEntry('File', {
        name: `file${i}.txt`,
        path: `/home/user/file${i}.txt`,
        size: 1024,
        modified: JAN_15_2024_10_30_UTC
      })
    );

    const screen = render(() => <FileList entries={manyEntries} cursor={0} />);

    const body = screen.getByTestId('file-list-body');
    const bodyElement = body.element() as HTMLElement;

    bodyElement.style.height = '100px';
    bodyElement.style.overflow = 'auto';

    bodyElement.scrollTop = 200;

    const wheelEvent = new WheelEvent('wheel', { deltaY: -100, bubbles: true });
    bodyElement.dispatchEvent(wheelEvent);

    expect(bodyElement.scrollTop).toBe(200 - ROW_HEIGHT * ROWS_PER_SCROLL);
  });

  it('does not scroll above zero', () => {
    const manyEntries = Array.from({ length: 50 }, (_, i) =>
      createMockFileEntry('File', {
        name: `file${i}.txt`,
        path: `/home/user/file${i}.txt`,
        size: 1024,
        modified: JAN_15_2024_10_30_UTC
      })
    );

    const screen = render(() => <FileList entries={manyEntries} cursor={0} />);

    const body = screen.getByTestId('file-list-body');
    const bodyElement = body.element() as HTMLElement;

    bodyElement.style.height = '100px';
    bodyElement.style.overflow = 'auto';
    bodyElement.scrollTop = 0;

    const wheelEvent = new WheelEvent('wheel', { deltaY: -100, bubbles: true });
    bodyElement.dispatchEvent(wheelEvent);

    expect(bodyElement.scrollTop).toBe(0);
  });

  it('does not scroll past end of content', () => {
    const manyEntries = Array.from({ length: 10 }, (_, i) =>
      createMockFileEntry('File', {
        name: `file${i}.txt`,
        path: `/home/user/file${i}.txt`,
        size: 1024,
        modified: JAN_15_2024_10_30_UTC
      })
    );

    const screen = render(() => <FileList entries={manyEntries} cursor={0} />);

    const body = screen.getByTestId('file-list-body');
    const bodyElement = body.element() as HTMLElement;

    bodyElement.style.height = '100px';
    bodyElement.style.overflow = 'auto';

    const maxScroll = bodyElement.scrollHeight - bodyElement.clientHeight;
    bodyElement.scrollTop = maxScroll;

    const wheelEvent = new WheelEvent('wheel', { deltaY: 100, bubbles: true });
    bodyElement.dispatchEvent(wheelEvent);

    expect(bodyElement.scrollTop).toBeLessThanOrEqual(maxScroll);
  });
});
