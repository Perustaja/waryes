import {css, html, LitElement, TemplateResult} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import '../components/deck/edit-deck';
import '@vaadin/scroller';
import {UnitsDatabaseService} from '../services/units-db';
import {BeforeEnterObserver, Router, RouterLocation} from '@vaadin/router';
// import { decodeDeckString, Deck } from '@izohek/warno-deck-utils';
import {getAllianceNameFromDescriptor} from '../utils/get-alliance-name-from-descriptor';
import {Division, DivisionsMap} from '../types/deck-builder';
import {UnitMap} from '../types/unit';
import {Deck} from '../classes/deck';
import {DivisionsDatabaseService} from '../services/divisions-db';
import '../components/country-flag';
import '../components/division-flag';
import '../components/deck/summary-view';
import {notificationService} from '../services/notification';

@customElement('deck-builder-route')
export class DeckBuilderRoute
  extends LitElement
  implements BeforeEnterObserver
{
  static get styles() {
    return css`
      h3 {
        margin: 0;
      }

      button {
        all: unset;
        cursor: pointer;
      }

      :host {
        height: 100%;
        display: flex;
      }

      .container {
        padding-left: var(--lumo-space-s);
        padding-right: var(--lumo-space-s);
        display: flex;
        overflow-x: hidden;
        width: 100%;
      }

      .full-screen-buttons {
        display: flex;
        flex-direction: column;
        flex: 1 1 100%;
        align-items: stretch;
        padding: var(--lumo-space-s);
      }

      .division-selection {
        display: flex;
        flex-direction: column;
        width: 100%;
      }

      button.choice-button {
        border-radius: var(--lumo-border-radius-m);
        padding: var(--lumo-space-m);
        background-color: var(--lumo-contrast-5pct);
        margin-bottom: var(--lumo-space-s);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        color: var(--lumo-contrast-80pct);
        border: 2px solid transparent;
        flex: 1 1 0;
        font-size: var(--lumo-font-size-xxl);
      }

      button.division-selector {
        border-radius: var(--lumo-border-radius-m);
        padding: var(--lumo-space-l);
        background-color: var(--lumo-contrast-5pct);
        margin-bottom: var(--lumo-space-s);
        display: flex;
        align-items: center;
        color: var(--lumo-contrast-80pct);
        border: 2px solid transparent;
        text-overflow: ellipsis;
        overflow-x: hidden;
        overflow-y: hidden;
        white-space: nowrap;
      }

      button.division-selector span {
        text-overflow: ellipsis;
        overflow-x: hidden;
        white-space: nowrap;
      }

      button:hover {
        background-color: var(--lumo-contrast-10pct);
      }

      button:focus {
        border: 2px solid var(--lumo-primary-color-50pct);
      }

      .button-content {
        flex: 1 1 100%;
        display: flex;
        flex-direction: row;
        width: 100%;
        align-items: center;
        justify-content: space-between;
      }

      .button-content > span {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      country-flag {
        margin-right: var(--lumo-space-s);
      }

      division-flag {
        margin: 0 var(--lumo-space-s);
      }
    `;
  }

  unitMap?: UnitMap;
  divisionsMap?: DivisionsMap;

  /**
   * Currently selected division
   */
  @state()
  selectedDivision?: Division;

  /**
   * Available divisions for selections
   */
  availableDivisions: Division[] = [];

  @state()
  deckToEdit?: Deck;

  /**
   * Whether to show in display mode, this is where you can not edit the deck anymore
   */
  @state()
  displayMode = false;

  /**
   * Converts unit array in to a map to be used by the edit-deck component
   */
  async onBeforeEnter(location: RouterLocation) {
    this.unitMap = await this.fetchUnitMap();

    const [units, divisions] = await Promise.all([
      this.fetchUnitMap(),
      this.fetchDivisionMap(),
    ]);

    this.unitMap = units;
    this.divisionsMap = divisions;

    this.availableDivisions = Object.values(this.divisionsMap).sort(
      alphabeticalCompare
    );

    const params = new URLSearchParams(location.search);
    const deckCode = params.get('code');

    if (deckCode) {
      try {
        const deckFromString = Deck.fromDeckCode(deckCode, {
          unitMap: units,
          divisions: this.availableDivisions,
        });

        this.selectedDivision = deckFromString.division;
        this.deckToEdit = deckFromString;
        this.displayMode = true;
      } catch (err) {
        console.error(err);
        setTimeout(
          () =>
            notificationService.instance?.addNotification({
              duration: 10000,
              content:
                'Unable to load deck code, please report this deck code on the WarYes discord.',
              theme: 'error',
            }),
          1000
        );
      }
    }
  }

  async fetchUnitMap() {
    const units = await UnitsDatabaseService.fetchUnits();
    const unitMap: UnitMap = {};

    if (units) {
      for (const unit of units) {
        unitMap[unit.descriptorName] = unit;
      }
    }

    return unitMap;
  }

  async fetchDivisionMap() {
    const divisions = await DivisionsDatabaseService.fetchDivisions();
    const divisionMap: DivisionsMap = {};

    if (divisions) {
      for (const division of divisions) {
        divisionMap[division.descriptor] = division;
      }
    }

    return divisionMap;
  }

  clearDeckParameters() {
    Router.go('/deck-builder');
  }

  selectDivision(division: Division) {
    if (this.unitMap) {
      this.deckToEdit = new Deck({division, unitMap: this.unitMap});
    } else {
      throw new Error('Unit Map not loaded');
    }
  }

  resetDivision() {
    this.deckToEdit = undefined;
  }

  render(): TemplateResult {
    if (this.displayMode && this.deckToEdit) {
      return this.renderDisplayMode(this.deckToEdit);
    }
    if (this.deckToEdit) {
      return this.renderDeckEditor(this.deckToEdit);
    }

    return this.renderDivisionSelection();
  }

  renderDisplayMode(deck: Deck) {
    return html`<summary-view
      @edit-clicked=${() => (this.displayMode = false)}
      .deck=${deck}
    ></summary-view>`;
  }

  renderDeckEditor(deck: Deck): TemplateResult {
    return html`<edit-deck
      @change-division-clicked=${() => this.resetDivision()}
      @summary-clicked=${() => (this.displayMode = true)}
      @deck-cleared=${this.clearDeckParameters}
      .deck=${deck}
    ></edit-deck>`;
  }

  renderDivisionSelection(): TemplateResult {
    return html`<div class="container">
      <div class="division-selection">
        <h2 style="margin: var(--lumo-space-m);">Select a deck to edit</h2>
        ${this.availableDivisions.map((div) => {
          return html`<button
            class="division-selector"
            @click=${() => this.selectDivision(div)}
          >
            <country-flag .country=${div.country}></country-flag>
            <division-flag .division=${div}></division-flag>
            <span
              >${getAllianceNameFromDescriptor(div.alliance)} -
              ${div.name ?? div.descriptor}</span
            >
          </button>`;
        })}
      </div>
    </div>`;
  }
}

function alphabeticalCompare(a: Division, b: Division) {
  if (a.alliance < b.alliance) {
    return -1;
  }
  if (a.alliance > b.alliance) {
    return 1;
  }
  return 0;
}

declare global {
  interface HTMLElementTagNameMap {
    'deck-builder-route': DeckBuilderRoute;
  }
}