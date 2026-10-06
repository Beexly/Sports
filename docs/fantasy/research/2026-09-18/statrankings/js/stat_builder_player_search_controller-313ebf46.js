import { Controller } from "@hotwired/stimulus";
import { dispatchAnalytics } from "dispatch_analytics";

// Live, client-side player search shared by StatBuilder+ and MatchupIQ+ (see
// Components::Stats::PlayerPicker/ActivePlayersDataIsland -- this controller
// name is kept as-is on both pages, a purely internal detail not worth
// renaming). On connect, reads the active-player list preloaded by each
// page's own view (a JSON data island rendered once, outside the turbo frame
// this controller's root element lives inside -- so it survives every
// in-frame swap without ever being re-fetched) and filters it in memory on
// every keystroke -- no network round-trip, no debounce needed.
//
// Team logos are shipped once per team (not per player) as <template>s built
// server-side from the real UI::TeamLogo component; rows are built here by
// cloning the matching template rather than re-implementing icon
// resolution/fallback logic in JS.
//
// The dropdown/trending markup PlayerPicker renders server-side is only the
// SSR fallback for the first paint and ?q= deep-links -- every keystroke
// after that replaces the "results" target's contents directly. Selecting a
// result is still a plain `turbo_frame: "_top"` link (a full Turbo Drive
// visit, unchanged) -- only the search-as-you-type path skips the server.
const DATA_ISLAND_ID = "stat-builder-active-players";
const TEAM_LOGOS_ID = "stat-builder-team-logos";

export default class extends Controller {
  static targets = ["input", "results"];
  static values = {
    resultLimit: { type: Number, default: 8 },
    // Each tool's own player-scoped route ("/nfl/advanced/players/stat-builder",
    // "/nfl/advanced/players/matchup-iq") -- mirrors PlayerPicker#player_path
    // on the Ruby side, which the SSR fallback rows already use.
    searchPath: { type: String, default: "/nfl/advanced/players/stat-builder" },
    // The four values below are all opt-in -- the primary PlayerPicker sets
    // none of them, so its behavior is unchanged. They exist for the "add a
    // player to compare" search (Components::StatBuilder::ComparePicker):
    //   position     -- restrict matches to one position (compare is same-position only)
    //   excludeIds   -- CSV of custom_ids to hide (the primary + already-added players)
    //   hrefTemplate -- a full URL carrying "__ID__" where the picked player's
    //                   id goes; when set, result rows link here instead of
    //                   "?player=" so the pick is *appended* to ?compare= (the
    //                   URL, with the current stats/weeks preserved, is built
    //                   server-side -- JS just fills the id)
    //   syncQuery    -- write ?q= into the URL on each keystroke; off for the
    //                   compare search so it doesn't fight the primary picker's own q
    position: { type: String, default: "" },
    excludeIds: { type: String, default: "" },
    hrefTemplate: { type: String, default: "" },
    syncQuery: { type: Boolean, default: true },
  };

  connect() {
    this.players = this.#loadPlayers();
    this.teamLogoTemplates = this.#loadTeamLogoTemplates();
    this.initialResultsHTML = this.hasResultsTarget ? this.resultsTarget.innerHTML : "";
  }

  search(event) {
    const query = event.target.value.trim();

    if (this.syncQueryValue) {
      const url = new URL(window.location.href);
      if (query === "") {
        url.searchParams.delete("q");
      } else {
        url.searchParams.set("q", query);
      }
      history.replaceState(history.state, "", url.toString());
    }

    this.#render(query);
  }

  #render(query) {
    if (!this.hasResultsTarget) return;

    if (query === "") {
      this.resultsTarget.innerHTML = this.initialResultsHTML;
      return;
    }

    this.resultsTarget.replaceChildren(this.#buildDropdown(query));
  }

  #buildDropdown(query) {
    const matches = this.#matches(query);

    const ul = document.createElement("ul");
    ul.className = "player-picker__dropdown";
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-label", "Player search results");
    ul.setAttribute("aria-live", "polite");

    if (matches.length === 0) {
      const li = document.createElement("li");
      li.className = "player-picker__empty";
      li.textContent = "No players found";
      ul.appendChild(li);
      return ul;
    }

    for (const player of matches) ul.appendChild(this.#buildResultRow(query, player));
    return ul;
  }

  #matches(query) {
    const lower = query.toLowerCase();
    const position = this.positionValue;
    const excluded = this.#excludedIds();
    const matches = [];
    for (const player of this.players) {
      if (position && player.position !== position) continue;
      if (excluded.has(player.custom_id)) continue;
      if (player.full_name.toLowerCase().includes(lower)) {
        matches.push(player);
        if (matches.length === this.resultLimitValue) break;
      }
    }
    return matches;
  }

  #excludedIds() {
    return new Set(
      this.excludeIdsValue
        .split(",")
        .map(id => id.trim())
        .filter(Boolean),
    );
  }

  #buildResultRow(query, player) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");

    const a = document.createElement("a");
    a.href = this.hrefTemplateValue
      ? this.hrefTemplateValue.replace("__ID__", encodeURIComponent(player.custom_id))
      : `${this.searchPathValue}?player=${encodeURIComponent(player.custom_id)}`;
    a.className = "player-picker__result";
    a.dataset.turboFrame = "_top";

    // A hrefTemplate is only set for the "add a player to compare" search
    // (see ComparePicker), where picking a result appends them to ?compare= --
    // so that pick is a comparison add. The primary picker (no template) is a
    // plain player selection.
    a.addEventListener("click", () => {
      const name = this.hrefTemplateValue ? "comparison_add_player" : "player_search_select";
      dispatchAnalytics(name, { player: player.custom_id });
    });

    const logo = this.teamLogoTemplates.get(player.team_abbreviation);
    if (logo) a.appendChild(logo.content.cloneNode(true));

    const name = document.createElement("span");
    name.className = "player-picker__result-name";
    this.#appendHighlightedName(name, player.full_name, query);
    a.appendChild(name);

    const position = document.createElement("span");
    position.className = "player-picker__result-pos";
    position.textContent = player.position;
    a.appendChild(position);

    li.appendChild(a);
    return li;
  }

  // Mirrors PlayerPicker#highlighted_name: splits the name around the first
  // case-insensitive match and wraps it in an accent span.
  #appendHighlightedName(parent, name, query) {
    const index = name.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) {
      parent.appendChild(document.createTextNode(name));
      return;
    }

    const finish = index + query.length;
    if (index > 0) parent.appendChild(document.createTextNode(name.slice(0, index)));

    const match = document.createElement("span");
    match.className = "player-picker__match";
    match.textContent = name.slice(index, finish);
    parent.appendChild(match);

    if (finish < name.length) parent.appendChild(document.createTextNode(name.slice(finish)));
  }

  #loadPlayers() {
    const element = document.getElementById(DATA_ISLAND_ID);
    if (!element) return [];

    try {
      return JSON.parse(element.textContent);
    } catch {
      return [];
    }
  }

  #loadTeamLogoTemplates() {
    const map = new Map();
    const container = document.getElementById(TEAM_LOGOS_ID);
    if (!container) return map;

    container.querySelectorAll("template[data-team]").forEach(template => {
      map.set(template.dataset.team, template);
    });
    return map;
  }
}
