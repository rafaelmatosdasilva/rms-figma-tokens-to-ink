# Changelog

Tokens to Ink is versioned to match the version published to the Figma Community, which Figma assigns.
A design system update is committed without a release (`build: ds-core vX.Y.Z`) and ships with the next version published.

(Some earlier entries use decimals like `v5.1` for repo-only releases. That scheme was retired on 22 July 2026.)

### v6 · 13 September 2026
Published to Figma Community. (The v5 Community release was superseded by this one and
removed; everything it carried is included here.)
- Print-ready CMYK export: crop and registration marks, colour bars and file info, with a
  white knockout behind the marks so they stay visible on dark art, plus real bleed, on
  both PDF and CMYK TIFF.
- Convert placed images to CMYK on export.
- Choose a transparent or opaque-white TIFF background.
- Redesigned export as an inline screen, reached with a Colors / Export toggle, with the
  format choice and grouped output and marks-and-bleed cards, replacing the old fly-over
  and pop-up modal.
- The plugin scans as soon as it opens. With nothing selected it lists every colour
  variable the file can use (local and library), so you can pair print values without
  picking artwork first.
- Scanning after that stays manual, and the scan button names its target: "Scan selection"
  when something is selected, "Scan file" otherwise.
- The output column expands when the window is resized, so long Pantone and vinyl names
  aren't cut off.
- Exports are steadier: cancelling no longer reports success, PDFs stamp the real export
  date, low-resolution images downsample without vanishing, images stay in the CMYK PDF,
  and large selections no longer crash Figma during pre-flight.
- The window keeps its manually set height on reopen; the content auto-fit no longer
  overrides a saved size.
- Failures are reported as a toast in the corner instead of a red bar wedged into the
  panel, and an error toast stays up longer than a confirmation.
- Dark mode colours and spacing snapped onto the design system's scale, replacing loose
  numbers that matched nothing in the system.

Landed since publishing, and going out with the next Community release:
- Preflight opens from the export bar as a dialog, as the design draws it: images below the
  downsample target and images that stay RGB are listed under Errors, each with Focus in
  canvas, and Rescan checks again. The lists no longer sit inside the Output card.
- The Format choice and the Preflight dialog are built from the design system's own radio
  group, modal, overlay, section divider and list rows.
- Each colour in the list is the design system's table row, as the design draws it: its name
  and value in the m text style with more room above and below, the connector, then its print
  values, and a line under every row but the last.

### v4 · 17 July 2026
Published to Figma Community. Later shared design-system work landed here without
a new Community release, since none of it changed how the plugin works:
- Node and empty-state colours corrected against the design system.
- Section dividers are 2px taller, matching a spacing change in the design system.
