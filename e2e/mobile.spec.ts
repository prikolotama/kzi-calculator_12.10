import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

for (const width of [320, 390, 760]) {
  test(`мобильная шапка и окна в iframe другого домена, ${width}`, async ({ page }) => {
    await page.context().route('http://localhost:4173/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const file = pathname === '/' ? 'index.html' : pathname.slice(1);
      const types: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.ttf': 'font/ttf',
        '.svg': 'image/svg+xml',
      };
      await route.fulfill({
        contentType: types[path.extname(file)] || 'application/octet-stream',
        body: await readFile(path.join('dist', file)),
      });
    });
    await page.setViewportSize({ width, height: 800 });
    await page.route('**/mobile-host', route =>
      route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `<style>body{margin:0}iframe{display:block;width:100%;border:0;height:600px}</style>
        <div style="height:300px">Страница сайта</div><iframe src="http://localhost:4173/#kzi"></iframe>
        <script>const frame=document.querySelector('iframe');window.addEventListener('message',e=>{
          if(e.source===frame.contentWindow && e.origin==='http://localhost:4173' && e.data.type==='checku:resize')frame.style.height=e.data.height+'px';
        });</script>`,
      })
    );
    await page.goto('http://localhost:4174/mobile-host');
    const app = page.frameLocator('iframe');
    await expect(app.locator('header')).toBeVisible();
    await expect(app.locator('header a')).toHaveAttribute('href', 'https://sec.ussc.ru/products/checku');
    await expect(app.locator('header a')).toHaveAttribute('target', '_blank');
    await expect(app.getByText('Сохранить в файл', { exact: true })).toBeVisible();
    await expect(app.getByText('Загрузить из файла', { exact: true })).toBeVisible();
    await expect.poll(() => app.locator('body').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Onest');
    await app.locator('body').evaluate(() => document.fonts.ready);
    expect(
      await app
        .locator('body')
        .evaluate(() => Array.from(document.fonts).some(font => font.family === 'Onest' && font.status === 'loaded'))
    ).toBe(true);
    await page.screenshot({ path: `test-results/header-${width}.png` });
    await app.getByRole('button', { name: 'Как это работает', exact: true }).click();
    const dialog = app.getByRole('dialog', { name: 'Как это работает' });
    await expect(dialog).toBeVisible();
    const inViewport = async () => {
      const offset = await page.locator('iframe').evaluate(el => el.getBoundingClientRect().top);
      const bounds = await app.locator('dialog[open]').evaluate(el => ({
        top: el.getBoundingClientRect().top,
        bottom: el.getBoundingClientRect().bottom,
        left: el.getBoundingClientRect().left,
        right: el.getBoundingClientRect().right,
      }));
      return bounds.top + offset >= 0 && bounds.bottom + offset <= 801 && bounds.left >= 0 && bounds.right <= width;
    };
    await expect.poll(inViewport).toBe(true);
    for (const control of [dialog.getByRole('heading'), dialog.getByRole('button', { name: 'Понятно' })]) {
      const inside = await control.evaluate(el => {
        const box = el.getBoundingClientRect();
        const modal = el.closest('dialog')!.getBoundingClientRect();
        return box.top >= modal.top && box.bottom <= modal.bottom;
      });
      expect(inside).toBe(true);
    }
    await page.screenshot({ path: `test-results/help-${width}.png` });
    await dialog.getByRole('button', { name: 'Понятно' }).click();
    await app.getByRole('button', { name: 'Сформировать отчет', exact: true }).click();
    await expect.poll(inViewport).toBe(true);
    await page.screenshot({ path: `test-results/requisites-${width}.png` });
  });
}
