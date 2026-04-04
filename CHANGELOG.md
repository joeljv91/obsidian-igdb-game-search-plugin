# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.1.0](https://github.com/jjimenez22991/obsidian-game-search-plugin/compare/0.0.7...0.1.0) (2026-04-04)


### Bug Fixes

* update manifest-beta ([9cb6c4e](https://github.com/jjimenez22991/obsidian-game-search-plugin/commit/9cb6c4e80c1f65bbcd34d5931aad8fafb68a4681))

### [0.0.7](https://github.com/jjimenez22991/obsidian-game-search-plugin/compare/0.0.6...0.0.7) (2026-03-22)


### Features

* improve readme ([4c32e8d](https://github.com/jjimenez22991/obsidian-game-search-plugin/commit/4c32e8d5f5446a41cc45b7d1619e169ec5e32c3d))
* steam whishlist disable flag, suggest modal improvements, private profile error improvement ([4778a78](https://github.com/jjimenez22991/obsidian-game-search-plugin/commit/4778a7897743834d8ef2d791a93d8997e348f34e))
* update manifest-beta version ([37a5a5f](https://github.com/jjimenez22991/obsidian-game-search-plugin/commit/37a5a5f46c48e849c194250d5e93f102425e2f5b))

### [0.0.6](https://github.com/jjimenez22991/obsidian-game-search-plugin/compare/0.0.5...0.0.6) (2026-03-22)


### Features

* steam achivements + improve suggestion modal ([5488ebc](https://github.com/jjimenez22991/obsidian-game-search-plugin/commit/5488ebc439c0d8629ff93fcc0ee53c3220c554d8))

### [0.0.5](https://github.com/jjimenez22991/obsidian-game-search-plugin/compare/0.0.4...0.0.5) (2026-03-22)


### Features

* fixes igdb + steam suggestions ([2c92dbc](https://github.com/jjimenez22991/obsidian-game-search-plugin/commit/2c92dbc7097e66016c1010c664cb7bbabbb6a7ea))

### [0.0.4](https://github.com/jjimenez22991/obsidian-game-search-plugin/compare/0.0.3...0.0.4) (2026-03-22)

### [0.0.3](https://github.com/jjimenez22991/obsidian-game-search-plugin/compare/0.0.2...0.0.3) (2026-03-21)


### Features

* add steam sync suggest on failure + fix styles ([b8bf11e](https://github.com/jjimenez22991/obsidian-game-search-plugin/commit/b8bf11e9bfcf9eaf0c3d75fe3636761d13dcc808))
* added release patch ([0f866b9](https://github.com/jjimenez22991/obsidian-game-search-plugin/commit/0f866b90ba9f8850d1e05a462608ad6bcba9e965))

## 0.2.14

Adjusts how complex and array objects from RAWG are provided to template/templater
see changes to README in `39f58b0851be94c97209fdbe0ea7c47597fff737`
[Issue 48](https://github.com/CMorooney/obsidian-game-search-plugin/issues/48)

## 0.2.13

Fixes rendering of ESRB rating, partially fixes regeneration of templated metadata
esrb: [issue 46](https://github.com/CMorooney/obsidian-game-search-plugin/issues/46)
templating: [issue 45](https://github.com/CMorooney/obsidian-game-search-plugin/issues/45)
(PR [47](https://github.com/CMorooney/obsidian-game-search-plugin/pull/47))

## 0.2.12

When comparing game names for Steam sync, use [fuzzball](https://github.com/nol13/fuzzball.js)
could probably be tweaked to be more performant,
but a good first step to better string compare

## 0.2.11

Attempt to implement [38](https://github.com/CMorooney/obsidian-game-search-plugin/issues/38)
fixes casing mis-match for some games when trying to match
Steam game on note creation

## 0.2.10

Attempt to implement [38](https://github.com/CMorooney/obsidian-game-search-plugin/issues/38)
Match steam game in user's library when creating game note (if setting on)
and inject metadata right then

adjusts placement of toggles in the settings pane to be a little more sensible

fixes typo in readme, adds content that should have been added with `0.2.9`

## 0.2.9

Attempt to implement [34](https://github.com/CMorooney/obsidian-game-search-plugin/issues/34)
inject steam playtime_forever and playtime_2weeks into metadata

## 0.2.8

Better attempt to fix bug [32](https://github.com/CMorooney/obsidian-game-search-plugin/issues/32)
when trying to match steam games with RAWG API,
mark query as precise and exclude itch.io specifically

## 0.2.7

Better attempt to fix bug [32](https://github.com/CMorooney/obsidian-game-search-plugin/issues/32)
when trying to match steam games with RAWG API, provide Steam as storeId

## 0.2.6

Attempt to fix bug [32](https://github.com/CMorooney/obsidian-game-search-plugin/issues/32)
when trying to match steam games with RAWG API, flag the query as `search_exact`
to try and increase chances of the correct match.

## 0.2.5

Attempt to fix bug [29](https://github.com/CMorooney/obsidian-game-search-plugin/issues/29)

## 0.2.4

Fixes bug where regenerating metadata for game files would incorrectly format a string
that included a colon.

## 0.2.3

Fixes bug where re-generating metadata for game files would
skip executing any inline templater scripts.
[discussion](https://github.com/CMorooney/obsidian-game-search-plugin/discussions/24)

## 0.2.2

Re-initializes settings on API key entry to fix 401 bugs

## 0.2.1

Fixes bugs adding game note when passing undefined params in `createNote`
(addresses bug [20](https://github.com/CMorooney/obsidian-game-search-plugin/issues/20))

## 0.2.0

Adds Steam sync!
Changes how note regeneration works -- instead of completely regenerating the note
only regen and replace the metadata. Carries over steam related metadata if applicable

this is a rather large set of changes..
probably best to look at the README changes at commit `5222179a5758922c3e60060d0dc1d6646b724199`

## 0.1.8

Fixes issue with game titles that include
the pipe character or a question mark.
([Issue 15](https://github.com/CMorooney/obsidian-game-search-plugin/issues/15))

## 0.1.7

Fixes issue with Tags variable serialization
([Issue 13](https://github.com/CMorooney/obsidian-game-search-plugin/issues/13))

## 0.1.6

Fixes broken icon for ribbon button ([Issue 8](https://github.com/CMorooney/obsidian-game-search-plugin/issues/8))

## 0.1.5

Adds a button in the settings page to
completely regenerate all files in the selected folder.
This was mostly done so that folks who were not adding
anything to their templates could update their template and regenerate their library
([Issue 6](https://github.com/CMorooney/obsidian-game-search-plugin/issues/6))

## 0.1.4

Adds request to Game details endpoint of
RAWG api before creating game not or inserting
metadata into existing. This was mostly done so
that game Publishers and Developers could be
used in templating.
([Issue 3](https://github.com/CMorooney/obsidian-game-search-plugin/issues/3))

## 0.1.3

Puts `editorCallback` back when inserting
game metadata into existing note --
_that_ makes sense I just wasn't using
that feature as much/ever.

## 0.1.2

Removes `editorCallback` for action
in prefence of `callback` --
I would like to be able to create a game note
without being in edit mode.

## 0.1.1

Fixes install problem described in 0.1.0

## 0.1.0

Initial release to Obsidian package collection -
this version was broken because of a name mismatch
between the registered plugin and the actual manifest
after making a change to the registration during PR
but not the actual plugin.
