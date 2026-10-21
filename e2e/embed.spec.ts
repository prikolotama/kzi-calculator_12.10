import { expect, test } from '@playwright/test';

test('справка об обмене файлами открывается и закрывается с клавиатуры', async ({ page }) => {
  await page.goto('./');
  const trigger = page.getByRole('button', { name: 'Как это работает', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Как это работает' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('не отправляются на сервер');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  for (const mode of ['kzi', 'uzi']) {
    await page.goto(`./#${mode}`);
    await expect(page.getByText('Разработано:', { exact: false })).toHaveCount(0);
    await expect(page.locator('a[href^="mailto:"], a[href^="tel:"]')).toHaveCount(0);
  }
});

for (const width of [390, 1440]) {
  test(`iframe сообщает высоту при росте и уменьшении содержимого, ширина ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/embed-test', route =>
      route.fulfill({
        contentType: 'text/html',
        body: `<style>body{margin:0}iframe{display:block;width:100%;border:0;height:600px}</style>
        <iframe src="/#kzi"></iframe><script>
        const frame=document.querySelector('iframe');
        window.addEventListener('message', e=>{
          if(e.source===frame.contentWindow && e.origin===location.origin && e.data.type==='checku:resize') {
            frame.style.height=e.data.height+'px';
          }
        });</script>`,
      })
    );
    await page.goto('./embed-test');
    const frame = page.frames().find(item => item.parentFrame());
    if (!frame) throw new Error('iframe не загружен');
    await frame.locator('#root header').waitFor();
    await expect.poll(() => page.locator('iframe').evaluate(el => el.clientHeight)).toBeGreaterThan(600);
    const initial = await page.locator('iframe').evaluate(el => el.clientHeight);
    await frame.evaluate(() => {
      const block = document.createElement('div');
      block.id = 'resize-probe';
      block.style.height = '700px';
      document.getElementById('root')!.append(block);
    });
    await expect.poll(() => page.locator('iframe').evaluate(el => el.clientHeight)).toBe(initial + 700);
    await frame.locator('#resize-probe').evaluate(el => el.remove());
    await expect.poll(() => page.locator('iframe').evaluate(el => el.clientHeight)).toBe(initial);
    expect(await frame.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeLessThanOrEqual(
      1
    );
  });
}
