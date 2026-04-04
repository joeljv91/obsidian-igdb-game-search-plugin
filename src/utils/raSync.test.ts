import { syncRAGames, findAndSyncRAGame } from './raSync';

describe('findAndSyncRAGame', () => {
  const settings: any = {
    folder: 'Games',
    fileNameFormat: '{{name}}',
  };

  it('updates an already linked note by ra_id', async () => {
    const file = { name: 'Sonic.md' } as any;
    const vault: any = {
      getFolderByPath: jest.fn().mockReturnValue({ children: [file] }),
    };

    const fmCalls: any[] = [];
    const fileManager: any = {
      processFrontMatter: jest.fn(async (_target, cb) => {
        const data = { ra_id: 1 };
        const out = cb(data);
        fmCalls.push(out);
      }),
    };

    const igdbApi: any = {};
    const createNewGameNote = jest.fn();

    await findAndSyncRAGame(
      vault,
      settings,
      fileManager,
      igdbApi,
      {
        id: 1,
        title: 'Sonic',
        userCompletionHardcore: '100.00%',
        highestAwardKind: 'mastered',
        highestAwardDate: '2024-01-01T00:00:00+00:00',
        mostRecentAwardedDate: null,
      },
      createNewGameNote,
      new Map(),
    );

    expect(createNewGameNote).not.toHaveBeenCalled();
    expect(fileManager.processFrontMatter).toHaveBeenCalledTimes(2);
    expect(fmCalls[1].ra_user_completion_hardcore).toBe('100.00%');
  });

  it('creates a new note when no existing file matches', async () => {
    const vault: any = {
      getFolderByPath: jest.fn().mockReturnValue({ children: [] }),
      getAbstractFileByPath: jest.fn().mockReturnValue(null),
    };
    const fileManager: any = { processFrontMatter: jest.fn() };

    const igdbGame = { id: 99, slug: 'sonic', name: 'Sonic', first_release_date: 0 };
    const igdbApi: any = {
      getByQuery: jest.fn().mockResolvedValue([{ id: 99, slug: 'sonic', name: 'Sonic' }]),
      getBySlugOrId: jest.fn().mockResolvedValue(igdbGame),
    };

    const createNewGameNote = jest.fn().mockResolvedValue(undefined);

    await findAndSyncRAGame(
      vault,
      settings,
      fileManager,
      igdbApi,
      {
        id: 7,
        title: 'Sonic',
        userCompletionHardcore: '90.00%',
        highestAwardKind: 'beaten-hardcore',
        highestAwardDate: '2024-01-01T00:00:00+00:00',
        mostRecentAwardedDate: null,
      },
      createNewGameNote,
      new Map(),
    );

    expect(createNewGameNote).toHaveBeenCalledTimes(1);
    expect(createNewGameNote.mock.calls[0][0].ra_id).toBe(7);
    expect(createNewGameNote.mock.calls[0][0].ra_user_completion_hardcore).toBe('90.00%');
  });
});

describe('syncRAGames', () => {
  it('syncs only completed games when the setting is enabled', async () => {
    const vault: any = {
      getFolderByPath: jest.fn().mockReturnValue({ children: [] }),
      getAbstractFileByPath: jest.fn().mockReturnValue(null),
    };
    const fileManager: any = { processFrontMatter: jest.fn() };
    const igdbApi: any = {
      getByQuery: jest.fn().mockResolvedValue([{ id: 1, slug: 'completed-game', name: 'Completed Game' }]),
      getBySlugOrId: jest
        .fn()
        .mockResolvedValue({ id: 1, slug: 'completed-game', name: 'Completed Game', first_release_date: 0 }),
    };
    const raApi: any = {
      getAllCompletionProgressWithDetails: jest.fn().mockResolvedValue([
        {
          id: 1,
          title: 'Completed Game',
          userCompletionHardcore: '100.00%',
          highestAwardKind: 'mastered',
          highestAwardDate: '2024-01-01T00:00:00+00:00',
          mostRecentAwardedDate: null,
        },
        {
          id: 2,
          title: 'Played Game',
          userCompletionHardcore: '12.00%',
          highestAwardKind: null,
          highestAwardDate: null,
          mostRecentAwardedDate: null,
        },
      ]),
    };

    const createNewGameNote = jest.fn().mockResolvedValue(undefined);

    await syncRAGames(
      vault,
      {
        folder: 'Games',
        fileNameFormat: '{{name}}',
        onlySyncCompletedRAGames: true,
        metaDataForRASyncedGames: null,
      } as any,
      fileManager,
      igdbApi,
      raApi,
      createNewGameNote,
      () => undefined,
    );

    expect(createNewGameNote).toHaveBeenCalledTimes(1);
    expect(createNewGameNote.mock.calls[0][0].ra_id).toBe(1);
  });
});
