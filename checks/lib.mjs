// Shared helpers for the suites.
import { expect } from '/home/user/oss-new/control/runtime/index.mjs';

// A 2x2 PNG.
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
  'base64',
);

export function form(name, type, bytes) {
  const body = new FormData();
  body.set('file', new Blob([bytes], { type }), name);
  return body;
}

export async function upload(runtime, role, name = 'photo.png', type = 'image/png', bytes = PNG) {
  const res = await runtime.fetch('/api/uploads', { role, method: 'POST', body: form(name, type, bytes) });
  return res;
}

/** Creates a design from the home page and returns its id. */
export async function createDesign(page, name, preset = 'social') {
  await page.goto('/');
  await page.getByTestId('new-design').click();
  await page.getByTestId(`preset-${preset}`).click();
  await page.getByLabel('Name').fill(name);
  await Promise.all([
    page.waitForURL(/\/d\/[\w-]+$/),
    page.getByRole('button', { name: 'Create', exact: true }).click(),
  ]);
  await expect(page.getByTestId('canvas')).toBeVisible();
  return page.url().split('/d/')[1];
}

export async function waitSaved(page) {
  await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 15000 });
}

export async function shareWith(page, email, role) {
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByTestId(`share-role-${role}`).click();
  await dialog.getByRole('button', { name: 'Add' }).click();
  await expect(dialog.getByTestId('share-row').filter({ hasText: email })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}
