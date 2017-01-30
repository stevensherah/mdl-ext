/* eslint-env mocha */
import { before, beforeEach, after, afterEach, describe, it } from 'mocha';
import { expect, assert } from 'chai';
import sinon from 'sinon';
import requireUncached from 'require-uncached';
import jsdomify from 'jsdomify';
import {removeChildElements} from '../../src/utils/dom-utils';
import {patchJsDom} from '../testutils/patch-jsdom';
import {shouldBehaveLikeAMdlComponent} from '../testutils/shared-component-behaviours';
import {
  VK_ENTER,
  VK_SPACE,
} from '../../src/utils/constants';

const JS_COLLAPSIBLE = 'mdlext-js-collapsible';
const COLLAPSIBLE_COMPONENT = 'MaterialExtCollapsible';
const COLLAPSIBLE_CONTROL_CLASS = 'mdlext-collapsible';
const COLLAPSIBLE_REGION_CLASS = 'mdlext-collapsible-region';

const fixture_simple = `
<div class="${JS_COLLAPSIBLE}">
  <button class="${COLLAPSIBLE_CONTROL_CLASS}">Click to expand</button>
</div>
<div class="${COLLAPSIBLE_REGION_CLASS}"><p>A collapsible region</p></div>`;

const fixture_aria_expanded_false = `
<div class="${JS_COLLAPSIBLE}">
  <button class="${JS_COLLAPSIBLE} ${COLLAPSIBLE_CONTROL_CLASS}" tabindex="101" aria-expanded="false" aria-controls="region-1">Click to expand</button>
</div>
<div id="region-1" class=${COLLAPSIBLE_REGION_CLASS} tabindex="102" role="region" hidden><p>A collapsible region #1</p></div>`;

const fixture_aria_expanded_true = `
<div class="${JS_COLLAPSIBLE}">
  <button class="${COLLAPSIBLE_CONTROL_CLASS}" aria-expanded="true" aria-controls="region-2">Click to expand</button>
</div>
<div id="region-2" class="${COLLAPSIBLE_REGION_CLASS}" role="region"><p>A collapsible region #2</p></div>`;

const fixture_without_region = `
<span>
  <div class="${JS_COLLAPSIBLE}">
    <button class="${COLLAPSIBLE_CONTROL_CLASS}">Click to expand</button>
  </div>
</span>`;

const fixture_one_to_many_aria_controls = `
<button class="${JS_COLLAPSIBLE}" aria-expanded="true" aria-controls="region-1 region-2">Click to expand</button>
<div id="region-1" class="${COLLAPSIBLE_REGION_CLASS}"><p>A collapsible region</p></div>
<div id="region-2" class="${COLLAPSIBLE_REGION_CLASS}"><p>A collapsible region</p></div>`;

const fixture_one_to_many_siblings = `
<div class=${JS_COLLAPSIBLE}>Click to expand</div>
<div class="${COLLAPSIBLE_REGION_CLASS}"><p>A collapsible region</p></div>
<div class="${COLLAPSIBLE_REGION_CLASS}"><p>A collapsible region</p></div>`;

const fixture_collapsibles_with_one_to_many_siblings = `
<div class="${JS_COLLAPSIBLE}">
  <button class=${COLLAPSIBLE_CONTROL_CLASS} aria-expanded="true">Collapsible 1</button>
</div>
<div class="${COLLAPSIBLE_REGION_CLASS}"><p>A collapsible region #1.1</p></div>
<p>A Paragraph</p>
<div class="${COLLAPSIBLE_REGION_CLASS}"><p>A collapsible region #1.2</p></div>

<header class="${JS_COLLAPSIBLE} ${COLLAPSIBLE_CONTROL_CLASS}">
  <p>Collapsible 2</p>
</header>
<div class="${COLLAPSIBLE_REGION_CLASS}"><p>A collapsible region #2.1</p></div>
<div class="${COLLAPSIBLE_REGION_CLASS}"><p>A collapsible region #2.2</p></div>
<div class="${COLLAPSIBLE_REGION_CLASS}"><p>A collapsible region #2.3</p></div>`;

