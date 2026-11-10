# AniTools Create

Create is a browser-only artwork studio. It deliberately uses native Canvas APIs so that artwork is composed in the browser without transiting through AniTools servers and the export does not depend on a third-party rendering service.

## Output formats

| Preset | Dimensions | Intended use |
| --- | ---: | --- |
| Story | 1080 × 1920 | 9:16 social story |
| Square | 1080 × 1080 | Square social post |
| AniList thumbnail | 1200 × 630 | Landscape social preview |
| Banner | 1500 × 500 | Wide profile or community banner |

Every preset can be exported as PNG, JPEG or WebP. JPEG exports are flattened over white because the format has no alpha channel.

## Card types

- **Anime card**: a selected anime over its cover or banner, with an optional personal score badge (shown in the score format chosen in Settings), a short personal note and up to three genres.
- **Stats card**: the loaded AniList profile's anime count, episodes, watch time and mean score. Export is disabled until a profile with statistics is loaded.

## Template and rendering rules

- The source image is cropped with a cover strategy and adjustable zoom plus horizontal and vertical focal points.
- AniList cover art or the available trailer thumbnail can be used as the source.
- Automatic content can select the currently watched (most recently updated first), best rated, lowest rated, most popular, longest watched, most rewatched or favourite anime from the loaded AniList list.
- English, Romaji, native and AniList-preferred titles are supported.
- Font family, title scale and subtitle scale are rendered directly into the exported Canvas.
- The accent, background and overlay are user-controlled.
- Text is wrapped and truncated to bounded regions so it cannot escape the canvas.
- The preview and download use the same canvas at the exact output dimensions.
- Filenames are normalized to safe ASCII slugs.

## Privacy and licensing

Images come from AniList only; there is no local file import and nothing is uploaded.

Users remain responsible for the rights to every image, font, logo and character. AniTools does not grant reuse rights for AniList cover art, studio logos or other copyrighted assets. The built-in template uses system fonts and code-generated shapes, so it does not add a separate asset licence requirement.

## Current limitations

- Create is a single-image compositor, not a full layer editor.
- Projects are not persisted; only the downloaded artwork is durable.
- Browser Canvas encoding support determines whether WebP export is available.
