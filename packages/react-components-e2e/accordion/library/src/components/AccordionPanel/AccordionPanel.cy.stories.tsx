import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Accordion, AccordionHeader, AccordionItem } from '../../index';
import { AccordionPanel } from './AccordionPanel';
import type { AccordionPanelProps } from './AccordionPanel.types';
import { Default } from '../../../../stories/src/Accordion/AccordionDefault.stories';
import { Controlled } from '../../../../stories/src/Accordion/AccordionControlled.stories';
import { Multiple } from '../../../../stories/src/Accordion/AccordionMultiple.stories';
import { Disabled } from '../../../../stories/src/Accordion/AccordionDisabled.stories';
import { motionTokens } from '@fluentui/react-motion';
import type { MotionImperativeRef } from '@fluentui/react-motion';
import * as axe from 'axe-core';
import { getTabster } from 'tabster';

const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
const panel = (props: AccordionPanelProps = {}, open = false) =>
  render(
    <Accordion collapsible defaultOpenItems={open ? ['a'] : []}>
      <AccordionItem value="a">
        <AccordionHeader as="h2" button={{ id: 'header' }}>
          Section
        </AccordionHeader>
        <AccordionPanel id="panel" {...props}>
          <button id="action">Action</button>
          <input id="input" aria-label="Notes" />
        </AccordionPanel>
      </AccordionItem>
    </Accordion>,
  );
const settled = () =>
  cy
    .get('#panel')
    .should('be.visible')
    .should($node => {
      expect(
        $node[0].getAnimations({ subtree: true }).filter(animation => animation.playState === 'running'),
      ).to.have.length(0);
    });
const setMotionState = (ref: React.RefObject<MotionImperativeRef | null | undefined>, state: 'paused' | 'running') =>
  cy.then(() => {
    if (!ref.current) {
      throw new Error('Motion imperative handle is not initialized');
    }
    ref.current.setPlayState(state);
  });
const emulateMotion = (value: 'reduce' | 'no-preference') =>
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [{ name: 'prefers-reduced-motion', value }] },
    }),
  );

beforeEach(() => emulateMotion('no-preference'));
afterEach(() =>
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [] },
    }),
  ),
);

describe('AccordionPanel documented content and motion', () => {
  it('mounts only open default-story content and unmounts the previously selected panel', () => {
    render(<Default />);
    cy.get('.fui-AccordionPanel').should('not.exist');
    cy.contains('button', 'Accordion Header 1').realClick();
    cy.contains('Accordion Panel 1').should('be.visible');
    cy.contains('button', 'Accordion Header 2').focus();
    cy.realPress('Enter');
    cy.contains('Accordion Panel 2').should('be.visible');
    cy.contains('Accordion Panel 1').should('not.exist');
  });

  it('keeps independently selected multiple-story panels mounted', () => {
    render(<Multiple />);
    cy.contains('button', 'Accordion Header 1').focus();
    cy.realPress('Enter');
    cy.contains('button', 'Accordion Header 2').focus();
    cy.realPress('Enter');
    cy.get('.fui-AccordionPanel').should('have.length', 2);
  });

  it('follows accepted controlled-story expansion and collapse', () => {
    render(<Controlled />);
    cy.contains('Accordion Panel 1').should('be.visible');
    cy.contains('button', 'Accordion Header 1').focus();
    cy.realPress('Space');
    cy.contains('Accordion Panel 1').should('not.exist');
  });

  it('keeps disabled-story panels absent through native pointer activation', () => {
    render(<Disabled />);
    cy.get('button').first().realClick();
    cy.get('.fui-AccordionPanel').should('not.exist');
  });

  it('renders documented panel margins without overriding custom content geometry', () => {
    panel({}, true);
    cy.get('#panel').should('have.css', 'margin-left', '12px').and('have.css', 'margin-right', '12px');
    cy.get('#action').should('be.visible');
  });

  it('applies documented direct duration, easing and opacity parameters to actual animations', () => {
    panel({ collapseMotion: { duration: 1000, easing: motionTokens.curveDecelerateMid, animateOpacity: true } });
    cy.get('#header').realClick();
    cy.get('#panel').should($node => {
      const animations = $node[0].getAnimations();
      expect(animations.length).to.be.greaterThan(0);
      expect(animations.map(animation => animation.effect?.getTiming().duration)).to.deep.equal([1000, 1000, 1000]);
      expect(animations.map(animation => animation.effect?.getTiming().easing?.replace(/\s+/g, ''))).to.deep.equal(
        Array(3).fill(motionTokens.curveDecelerateMid.replace(/\s+/g, '')),
      );
      expect(
        animations.some(animation =>
          (animation.effect as KeyframeEffect).getKeyframes().some(frame => frame.opacity !== undefined),
        ),
      ).to.equal(true);
    });
    settled();
    cy.get('#header').realClick();
    cy.get('#panel').should($node => {
      const animations = $node[0].getAnimations();
      expect(animations.map(animation => animation.effect?.getTiming().duration)).to.deep.equal([1000, 1000, 1000]);
      expect(animations.map(animation => animation.effect?.getTiming().easing?.replace(/\s+/g, ''))).to.deep.equal(
        Array(3).fill(motionTokens.curveDecelerateMid.replace(/\s+/g, '')),
      );
    });
    cy.get('#panel').should('not.exist');
  });
});

