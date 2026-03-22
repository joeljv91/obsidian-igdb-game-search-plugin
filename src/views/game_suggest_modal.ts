import { App, SuggestModal } from 'obsidian';
import { IGDBAPI } from '@src/apis/igdb_games_api';
import { IGDBGame, IGDBGameFromSearch, releaseYearForIGDBGame, normalizeCoverUrl } from '@models/igdb_game.model';

export class GameSuggestModal extends SuggestModal<IGDBGameFromSearch> {
  private items: IGDBGameFromSearch[];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    app: App,
    private api: IGDBAPI,
    private readonly suggestion: IGDBGameFromSearch[],
    private onChoose: (error: Error | null, result?: IGDBGame) => void,
    private readonly initialQuery?: string,
  ) {
    super(app);
    this.items = [...suggestion];
    this.setPlaceholder('Type to search IGDB...');
  }

  onOpen() {
    super.onOpen();
    // Pre-populate input with the initial query (e.g. Steam game name)
    // so the user sees what was searched and can refine it
    if (this.initialQuery) {
      this.inputEl.value = this.initialQuery;
      this.inputEl.dispatchEvent(new Event('input'));
    }

    // Skip button — lets the user dismiss without selecting (useful during Steam sync)
    const footer = this.modalEl.createDiv({ cls: 'igdb-game-searcher__suggest-footer' });
    const skipBtn = footer.createEl('button', {
      text: 'Skip this game',
      cls: 'igdb-game-searcher__suggest-skip',
    });
    skipBtn.addEventListener('click', () => {
      this.close();
      this.onChoose(new Error('skipped'));
    });
  }

  // Returns filtered suggestions; also triggers async IGDB re-fetch on new queries.
  getSuggestions(query: string): IGDBGameFromSearch[] {
    if (!query) return this.items;

    const q = query.toLowerCase();
    const clientFiltered = this.items.filter(g => g.name.toLowerCase().includes(q));

    // Debounced IGDB re-fetch so typing a new title loads fresh results
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.fetchFromIGDB(query), 400);

    return clientFiltered.length ? clientFiltered : this.items;
  }

  private async fetchFromIGDB(query: string) {
    try {
      const results = await this.api.getByQuery(query);
      if (results?.length) {
        this.items = results;
        // Trigger Obsidian's internal suggestion refresh
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any).updateSuggestions?.();
      }
    } catch {
      // silently ignore fetch errors
    }
  }

  // Renders each suggestion item.
  renderSuggestion(game: IGDBGameFromSearch, el: HTMLElement) {
    const container = el.createDiv({ cls: 'igdb-game-searcher__suggest-item' });

    const coverUrl = normalizeCoverUrl(game.cover?.url);
    if (coverUrl) {
      const img = container.createEl('img', { cls: 'igdb-game-searcher__suggest-cover' });
      img.src = coverUrl;
      img.alt = game.name;
    } else {
      container.createEl('div', {
        cls: 'igdb-game-searcher__suggest-cover igdb-game-searcher__suggest-cover--placeholder',
      });
    }

    const info = container.createEl('div', { cls: 'igdb-game-searcher__suggest-info' });
    const titleRow = info.createEl('div', { cls: 'igdb-game-searcher__suggest-title-row' });
    titleRow.createEl('span', { text: game.name, cls: 'igdb-game-searcher__suggest-title' });
    if (game.category != null && game.category !== 0) {
      const categoryLabel: Record<number, string> = {
        1: 'DLC',
        2: 'Expansion',
        3: 'Bundle',
        4: 'Standalone DLC',
        5: 'Mod',
        6: 'Episode',
        7: 'Season',
        8: 'Remake',
        9: 'Remaster',
        10: 'Expanded',
        11: 'Port',
        12: 'Fork',
        13: 'Pack',
        14: 'Update',
      };
      titleRow.createEl('span', {
        text: categoryLabel[game.category] ?? 'Other',
        cls: 'igdb-game-searcher__suggest-category',
      });
    }
    if (game.first_release_date) {
      info.createEl('small', { text: releaseYearForIGDBGame(game), cls: 'igdb-game-searcher__suggest-year' });
    }
  }

  // Perform action on the selected suggestion.
  async onChooseSuggestion(game: IGDBGameFromSearch) {
    const g = await this.api.getBySlugOrId(game.slug ?? game.id);
    this.onChoose(null, g);
  }
}
