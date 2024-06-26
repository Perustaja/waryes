import { html, LitElement, TemplateResult} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
// @ts-ignore
import WaryesImage from '../../images/waryes-transparent.png';
import {FirebaseService, FirebaseServiceClass} from '../services/firebase';
import { User } from "firebase/auth";
import '@vaadin/app-layout';
import '@vaadin/app-layout/vaadin-drawer-toggle';
import '@vaadin/icon';
import '@vaadin/icons';
import '@vaadin/tabs';
import '../components/notification-manager';
import '../components/authenticated-menu';
import { BeforeEnterObserver } from '@vaadin/router';
import { BundleManagerService } from '../services/bundle-manager';
import { StrapiAdapter } from '../classes/StrapiAdapter';
import { MenuGroup } from './index';

@customElement('application-route')
export class Application extends LitElement implements BeforeEnterObserver {

  firebase: FirebaseServiceClass = FirebaseService;

  @state() 
  menuGroups: MenuGroup[] = [];

  async onBeforeEnter() {
    await BundleManagerService.initialise();
    const menu = await StrapiAdapter.getSideMenu();
    const menuGroups = menu?.data.attributes.MenuGroup;

    if (!menuGroups) {
      return;
    }

    this.menuGroups = menuGroups.map((menuGroup) => {
      return {
        title: menuGroup.Display,
        items: menuGroup.menu_items.data.map((menuItem) => {
          return {
            title: menuItem.attributes.Display,
            logo: menuItem.attributes.Logo,
            link: menuItem.attributes.URL,
            authenticated: menuItem.attributes.Authenticated || false,
          };
        }),
      };
    }) as MenuGroup[];
    
  }
  

  /**
   * loggedInUser states:
   * undefined = waiting for auth status
   * null      = not logged in
   * User      = logged in
   */
  @property()
  loggedInUser: User | null | undefined;

  constructor() {
    super();
    
    this.firebase.auth?.onAuthStateChanged((user) => {
      this.loggedInUser = user
    })
  }

  render(): TemplateResult {
    return html`
    <notification-manager></notification-manager>
    
    ${ this.loggedInUser !== undefined ? html`
        <authenticated-menu .user=${ this.loggedInUser } .menu=${this.menuGroups}>
          <slot></slot>
        </authenticated-menu>` 
        : null
    }`;
  }
}