describe('AccordionPanel native focus and motion boundaries', () => {
  for (const key of ['Enter', 'Space'] as const) {
    it(`opens via ${key}, admits tabbing into content and removes content after collapse`, () => {
      panel();
      cy.get('#header').focus();
      cy.realPress(key);
      settled();
      cy.realPress('Tab');
      cy.get('#action').should('have.focus');
      cy.realPress('Tab');
      cy.get('#input').should('have.focus');
      cy.realPress(['Shift', 'Tab']);
      cy.get('#action').should('have.focus');
      cy.get('#header').focus();
      cy.realPress(key);
      cy.get('#panel').should('not.exist');
      cy.get('#header').should('have.focus');
    });
  }

  it('makes still-mounted collapsing content inert immediately and excludes native tab focus', () => {
    const ref = React.createRef<MotionImperativeRef | undefined>();
    const start = cy.spy().as('start');
    render(
      <>
        <Accordion collapsible defaultOpenItems="a">
          <AccordionItem value="a">
            <AccordionHeader button={{ id: 'header' }}>Section</AccordionHeader>
            <AccordionPanel
              id="panel"
              collapseMotion={{
                duration: 1000,
                imperativeRef: ref,
                onMotionStart: (event, data) => {
                  start(event, data);
                },
              }}
            >
              <button id="action">Action</button>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
        <button id="after">After</button>
      </>,
    );
    cy.get('#header').realClick();
    cy.get('@start').its('lastCall.args.1.direction').should('equal', 'exit');
    setMotionState(ref, 'paused');
    cy.get('#panel').should('have.attr', 'inert');
    cy.get('#panel').should('have.attr', 'tabindex', '-1');
    cy.get('#action').then($node => $node[0].focus());
    cy.get('#action').should('not.have.focus');
    cy.get('#header').focus();
    cy.realPress('Tab');
    cy.get('#after').should('have.focus');
    setMotionState(ref, 'running');
    cy.get('#panel').should('not.exist');
  });

  it('delivers one start and finish callback per enter and exit direction', () => {
    const start = cy.spy().as('start');
    const finish = cy.spy().as('finish');
    panel({ collapseMotion: { duration: 200, onMotionStart: start, onMotionFinish: finish } });
    cy.get('#header').realClick();
    cy.get('@finish')
      .should('have.been.calledOnce')
      .its('firstCall.args')
      .should('deep.equal', [null, { direction: 'enter' }]);
    settled();
    cy.get('#header').realClick();
    cy.get('#panel').should('not.exist');
    cy.get('@start')
      .should('have.been.calledTwice')
      .its('lastCall.args')
      .should('deep.equal', [null, { direction: 'exit' }]);
    cy.get('@finish')
      .should('have.been.calledTwice')
      .its('lastCall.args')
      .should('deep.equal', [null, { direction: 'exit' }]);
  });

  it('reverses a paused exit when reopened without unmounting or losing interactive content', () => {
    const ref = React.createRef<MotionImperativeRef | undefined>();
    panel({ collapseMotion: { duration: 1000, imperativeRef: ref } }, true);
    cy.get('#panel').then($original => {
      cy.get('#header').realClick();
      setMotionState(ref, 'paused');
      cy.get('#panel').should('have.attr', 'inert');
      cy.get('#header').realClick();
      settled();
      cy.get('#panel').should($node => expect($node[0]).to.equal($original[0]));
      cy.get('#panel').should('not.have.attr', 'inert');
      cy.get('#header').focus();
      cy.realPress('Tab');
      cy.get('#action').should('have.focus');
    });
  });

  it('uses null motion as immediate presence transitions rather than rendering closed content', () => {
    panel({ collapseMotion: null });
    cy.get('#panel').should('not.exist');
    cy.get('#header').realClick();
    cy.get('#panel')
      .should('be.visible')
      .should($node => expect($node[0].getAnimations()).to.have.length(0));
    cy.get('#header').realClick();
    cy.get('#panel').should('not.exist');
  });

  it('honors browser-emulated reduced motion while retaining enter/exit callbacks', () => {
    const finish = cy.spy().as('finish');
    emulateMotion('reduce');
    cy.window().should(win => expect(win.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(true));
    panel({ collapseMotion: { duration: 1000, onMotionFinish: finish } });
    cy.get('#header').realClick();
    cy.get('#panel').should($node =>
      expect($node[0].getAnimations().map(animation => animation.effect?.getTiming().duration)).to.deep.equal([
        1, 1, 1,
      ]),
    );
    cy.get('@finish').should('have.been.calledOnce');
    cy.get('#header').realClick();
    cy.get('#panel').should('not.exist');
    cy.get('@finish').should('have.been.calledTwice');
  });

  it('passes ordinary axe rules for labeled interactive open content', () => {
    panel({}, true);
    cy.get('#panel').then($node =>
      axe.run($node[0]).then(result => expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([])),
    );
  });
});

describe('AccordionPanel source and conformance contracts', () => {
  it('forwards root classes, styles, native metadata and caller-supplied region naming', () => {
    panel(
      {
        className: 'custom-panel',
        title: 'Details',
        role: 'region',
        'aria-labelledby': 'header',
        style: { border: '2px solid red' },
      },
      true,
    );
    cy.get('#panel')
      .should('have.prop', 'tagName', 'DIV')
      .and('have.class', 'fui-AccordionPanel')
      .and('have.class', 'custom-panel')
      .and('have.attr', 'title', 'Details')
      .and('have.attr', 'role', 'region')
      .and('have.attr', 'aria-labelledby', 'header')
      .and('have.css', 'border-top-width', '2px');
    cy.get('#panel').should('not.have.attr', 'open');
  });

  it('attaches the object ref on presence entry and clears it after completed exit', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Accordion collapsible>
        <AccordionItem value="a">
          <AccordionHeader button={{ id: 'header' }}>Section</AccordionHeader>
          <AccordionPanel id="panel" ref={ref}>
            <button>Action</button>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>,
    );
    cy.get('#panel')
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
    cy.get('#header').realClick();
    settled();
    cy.get('#panel').should($node => expect(ref.current).to.equal($node[0]));
    cy.get('#header').realClick();
    cy.get('#panel')
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });

  it('forwards callback refs across presence entries and cleanup without stale roots', () => {
    const ref = cy.spy().as('ref');
    render(
      <Accordion collapsible>
        <AccordionItem value="a">
          <AccordionHeader button={{ id: 'header' }}>Section</AccordionHeader>
          <AccordionPanel id="panel" ref={ref}>
            Details
          </AccordionPanel>
        </AccordionItem>
      </Accordion>,
    );
    cy.get('@ref').should('not.have.been.called');
    cy.get('#header').realClick();
    cy.get('#panel').then($node => cy.get('@ref').its('lastCall.args.0').should('equal', $node[0]));
    settled();
    cy.get('#header').realClick();
    cy.get('#panel').should('not.exist');
    cy.get('@ref').its('lastCall.args.0').should('be.null');
    cy.get('#header').realClick();
    cy.get('#panel').then($node => cy.get('@ref').its('lastCall.args.0').should('equal', $node[0]));
  });

  it('supports custom motion render functions while enforcing inertness on retained closed content', () => {
    panel({
      collapseMotion: {
        children: (_, props) => (
          <div id="custom-motion" data-visible={String(props.visible)}>
            {props.children}
          </div>
        ),
      },
    });
    cy.get('#custom-motion').should('have.attr', 'data-visible', 'false');
    cy.get('#panel').should('have.attr', 'inert');
    cy.get('#panel').should('have.attr', 'tabindex', '-1');
    cy.get('#action').then($node => $node[0].focus());
    cy.get('#action').should('not.have.focus');
    cy.get('#header').realClick();
    cy.get('#custom-motion').should('have.attr', 'data-visible', 'true');
    cy.get('#panel').should('not.have.attr', 'inert');
    cy.get('#header').focus();
    cy.realPress('Tab');
    cy.get('#action').should('have.focus');
    cy.get('#header').realClick();
    cy.get('#custom-motion').should('have.attr', 'data-visible', 'false');
    cy.get('#panel').should('have.attr', 'inert');
  });

  it('uses updated documented motion parameters and handlers on later presence transitions', () => {
    const first = cy.spy().as('first');
    const second = cy.spy().as('second');
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <Accordion collapsible>
            <AccordionItem value="a">
              <AccordionHeader button={{ id: 'header' }}>Section</AccordionHeader>
              <AccordionPanel
                id="panel"
                collapseMotion={{
                  duration: updated ? 600 : 1000,
                  animateOpacity: !updated,
                  onMotionFinish: updated ? second : first,
                }}
              >
                Details
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </>
      );
    };
    render(<Owner />);
    cy.get('#header').realClick();
    cy.get('@first').should('have.been.calledOnce');
    settled();
    cy.get('#header').realClick();
    cy.get('#panel').should('not.exist');
    cy.get('@first').should('have.been.calledTwice');
    cy.get('#update').realClick();
    cy.get('#header').realClick();
    cy.get('#panel').should($node => {
      const animations = $node[0].getAnimations();
      expect(animations.length).to.be.greaterThan(0);
      expect(animations.map(animation => animation.effect?.getTiming().duration)).to.deep.equal([600, 600]);
      expect(
        animations.some(animation =>
          (animation.effect as KeyframeEffect).getKeyframes().some(frame => frame.opacity !== undefined),
        ),
      ).to.equal(false);
    });
    cy.get('@second').should('have.been.calledOnce');
    cy.get('@first').should('have.been.calledTwice');
  });

  it('allows caller tabIndex when open and restores it after closed retained content reopens', () => {
    panel({ tabIndex: 0, collapseMotion: { children: (_, props) => props.children } }, true);
    cy.get('#panel').should('have.attr', 'tabindex', '0').focus().should('have.focus');
    cy.get('#header').realClick();
    cy.get('#panel').should('have.attr', 'tabindex', '-1');
    cy.get('#header').realClick();
    cy.get('#panel').should('have.attr', 'tabindex', '0').focus().should('have.focus');
  });

  it('excludes open content from deprecated arrow navigation without excluding native tab access', () => {
    render(
      <Accordion collapsible navigation="linear" defaultOpenItems="a">
        <AccordionItem value="a">
          <AccordionHeader button={{ id: 'header' }}>Section</AccordionHeader>
          <AccordionPanel id="panel">
            <button id="action">Action</button>
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionHeader button={{ id: 'next-header' }}>Next</AccordionHeader>
        </AccordionItem>
      </Accordion>,
    );
    cy.get('#panel').should('have.attr', 'data-tabster');
    cy.get('#header')
      .focus()
      .should('have.focus')
      .should($node => {
        const win = $node[0].ownerDocument.defaultView;
        if (!win) {
          throw new Error('Header document has no window');
        }
        expect(getTabster(win)?.focusedElement.getFocusedElement()).to.equal($node[0]);
      });
    cy.realPress('ArrowDown');
    cy.get('#next-header').should('have.focus');
    cy.get('#header').focus();
    cy.realPress('Tab');
    cy.get('#action').should('have.focus');
  });

  it('reflects live provider spacing tokens without remounting an open panel', () => {
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <FluentProvider theme={updated ? { ...webLightTheme, spacingHorizontalM: '24px' } : webLightTheme}>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <Accordion defaultOpenItems="a">
            <AccordionItem value="a">
              <AccordionHeader>Section</AccordionHeader>
              <AccordionPanel id="panel">Details</AccordionPanel>
            </AccordionItem>
          </Accordion>
        </FluentProvider>
      );
    };
    mount(<Owner />);
    cy.get('#panel')
      .should('have.css', 'margin-left', '12px')
      .then($original => {
        cy.get('#update').realClick();
        cy.get('#panel')
          .should('have.css', 'margin-left', '24px')
          .and('have.css', 'margin-right', '24px')
          .should($node => expect($node[0]).to.equal($original[0]));
      });
  });

  it('does not invent content presence without an owning open item', () => {
    render(<AccordionPanel id="panel">Standalone</AccordionPanel>);
    cy.get('#panel').should('not.exist');
  });
});
