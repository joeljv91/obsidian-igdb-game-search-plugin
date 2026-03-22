import { TFile, Notice, Vault, FileManager, normalizePath } from 'obsidian';
import { extract } from 'fuzzball';
import { IGDBGameSearcherSettings } from '@settings/settings';
import type { Nullable } from '../main';
import { SteamAPI } from '@src/apis/steam_api';
import { IGDBAPI } from '@src/apis/igdb_games_api';
import { makeFileName, stringToMap } from '@utils/utils';
import { IGDBGame, IGDBGameFromSearch } from '@models/igdb_game.model';

type CreateGameFunc = (
  params: {
    game: IGDBGame;
    steam_id: number;
    steam_playtime_forever: number;
    steam_playtime_2weeks: number;
    overwriteFile: boolean;
  },
  openAfterCreate: boolean,
  extraData?: Map<string, string>,
) => Promise<void>;

export async function findAndSyncSteamGame(
  vault: Vault,
  settings: any,
  fileManager: FileManager,
  igdbApi: IGDBAPI,
  name: string,
  steamId: number,
  steamPlaytimeForever: number,
  steamPlaytime2Weeks: number,
  createNewGameNote: CreateGameFunc,
  metadata: Map<string, string>,
  logDescription: string,
  onMatchFailed?: (name: string) => Promise<IGDBGame | null>,
): Promise<void> {
  // First try precise lookup by Steam App ID via IGDB external_games
  let igdbGame: Nullable<IGDBGame> = await igdbApi.getByExternalSteamId(steamId).catch(() => null);

  // Fall back to fuzzy name search if exact match fails
  if (!igdbGame) {
    let igdbGameFromSearch: Nullable<IGDBGameFromSearch>;
    try {
      const igdbGames = await igdbApi.getByQuery(name);
      if (igdbGames.length > 0) {
        const results = extract(name, igdbGames, { processor: g => g.name, limit: 1, cutoff: 65, returnObjects: true });
        igdbGameFromSearch = results?.[0]?.choice;
      }
    } catch (igdbApiError) {
      console.warn('[IGDB Game Searcher][Steam Sync][ERROR] getting IGDB game for ' + logDescription + ' game ' + name);
      console.warn(igdbApiError);
    }

    if (igdbGameFromSearch) {
      try {
        igdbGame = await igdbApi.getBySlugOrId(igdbGameFromSearch.slug ?? igdbGameFromSearch.id);
      } catch (detailError) {
        console.warn('[IGDB Game Searcher][Steam Sync][ERROR] getting IGDB details for ' + name);
        console.warn(detailError);
      }
    }
  }

  if (!igdbGame) {
    if (onMatchFailed) {
      try {
        igdbGame = await onMatchFailed(name);
      } catch (e) {
        console.warn('[IGDB Game Searcher][Steam Sync][onMatchFailed] ' + e);
      }
    }
  }

  if (!igdbGame) {
    new Notice('Unable to sync ' + logDescription + ' game ' + name);
    console.warn('[IGDB Game Searcher][Steam Sync] SKIPPING! ' + name);
    return;
  }

  const possibleExistingFilePath = makeFileName(igdbGame, settings.fileNameFormat);
  const existingGameFile = vault.getAbstractFileByPath(
    normalizePath(settings.folder + '/' + possibleExistingFilePath),
  ) as TFile;

  if (existingGameFile) {
    console.info(
      '[IGDB Game Searcher][Steam Sync]: found match for vault file: ' +
        existingGameFile.name +
        ' and ' +
        logDescription +
        ' game: ' +
        name,
    );

    await fileManager.processFrontMatter(existingGameFile, data => {
      data.steam_id = steamId;
      data.steam_playtime_forever = steamPlaytimeForever;
      data.steam_playtime_2weeks = steamPlaytime2Weeks;
      if (metadata && metadata instanceof Map) {
        for (const [key, value] of metadata) {
          data[key.trim()] = value.trim();
        }
      }
      return data;
    });
  } else {
    console.info('[IGDB Game Searcher][Steam Sync] creating note for ' + name);
    try {
      await createNewGameNote(
        {
          game: igdbGame,
          steam_id: steamId,
          steam_playtime_forever: steamPlaytimeForever,
          steam_playtime_2weeks: steamPlaytime2Weeks,
          overwriteFile: false,
        },
        false,
        metadata,
      );
    } catch (writeError) {
      console.warn('[IGDB Game Searcher][Steam Sync][ERROR] writing file for steam game ' + name);
      console.warn(writeError);
    }
  }
}

