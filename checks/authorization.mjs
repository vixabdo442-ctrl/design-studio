import { startRuntime, expect } from '/home/user/oss-new/control/runtime/index.mjs';
import { createDesign, shareWith, upload, waitSaved } from './lib.mjs';

const runtime = await startRuntime();
try {
  await runtime.assertPrivateAccess(['/', '/shared', '/templates', '/uploads', '/brand', '/health', '/api/brand']);

  // The app has no sign-in of its own.
  for (const path of ['/login', '/signin', '/signup', '/logout']) {
    const res = await runtime.fetch(path, { role: 'member' });
    expect(res.status).toBe(404);
    expect(await res.text()).not.toMatch(/type="password"/);
  }

  // Uploads are private to the uploader.
  const created = await upload(runtime, 'owner', 'private.png');
  expect(created.status).toBe(201);
  const { id: uploadId } = await created.json();
  expect((await runtime.fetch(`/files/u/${uploadId}`, { role: 'owner' })).status).toBe(200);
  expect((await runtime.fetch(`/files/u/${uploadId}`, { role: 'member' })).status).toBe(404);
  expect([401, 403]).toContain((await runtime.fetch(`/files/u/${uploadId}`, { role: 'outsider' })).status);
  expect([401, 403]).toContain((await runtime.fetch(`/files/u/${uploadId}`)).status);
  expect([401, 403]).toContain((await upload(runtime, undefined)).status);

  // A design is private to its owner until shared.
  const owner = await (await runtime.context('owner')).newPage();
  const designId = await createDesign(owner, 'Board deck', 'presentation');
  await owner.getByRole('tab', { name: 'Uploads' }).click();
  await owner.getByTestId('place-upload').filter({ hasText: 'private.png' }).click();
  await waitSaved(owner);
  const ownerDoc = await (await runtime.fetch(`/api/designs/${designId}`, { role: 'owner' })).json();
  expect(ownerDoc.role).toBe('owner');
  expect((await runtime.fetch(`/api/designs/${designId}`, { role: 'member' })).status).toBe(404);
  expect([401, 403]).toContain((await runtime.fetch(`/api/designs/${designId}`, { role: 'outsider' })).status);
  // Naming the design doesn't open its images to someone without access to it.
  expect((await runtime.fetch(`/files/u/${uploadId}?design=${designId}`, { role: 'member' })).status).toBe(404);
  const save = (role, version, doc) => runtime.fetch(`/api/designs/${designId}`, {
    role, method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ version, doc }),
  });
  expect((await save('member', ownerDoc.version, ownerDoc.doc)).status).toBe(404);

  const member = await (await runtime.context('member')).newPage();
  await member.goto(`/d/${designId}`);
  await expect(member.getByText('Design not found')).toBeVisible();
  await expect(member.getByTestId('canvas')).toHaveCount(0);
  await member.goto('/shared');
  await expect(member.getByTestId('design-card')).toHaveCount(0);
  await member.goto('/');
  await expect(member.getByTestId('design-card')).toHaveCount(0);

  // Viewers read but can't save, share or delete.
  await shareWith(owner, 'member@example.test', 'view');
  const asViewer = await runtime.fetch(`/api/designs/${designId}`, { role: 'member' });
  expect(asViewer.status).toBe(200);
  expect((await asViewer.json()).role).toBe('view');
  expect((await runtime.fetch(`/files/u/${uploadId}?design=${designId}`, { role: 'member' })).status).toBe(200);
  expect((await runtime.fetch(`/files/u/${uploadId}`, { role: 'member' })).status).toBe(404);
  expect((await save('member', ownerDoc.version, ownerDoc.doc)).status).toBe(403);
  await member.goto(`/d/${designId}`);
  await expect(member.getByTestId('read-only')).toBeVisible();
  await expect(member.getByRole('button', { name: 'Share', exact: true })).toHaveCount(0);
  await expect(member.getByRole('button', { name: 'Save as template' })).toHaveCount(0);

  // A member can't place someone else's upload in their own design.
  const memberPage = await (await runtime.context('member')).newPage();
  const memberDesign = await createDesign(memberPage, 'My flyer', 'flyer');
  const mine = await (await runtime.fetch(`/api/designs/${memberDesign}`, { role: 'member' })).json();
  mine.doc.pages[0].elements.push({ id: 'img1', type: 'image', source: 'upload', assetId: uploadId, x: 0, y: 0, w: 100, h: 100, rotation: 0 });
  const smuggle = await runtime.fetch(`/api/designs/${memberDesign}`, {
    role: 'member', method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ version: mine.version, doc: mine.doc }),
  });
  expect(smuggle.status).toBe(403);
  expect((await runtime.fetch(`/files/u/${uploadId}?design=${memberDesign}`, { role: 'member' })).status).toBe(404);

  // Organization link access opens the design to members, and only in the organization.
  await owner.getByRole('button', { name: 'Share', exact: true }).click();
  await owner.getByRole('dialog').getByRole('button', { name: 'Remove member@example.test' }).click();
  await expect(owner.getByRole('dialog').getByTestId('share-row')).toHaveCount(0);
  expect((await runtime.fetch(`/api/designs/${designId}`, { role: 'member' })).status).toBe(404);
  await owner.getByRole('dialog').getByTestId('link-edit').click();
  await expect(owner.getByRole('dialog').getByTestId('link-edit')).toHaveAttribute('aria-pressed', 'true');
  const viaLink = await runtime.fetch(`/api/designs/${designId}`, { role: 'member' });
  expect((await viaLink.json()).role).toBe('edit');
  expect([401, 403]).toContain((await runtime.fetch(`/api/designs/${designId}`, { role: 'outsider' })).status);
  await owner.getByRole('dialog').getByTestId('link-none').click();
  await expect(owner.getByRole('dialog').getByTestId('link-none')).toHaveAttribute('aria-pressed', 'true');
  expect((await runtime.fetch(`/api/designs/${designId}`, { role: 'member' })).status).toBe(404);

  // Brand kit edits are admin-only.
  const brand = { colors: [{ name: 'Ink', hex: '#111827' }], headingFont: 'Georgia', subheadingFont: null, bodyFont: 'Arial' };
  const putBrand = (role) => runtime.fetch('/api/brand', {
    role, method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(brand),
  });
  expect((await putBrand('member')).status).toBe(403);
  expect((await putBrand('owner')).status).toBe(200);
  const memberBrand = await (await runtime.fetch('/api/brand', { role: 'member' })).json();
  expect(memberBrand.colors[0].name).toBe('Ink');
  expect(memberBrand.canEdit).toBe(false);
  const logoForm = new FormData();
  logoForm.set('file', new Blob([(await import('./lib.mjs')).PNG], { type: 'image/png' }), 'logo.png');
  expect((await runtime.fetch('/api/brand/logos', { role: 'member', method: 'POST', body: logoForm })).status).toBe(403);
  const outsiderBrand = await runtime.fetch('/api/brand', { role: 'outsider' });
  expect([401, 403]).toContain(outsiderBrand.status);

  // Team templates: only the creator or an admin deletes.
  await memberPage.goto(`/d/${memberDesign}`);
  await memberPage.getByRole('button', { name: 'Save as template' }).click();
  await memberPage.getByRole('dialog').getByLabel('Name').fill('Member flyer');
  await memberPage.getByRole('dialog').getByLabel('Category').fill('Flyers');
  await memberPage.getByRole('dialog').getByRole('button', { name: 'Save template' }).click();
  await expect(memberPage.getByText('Saved as a team template')).toBeVisible();
  await owner.goto(`/d/${designId}`);
  await owner.getByRole('button', { name: 'Save as template' }).click();
  await owner.getByRole('dialog').getByLabel('Name').fill('Owner deck');
  await owner.getByRole('dialog').getByLabel('Category').fill('Decks');
  await owner.getByRole('dialog').getByRole('button', { name: 'Save template' }).click();
  await expect(owner.getByText('Saved as a team template')).toBeVisible();
  await memberPage.goto('/templates');
  await expect(memberPage.getByTestId('template-card').filter({ hasText: 'Owner deck' }).getByRole('button', { name: 'Delete' })).toHaveCount(0);
  await expect(memberPage.getByTestId('template-card').filter({ hasText: 'Member flyer' }).getByRole('button', { name: 'Delete' })).toHaveCount(1);
  await owner.goto('/templates');
  const memberTemplate = owner.getByTestId('template-card').filter({ hasText: 'Member flyer' });
  await memberTemplate.getByRole('button', { name: 'Delete' }).click();
  await owner.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(memberTemplate).toHaveCount(0);

  // Folders are private to their owner.
  await owner.goto('/');
  await owner.getByTestId('new-folder').click();
  await owner.getByRole('dialog').getByLabel('Name').fill('Board only');
  await owner.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(owner.getByTestId('folder').filter({ hasText: 'Board only' })).toBeVisible();
  await member.goto('/');
  await expect(member.getByTestId('folder')).toHaveCount(0);
  await member.goto('/uploads');
  await expect(member.getByTestId('upload-card')).toHaveCount(0);
} finally {
  await runtime.close();
}
