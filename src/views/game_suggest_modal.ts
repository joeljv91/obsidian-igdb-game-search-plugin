import { App, SuggestModal } from 'obsidian';
import { IGDBAPI } from '@src/apis/igdb_games_api';
import { IGDBGame, IGDBGameFromSearch, releaseYearForIGDBGame } from '@models/igdb_game.model';

export class GameSuggestModal extends SuggestModal<IGDBGameFromSearch> {
  constructor(
    app: App,
    private api: IGDBAPI,
    private readonly suggestion: IGDBGameFromSearch[],
    private onChoose: (error: Error | null, result?: IGDBGame) => void,
  ) {
    super(app);
  }

  // Returns all available suggestions.
  getSuggestions(_query: string): IGDBGameFromSearch[] {
    return this.suggestion;
  }

  // Renders each suggestion item.
  renderSuggestion(game: IGDBGameFromSearch, el: HTMLElement) {
    const title = game.name;
    const publishDate = game.first_release_date ? `(${releaseYearForIGDBGame(game)})` : '';
    el.createEl('div', { text: title });
    el.createEl('small', { text: publishDate });
  }

  // Perform action on the selected suggestion.
  async onChooseSuggestion(game: IGDBGameFromSearch) {
    const g = await this.api.getBySlugOrId(game.slug ?? game.id);
    this.onChoose(null, g);
  }
}
