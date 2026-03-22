/* eslint-disable @typescript-eslint/no-explicit-any  */

import type { Nullable } from '../main';
import { requestUrl } from 'obsidian';
import { extract } from 'fuzzball';
import {
  SteamResponse,
  OwnedSteamGames,
  SteamGame,
  SteamWishlistedGame,
  SteamAchievementInfo,
  SteamUserAchievement,
} from '@models/steam_game.model';

export class SteamAPI {
  private resolvedId: string | null = null;

  constructor(private readonly key: string, private readonly userInput: string) {}

  /**
   * Resolves the user-provided Steam identifier to a 64-bit Steam ID.
   * Accepts:
   *   - Full profile URL: https://steamcommunity.com/id/retro-joe/
   *   - Full numeric URL: https://steamcommunity.com/profiles/76561198039686749/
   *   - Vanity name:      retro-joe
   *   - 64-bit ID:        76561198039686749
   * Result is cached after the first resolution.
   */
  async resolveId(): Promise<string> {
    if (this.resolvedId) return this.resolvedId;

    const input = this.userInput.trim();

    // https://steamcommunity.com/profiles/76561198039686749/
    const profileUrlMatch = input.match(/steamcommunity\.com\/profiles\/(\d+)/);
    if (profileUrlMatch) {
      this.resolvedId = profileUrlMatch[1];
      return this.resolvedId;
    }

    // Already a 17-digit Steam64 ID
    if (/^\d{17}$/.test(input)) {
      this.resolvedId = input;
      return this.resolvedId;
    }

    // Extract vanity name from https://steamcommunity.com/id/retro-joe/
    let vanity = input;
    const idUrlMatch = input.match(/steamcommunity\.com\/id\/([^/]+)/);
    if (idUrlMatch) {
      vanity = idUrlMatch[1].replace(/\/$/, '');
    }

    // Resolve via Steam API
    const url = new URL('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/');
    url.searchParams.append('key', this.key);
    url.searchParams.append('vanityurl', vanity);
    url.searchParams.append('format', 'json');
    const res = await requestUrl({ url: url.href, method: 'GET' });
    const steam64: string | undefined = res.json?.response?.steamid;
    if (!steam64) throw new Error('[IGDB Game Searcher][Steam API] Could not resolve Steam vanity URL: ' + vanity);
    this.resolvedId = steam64;
    return this.resolvedId;
  }

  async tryGetGame(nameQuery: string): Promise<Nullable<SteamGame>> {
    try {
      const games = await this.getOwnedGames();
      const results = extract(nameQuery, games, { processor: g => g.name, limit: 1, cutoff: 65, returnObjects: true });
      return results?.[0]?.choice ?? null;
    } catch (error) {
      console.warn('[IGDB Game Searcher][Steam API][tryGetGame]' + error);
      throw error;
    }
  }

  async getOwnedGames(): Promise<SteamGame[]> {
    try {
      const steamId = await this.resolveId();
      const apiURL = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/');
      apiURL.searchParams.append('key', this.key);
      apiURL.searchParams.append('steamid', steamId);
      apiURL.searchParams.append('include_appinfo', 'true');
      apiURL.searchParams.append('format', 'json');

      const res = await requestUrl({
        url: apiURL.href,
        method: 'GET',
      });

      const results = res.json as SteamResponse<OwnedSteamGames>;

      if (results?.response?.game_count <= 0) {
        return [];
      }

      return results.response.games;
    } catch (error) {
      console.warn('[IGDB Game Searcher][Steam API][getOwnedGames]' + error);
      throw error;
    }
  }