export async function syncSteamWishlist(
  vault: Vault,
  settings: any,
  fileManager: FileManager,
  igdbApi: IGDBAPI,
  steamApi: SteamAPI,
  createNewGameNote: CreateGameFunc,
  processedPercent: (percent: number) => void,
  onMatchFailed?: (name: string) => Promise<IGDBGame | null>,
): Promise<void> {
  if (!steamApi) return;
  console.info('[IGDB Game Searcher][Steam Sync]: fetching wishlist from steam api');
  const wishlistGames = await steamApi.getWishlist();
  let index = 0;
  const amount = wishlistGames.size;

  for (const [key, value] of wishlistGames) {
    await findAndSyncSteamGame(
      vault,
      settings,
      fileManager,
      igdbApi,
      value.name,
      key,
      0,
      0,
      createNewGameNote,
      stringToMap(settings.metaDataForWishlistedSteamGames),
      'wishlisted steam',
      onMatchFailed,
    );
    processedPercent(++index / amount);
  }
}

export async function syncOwnedSteamGames(
  vault: Vault,
  settings: IGDBGameSearcherSettings,
  fileManager: FileManager,
  igdbApi: IGDBAPI,
  steamApi: SteamAPI,
  createNewGameNote: CreateGameFunc,
  processedPercent: (percent: number) => void,
  onMatchFailed?: (name: string) => Promise<IGDBGame | null>,
): Promise<void> {
  if (!steamApi) return;
  console.info('[IGDB Game Searcher][Steam Sync]: fetching owned games from steam api');
  const ownedSteamGames = await steamApi.getOwnedGames();

  console.info('[IGDB Game Searcher][Steam Sync]: begin steam game directory iteration');
  let index = 0;
  const amount = ownedSteamGames.length;

  for (let i = 0; i < ownedSteamGames.length; i++) {
    const steamGame = ownedSteamGames[i];
    await findAndSyncSteamGame(
      vault,
      settings,
      fileManager,
      igdbApi,
      steamGame.name,
      steamGame.appid,
      steamGame.playtime_forever,
      steamGame.playtime_2weeks,
      createNewGameNote,
      stringToMap(settings.metaDataForOwnedSteamGames),
      'owned steam',
      onMatchFailed,
    );
    processedPercent(++index / amount);
  }
}

export async function syncPlaytimes(
  vault: Vault,
  fileManager: FileManager,
  steamApi: SteamAPI,
  settings: any,
): Promise<void> {
  const folderPath = normalizePath(settings.folder);
  const folder = vault.getFolderByPath(folderPath);

  const doForChild = async (func: (file: TFile) => Promise<void>) => {
    for (const f of folder.children) {
      const file = f as TFile;
      if (!!file && file.name.includes('.md')) {
        await func(file);
      }
    }
  };

  // Collect all steam_ids from notes first
  const ids: string[] = [];
  await doForChild(async file => {
    await new Promise<void>(resolve => {
      fileManager.processFrontMatter(file, data => {
        if (data.steam_id) ids.push(String(data.steam_id));
        resolve();
        return data;
      });
    });
  });

  const playerStats = await steamApi.getPlayerStatsForGames(ids);
  if (playerStats) {
    await doForChild(async file => {
      await fileManager.processFrontMatter(file, data => {
        const id = data.steam_id ? String(data.steam_id) : null;
        if (id && playerStats[id]) {
          data.steam_playtime_forever = playerStats[id].playtime_forever;
          data.steam_playtime_2weeks = playerStats[id].playtime_2weeks;
        }
        return data;
      });
    });
  }
}

export async function syncAchievements(
  vault: Vault,
  fileManager: FileManager,
  steamApi: SteamAPI,
  settings: any,
): Promise<void> {
  const folderPath = normalizePath(settings.folder);
  const folder = vault.getFolderByPath(folderPath);

  for (const f of folder.children) {
    const file = f as TFile;
    if (!file || !file.name.includes('.md')) continue;

    // Read steam_id from frontmatter
    let steamAppId: string | null = null;
    await new Promise<void>(resolve => {
      fileManager.processFrontMatter(file, data => {
        if (data.steam_id) steamAppId = String(data.steam_id);
        resolve();
        return data;
      });
    });

    if (!steamAppId) continue;

    try {
      const result = await steamApi.getPlayerAchievmentsForGame(steamAppId);

      await fileManager.processFrontMatter(file, data => {
        data.steam_achievements_total = result.total;
        data.steam_achievements_earned = result.items.length;
        data.steam_achievements_percent =
          result.total > 0 ? Math.round((result.items.length / result.total) * 1000) / 10 : 0;
        data.steam_achievements = result.items.map(a => ({
          name: a.display_name,
          description: a.description,
          unlock_time: a.unlock_time ? new Date(a.unlock_time * 1000).toISOString().split('T')[0] : null,
        }));
        return data;
      });
    } catch (e) {
      console.warn('[IGDB Game Searcher][Steam Sync][syncAchievements] failed for appId ' + steamAppId, e);
    }
  }
}
