describe('Directory Listing', () => {
  it('displays fixture directory contents on startup', async () => {
    const leftPane = await $('[data-testid="pane-left"]');
    await leftPane.waitForExist({ timeout: 10000 });

    const fileListBody = await leftPane.$('[data-testid="file-list-body"]');
    await fileListBody.waitForExist({ timeout: 10000 });

    await browser.pause(500);

    const entries = await leftPane.$$('[data-testid="file-entry"]');
    expect(entries.length).toBe(5);

    const html = await fileListBody.getHTML();
    expect(html).toContain('documents');
    expect(html).toContain('downloads');
    expect(html).toContain('file.txt');
    expect(html).toContain('readme.md');
  });

  it('shows directories before files (sorted)', async () => {
    const leftPane = await $('[data-testid="pane-left"]');
    await leftPane.$('[data-testid="file-list-body"]').waitForExist({ timeout: 10000 });

    await browser.pause(500);

    const entries = await leftPane.$$('[data-testid="file-entry"]');

    const firstEntry = entries[0];
    const secondEntry = entries[1];

    const firstType = await firstEntry.getAttribute('data-entry-type');
    const secondType = await secondEntry.getAttribute('data-entry-type');

    expect(firstType).toBe('directory');
    expect(secondType).toBe('directory');
  });

  it('displays correct columns for each entry', async () => {
    const leftPane = await $('[data-testid="pane-left"]');
    await leftPane.$('[data-testid="file-list-body"]').waitForExist({ timeout: 10000 });

    await browser.pause(500);

    const firstFileEntry = await leftPane.$('[data-testid="file-entry"][data-entry-type="file"]');
    await firstFileEntry.waitForExist({ timeout: 5000 });

    const name = await firstFileEntry.$('[data-testid="entry-name"]');
    const size = await firstFileEntry.$('[data-testid="entry-size"]');
    const date = await firstFileEntry.$('[data-testid="entry-date"]');

    expect(await name.isExisting()).toBe(true);
    expect(await size.isExisting()).toBe(true);
    expect(await date.isExisting()).toBe(true);
  });

  it('shows hidden files', async () => {
    const leftPane = await $('[data-testid="pane-left"]');
    const fileListBody = await leftPane.$('[data-testid="file-list-body"]');
    await fileListBody.waitForExist({ timeout: 10000 });

    await browser.pause(500);

    const html = await fileListBody.getHTML();
    expect(html).toContain('.hidden');
  });
});
