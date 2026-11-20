import { startRuntime, expect } from '/home/user/oss-new/control/runtime/index.mjs';
import { createDesign, shareWith, upload, waitSaved } from './lib.mjs';

const runtime = await startRuntime();
try {
  const owner = await (await runtime.context('owner', { acceptDownloads: true })).newPage();
  const member = await (await runtime.context('member', { acceptDownloads: true })).newPage();

  // F001: create from a preset, edit on the canvas, autosave.
  await owner.goto('/');
  await runtime.assertBackLink(owner);
  await expect(owner.getByRole('heading', { name: 'Designs' })).toBeVisible();
  const designId = await createDesign(owner, 'Spring Bake Sale', 'social');
  await expect(owner.getByTestId('design-size')).toHaveText('1080 × 1080 px');

  await owner.getByRole('button', { name: 'Add text' }).click();
  await expect(owner.getByTestId('element')).toHaveCount(1);
  await owner.getByLabel('Text', { exact: true }).fill('Spring Bake Sale\nSaturday 10am');
  await owner.getByLabel('Font size').fill('96');
  await expect(owner.getByTestId('canvas')).toContainText('Saturday 10am');

  await owner.getByRole('button', { name: 'Add rectangle' }).click();
  await expect(owner.getByTestId('element')).toHaveCount(2);
  await owner.getByLabel('Fill').fill('#f59e0b');
  const x = owner.getByLabel('X', { exact: true });
  await x.fill('300');
  await expect(x).toHaveValue('300');
  await owner.getByRole('button', { name: 'Send backward' }).click();
  await owner.getByRole('button', { name: 'Undo' }).click();
  await owner.getByRole('button', { name: 'Undo' }).click();
  await owner.getByRole('button', { name: 'Undo' }).click();
  await owner.getByRole('button', { name: 'Undo' }).click();
  await expect(owner.getByTestId('element')).toHaveCount(1);
  await owner.getByRole('button', { name: 'Redo' }).click();
  await expect(owner.getByTestId('element')).toHaveCount(2);

  await owner.getByRole('button', { name: 'Add page' }).click();
  await expect(owner.getByTestId('page-thumb')).toHaveCount(2);
  await owner.getByLabel('Background').fill('#fde68a');
  await owner.getByRole('button', { name: 'Duplicate page' }).click();
  await expect(owner.getByTestId('page-thumb')).toHaveCount(3);
  await owner.getByRole('button', { name: 'Delete page' }).click();
  await expect(owner.getByTestId('page-thumb')).toHaveCount(2);
  await owner.getByTestId('page-thumb').first().click();
  await waitSaved(owner);
  await owner.reload();
  await expect(owner.getByTestId('canvas')).toContainText('Saturday 10am');
  await expect(owner.getByTestId('page-thumb')).toHaveCount(2);

  // Request level: the saved document and its version; a stale save is refused.
  const doc = await (await runtime.fetch(`/api/designs/${designId}`, { role: 'owner' })).json();
  expect(doc.name).toBe('Spring Bake Sale');
  expect(doc.doc.pages).toHaveLength(2);
  const put = (version) => runtime.fetch(`/api/designs/${designId}`, {
    role: 'owner', method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ version, doc: doc.doc }),
  });
  const fresh = await put(doc.version);
  expect(fresh.status).toBe(200);
  expect((await fresh.json()).version).toBe(doc.version + 1);
  expect((await put(doc.version)).status).toBe(409);
  // The open editor now holds a stale version: its next save is refused, not applied.
  await owner.getByRole('button', { name: 'Add ellipse' }).click();
  await expect(owner.getByTestId('conflict')).toBeVisible({ timeout: 15000 });
  await owner.reload();
  await expect(owner.getByTestId('element')).toHaveCount(2);

  // Home list: thumbnail, name, rename, duplicate.
  await owner.goto('/');
  const card = owner.getByTestId('design-card').filter({ hasText: 'Spring Bake Sale' });
  await expect(card).toBeVisible();
  await expect(card.getByTestId('thumbnail')).toBeVisible();
  await card.getByRole('button', { name: 'Design actions' }).click();
  await owner.getByRole('menuitem', { name: 'Duplicate' }).click();
  const copy = owner.getByTestId('design-card').filter({ hasText: 'Spring Bake Sale (copy)' });
  await expect(copy).toBeVisible();
  await copy.getByRole('button', { name: 'Design actions' }).click();
  await owner.getByRole('menuitem', { name: 'Rename' }).click();
  await owner.getByRole('dialog').getByLabel('Name').fill('Bake Sale Story');
  await owner.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  const renamed = owner.getByTestId('design-card').filter({ hasText: 'Bake Sale Story' });
  await expect(renamed).toBeVisible();
  await renamed.getByRole('button', { name: 'Design actions' }).click();
  await owner.getByRole('menuitem', { name: 'Delete' }).click();
  await owner.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(renamed).toHaveCount(0);

  // Custom size.
  await owner.getByTestId('new-design').click();
  await owner.getByTestId('preset-custom').click();
  await owner.getByLabel('Width (px)').fill('1200');
  await owner.getByLabel('Height (px)').fill('628');
  await owner.getByLabel('Name').fill('Blog header');
  await Promise.all([owner.waitForURL(/\/d\//), owner.getByRole('button', { name: 'Create', exact: true }).click()]);
  await expect(owner.getByTestId('design-size')).toHaveText('1200 × 628 px');

  // F006: folders and search.
  await owner.goto('/');
  await owner.getByTestId('new-folder').click();
  await owner.getByRole('dialog').getByLabel('Name').fill('Spring campaign');
  await owner.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(owner.getByTestId('folder').filter({ hasText: 'Spring campaign' })).toBeVisible();
  await card.getByRole('button', { name: 'Design actions' }).click();
  await owner.getByRole('menuitem', { name: 'Move to folder' }).click();
  await owner.getByRole('dialog').getByRole('button', { name: 'Spring campaign' }).click();
  await expect(card).toHaveCount(0);
  await owner.getByTestId('folder').filter({ hasText: 'Spring campaign' }).click();
  await expect(owner.getByRole('heading', { name: 'Spring campaign' })).toBeVisible();
  await expect(card).toBeVisible();
  await owner.getByRole('button', { name: 'Rename folder' }).click();
  await owner.getByRole('dialog').getByLabel('Name').fill('Spring 2026');
  await owner.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(owner.getByRole('heading', { name: 'Spring 2026' })).toBeVisible();
  await owner.goto('/');
  await owner.getByTestId('search-designs').fill('bake');
  await expect(card).toBeVisible();
  await expect(owner.getByTestId('design-card').filter({ hasText: 'Blog header' })).toHaveCount(0);
  await owner.getByTestId('search-designs').fill('');
  await owner.getByTestId('folder').filter({ hasText: 'Spring 2026' }).click();
  await owner.getByRole('button', { name: 'Delete folder' }).click();
  await owner.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(owner.getByRole('heading', { name: 'Designs' })).toBeVisible();
  await expect(card).toBeVisible();
  await expect(owner.getByTestId('folder')).toHaveCount(0);

  // F003: uploads library.
  await owner.goto('/uploads');
  await owner.getByTestId('upload-input').setInputFiles({ name: 'logo-mark.png', mimeType: 'image/png', buffer: (await import('./lib.mjs')).PNG });
  await expect(owner.getByTestId('upload-card').filter({ hasText: 'logo-mark.png' })).toBeVisible();
  await owner.getByTestId('upload-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(owner.getByText('Use a PNG, JPG, WebP or SVG image')).toBeVisible();
  const apiUpload = await upload(runtime, 'owner', 'cupcakes.png');
  expect(apiUpload.status).toBe(201);
  const uploaded = await apiUpload.json();
  const fileRes = await runtime.fetch(`/files/u/${uploaded.id}`, { role: 'owner' });
  expect(fileRes.status).toBe(200);
  expect(fileRes.headers.get('content-type')).toBe('image/png');
  expect((await upload(runtime, 'owner', 'big.png', 'image/png', Buffer.alloc(10 * 1024 * 1024 + 1))).status).toBe(413);
  expect((await upload(runtime, 'owner', 'a.txt', 'text/plain', Buffer.from('x'))).status).toBe(415);

  // Place the upload into the design.
  await owner.goto(`/d/${designId}`);
  await owner.getByRole('tab', { name: 'Uploads' }).click();
  await owner.getByTestId('place-upload').filter({ hasText: 'cupcakes.png' }).click();
  await expect(owner.locator('[data-testid="element"][data-type="image"]')).toHaveCount(1);
  await waitSaved(owner);

  // F005: sharing and comments.
  await shareWith(owner, 'member@example.test', 'view');
  expect((await runtime.fetch(`/files/u/${uploaded.id}?design=${designId}`, { role: 'member' })).status).toBe(200);
  await member.goto('/shared');
  const sharedCard = member.getByTestId('design-card').filter({ hasText: 'Spring Bake Sale' });
  await expect(sharedCard).toBeVisible();
  await sharedCard.getByRole('link').first().click();
  await expect(member.getByTestId('read-only')).toBeVisible();
  await expect(member.getByRole('button', { name: 'Add text' })).toHaveCount(0);
  await expect(member.getByRole('button', { name: 'Share', exact: true })).toHaveCount(0);
  await member.getByRole('tab', { name: 'Comments' }).click();
  await member.getByLabel('Add a comment').fill('Can the date be larger?');
  await member.getByLabel('On this page').check();
  await member.getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(member.getByTestId('comment-thread').filter({ hasText: 'Can the date be larger?' })).toContainText('Page 1');

  // F004: export as a viewer.
  await member.getByRole('button', { name: 'Export' }).click();
  await member.getByRole('dialog').getByTestId('format-png').click();
  const [png] = await Promise.all([member.waitForEvent('download'), member.getByRole('dialog').getByRole('button', { name: 'Download' }).click()]);
  expect(png.suggestedFilename()).toMatch(/\.png$/);
  await member.getByRole('button', { name: 'Export' }).click();
  await member.getByRole('dialog').getByTestId('format-pdf').click();
  await member.getByRole('dialog').getByTestId('scale-2').click();
  const [pdf] = await Promise.all([member.waitForEvent('download'), member.getByRole('dialog').getByRole('button', { name: 'Download' }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  const pdfBytes = await (await import('node:fs/promises')).readFile(await pdf.path());
  expect(pdfBytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect((pdfBytes.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBe(2);
  await member.getByRole('button', { name: 'Export' }).click();
  await member.getByRole('dialog').getByTestId('format-jpg').click();
  await member.getByRole('dialog').getByTestId('pages-all').click();
  const jpgs = [];
  member.on('download', (d) => jpgs.push(d.suggestedFilename()));
  await member.getByRole('dialog').getByRole('button', { name: 'Download' }).click();
  await expect.poll(() => jpgs.length).toBe(2);
  expect(jpgs.every((f) => f.endsWith('.jpg'))).toBe(true);

  // The owner replies and resolves; the member's role changes to edit.
  await owner.reload();
  await owner.getByRole('tab', { name: 'Comments' }).click();
  const thread = owner.getByTestId('comment-thread').filter({ hasText: 'Can the date be larger?' });
  await thread.getByLabel('Reply').fill('Bumped it to 120.');
  await thread.getByRole('button', { name: 'Reply' }).click();
  await expect(thread).toContainText('Bumped it to 120.');
  await thread.getByRole('button', { name: 'Resolve' }).click();
  await expect(thread.getByTestId('resolved')).toBeVisible();
  await thread.getByRole('button', { name: 'Reopen' }).click();
  await expect(thread.getByTestId('resolved')).toHaveCount(0);
  await owner.getByRole('button', { name: 'Share', exact: true }).click();
  const row = owner.getByRole('dialog').getByTestId('share-row').filter({ hasText: 'member@example.test' });
  await row.getByTestId('row-role-edit').click();
  await expect(row.getByTestId('row-role-edit')).toHaveAttribute('aria-pressed', 'true');
  await owner.keyboard.press('Escape');
  await member.reload();
  await expect(member.getByRole('button', { name: 'Add text' })).toBeVisible();
  await member.getByRole('button', { name: 'Add text' }).click();
  await waitSaved(member);
  await member.getByRole('tab', { name: 'Comments' }).click();
  const mine = member.getByTestId('comment-thread').filter({ hasText: 'Can the date be larger?' });
  await mine.getByRole('button', { name: 'Delete' }).first().click();
  await expect(mine).toHaveCount(0);

  // F003: deleting an upload leaves a placeholder in designs using it.
  await owner.goto('/uploads');
  const cupcakes = owner.getByTestId('upload-card').filter({ hasText: 'cupcakes.png' });
  await cupcakes.getByRole('button', { name: 'Delete cupcakes.png' }).click();
  await owner.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(cupcakes).toHaveCount(0);
  await owner.goto(`/d/${designId}`);
  await expect(owner.getByTestId('canvas').getByTestId('missing-image')).toBeVisible();

  // F002: save as a team template; a member uses it without changing it.
  await owner.getByRole('button', { name: 'Save as template' }).click();
  await owner.getByRole('dialog').getByLabel('Name').fill('Bake sale post');
  await owner.getByRole('dialog').getByLabel('Category').fill('Events');
  await owner.getByRole('dialog').getByRole('button', { name: 'Save template' }).click();
  await expect(owner.getByText('Saved as a team template')).toBeVisible();
  await member.goto('/templates');
  await member.getByTestId('category-Events').click();
  const teamTemplate = member.getByTestId('template-card').filter({ hasText: 'Bake sale post' });
  await expect(teamTemplate).toBeVisible();
  await expect(member.getByTestId('template-card').filter({ hasText: 'Weekend sale' })).toHaveCount(0);
  await expect(teamTemplate.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  await member.getByTestId('category-all').click();
  await member.getByLabel('Search templates').fill('weekend');
  await expect(member.getByTestId('template-card')).toHaveCount(1);
  await member.getByLabel('Search templates').fill('');
  await Promise.all([member.waitForURL(/\/d\//), teamTemplate.getByRole('button', { name: 'Use template' }).click()]);
  await expect(member.getByTestId('canvas')).toContainText('Saturday 10am');
  const headline = member.getByTestId('element').filter({ hasText: 'Saturday 10am' });
  const box = await headline.boundingBox();
  await headline.click({ position: { x: 5, y: box.height - 5 } });
  await member.getByLabel('Text', { exact: true }).fill('Summer Bake Sale');
  await waitSaved(member);
  await member.goto('/templates');
  await member.getByRole('button', { name: 'Use template' }).first().click();
  await member.waitForURL(/\/d\//);
  await expect(member.getByTestId('canvas')).toContainText('Spring Bake Sale');

  // F007: the admin edits the brand kit; members apply it in the editor.
  await owner.goto('/brand');
  await owner.getByLabel('Color name').fill('Berry');
  await owner.getByLabel('Color value').fill('#be185d');
  await owner.getByRole('button', { name: 'Add color' }).click();
  await owner.getByTestId('font-heading').getByRole('button', { name: 'Georgia' }).click();
  await owner.getByTestId('logo-input').setInputFiles({ name: 'mark.png', mimeType: 'image/png', buffer: (await import('./lib.mjs')).PNG });
  await expect(owner.getByTestId('logo')).toHaveCount(1);
  await owner.getByRole('button', { name: 'Save brand kit' }).click();
  await expect(owner.getByText('Brand kit saved')).toBeVisible();
  await member.goto('/brand');
  await expect(member.getByTestId('brand-color').filter({ hasText: 'Berry' })).toBeVisible();
  await expect(member.getByRole('button', { name: 'Save brand kit' })).toHaveCount(0);
  await createDesign(member, 'Team update', 'presentation');
  await member.getByRole('button', { name: 'Add text' }).click();
  await member.getByRole('tab', { name: 'Brand' }).click();
  await member.getByTestId('brand-swatch').filter({ hasText: 'Berry' }).click();
  await member.getByRole('button', { name: 'Heading · Georgia' }).click();
  await member.getByTestId('brand-logo').first().click();
  await expect(member.locator('[data-testid="element"][data-type="image"]')).toHaveCount(1);
  await member.getByTestId('element').first().click();
  await member.getByRole('tab', { name: 'Edit' }).click();
  await expect(member.getByLabel('Color', { exact: true })).toHaveValue('#be185d');
  await expect(member.getByTestId('font-value')).toHaveText('Georgia');

  // Phone-sized smoke.
  const phone = await (await runtime.context('member', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await phone.goto('/');
  await expect(phone.getByRole('heading', { name: 'Designs' })).toBeVisible();
  await expect(phone.getByTestId('new-design')).toBeVisible();
  await expect(phone.getByTestId('design-card').filter({ hasText: 'Team update' })).toBeVisible();

  // The picture: a poster made from a bundled template, open in the editor.
  await owner.goto('/templates');
  await Promise.all([
    owner.waitForURL(/\/d\//),
    owner.getByTestId('template-card').filter({ hasText: 'Weekend sale' }).getByRole('button', { name: 'Use template' }).click(),
  ]);
  await expect(owner.getByTestId('canvas')).toContainText('WEEKEND');
  await runtime.assertBackLink(owner);
  await owner.getByTestId('canvas-area').click({ position: { x: 5, y: 5 } });
  await runtime.screenshot(owner);
} finally {
  await runtime.close();
}
