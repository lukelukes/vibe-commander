function extractText(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

async function getElementText(el: WebdriverIO.Element): Promise<string> {
  const html = await el.getHTML();
  return extractText(html);
}

describe('Navigation User Journey', () => {
  it('allows navigating through directories using keyboard and mouse', async () => {
    const leftPane = await $('[data-testid="pane-left"]');
    await leftPane.waitForExist({ timeout: 10000 });

    await $('[data-testid="pane-left"] [data-testid="file-list-body"]').waitForExist({
      timeout: 10000
    });
    await browser.pause(500);

    const pathBar = await $('[data-testid="path-bar"]');
    await pathBar.waitForExist({ timeout: 5000 });

    const pathDisplay = await $('[data-testid="path-display"]');
    await pathDisplay.waitForExist({ timeout: 5000 });
    const startingPath = await getElementText(pathDisplay);

    const startingHtml = await $(
      '[data-testid="pane-left"] [data-testid="file-list-body"]'
    ).getHTML();
    expect(startingHtml).toContain('documents');
    expect(startingHtml).toContain('downloads');

    await leftPane.click();
    await browser.keys(['ArrowDown']);
    await browser.pause(100);

    let cursorName = await $(
      '[data-testid="pane-left"] [data-testid="file-entry"][data-cursor="true"] [data-testid="entry-name"]'
    );
    expect(await getElementText(cursorName)).toBe('downloads');

    await browser.keys(['ArrowUp']);
    await browser.pause(100);

    cursorName = await $(
      '[data-testid="pane-left"] [data-testid="file-entry"][data-cursor="true"] [data-testid="entry-name"]'
    );
    expect(await getElementText(cursorName)).toBe('documents');

    await browser.keys(['Enter']);
    await browser.waitUntil(
      async () =>
        (
          await getElementText(await $('[data-testid="pane-left"] [data-testid="path-display"]'))
        ).includes('documents'),
      { timeout: 5000, timeoutMsg: 'Expected path to contain documents after Enter' }
    );

    let bodyHtml = await $('[data-testid="pane-left"] [data-testid="file-list-body"]').getHTML();
    expect(bodyHtml).toContain('work');
    expect(bodyHtml).toContain('notes.txt');

    const workEntry = await $('[data-testid="pane-left"] [data-testid="file-entry"]');
    await workEntry.doubleClick();
    await browser.waitUntil(
      async () =>
        (
          await getElementText(await $('[data-testid="pane-left"] [data-testid="path-display"]'))
        ).includes('work'),
      { timeout: 5000, timeoutMsg: 'Expected path to contain work after double-click' }
    );

    bodyHtml = await $('[data-testid="pane-left"] [data-testid="file-list-body"]').getHTML();
    expect(bodyHtml).toContain('report.pdf');
    expect(bodyHtml).toContain('data.csv');

    await browser.keys(['Alt', 'ArrowLeft']);
    await browser.waitUntil(
      async () => {
        const path = await getElementText(
          await $('[data-testid="pane-left"] [data-testid="path-display"]')
        );
        return path.includes('documents') && !path.includes('work');
      },
      { timeout: 5000, timeoutMsg: 'Expected to go back to documents' }
    );

    await browser.keys(['Alt', 'ArrowRight']);
    await browser.waitUntil(
      async () =>
        (
          await getElementText(await $('[data-testid="pane-left"] [data-testid="path-display"]'))
        ).includes('work'),
      { timeout: 5000, timeoutMsg: 'Expected to go forward to work' }
    );

    await browser.keys(['Backspace']);
    await browser.waitUntil(
      async () => {
        const path = await getElementText(
          await $('[data-testid="pane-left"] [data-testid="path-display"]')
        );
        return path.includes('documents') && !path.includes('work');
      },
      { timeout: 5000, timeoutMsg: 'Expected backspace to go to documents' }
    );

    await browser.keys(['Backspace']);
    await browser.waitUntil(
      async () =>
        (await getElementText(
          await $('[data-testid="pane-left"] [data-testid="path-display"]')
        )) === startingPath,
      { timeout: 5000, timeoutMsg: 'Expected to return to starting path' }
    );
  });
});
