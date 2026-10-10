import { describe, it, expect, afterEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { loadUI } from '@rms/ds-core/test-utils';

const UI = fileURLToPath(new URL('../ui.html', import.meta.url));

let ui;
afterEach(() => { if (ui) { ui.close(); ui = null; } });

// Export is now an inline view (Colors | Export tabs). Show it; format defaults to PDF.
const setFmt = (u, fmt) => { const r = u.$(`#fmt-${fmt}`); r.checked = true; r.dispatchEvent(new u.window.Event('change')); };
const openModal    = (u) => { u.window.__showExportView(); };
const openModalTiff = (u) => { u.window.__showExportView(); setFmt(u, 'tiff'); };
const enableDownsample = (u) => { const t = u.$('#downsample-toggle'); t.checked = true; t.dispatchEvent(new u.window.Event('change')); };
// The low-res image list arrives on a preflight-images message.
const imagesMsg = (over = {}) => ({ type: 'preflight-images', target: 300, images: [], ...over });
// Preflight is the system's modal (Figma screen 2225:28241), opened from the export bar.
const openPreflight = (u) => u.click(u.$('#export-preflight-btn'));
const rowsOf = (u) => u.$$('#preflight-slot .listItem');
const enableCmyk = (u) => { const t = u.$('#cmyk-images-toggle'); t.checked = true; t.dispatchEvent(new u.window.Event('change')); };

describe('tokens-to-ink UI — export pre-flight', () => {
  it('opens the Preflight modal from the export bar, scans, and closes back to its button', () => {
    ui = loadUI(UI);
    openModal(ui);
    enableDownsample(ui);
    const before = ui.sentOf('preflight-request').length;
    openPreflight(ui);
    const modal = ui.$('#preflight-modal');
    expect(modal.classList.contains('is-open')).toBe(true);
    // The system's modal: the card is a modal dialog named by its title.
    expect(modal.querySelector('.modal-card').getAttribute('role')).toBe('dialog');
    expect(modal.querySelector('.modal-card').getAttribute('aria-labelledby')).toBe('preflight-title');
    expect(ui.sentOf('preflight-request').length).toBeGreaterThan(before);
    expect(ui.$('#preflight-rescan').disabled).toBe(true);   // Rescan waits while a scan runs
    ui.receive(imagesMsg({ images: [] }));
    expect(ui.$('#preflight-rescan').disabled).toBe(false);
    ui.click(ui.$('#preflight-close'));
    expect(modal.classList.contains('is-closing')).toBe(true);
    expect(ui.errors).toEqual([]);
  });

  it('builds the modal from the system: overlay, modal, dividerSection, listItem', () => {
    ui = loadUI(UI);
    openModal(ui);
    enableDownsample(ui);
    openPreflight(ui);
    ui.receive(imagesMsg({ images: [{ id: 'i1', name: 'hero.jpg', meta: '1200×1200 px · 210 dpi' }] }));
    expect(ui.$('#preflight-modal .overlay')).toBeTruthy();
    expect(ui.$('#preflight-modal .modal-card .modal-header .modal-close use').getAttribute('href')).toBe('#icon-cross');
    const sec = ui.$('#preflight-slot .dividerSection');
    expect(sec.textContent).toContain('Errors');
    expect(sec.querySelector('.count').textContent).toBe('1');
    expect(sec.querySelector('.tier-dot.high')).toBeTruthy();
    const row = rowsOf(ui)[0];
    expect(row.querySelector('.listItem-icon use').getAttribute('href')).toBe('#icon-image');
    expect(row.querySelector('.listItem-divider')).toBeTruthy();
  });

  it('lists low-res images only once downsample is on, and focuses on click', () => {
    ui = loadUI(UI);
    openModal(ui);
    openPreflight(ui);
    const imgs = [{ id: 'i1', name: 'hero.jpg', meta: '1200×1200 px · 210 dpi' }];

    // Off by default → nothing listed even though images were sent.
    ui.receive(imagesMsg({ images: imgs }));
    expect(rowsOf(ui)).toHaveLength(0);

    enableDownsample(ui);
    ui.receive(imagesMsg({ images: imgs }));
    const rows = rowsOf(ui);
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('hero.jpg');
    expect(rows[0].textContent).toContain('210 dpi');
    expect(rows[0].textContent).toContain('below 300 dpi target');

    const focusBtn = rows[0].querySelector('.listItem-action');
    expect(focusBtn.getAttribute('data-tip')).toBe('Focus in canvas');
    ui.click(focusBtn);
    expect(ui.sentOf('focus-node').pop()).toMatchObject({ type: 'focus-node', nodeId: 'i1' });
    expect(ui.errors).toEqual([]);
  });

  it('offers Preflight for PDF only, and lists nothing for TIFF', () => {
    ui = loadUI(UI);
    openModal(ui);
    enableDownsample(ui);
    expect(ui.$('#export-preflight-btn').style.display).toBe('');
    openModalTiff(ui);   // switch to TIFF via the format radio
    expect(ui.$('#export-preflight-btn').style.display).toBe('none');
    ui.receive(imagesMsg({ hasImages: true, images: [{ id: 'i1', name: 'hero', meta: 'x' }] }));
    expect(rowsOf(ui)).toHaveLength(0);
    expect(ui.$('#card-tiff').hidden).toBe(false);    // TIFF shows the raster card…
    expect(ui.$('#card-marks').hidden).toBe(false);   // …marks/bleed apply to TIFF too…
    expect(ui.$('#card-output').hidden).toBe(true);   // …but not the PDF-only Output card
  });

  it('keeps Marks in the right slot for both formats (Raster shares the Output/left slot)', () => {
    ui = loadUI(UI);
    openModal(ui);
    // DOM order must be [output|raster] then [marks] so the Marks card never shifts when the
    // format changes: PDF shows output (left) + marks (right); TIFF shows raster (left, same
    // slot) + marks (right). The format-specific card is always earlier in the DOM than marks.
    const cards = ui.$$('.export-cards .export-card-wrap').map((c) => c.id);
    expect(cards.indexOf('card-tiff')).toBeLessThan(cards.indexOf('card-marks'));
    expect(cards.indexOf('card-output')).toBeLessThan(cards.indexOf('card-marks'));
  });

  it('keeps the downsample option in the Output card for PDF (no image-quality sub-tab)', () => {
    ui = loadUI(UI);
    openModal(ui);
    ui.receive(imagesMsg({ hasImages: false, images: [] }));
    expect(ui.$('#card-output').hidden).toBe(false);
    expect(ui.$('#downsample-toggle')).toBeTruthy();
    expect(ui.$('#card-marks').hidden).toBe(false);
  });

  it('says there are no issues when nothing is below the target, and nothing to check with both toggles off', () => {
    ui = loadUI(UI);
    openModal(ui);
    openPreflight(ui);
    expect(ui.$('#preflight-slot .empty-state-title').textContent).toBe('Nothing to check');
    enableDownsample(ui);
    ui.receive(imagesMsg({ images: [] }));
    expect(rowsOf(ui)).toHaveLength(0);
    expect(ui.$('#preflight-slot .empty-state-title').textContent).toBe('No issues found');
  });

  it('clears the list immediately when downsample is deselected', () => {
    ui = loadUI(UI);
    openModal(ui);
    enableDownsample(ui);
    ui.receive(imagesMsg({ images: [{ id: 'i1', name: 'hero', meta: 'x' }] }));
    expect(rowsOf(ui)).toHaveLength(1);

    const t = ui.$('#downsample-toggle');
    t.checked = false; t.dispatchEvent(new ui.window.Event('change'));
    expect(rowsOf(ui)).toHaveLength(0);   // gone without a new scan
  });

  it('names the current dpi target', () => {
    ui = loadUI(UI);
    openModal(ui);
    enableDownsample(ui);
    ui.receive(imagesMsg({ target: 350, images: [{ id: 'i1', name: 'hero', meta: 'x' }] }));
    expect(rowsOf(ui)[0].textContent).toContain('below 350 dpi target');
  });

  it('re-scans against the new threshold when the dpi target changes', async () => {
    ui = loadUI(UI);
    openModal(ui);
    enableDownsample(ui);
    const before = ui.sentOf('preflight-request').length;
    const dpi = ui.$('#dpi-input');
    dpi.value = '150'; dpi.dispatchEvent(new ui.window.Event('input'));
    await new Promise((r) => setTimeout(r, 300));   // clear the input debounce
    const reqs = ui.sentOf('preflight-request');
    expect(reqs.length).toBeGreaterThan(before);
    expect(reqs.pop()).toMatchObject({ dpi: 150 });
  });

  it('does not scan on open with both toggles off, but scans once a toggle turns on', () => {
    ui = loadUI(UI);
    openModal(ui);
    // Both scan-driven toggles are off → nothing to pre-flight → no backend round-trip. This is the
    // fix for the Colors↔Export interaction lag: no per-image walk on a switch that shows nothing.
    expect(ui.sentOf('preflight-request').length).toBe(0);
    enableDownsample(ui);
    expect(ui.sentOf('preflight-request').length).toBeGreaterThan(0);
    expect(ui.sentOf('preflight-request').pop()).toMatchObject({ dpi: 300 });
  });

  it('clears the list on reopen — a new selection never shows the old images', () => {
    ui = loadUI(UI);
    openModal(ui);
    enableDownsample(ui);
    ui.receive(imagesMsg({ images: [{ id: 'oldimg', name: 'old.jpg', meta: '100×100 px · 50 dpi' }] }));
    expect(rowsOf(ui)).toHaveLength(1);

    // Reopen (e.g. after scanning a different selection) → the list is empty immediately,
    // BEFORE any new scan result arrives.
    openModal(ui);
    expect(rowsOf(ui)).toHaveLength(0);

    ui.receive(imagesMsg({ images: [{ id: 'newimg', name: 'new.jpg', meta: '120×120 px · 60 dpi' }] }));
    const rows = rowsOf(ui);
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('new.jpg');
  });

  it('lists images that will stay RGB — only when "Convert images to CMYK" is on — and focuses on click', () => {
    ui = loadUI(UI);
    openModal(ui);
    const bad = [{ id: 'b1', name: 'logo.jpg', meta: 'CMYK JPEG' }];

    // Default (toggle OFF): images are kept in RGB by design, so there is nothing to warn about.
    ui.receive(imagesMsg({ hasImages: true, unconvertible: bad }));
    expect(rowsOf(ui)).toHaveLength(0);

    enableCmyk(ui);
    ui.receive(imagesMsg({ hasImages: true, unconvertible: bad }));
    const rows = rowsOf(ui);
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('logo.jpg');
    expect(rows[0].textContent).toContain('stays RGB (CMYK JPEG)');
    expect(rows[0].querySelector('.listItem-icon use').getAttribute('href')).toBe('#icon-var-color');

    ui.click(rows[0].querySelector('.listItem-action'));
    expect(ui.sentOf('focus-node').pop()).toMatchObject({ type: 'focus-node', nodeId: 'b1' });
    expect(ui.errors).toEqual([]);
  });

  it('lists no RGB warning when none are reported, and none for TIFF', () => {
    ui = loadUI(UI);
    openModal(ui);
    enableCmyk(ui);
    ui.receive(imagesMsg({ hasImages: true, unconvertible: [] }));
    expect(rowsOf(ui)).toHaveLength(0);

    openModalTiff(ui);   // TIFF has no CMYK-vector conversion
    ui.receive(imagesMsg({ hasImages: true, unconvertible: [{ id: 'b1', name: 'logo.jpg', meta: 'CMYK JPEG' }] }));
    expect(rowsOf(ui)).toHaveLength(0);
  });

  it('escapes a malicious layer name — it cannot inject markup', () => {
    ui = loadUI(UI);
    openModal(ui);
    enableDownsample(ui);
    ui.receive(imagesMsg({ images: [{ id: 'x', name: '<img src=x onerror="globalThis.__pf=1">', meta: '10×10 px · 5 dpi' }] }));
    const list = ui.$('#preflight-slot');
    expect(list.querySelector('img')).toBeNull();
    expect(list.textContent).toContain('<img src=x onerror=');
    expect(ui.window.__pf).toBeUndefined();
  });

  it('puts the format radios in the system radioButtonGroup', () => {
    ui = loadUI(UI);
    openModal(ui);
    const group = ui.$('.radioButtonGroup');
    expect(group.querySelector('.radioButtonGroup-label').textContent).toBe('Format');
    expect(group.querySelectorAll('.radioButtonGroup-slot .radioButton')).toHaveLength(2);
  });
});
