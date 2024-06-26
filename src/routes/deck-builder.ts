import {css, html, LitElement, TemplateResult} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import '../components/deck/edit-deck';
import '@vaadin/scroller';
import {BeforeEnterObserver, Router, RouterLocation} from '@vaadin/router';
import {getAllianceNameFromDescriptor} from '../utils/get-alliance-name-from-descriptor';
import {Division} from '../types/deck-builder';
import {Deck} from '../classes/deck';
import '../components/country-flag';
import '../components/division-flag';
import '../components/deck/summary-view';
import {notificationService} from '../services/notification';
import {LoadUnitsAndDivisionsMixin} from '../mixins/load-units-and-divisions';

@customElement('deck-builder-route')
export class DeckBuilderRoute
  extends LoadUnitsAndDivisionsMixin(LitElement)
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
        flex-direction: row;
        overflow-x: hidden;
      }

      .container {
        display: flex;
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

      .display-mode-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding-left: var(--lumo-space-s);
        padding-right: var(--lumo-space-s);
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

      button > span {
        display: flex;
        flex: 1 1 0%;
      }

      country-flag {
        margin-right: var(--lumo-space-s);
      }

      division-flag {
        margin: 0 var(--lumo-space-s);
      }
      summary-view {
        flex: 1 1 100%;
      }
    `;
  }

  @state()
  userDeckId?: string;

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
    await this.loadUnitsAndDivisions();

    this.availableDivisions = Object.values(this.divisionsMap).sort(
      alphabeticalCompare
    );

    const params = new URLSearchParams(location.search);
    const deckCode = params.get('code');
    const shouldStartEditing = params.get('edit') === 'true';
    const userDeckId = params.get('ud') || undefined;

    const divisionId = location.params.divisionId as string;

    if (divisionId) {
      
      const division = this.divisionsMap[divisionId];
      if(division) {
        this.selectedDivision = division;
        this.selectDivision(division);
      }
      
    }  
      if (deckCode) {
        try {
          const deckFromString = Deck.fromDeckCode(deckCode, {
            unitMap: this.unitMap,
            divisions: this.availableDivisions,
          });

          this.selectedDivision = deckFromString.division;
          this.deckToEdit = deckFromString;
          this.displayMode = shouldStartEditing ? false : true;
          this.userDeckId = userDeckId;
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
      return this.renderDeckEditor(this.deckToEdit, this.userDeckId);
    }

    return this.renderDivisionSelection();
  }

  renderDisplayMode(deck: Deck) {
    return html` <div class="display-mode-container">
      <deck-header
        .deck=${deck}
        .name=${deck.division.name ?? deck.division.descriptor}
      >
        <vaadin-button
          slot="toolbar"
          theme="primary"
          style="min-width: 0px;"
          @click=${() => (this.displayMode = false)}
          >Edit</vaadin-button
        >
      </deck-header>
      <summary-view .deck=${deck}> </summary-view>
    </div>`;
  }

  renderDeckEditor(deck: Deck, userDeckId?: string): TemplateResult {
    return html`<edit-deck
      @change-division-clicked=${() => this.resetDivision()}
      @summary-clicked=${() => (this.displayMode = true)}
      @deck-cleared=${this.clearDeckParameters}
      .userDeckId=${userDeckId}
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
            <div>
              ${getAllianceNameFromDescriptor(div.alliance)} -
              ${div.name ?? div.descriptor}
            </div>
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
