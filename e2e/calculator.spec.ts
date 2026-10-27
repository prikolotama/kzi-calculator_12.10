import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { checkAllCriteria, fillAllRatios, fillRatio, openKziGroups, resultValue } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('./#kzi');
});

test('Кзи: все показатели выполнены, затем порог многофакторной аутентификации не достигнут', async ({ page }) => {
  await expect(resultValue(page)).toHaveText('0,00');
  await checkAllCriteria(page);
  await fillAllRatios(page, '10', '10');
  await expect(resultValue(page)).toHaveText('1,00');
  await expect(page.locator('aside').getByText('Минимальный базовый').first()).toBeVisible();

  // Пример из замечаний: 40 привилегированных, 18 со вторым фактором -> 45%, не выполнено
  await fillRatio(page, 'k22', '40', '18');
  const k22 = page.locator('#indicator-k22');
  await expect(k22.getByText('45%', { exact: true })).toBeVisible();
  await expect(k22.getByText('не выполнено', { exact: true })).toBeVisible();
  await expect(resultValue(page)).toHaveText('0,925');

  const blockers = page.locator('aside').getByText('Что мешает получить Кзи = 1');
  await expect(blockers).toBeVisible();
  await page
    .locator('aside')
    .getByRole('button', { name: /Многофакторная аутентификация/ })
    .click();
  await expect(k22).toBeInViewport();
});

test('значок показателя только показывает состояние и не отмечает критерии', async ({ page }) => {
  await openKziGroups(page);
  const k11 = page.locator('#indicator-k11');
  const status = k11.getByRole('img', { name: 'Не выполнен' });
  await expect(status).toBeVisible();
  await status.click();
  await expect(k11.locator('input[type=checkbox]:checked')).toHaveCount(0);
  await k11.getByRole('checkbox').first().check({ force: true });
  await expect(k11.getByRole('img', { name: 'Выполнен частично' })).toBeVisible();
});

test('«Информация о калькуляторе» свернута по умолчанию', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Информация о калькуляторе/ })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
});

test('Кзи: отчет скачивается без реквизитов', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Сформировать отчет', exact: true })).toHaveCount(0);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('aside').getByRole('button', { name: 'Скачать отчет' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.docx$/);
  expect((await readFile(await download.path())).subarray(0, 2).toString()).toBe('PK');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByTestId('toast')).toContainText('Отчет сохранен');
});

test('сохранение в файл и загрузка из файла', async ({ page }) => {
  await checkAllCriteria(page);
  await fillAllRatios(page, '10', '10');
  await expect(resultValue(page)).toHaveText('1,00');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Скачать данные' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^Кзи_\d{2}\.\d{2}\.\d{4}\.json$/);
  const file = await download.path();

  await page.locator('aside').getByRole('button', { name: 'Сброс' }).click();
  await expect(resultValue(page)).toHaveText('0,00');

  await page.locator('input[type=file]').setInputFiles(file);
  await expect(resultValue(page)).toHaveText('1,00');
  await expect(page.getByTestId('toast')).toContainText('Данные загружены');
});

test('срок следующей проверки показан без календаря в обоих режимах', async ({ page }) => {
  for (const mode of ['kzi', 'uzi']) {
    await page.goto(`./#${mode}`);
    await expect(page.getByText(/При оценке сегодня следующая проверка не позднее/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Добавить в календарь' })).toHaveCount(0);
  }
});

test('Узи: режим по ссылке, уровень направления и текущий отчет', async ({ page }) => {
  await page.goto('./#uzi');
  await expect(page.getByRole('heading', { name: 'Калькулятор уровня зрелости' })).toBeVisible();
  const direction = page.locator('#direction-1');
  await direction.locator('button[aria-expanded]').click();
  const groups = direction.getByRole('radiogroup');
  for (let index = 0; index < 8; index++) {
    await groups.nth(index).locator('input[type=radio]').last().check({ force: true });
  }
  await expect(direction.getByText('Уровень 4')).toBeVisible();
  await expect(resultValue(page)).toHaveText('0,19');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('aside').getByRole('button', { name: 'Скачать отчет' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^Текущий_отчет_Узи_\d{2}\.\d{2}\.\d{4}\.docx$/);

  await page.getByRole('tab', { name: /Кзи/ }).click();
  await expect(page).toHaveURL(/#kzi$/);
});

test('ответы версии 3 переносятся из хранилища браузера', async ({ page }) => {
  // Страница без калькулятора: при уходе с нее ответы не сохраняются поверх подготовленных данных
  await page.goto('./favicon.svg');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'checku-kzi-v3',
      JSON.stringify({
        v: 3,
        mode: 'kzi',
        form: { org: 'ООО «Ромашка»', region: 'ufo' },
        kzi: { items: { k11: [true, true] }, na: { k13: true }, zero: {} },
        uzi: {},
      })
    );
  });
  await page.goto('./#kzi');
  await openKziGroups(page);
  const k11 = page.locator('#indicator-k11');
  await expect(k11.getByRole('img', { name: 'Выполнен', exact: true })).toBeVisible();
  await expect(page.locator('#indicator-k13').getByRole('img', { name: 'Не применим' })).toBeVisible();
  // k11 (0,03) + k13 (0,03) = 0,06
  await expect(resultValue(page)).toHaveText('0,06');
});
