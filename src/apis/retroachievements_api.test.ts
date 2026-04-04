import { requestUrl } from 'obsidian';
import { RetroAchievementsAPI } from './retroachievements_api';

const mockRequestUrl = requestUrl as jest.Mock;

describe('RetroAchievementsAPI', () => {
  beforeEach(() => {
    mockRequestUrl.mockReset();
  });

  it('requests user completion progress with pagination params', async () => {
    mockRequestUrl.mockResolvedValueOnce({
      json: { Count: 1, Total: 1, Results: [{ GameID: 1, Title: 'Sonic' }] },
    });

    const api = new RetroAchievementsAPI('ra-key', 'ra-user');
    const response = await api.getUserCompletionProgress(500, 100);

    expect(response.Total).toBe(1);
    const call = mockRequestUrl.mock.calls[0][0];
    expect(call.url).toContain('API_GetUserCompletionProgress.php');
    expect(call.url).toContain('y=ra-key');
    expect(call.url).toContain('u=ra-user');
    expect(call.url).toContain('c=500');
    expect(call.url).toContain('o=100');
  });

  it('pages through all completion records', async () => {
    mockRequestUrl
      .mockResolvedValueOnce({
        json: {
          Count: 2,
          Total: 3,
          Results: [
            { GameID: 1, Title: 'A' },
            { GameID: 2, Title: 'B' },
          ],
        },
      })
      .mockResolvedValueOnce({
        json: {
          Count: 1,
          Total: 3,
          Results: [{ GameID: 3, Title: 'C' }],
        },
      });

    const api = new RetroAchievementsAPI('ra-key', 'ra-user');
    const result = await api.getAllCompletionProgress();

    expect(result).toHaveLength(3);
    expect(result.map(g => g.GameID)).toEqual([1, 2, 3]);
  });

  it('returns enriched completion data using game detail endpoint', async () => {
    mockRequestUrl
      .mockResolvedValueOnce({
        json: {
          Count: 1,
          Total: 1,
          Results: [
            {
              GameID: 1,
              Title: 'Sonic',
              HighestAwardKind: 'mastered',
              HighestAwardDate: '2024-01-01T00:00:00+00:00',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        json: {
          ID: 1,
          UserCompletionHardcore: '100.00%',
          HighestAwardKind: 'mastered',
          HighestAwardDate: '2024-01-01T00:00:00+00:00',
        },
      });

    const api = new RetroAchievementsAPI('ra-key', 'ra-user');
    const result = await api.getAllCompletionProgressWithDetails();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].userCompletionHardcore).toBe('100.00%');
    expect(mockRequestUrl.mock.calls[1][0].url).toContain('API_GetGameInfoAndUserProgress.php');
  });

  it('retries when RetroAchievements responds with 429', async () => {
    mockRequestUrl.mockRejectedValueOnce(new Error('Request failed, status 429')).mockResolvedValueOnce({
      json: {
        Count: 1,
        Total: 1,
        Results: [{ GameID: 1, Title: 'Sonic' }],
      },
    });

    const api = new RetroAchievementsAPI('ra-key', 'ra-user', { retryBaseDelayMs: 0, maxRetryAttempts: 2 });
    const response = await api.getUserCompletionProgress();

    expect(response.Total).toBe(1);
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);
  });
});