const fixture_nested_collapsible = `
<div class="${JS_COLLAPSIBLE}">
  <button class="${COLLAPSIBLE_CONTROL_CLASS}">Click to expand</button>
</div>
<div class="${COLLAPSIBLE_REGION_CLASS}">
  <p>A collapsible region</p>

  <div class="${JS_COLLAPSIBLE}">
    <button class="${COLLAPSIBLE_CONTROL_CLASS}">Click to expand nested</button>
  </div>
  <div class="${COLLAPSIBLE_REGION_CLASS}">
    <p>A nested collapsible region</p>
    
    <div class="${JS_COLLAPSIBLE}">
      <button class="${COLLAPSIBLE_CONTROL_CLASS}">Click to expand nested</button>
    </div>
    <div class="${COLLAPSIBLE_REGION_CLASS}">
      <p>A nested collapsible region</p>
    </div>    
  </div>
</div>`;

const fixture_collapsible_mdl_card = `
<div class="mdl-card" role="presentation">
  <header class="mdl-card__title mdlext-js-collapsible mdlext-collapsible" aria-expanded="true"">
    <button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect">
      <i class="material-icons">view_headline</i>
    </button>
    <h2 class="mdl-card__title-text">Welcome</h2>
  </header>
  <div class="mdl-card__supporting-text mdlext-collapsible-region">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    Mauris sagittis pellentesque lacus eleifend lacinia...
  </div>
  <footer class="mdl-card__actions mdl-card--border mdlext-collapsible-region">
    <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect">
      Get Started
    </a>
  </footer>
  <div class="mdl-card__menu">
    <button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect">
      <i class="material-icons">share</i>
    </button>
  </div>
</div>`;


const fixture = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Collapsible Fixture</title>
</head>
<body>
<main>
  <div id="default-fixture">
    ${fixture_simple}
  </div>
  <div id="mount">
  </div>
