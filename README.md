# IGDB Game Searcher

- [How to Install](#how-to-install)
- [Basic Usage](#basic-usage)
- [Steam Sync](#steam-sync)
  - [Steam Frontmatter Properties](#steam-frontmatter-properties)
  - [Achievements](#achievements)
  - [Manual Match](#manual-match)
- [Templating](#templating)
  - [Example Template](#example-template)
  - [Template Variables](#template-variables)
  - [Inline Scripts](#inline-scripts)
  - [Regenerating File Metadata](#regenerating-file-metadata)
- [Settings Reference](#settings-reference)

## Description

Search for games by title and automatically create notes with metadata fetched from the [IGDB API](https://api-docs.igdb.com/). Optionally sync your Steam library, wishlist, playtime, and achievements.

## How to Install

Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat) using the repo URL, or clone directly and symlink to your vault's plugins folder.

## Basic Usage

1. Create a Twitch Developer application at [dev.twitch.tv](https://dev.twitch.tv/console/apps) to get a **Client ID** and **Client Secret**
2. Enter both in plugin settings
3. Select a folder for game notes, a file name format (e.g. `{{name}} ({{release_year}})`), and a template file
4. Run **Create new game note**, search for a game, and pick from results

The search modal shows covers, release year, and category badges (DLC, Remake, etc.). Results are live-updated as you type.

## Steam Sync

1. Get a Steam Web API key from [steamcommunity.com/dev](https://steamcommunity.com/dev)
2. Enter your **Steam Profile** — accepts any of:
   - Profile URL: `https://steamcommunity.com/id/retro-joe/`
   - Numeric URL: `https://steamcommunity.com/profiles/76561198039686749/`
   - Vanity name: `retro-joe`
   - 64-bit Steam ID: `76561198039686749`  
   The plugin resolves it to a Steam64 ID automatically (result is cached per session).
3. Ensure Steam Privacy Settings have **Game details** and **Wishlist** set to `Public`
4. (Optional) define metadata key/value pairs to inject into owned or wishlisted notes — e.g. `owned_platform: steam`
5. Run **Sync Steam** — syncs owned games, wishlist, and achievements in one pass

Matching uses the IGDB `external_games` endpoint (exact Steam App ID) and falls back to fuzzy name matching.

### Steam Frontmatter Properties

The following snake_case properties are written automatically to synced notes. Do not remove `steam_id` from notes you want to keep synced.

| Property | Description |
|---|---|
| `steam_id` | Steam App ID |
| `steam_playtime_forever` | Total playtime in minutes |
| `steam_playtime_2weeks` | Playtime in the last 2 weeks (minutes) |
| `steam_achievements_total` | Total achievements in the game |
| `steam_achievements_earned` | Number of achievements you've unlocked |
| `steam_achievements_percent` | Completion percentage (1 decimal) |
| `steam_achievements` | List of unlocked achievements with `name`, `description`, `unlock_time` |

### Achievements

Achievements are synced as part of **Sync Steam**. You can also run **Sync Steam Achievements** independently to update only achievement data across all notes that have a `steam_id`.

When creating a note manually with *Try match Steam game on creation* enabled, achievements are fetched immediately for the matched game.

### Manual Match

Enable **Prompt on sync failure** in settings. When a game can't be auto-matched during sync, a search modal opens so you can pick the correct IGDB entry manually. A **Skip this game** button lets you bypass it and continue the sync.

## Templating

Pair with [Templater](https://github.com/SilentVoid13/Templater) for rich note generation.

### Example Template

```markdown
---
tags: game
id: "{{id}}"
name: "{{name}}"
igdb_url: "{{url}}"
release_date: "{{release_date}}"
cover_url: "{{cover_url}}"
rating: "{{rating}}"
aggregated_rating: "{{aggregated_rating}}"
steam_url: "{{steam_url}}"
website: "{{website}}"
genres:
<%= game.genres?.filter(g => typeof g === 'object' && g.name).map(g => `  - "${g.name}"`).join('\n') ?? '' %>
platforms:
<%= game.platforms?.filter(p => typeof p === 'object' && p.name).map(p => `  - "${p.name}"`).join('\n') ?? '' %>
developers:
<%= game.involved_companies?.filter(c => c.developer && c.company?.name).map(c => `  - "${c.company.name}"`).join('\n') ?? '' %>
publishers:
<%= game.involved_companies?.filter(c => c.publisher && c.company?.name).map(c => `  - "${c.company.name}"`).join('\n') ?? '' %>
game_modes:
<%= game.game_modes?.filter(m => typeof m === 'object' && m.name).map(m => `  - "${m.name}"`).join('\n') ?? '' %>
themes:
<%= game.themes?.filter(t => typeof t === 'object' && t.name).map(t => `  - "${t.name}"`).join('\n') ?? '' %>
---
![cover|300]({{cover_url}})

## Summary
{{summary}}

## Notes
```

### Template Variables

| Variable | Type | Description |
|---|---|---|
| `id` | number | IGDB game ID |
| `slug` | string | IGDB game slug |
| `name` | string | Game title |
| `release_date` | string | Release date as `YYYY-MM-DD` |
| `release_year` | string | Release year as `YYYY` |
| `cover_url` | string | Cover image URL (`https://`, `t_cover_big` size) |
| `summary` | string | Short description |
| `storyline` | string | Longer narrative description |
| `rating` | string | IGDB community rating (0–100) |
| `aggregated_rating` | string | External critics rating (0–100) |
| `genres` | string | Comma-separated genre names |
| `platforms` | string | Comma-separated platform names |
| `themes` | string | Comma-separated theme names |
| `game_modes` | string | Comma-separated game mode names |
| `developers` | string | Comma-separated developer names |
| `publishers` | string | Comma-separated publisher names |
| `url` | string | IGDB game page URL |
| `website` | string | Official website URL |
| `steam_url` | string | Steam store URL |

### Inline Scripts

Use `<%= script %>` to run JavaScript against the raw `game` object for richer YAML output:

```
genres:
<%= game.genres?.filter(g => typeof g === 'object' && g.name).map(g => `  - "${g.name}"`).join('\n') ?? '' %>
```

> Always use optional chaining (`?.`) and a `?? ''` fallback — IGDB may omit fields for lesser-known games.

### Regenerating File Metadata

The **Regen** button in settings (*Advanced/Dangerous*) regenerates frontmatter for all notes in your folder.

- Note body is preserved; only the `---` block is replaced
- Looks up IGDB using `id`, `slug`, or `name` frontmatter (falls back to filename)
- Steam properties (`steam_id`, `steam_playtime_forever`, `steam_playtime_2weeks`, `steam_achievements_earned`, `steam_achievements`) and any custom Steam metadata are preserved

## Settings Reference

| Setting | Description |
|---|---|
| IGDB Client ID | Twitch Developer app Client ID |
| IGDB Client Secret | Twitch Developer app Client Secret |
| New file location | Folder where game notes are created |
| New file name | Filename format — supports `{{name}}`, `{{release_year}}`, `{{DATE}}`, etc. |
| Template file | Path to your note template |
| Steam API Key | Steam Web API key |
| Steam Profile | Profile URL, vanity name, or 64-bit Steam ID — resolved automatically |
| Metadata for owned Steam games | Key/value pairs injected into owned game notes |
| Metadata for wishlisted Steam games | Key/value pairs injected into wishlisted game notes |
| Sync Steam on start | Sync library + wishlist + achievements when plugin loads |
| Sync wishlist | Include wishlist in Steam sync (disable if wishlist is private) |
| Sync playtime on start | Update playtime fields for all Steam-linked notes on load |
| Try match Steam game on creation | Auto-match a manually created note to your Steam library |
| Prompt on sync failure | Show a manual search modal when a game can't be auto-matched during sync |

