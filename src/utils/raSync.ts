import { TFile, Notice, Vault, FileManager, normalizePath } from 'obsidian';
import { extract } from 'fuzzball';
import { IGDBGameSearcherSettings } from '@settings/settings';
import type { Nullable } from '../main';
import { IGDBAPI } from '@src/apis/igdb_games_api';
import { RetroAchievementsAPI } from '@src/apis/retroachievements_api';
import { makeFileName, stringToMap } from '@utils/utils';
import { IGDBGame, IGDBGameFromSearch } from '@models/igdb_game.model';
import { RASyncGame } from '@models/retroachievements_game.model';

const RA_COMPLETION_AWARD_KINDS = new Set(['mastered', 'completed', 'beaten', 'beaten-hardcore']);

function isCompletedRAGame(game: RASyncGame): boolean {
  const awardKind = (game.highestAwardKind ?? '').toLowerCase().trim();
  if (RA_COMPLETION_AWARD_KINDS.has(awardKind)) {
    return true;
  }

  const hardcoreCompletionText = (game.userCompletionHardcore ?? '').replace('%', '').trim();
  const hardcoreCompletion = parseFloat(hardcoreCompletionText);
  return !Number.isNaN(hardcoreCompletion) && hardcoreCompletion >= 100;
}

type CreateGameFunc = (
  params: {
    game: IGDBGame;
    overwriteFile: boolean;
    ra_id?: number;
    ra_user_completion_hardcore?: string | null;
    ra_highest_award_kind?: string | null;
    ra_highest_award_date?: string | null;
  },
  openAfterCreate: boolean,
  extraData?: Map<string, string>,
) => Promise<void>;

export async function findAndSyncRAGame(
  vault: Vault,
  settings: IGDBGameSearcherSettings,
  fileManager: FileManager,
  igdbApi: IGDBAPI,
  game: RASyncGame,
  createNewGameNote: CreateGameFunc,
  metadata: Map<string, string>,
  onMatchFailed?: (name: string) => Promise<IGDBGame | null>,
): Promise<void> {
  const folderPath = normalizePath(settings.folder);
  const folder = vault.getFolderByPath(folderPath);

  if (folder) {
    for (const f of folder.children) {
      const file = f as TFile;
      if (!file || !file.name.endsWith('.md')) continue;

      let alreadyLinked = false;
      await new Promise<void>(resolve => {
        fileManager.processFrontMatter(file, data => {
          if (data.ra_id != null && Number(data.ra_id) === game.id) {
            alreadyLinked = true;
          }
          resolve();
          return data;
        });
      });

      if (alreadyLinked) {
        await fileManager.processFrontMatter(file, data => {
          data.ra_id = game.id;
          data.ra_user_completion_hardcore = game.userCompletionHardcore;
          data.ra_highest_award_kind = game.highestAwardKind;
          data.ra_highest_award_date = game.highestAwardDate ?? game.mostRecentAwardedDate;
          if (metadata && metadata instanceof Map) {
            for (const [key, value] of metadata) {
              data[key.trim()] = value.trim();
            }
          }
          return data;
        });
        return;
      }
    }
  }

  let igdbGame: Nullable<IGDBGame> = null;
  let igdbGameFromSearch: Nullable<IGDBGameFromSearch> = null;

  try {
    const igdbGames = await igdbApi.getByQuery(game.title);
    if (igdbGames.length > 0) {
      const results = extract(game.title, igdbGames, {
        processor: g => g.name,
        limit: 1,
        cutoff: 65,
        returnObjects: true,
      });
      igdbGameFromSearch = results?.[0]?.choice;
    }
  } catch (error) {
    console.warn('[IGDB Game Searcher][RA Sync][ERROR] getting IGDB game for RA game ' + game.title);
    console.warn(error);
  }

  if (igdbGameFromSearch) {
    try {
      igdbGame = await igdbApi.getBySlugOrId(igdbGameFromSearch.slug ?? igdbGameFromSearch.id);
    } catch (error) {
      console.warn('[IGDB Game Searcher][RA Sync][ERROR] getting IGDB details for ' + game.title);
      console.warn(error);
    }
  }

  if (!igdbGame && onMatchFailed) {
    try {
      igdbGame = await onMatchFailed(game.title);
    } catch (error) {
      console.warn('[IGDB Game Searcher][RA Sync][onMatchFailed] ' + error);
    }
  }

  if (!igdbGame) {
    new Notice('Unable to sync retroachievements game ' + game.title);
    return;
  }

  const possibleExistingFilePath = makeFileName(igdbGame, settings.fileNameFormat);
  const existingGameFile = vault.getAbstractFileByPath(
    normalizePath(settings.folder + '/' + possibleExistingFilePath),
  ) as TFile;

  if (existingGameFile) {
    await fileManager.processFrontMatter(existingGameFile, data => {
      data.ra_id = game.id;
      data.ra_user_completion_hardcore = game.userCompletionHardcore;
      data.ra_highest_award_kind = game.highestAwardKind;
      data.ra_highest_award_date = game.highestAwardDate ?? game.mostRecentAwardedDate;
      if (metadata && metadata instanceof Map) {
        for (const [key, value] of metadata) {
          data[key.trim()] = value.trim();
        }
      }
      return data;
    });
  } else {
    await createNewGameNote(
      {
        game: igdbGame,
        overwriteFile: false,
        ra_id: game.id,
        ra_user_completion_hardcore: game.userCompletionHardcore,
        ra_highest_award_kind: game.highestAwardKind,
        ra_highest_award_date: game.highestAwardDate ?? game.mostRecentAwardedDate,
      },
      false,
      metadata,
    );
  }
}

export async function syncRAGames(
  vault: Vault,
  settings: IGDBGameSearcherSettings,
  fileManager: FileManager,
  igdbApi: IGDBAPI,
  raApi: RetroAchievementsAPI,
  createNewGameNote: CreateGameFunc,
  processedPercent: (percent: number) => void,
  onMatchFailed?: (name: string) => Promise<IGDBGame | null>,
): Promise<void> {
  const rawGames = await raApi.getAllCompletionProgressWithDetails();
  const games = settings.onlySyncCompletedRAGames ? rawGames.filter(isCompletedRAGame) : rawGames;
  const metadata = stringToMap(settings.metaDataForRASyncedGames);
  const total = games.length || 1;

  for (let i = 0; i < games.length; i++) {
    await findAndSyncRAGame(
      vault,
      settings,
      fileManager,
      igdbApi,
      games[i],
      createNewGameNote,
      metadata,
      onMatchFailed,
    );
    processedPercent((i + 1) / total);
  }
}
