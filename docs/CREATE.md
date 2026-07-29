# AniTools Create

Create is a browser-only artwork studio. It deliberately uses native Canvas APIs so that imported images do not transit through AniTools servers and the export does not depend on a third-party rendering service.

## Output formats

| Preset | Dimensions | Intended use |
| --- | ---: | --- |
| Story | 1080 × 1920 | 9:16 social story |
| Square | 1080 × 1080 | Square social post |
| Badge | 512 × 512 | Avatar or community badge; optional transparent exterior |
| AniList thumbnail | 1000 × 1500 | 2:3 media-style thumbnail |
| Banner | 1500 × 500 | Wide profile or community banner |

Every preset can be exported as PNG, JPEG or WebP. PNG and WebP preserve the transparent area of badges. JPEG exports are flattened over white because the format has no alpha channel.

## Template and rendering rules

- The source image is cropped with a cover strategy and adjustable zoom plus horizontal and vertical focal points.
- The accent, background and overlay are user-controlled.
- Text is wrapped and truncated to bounded regions so it cannot escape the canvas.
- The preview and download use the same canvas at the exact output dimensions.
- Filenames are normalized to safe ASCII slugs.
- PNG, JPEG and WebP are the only accepted source formats. SVG is intentionally excluded because it may contain active or externally referenced content.
- Source files are limited to 20 MB.

## Privacy and licensing

Imported files stay in the browser as temporary object URLs and are released when replaced or when the page closes. No upload endpoint is used.

Users remain responsible for the rights to every imported image, font, logo and character. AniTools does not grant reuse rights for AniList cover art, studio logos or other copyrighted assets. The built-in template uses system fonts and code-generated shapes, so it does not add a separate asset licence requirement.

## Current limitations

- Create is a single-image compositor, not a full layer editor.
- Projects are not persisted; only the downloaded artwork is durable.
- Browser Canvas encoding support determines whether WebP export is available.
- Cross-origin remote URLs are not accepted directly. Download the licensed source first, then import the local file.
