import { requestUrl } from 'obsidian';
import {
  RAGameInfoAndUserProgressResponse,
  RASyncGame,
  RAUserCompletionProgressEntry,
  RAUserCompletionProgressResponse,
} from '@models/retroachievements_game.model';

export class RetroAchievementsAPI {
  private readonly baseUrl = 'https://retroachievements.org/API';
  private readonly detailRequestDelayMs: number;
  private readonly retryBaseDelayMs: number;
  private readonly maxRetryAttempts: number;

  constructor(
    private readonly webApiKey: string,
    private readonly username: string,
    options?: {
      detailRequestDelayMs?: number;
      retryBaseDelayMs?: number;
      maxRetryAttempts?: number;
    },
  ) {
    this.detailRequestDelayMs = options?.detailRequestDelayMs ?? 200;
    this.retryBaseDelayMs = options?.retryBaseDelayMs ?? 1000;
    this.maxRetryAttempts = options?.maxRetryAttempts ?? 5;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRateLimitedError(error: unknown): boolean {
    const status = (error as { status?: number; statusCode?: number })?.status;
    const statusCode = (error as { status?: number; statusCode?: number })?.statusCode;
    if (status === 429 || statusCode === 429) {
      return true;
    }

    const message = String((error as { message?: string })?.message ?? error ?? '');
    return message.includes('status 429') || message.includes(' 429');
  }

  private async requestJsonWithRetry(url: string): Promise<unknown> {
    for (let attempt = 0; attempt < this.maxRetryAttempts; attempt++) {
      try {
        const response = await requestUrl({
          url,
          method: 'GET',
        });
        return response.json;
      } catch (error) {
        const isRateLimited = this.isRateLimitedError(error);
        const isLastAttempt = attempt === this.maxRetryAttempts - 1;
        if (!isRateLimited || isLastAttempt) {
          throw error;
        }

        const waitMs = this.retryBaseDelayMs * Math.pow(2, attempt);
        console.warn(
          '[IGDB Game Searcher][RetroAchievements API] rate limited, retrying in ' +
            waitMs +
            'ms (attempt ' +
            (attempt + 2) +
            '/' +
            this.maxRetryAttempts +
            ')',
        );
        await this.sleep(waitMs);
      }
    }

    throw new Error('[IGDB Game Searcher][RetroAchievements API] exhausted retry attempts');
  }

  private async get(endpoint: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(this.baseUrl + '/' + endpoint);
    url.searchParams.append('y', this.webApiKey);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    return await this.requestJsonWithRetry(url.href);
  }

  async getUserCompletionProgress(count = 500, offset = 0): Promise<RAUserCompletionProgressResponse> {
    const json = (await this.get('API_GetUserCompletionProgress.php', {
      u: this.username,
      c: String(count),
      o: String(offset),
    })) as RAUserCompletionProgressResponse;

    return {
      Count: json?.Count ?? 0,
      Total: json?.Total ?? 0,
      Results: Array.isArray(json?.Results) ? json.Results : [],
    };
  }

  async getGameInfoAndUserProgress(gameId: number): Promise<RAGameInfoAndUserProgressResponse> {
    const json = (await this.get('API_GetGameInfoAndUserProgress.php', {
      u: this.username,
      g: String(gameId),
    })) as RAGameInfoAndUserProgressResponse;

    return {
      ID: json?.ID ?? gameId,
      UserCompletionHardcore: json?.UserCompletionHardcore ?? null,
      HighestAwardKind: json?.HighestAwardKind ?? null,
      HighestAwardDate: json?.HighestAwardDate ?? null,
    };
  }

  async getAllCompletionProgress(): Promise<RAUserCompletionProgressEntry[]> {
    const allResults: RAUserCompletionProgressEntry[] = [];
    let offset = 0;
    const count = 500;
    let hasMore = true;

    while (hasMore) {
      const page = await this.getUserCompletionProgress(count, offset);
      if (!page.Results.length) {
        hasMore = false;
        continue;
      }

      allResults.push(...page.Results);
      offset += page.Results.length;

      if (offset >= page.Total) {
        hasMore = false;
      }
    }

    return allResults;
  }

  async getAllCompletionProgressWithDetails(onProgress?: (percent: number) => void): Promise<RASyncGame[]> {
    const games = await this.getAllCompletionProgress();
    const total = games.length || 1;
    const result: RASyncGame[] = [];

    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      try {
        const details = await this.getGameInfoAndUserProgress(game.GameID);
        result.push({
          id: game.GameID,
          title: game.Title,
          userCompletionHardcore: details.UserCompletionHardcore ?? null,
          highestAwardKind: details.HighestAwardKind ?? game.HighestAwardKind ?? null,
          highestAwardDate: details.HighestAwardDate ?? game.HighestAwardDate ?? null,
          mostRecentAwardedDate: game.MostRecentAwardedDate ?? null,
        });
      } catch (error) {
        console.warn(
          '[IGDB Game Searcher][RetroAchievements API][getAllCompletionProgressWithDetails] failed for gameId ' +
            game.GameID,
          error,
        );
        result.push({
          id: game.GameID,
          title: game.Title,
          userCompletionHardcore: null,
          highestAwardKind: game.HighestAwardKind ?? null,
          highestAwardDate: game.HighestAwardDate ?? null,
          mostRecentAwardedDate: game.MostRecentAwardedDate ?? null,
        });
      }

      if (onProgress) {
        onProgress((i + 1) / total);
      }

      if (i < games.length - 1 && this.detailRequestDelayMs > 0) {
        await this.sleep(this.detailRequestDelayMs);
      }
    }

    return result;
  }
}