</main>
</body>
</html>`;


describe('MaterialExtCollapsible', () => {

  before ( () => {
    patchJsDom(fixture);

    // Must load MDL after jsdom, see: https://github.com/mochajs/mocha/issues/1722
    requireUncached( 'material-design-lite/material');
    global.componentHandler = window.componentHandler;
    expect(componentHandler, 'Expected global MDL component handler').to.be.an.object;

    requireUncached('../../src/collapsible/collapsible');
    expect(window.MaterialExtCollapsible, 'Expected MaterialExtCollapsible not to be null').to.not.null;
    global.MaterialExtCollapsible = window.MaterialExtCollapsible;
  });

  after ( () => {
    jsdomify.destroy();
  });

  afterEach( () => {
    const mount = document.querySelector('#mount');
    const mdl = mount.querySelectorAll('.is-upgraded');
    componentHandler.downgradeElements(mdl);
    removeChildElements(mount);
  });

  describe('General behaviour', () => {

    shouldBehaveLikeAMdlComponent({
      componentName: COLLAPSIBLE_COMPONENT,
      componentCssClass: JS_COLLAPSIBLE,
      newComponenrMountNodeSelector: '#mount',
      newComponentHtml: fixture_simple
    });

    it('should have public methods available via widget', () => {
      const el = defaultCollapsibleFixture();
      componentHandler.upgradeElement(el, 'MaterialExtCollapsible');
      const methods = [
        'getControlElement',
        'getRegionElements',
        'addRegionElements',
        'removeRegionElements',
        'expand',
        'collapse',
        'toggle',
        'disableToggle'
      ];
      methods.forEach( fn => {
        expect(el.MaterialExtCollapsible[fn]).to.be.a('function');
      });

    });

    it('control element should be equal to component element', () => {
      const collapsible = document.createElement('div');
      collapsible.className = JS_COLLAPSIBLE;
      componentHandler.upgradeElement(collapsible, COLLAPSIBLE_COMPONENT);
      expect(collapsible).to.equal(collapsible.MaterialExtCollapsible.getControlElement());
    });

    it('should have default attributes and roles', () => {
      const collapsible = defaultCollapsibleFixture('div');
      let control = collapsible.nextElementSibling;
      expect(control.hasAttribute('aria-expanded')).to.be.false;
      expect(control.hasAttribute('aria-controls')).to.be.false;
      expect(control.hasAttribute('role')).to.be.false;
      expect(control.hasAttribute('tabindex')).to.be.false;

      componentHandler.upgradeElement(collapsible, COLLAPSIBLE_COMPONENT);

      control = collapsible.MaterialExtCollapsible.getControlElement();
      expect(control.hasAttribute('aria-expanded')).to.be.true;
      expect(control.getAttribute('aria-expanded')).to.equal('false');
      expect(control.hasAttribute('aria-controls')).to.be.true;
      expect(control.hasAttribute('role')).to.be.true;
      expect(control.getAttribute('role')).to.equal('button');
      expect(control.hasAttribute('tabindex')).to.be.true;
      expect(control.getAttribute('tabindex')).to.equal('0');

      const regions = collapsible.MaterialExtCollapsible.getRegionElements();
      expect(regions, 'Expected at least one region').to.have.length.above(0);

      regions.forEach( r => {
        expect(r.hasAttribute('id')).to.true;
        expect(r.hasAttribute('role')).to.true;
        expect(r.getAttribute('role')).to.equal('region');
        expect(r.hasAttribute('hidden')).to.true;
        expect(r.classList.contains(COLLAPSIBLE_REGION_CLASS)).to.true;
      });
    });

    it('should not have role="button" if control is a button', () => {
      const collapsible = defaultCollapsibleFixture();
      componentHandler.upgradeElement(collapsible, COLLAPSIBLE_COMPONENT);

      const control = collapsible.MaterialExtCollapsible.getControlElement();
      expect(control.nodeName.toLowerCase()).to.equal('button');
      expect(control.hasAttribute('role')).to.be.false;
    });

    it('should have role="button" if control is not a button', () => {
      const collapsible = defaultCollapsibleFixture('div');
      componentHandler.upgradeElement(collapsible, COLLAPSIBLE_COMPONENT);

      const control = collapsible.MaterialExtCollapsible.getControlElement();
      expect(control.hasAttribute('role')).to.be.true;
      expect(control.getAttribute('role')).to.equal('button');
    });

    it('should set tabindex if control is not a focusable element', () => {
      const collapsible = defaultCollapsibleFixture('div');
      componentHandler.upgradeElement(collapsible, COLLAPSIBLE_COMPONENT);
      const control = collapsible.MaterialExtCollapsible.getControlElement();
      expect(control.hasAttribute('tabindex')).to.be.true;
    });

    it('should not set tabindex if control is a focusable element', () => {
      const collapsible = defaultCollapsibleFixture('button');
      componentHandler.upgradeElement(collapsible, COLLAPSIBLE_COMPONENT);
      const control = collapsible.MaterialExtCollapsible.getControlElement();
      expect(control.hasAttribute('tabindex')).to.be.false;
    });

    it('should accept a collapsible component without a collapsible region', () => {
      const container = document.querySelector('#mount');
      expect(() => {
        container.insertAdjacentHTML('beforeend', fixture_without_region);
        const component = container.querySelector(`.${JS_COLLAPSIBLE}`);
        const region = component.querySelector(`.${COLLAPSIBLE_REGION_CLASS}`);
        expect(region).to.be.null;
        componentHandler.upgradeElement(component, COLLAPSIBLE_COMPONENT);
      }).to.not.throw(Error);
    });

    it('should have two collapsible regions given by aria-controls', () => {
      const container = document.querySelector('#mount');
      container.insertAdjacentHTML('beforeend', fixture_one_to_many_aria_controls);
      const component = container.querySelector(`.${JS_COLLAPSIBLE}`);
      componentHandler.upgradeElement(component, COLLAPSIBLE_COMPONENT);
      expect(component.MaterialExtCollapsible.getRegionElements()).to.have.length.of(2);
    });

    it('should have two collapsible regions given by siblings', () => {
      const container = document.querySelector('#mount');
      container.insertAdjacentHTML('beforeend', fixture_one_to_many_siblings);
      const component = container.querySelector(`.${JS_COLLAPSIBLE}`);
      componentHandler.upgradeElement(component, COLLAPSIBLE_COMPONENT);
      expect(component.MaterialExtCollapsible.getRegionElements()).to.have.length.of(2);
    });

    it('should have two collapsibles with many collapsible regions given by siblings', () => {
      const container = document.querySelector('#mount');
      container.insertAdjacentHTML('beforeend', fixture_collapsibles_with_one_to_many_siblings);
      const components = container.querySelectorAll(`.${JS_COLLAPSIBLE}`);
      componentHandler.upgradeElements(components, COLLAPSIBLE_COMPONENT);
      [...components].forEach(c => {
        expect(c.MaterialExtCollapsible.getRegionElements()).to.have.length.above(1);
      });
    });

    it('should not alter roles and attributes if already given in markup', () => {
      const container = document.querySelector('#mount');
      container.insertAdjacentHTML('beforeend', fixture_aria_expanded_false);
      let component = container.querySelector(`.${JS_COLLAPSIBLE}`);
      let control = component.querySelector(`.${COLLAPSIBLE_CONTROL_CLASS}`);
      let region = container.querySelector(`.${COLLAPSIBLE_REGION_CLASS}`);

      const control_expanded = control.getAttribute('aria-expanded');
      const control_controls = control.getAttribute('aria-controls');
      const control_tabindex = control.tabIndex;
      const region_role = region.getAttribute('role');
      const region_isHidden = region.hasAttribute('hidden');
      const region_tabindex = region.tabIndex;

      componentHandler.upgradeElement(component, COLLAPSIBLE_COMPONENT);

      // Re-query is strictly not needed
      component = container.querySelector(`.${JS_COLLAPSIBLE}`);
      control = component.querySelector(`.${COLLAPSIBLE_CONTROL_CLASS}`);
      region = container.querySelector(`.${COLLAPSIBLE_REGION_CLASS}`);

      expect(control_expanded).to.equal(control.getAttribute('aria-expanded'));
      expect(control_controls).to.equal(control.getAttribute('aria-controls'));
      expect(control_tabindex).to.equal(control.tabIndex);
      expect(region_role).to.equal(region.getAttribute('role'));
      expect(region_isHidden).to.equal(region.hasAttribute('hidden'));
      expect(region_tabindex).to.equal(region.tabIndex);
    });

    it('should render a nested collapsible', () => {
      expect(() => {
        const container = document.querySelector('#mount');
        container.insertAdjacentHTML('beforeend', fixture_nested_collapsible);
        const component = container.querySelector(`.${JS_COLLAPSIBLE}`);
        componentHandler.upgradeElement(component, COLLAPSIBLE_COMPONENT);
      }).to.not.throw(Error);
    });

    it('should render a mdl-card as collapsible', () => {
      expect(() => {
        const container = document.querySelector('#mount');
        container.insertAdjacentHTML('beforeend', fixture_collapsible_mdl_card);
        const component = container.querySelector(`.${JS_COLLAPSIBLE}`);
        componentHandler.upgradeElement(component, COLLAPSIBLE_COMPONENT);
      }).to.not.throw(Error);
    });

  });

  describe('Api', () => {
    it('should add a new collapsible region', () => {
      const container = document.querySelector('#mount');
      container.insertAdjacentHTML('beforeend', fixture_simple);
      const component = container.querySelector(`.${JS_COLLAPSIBLE}`);
      componentHandler.upgradeElement(component, COLLAPSIBLE_COMPONENT);
      expect(component.MaterialExtCollapsible.getRegionElements()).to.have.length.of(1);

      container.insertAdjacentHTML('beforeend',
        '<div id="new-region"><p>A new collapsible region</p></div>');

      component.MaterialExtCollapsible.addRegionElements(document.getElementById('new-region'));
      expect(component.MaterialExtCollapsible.getRegionElements()).to.have.length.of(2);
      expect(document.getElementById('new-region').classList.contains(COLLAPSIBLE_REGION_CLASS)).to.true;
    });

    it('should remove a collapsible region', () => {
      const container = document.querySelector('#mount');
      container.insertAdjacentHTML('beforeend', fixture_one_to_many_aria_controls);
      const component = container.querySelector(`.${JS_COLLAPSIBLE}`);
      componentHandler.upgradeElement(component, COLLAPSIBLE_COMPONENT);
      expect(component.MaterialExtCollapsible.getRegionElements()).to.have.length.of(2);
      const region = document.getElementById('region-1');
      component.MaterialExtCollapsible.removeRegionElements(region);
      expect(component.MaterialExtCollapsible.getRegionElements()).to.have.length.of(1);
    });

    it('should toggle', () => {
      const container = document.querySelector('#mount');
      container.insertAdjacentHTML('beforeend', fixture_one_to_many_aria_controls);
      const component = container.querySelector(`.${JS_COLLAPSIBLE}`);
      componentHandler.upgradeElement(component, COLLAPSIBLE_COMPONENT);
      const aria_expanded = component.MaterialExtCollapsible
        .getControlElement().getAttribute('aria-expanded');

      component.MaterialExtCollapsible.toggle();
      expect(aria_expanded).to.not.equal(component.MaterialExtCollapsible
        .getControlElement().getAttribute('aria-expanded'));

      component.MaterialExtCollapsible.toggle();
      expect(aria_expanded).to.equal(component.MaterialExtCollapsible
        .getControlElement().getAttribute('aria-expanded'));
    });

    it('should expand', () => {
      const container = document.querySelector('#mount');
      container.insertAdjacentHTML('beforeend', fixture_aria_expanded_false);
      const component = container.querySelector(`.${JS_COLLAPSIBLE}`);
      componentHandler.upgradeElement(component, COLLAPSIBLE_COMPONENT);
      const control = component.MaterialExtCollapsible.getControlElement();
      expect(control.getAttribute('aria-expanded')).to.equal('false');
      component.MaterialExtCollapsible.expand();
      expect(control.getAttribute('aria-expanded')).to.equal('true');
    });

    it('should collapse', () => {
      const container = document.querySelector('#mount');
      container.insertAdjacentHTML('beforeend', fixture_aria_expanded_true);
      const component = container.querySelector(`.${JS_COLLAPSIBLE}`);
      componentHandler.upgradeElement(component, COLLAPSIBLE_COMPONENT);
      const control = component.MaterialExtCollapsible.getControlElement();
      expect(control.getAttribute('aria-expanded')).to.equal('true');
      component.MaterialExtCollapsible.collapse();
      expect(control.getAttribute('aria-expanded')).to.equal('false');
    });

    it('should not toggle when control is disabled', () => {
      const container = document.querySelector('#mount');
      container.insertAdjacentHTML('beforeend', fixture_one_to_many_aria_controls);
      const component = container.querySelector(`.${JS_COLLAPSIBLE}`);
      componentHandler.upgradeElement(component, COLLAPSIBLE_COMPONENT);
      const aria_expanded = component.MaterialExtCollapsible
        .getControlElement().getAttribute('aria-expanded');

      component.MaterialExtCollapsible.disableToggle();
      expect(aria_expanded).to.equal(component.MaterialExtCollapsible
        .getControlElement().getAttribute('aria-expanded'));
    });

  });

  describe('Events', () => {
    let component;

    before( () => {
      component = document.querySelector(`#default-fixture .${JS_COLLAPSIBLE}`);
      assert.isNotNull(component, 'Expected collapsible not to be null');
    });

    it('should toggle when clicked', () => {
      const control = component.MaterialExtCollapsible.getControlElement();
      const aria_expanded = control.getAttribute('aria-expanded');

      dispatchMouseEvent(control, 'click');
      expect(aria_expanded).to.not.equal(control.getAttribute('aria-expanded'));

      dispatchMouseEvent(control, 'click');
      expect(aria_expanded).to.equal(control.getAttribute('aria-expanded'));
    });

    it('should toggle when enter is pressed', () => {
      const control = component.MaterialExtCollapsible.getControlElement();
      const aria_expanded = control.getAttribute('aria-expanded');

      dispatchKeyDownEvent(control, VK_ENTER);
      expect(aria_expanded).to.not.equal(control.getAttribute('aria-expanded'));

      dispatchKeyDownEvent(control, VK_ENTER);
      expect(aria_expanded).to.equal(control.getAttribute('aria-expanded'));
    });

    it('should toggle when space is pressed', () => {
      const control = component.MaterialExtCollapsible.getControlElement();
      const aria_expanded = control.getAttribute('aria-expanded');

      dispatchKeyDownEvent(control, VK_SPACE);
      expect(aria_expanded).to.not.equal(control.getAttribute('aria-expanded'));

      dispatchKeyDownEvent(control, VK_SPACE);
      expect(aria_expanded).to.equal(control.getAttribute('aria-expanded'));
    });

    it('should trigger a click event when space key is pressed', () => {
      const control = component.MaterialExtCollapsible.getControlElement();
      const spy = sinon.spy();
      control.addEventListener('click', spy);
      try {
        dispatchKeyDownEvent(control, VK_SPACE);
      }
      finally {
        control.removeEventListener('click', spy);
      }
      expect(spy.called, 'Expected "click" event to fire when SPACE key is pressed').to.true;
    });

    it('should trigger a click event when enter is pressed', () => {
      const control = component.MaterialExtCollapsible.getControlElement();
      const spy = sinon.spy();
      control.addEventListener('click', spy);
      try {
        dispatchKeyDownEvent(control, VK_ENTER);
      }
      finally {
        control.removeEventListener('click', spy);
      }
      expect(spy.called, 'Expected "click" event to fire when ENTER key is pressed').to.true;
    });


    it('should not toggle if control is disabled', () => {
      const control = component.MaterialExtCollapsible.getControlElement();
      control.setAttribute('disabled', '');
      const aria_expanded = control.getAttribute('aria-expanded');
      try {
        dispatchMouseEvent(control, 'click');
      }
      finally {
        control.removeAttribute('disabled');
      }

      control.setAttribute('aria-disabled', 'true');
      try {
        dispatchMouseEvent(control, 'click');
      }
      finally {
        control.removeAttribute('aria-disabled');
      }
      expect(aria_expanded, 'Expected control to not toggle').to.equal(control.getAttribute('aria-expanded'));
    });

    it('should not toggle if a focusable element contained in control element is clicked', () => {
      const collapsible = defaultCollapsibleFixture('div');

      const button = document.createElement('button');
      const control = collapsible.querySelector(`.${COLLAPSIBLE_CONTROL_CLASS}`);
      control.appendChild(button);

      componentHandler.upgradeElement(collapsible, COLLAPSIBLE_COMPONENT);

      const aria_expanded = control.getAttribute('aria-expanded');
      dispatchMouseEvent(button, 'click');
      expect(aria_expanded, 'Expected control to not toggle').to.equal(control.getAttribute('aria-expanded'));
    });

  });

});

function defaultCollapsibleFixture(controlNodeName = 'button') {

  const control = document.createElement(controlNodeName);
  control.className = COLLAPSIBLE_CONTROL_CLASS;

  const collapsible = document.createElement('div');
  collapsible.className = JS_COLLAPSIBLE;
  collapsible.appendChild(control);

  const region = document.createElement('div');
  region.className = COLLAPSIBLE_REGION_CLASS;

  const span = document.createElement('span');
  span.appendChild(collapsible);
  span.appendChild(region);

  const mount = document.getElementById('mount');
  mount.appendChild(span);

  return collapsible;
}

function dispatchKeyDownEvent(target, keyCode, shiftKey=false) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      keyCode: keyCode,
      shiftKey: shiftKey
    })
  );
}

function dispatchMouseEvent(target, name) {

  target.dispatchEvent(
    new MouseEvent(name, {
      bubbles: true,
      cancelable: true,
      view: window
    })
  );
}
