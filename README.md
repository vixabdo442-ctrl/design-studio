# Design Studio

Design Studio lets your team make social posts, stories, slides, posters and flyers in the browser, starting from a size or a template, and share, comment on and export them.

Inspired by https://canva.com

Built with [oss.new](https://oss.new) for [EveryApp](https://github.com/every-app/every-app).

## Features

- Create a design from a preset size or a custom one and edit text, shapes and images across pages, with undo, redo and autosave.
- Start from bundled or team templates, and save your own designs as team templates.
- Keep a private library of uploaded images (PNG, JPG, WebP, SVG up to 10 MB) and place them in designs.
- Download any page or all pages as PNG or JPG, or the whole design as a PDF, at 1× or 2×.
- Share a design with members by email or with the whole organization, as viewer or editor, and discuss it in comment threads.
- Organize your designs and uploads in private folders and search designs by name.
- Use the organization's brand colors, fonts and logos in one click; admins maintain them.

Left out: accounts and sign-in, which your Gateway handles; AI tools; stock media; video, animation and presenting; live co-editing; printing; plans and billing; enterprise brand controls; integrations and publishing; native apps.

## Setup

```sh
pnpm install
pnpm dev            # run locally behind the local launcher
pnpm test           # unit tests
pnpm run deploy     # deploy to your Cloudflare account behind your Gateway
```

Or install a release with `everyapp install <release URL>`. There are no secrets or settings to fill in. The app uses a D1 database and an R2 bucket; R2 must be enabled on the Cloudflare account once.

The checks in `checks/` run against a packaged release with EveryApp's release runtime.

## Limitations

- Fonts are a fixed set of common system fonts; how they look depends on the viewer's device.
- Text doesn't wrap automatically; use line breaks.
- Two people editing the same design at once don't see each other's changes: the later save is refused and that person reloads to continue.
- Exports render in the browser, so very large designs at 2× can be slow on low-memory devices.
