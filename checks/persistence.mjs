import { startRuntime, expect } from '/home/user/oss-new/control/runtime/index.mjs';
import { createDesign, upload, waitSaved } from './lib.mjs';

const runtime = await startRuntime();
try {
  let page = await (await runtime.context('owner')).newPage();
  const id = await createDesign(page, 'Harvest fair poster', 'a4');
  await page.getByRole('button', { name: 'Add text' }).click();
  await page.getByLabel('Text', { exact: true }).fill('Harvest Fair');
  await waitSaved(page);
  const created = await upload(runtime, 'owner', 'apples.png');
  const { id: uploadId } = await created.json();
  await page.goto('/');
  await page.getByTestId('new-folder').click();
  await page.getByRole('dialog').getByLabel('Name').fill('Autumn');
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(page.getByTestId('folder').filter({ hasText: 'Autumn' })).toBeVisible();
  const brand = await runtime.fetch('/api/brand', {
    role: 'owner', method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ colors: [{ name: 'Rust', hex: '#b45309' }], headingFont: 'Impact', subheadingFont: null, bodyFont: null }),
  });
  expect(brand.status).toBe(200);

  await runtime.restart();

  page = await (await runtime.context('owner')).newPage();
  await page.goto('/');
  await expect(page.getByTestId('design-card').filter({ hasText: 'Harvest fair poster' })).toBeVisible();
  await expect(page.getByTestId('folder').filter({ hasText: 'Autumn' })).toBeVisible();
  await page.goto(`/d/${id}`);
  await expect(page.getByTestId('canvas')).toContainText('Harvest Fair');
  const file = await runtime.fetch(`/files/u/${uploadId}`, { role: 'owner' });
  expect(file.status).toBe(200);
  expect(Buffer.from(await file.arrayBuffer()).length).toBeGreaterThan(0);
  const kit = await (await runtime.fetch('/api/brand', { role: 'member' })).json();
  expect(kit.colors).toEqual([{ name: 'Rust', hex: '#b45309' }]);
  expect(kit.headingFont).toBe('Impact');
} finally {
  await runtime.close();
}