  async getWishlist(): Promise<Map<number, SteamWishlistedGame>> {
    try {
      const steamId = await this.resolveId();
      const apiURL = new URL('https://store.steampowered.com/wishlist/profiles/' + steamId + '/wishlistdata/');
      const res = await requestUrl({
        url: apiURL.href,
        method: 'GET',
      });

      // The endpoint returns HTML (not JSON) when the wishlist is private or the profile doesn't exist.
      // Parse text manually so we can give a clear error instead of a cryptic "Unexpected token".
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(res.text);
      } catch {
        throw new Error(
          'Steam wishlist response was not valid JSON. ' +
            'Make sure your Steam profile and wishlist are set to Public in Steam Privacy Settings.',
        );
      }

      const m = new Map<number, SteamWishlistedGame>();
      for (const [k, v] of Object.entries(parsed)) {
        m.set(parseInt(k), v as SteamWishlistedGame);
      }
      return m;
    } catch (error) {
      console.warn('[IGDB Game Searcher][Steam API][getWishlist]' + error);
      throw error;
    }
  }

  async getPlayerStatsForGames(
    gameIds: string[],
  ): Promise<{ [key: string]: { playtime_forever: Nullable<number>; playtime_2weeks: Nullable<number> } } | undefined> {
    try {
      const steamId = await this.resolveId();
      const apiURL = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/');
      apiURL.searchParams.append('key', this.key);
      apiURL.searchParams.append('format', 'json');

      let htmlJsonArrayContent = '';
      const htmlCommaAndSpace = '%2C%20';

      for (const id of gameIds) {
        htmlJsonArrayContent += `${id}${htmlCommaAndSpace}`;
      }

      const query = `%22appids_filter%22%3A%20%5B${htmlJsonArrayContent.substring(
        0,
        htmlJsonArrayContent.length - htmlCommaAndSpace.length,
      )}%5D%2C%20%22steamid%22%3A%20${steamId}`;

      const res = await requestUrl({
        url: `${apiURL.href}&input_json={${query}}`,
        method: 'GET',
      });

      const games = res?.json?.response?.games;

      if (games) {
        const ret: { [key: string]: { playtime_forever: Nullable<number>; playtime_2weeks: Nullable<number> } } = {};
        for (const game of games) {
          ret[game.appid] = {
            playtime_forever: game.playtime_forever,
            playtime_2weeks: game.playtime_2weeks,
          };
        }
        return ret;
      }

      return undefined;
    } catch (error) {
      console.warn('[IGDB Game Searcher][Steam API][getWishlist]' + error);
      throw error;
    }
  }

  async getPlayerAchievmentsForGame(appId: string): Promise<{
    items: { name: string; display_name: string; description: string; achieved: boolean; unlock_time: number | null }[];
    total: number;
  }> {
    try {
      const steamId = await this.resolveId();
      // Get schema (display names + descriptions)
      const schemaUrl = new URL('https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/');
      schemaUrl.searchParams.append('key', this.key);
      schemaUrl.searchParams.append('appid', appId);
      schemaUrl.searchParams.append('format', 'json');
      const schemaResult = await requestUrl({ url: schemaUrl.href, method: 'GET' });
      const schemaAchievements: SteamAchievementInfo[] =
        schemaResult.json?.game?.availableGameStats?.achievements ?? [];

      // Get user's earned achievements
      const userUrl = new URL('https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/');
      userUrl.searchParams.append('key', this.key);
      userUrl.searchParams.append('steamid', steamId);
      userUrl.searchParams.append('appid', appId);
      userUrl.searchParams.append('format', 'json');
      const userResult = await requestUrl({ url: userUrl.href, method: 'GET' });
      const userAchievements: SteamUserAchievement[] = userResult.json?.playerstats?.achievements ?? [];

      // Cross-reference: only return earned achievements with display info
      const schemaMap = new Map(schemaAchievements.map(a => [a.name, a]));
      const items = userAchievements
        .filter(a => a.achieved === 1)
        .map(a => {
          const info = schemaMap.get(a.apiname ?? a.name);
          return {
            name: a.apiname ?? a.name,
            display_name: info?.displayName ?? a.apiname ?? a.name,
            description: info?.description ?? '',
            achieved: true,
            unlock_time: a.unlocktime ?? null,
          };
        });
      return { items, total: schemaAchievements.length };
    } catch (error) {
      console.warn('[IGDB Game Searcher][Steam API][getPlayerAchievementsForGame]' + error);
      return { items: [], total: 0 };
    }
  }
}
