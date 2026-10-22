import { expect, test } from '@playwright/test';

for (const protocol of [true, false]) {
  for (const width of [320, 390, 1440]) {
    test(`уведомление сброса остается читаемым при прокрутке, ${width}, viewport=${protocol}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.route('**/reset-host', route =>
        route.fulfill({
          contentType: 'text/html; charset=utf-8',
          body: `<style>body{margin:0}.header{position:fixed;top:0;height:100px;background:#111;width:100%;z-index:100}iframe{width:100%;border:0;display:block}</style>
      <div class="header">Шапка сайта</div><div style="height:300px"></div><iframe src="/#kzi"></iframe><div style="height:1000px"></div>
      <script>const f=document.querySelector('iframe');function viewport(){if(!${protocol})return;const r=f.getBoundingClientRect();f.contentWindow.postMessage({type:'checku:viewport',version:1,top:Math.max(0,-r.top),height:Math.max(0,Math.min(r.height,innerHeight-r.top)-Math.max(0,-r.top))},location.origin)}
      addEventListener('message',e=>{if(e.source===f.contentWindow&&e.data.type==='checku:resize'){f.style.height=e.data.height+'px';viewport()}});addEventListener('scroll',viewport);addEventListener('resize',viewport);</script>`,
        })
      );
      await page.goto('./reset-host');
      const app = page.frameLocator('iframe');
      await app.getByRole('button', { name: /^Группа 1\./ }).click();
      await app.locator('#indicator-k11 input[type=checkbox]').first().check({ force: true });
      await app.locator('aside').getByRole('button', { name: 'Сброс', exact: true }).click();
      const toast = app.getByTestId('toast');
      await expect(toast).toContainText('Отметки и числа сброшены');
      const readable = async () => {
        const offset = await page.locator('iframe').evaluate(el => el.getBoundingClientRect().top);
        const box = await toast.boundingBox();
        // boundingBox уже учитывает координаты фрейма относительно страницы.
        const inner = await toast.evaluate(el => ({ height: el.clientHeight, content: el.scrollHeight }));
        return (
          !!box &&
          box.y >= 100 &&
          box.y + box.height <= 788 &&
          inner.content <= inner.height + 1 &&
          Number.isFinite(offset)
        );
      };
      await expect.poll(readable).toBe(true);
      const before = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, -200);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(before);
      await expect.poll(readable).toBe(true);
      await page.mouse.wheel(0, 200);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(before);
      await expect.poll(readable).toBe(true);
      await page.screenshot({ path: `test-results/reset-toast-${width}-${protocol}.png` });
      await toast.getByRole('button', { name: 'Вернуть', exact: true }).click();
      await expect(toast).toBeEmpty();
      await expect(app.locator('#indicator-k11 input[type=checkbox]').first()).toBeChecked();
    });
  }
}
