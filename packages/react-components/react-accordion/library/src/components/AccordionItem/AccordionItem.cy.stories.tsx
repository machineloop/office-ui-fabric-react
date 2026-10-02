import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Accordion, AccordionHeader, AccordionPanel } from '../../index';
import { AccordionItem } from './AccordionItem';
import { useAccordionItemContext_unstable } from '../../contexts/accordionItem';
import { Default } from '../../../../stories/src/Accordion/AccordionDefault.stories';
import { Multiple } from '../../../../stories/src/Accordion/AccordionMultiple.stories';
import { Controlled } from '../../../../stories/src/Accordion/AccordionControlled.stories';
import { OpenItems } from '../../../../stories/src/Accordion/AccordionOpenItems.stories';
import { Collapsible } from '../../../../stories/src/Accordion/AccordionCollapsible.stories';
import { Disabled } from '../../../../stories/src/Accordion/AccordionDisabled.stories';
import * as axe from 'axe-core';

const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
const item = (value: unknown, id: string, disabled = false) => (
  <AccordionItem value={value} id={`item-${id}`} disabled={disabled}>
    <AccordionHeader as="h2" button={{ id: `header-${id}` }}>
      Section {id}
    </AccordionHeader>
    <AccordionPanel id={`panel-${id}`}>
      <button id={`action-${id}`}>Action {id}</button>
    </AccordionPanel>
  </AccordionItem>
);
const expanded = (id: string, value: boolean) =>
  cy.get(`#header-${id}`).should('have.attr', 'aria-expanded', String(value));
const settledPanel = (id: string) =>
  cy
    .get(id)
    .should('be.visible')
    .should($node => {
      expect(
        $node[0].getAnimations({ subtree: true }).filter(animation => animation.playState === 'running'),
      ).to.have.length(0);
    });

describe('AccordionItem documented ownership stories', () => {
  it('renders each default item independently and transfers single-open ownership', () => {
    render(<Default />);
    cy.get('.fui-AccordionItem').should('have.length', 3);
    cy.contains('button', 'Accordion Header 1').realClick();
    cy.contains('Accordion Panel 1').should('be.visible');
    cy.contains('button', 'Accordion Header 2').realClick();
    cy.contains('Accordion Panel 2').should('be.visible');
    cy.contains('Accordion Panel 1').should('not.exist');
  });

  it('initializes only the story-selected item as open', () => {
    render(<OpenItems />);
    cy.contains('button', 'Accordion Header 1').should('have.attr', 'aria-expanded', 'true');
    cy.contains('button', 'Accordion Header 2').should('have.attr', 'aria-expanded', 'false');
    cy.contains('button', 'Accordion Header 3').should('have.attr', 'aria-expanded', 'false');
  });

  it('retains multiple open item panels simultaneously', () => {
    render(<Multiple />);
    cy.contains('button', 'Accordion Header 1').realClick();
    cy.contains('button', 'Accordion Header 2').realClick();
    cy.contains('Accordion Panel 1').should('be.visible');
    cy.contains('Accordion Panel 2').should('be.visible');
  });

  it('allows the last open item to close in the collapsible story', () => {
    render(<Collapsible />);
    cy.contains('button', 'Accordion Header 1').realClick();
    cy.contains('Accordion Panel 1').should('be.visible');
    cy.contains('button', 'Accordion Header 1').realClick();
    cy.contains('Accordion Panel 1').should('not.exist');
  });

  it('uses owner-accepted controlled requests for multiple-item expansion and collapse', () => {
    render(<Controlled />);
    cy.contains('button', 'Accordion Header 1').should('have.attr', 'aria-expanded', 'true');
    cy.contains('button', 'Accordion Header 2').realClick();
    cy.contains('Accordion Panel 1').should('be.visible');
    cy.contains('Accordion Panel 2').should('be.visible');
    cy.contains('button', 'Accordion Header 1').realClick();
    cy.contains('Accordion Panel 1').should('not.exist');
    cy.contains('Accordion Panel 2').should('be.visible');
  });

  it('propagates disabled item state to every story header and leaves content closed', () => {
    render(<Disabled />);
    cy.get('.fui-AccordionItem').should('have.length', 3);
    cy.get('.fui-AccordionHeader__button').each($node => {
      cy.wrap($node).should('be.disabled').realClick();
      cy.wrap($node).should('have.attr', 'aria-expanded', 'false');
    });
    cy.get('.fui-AccordionPanel').should('not.exist');
  });
});

describe('AccordionItem native and identity boundaries', () => {
  for (const key of ['Enter', 'Space'] as const) {
    it(`opens the owning item with native ${key} without changing sibling ownership`, () => {
      const toggle = cy.spy().as('toggle');
      render(
        <Accordion multiple collapsible onToggle={toggle}>
          {item('a', 'a')}
          {item('b', 'b')}
        </Accordion>,
      );
      cy.get('#header-a').focus();
      cy.realPress(key);
      expanded('a', true);
      expanded('b', false);
      cy.get('#panel-a').should('be.visible');
      cy.get('@toggle')
        .should('have.been.calledOnce')
        .its('firstCall.args.1')
        .should('deep.equal', { value: 'a', openItems: ['a'] });
      cy.realPress(key);
      expanded('a', false);
      cy.get('#panel-a').should('not.exist');
      cy.get('@toggle').should('have.been.calledTwice');
    });
  }

  it('blocks a disabled item through real pointer and tab traversal while its enabled sibling works', () => {
    const toggle = cy.spy().as('toggle');
    render(
      <>
        <button id="before">Before</button>
        <Accordion collapsible onToggle={toggle}>
          {item('a', 'a', true)}
          {item('b', 'b')}
        </Accordion>
      </>,
    );
    cy.get('#header-a').realClick();
    expanded('a', false);
    cy.get('@toggle').should('not.have.been.called');
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#header-b').should('have.focus');
    cy.realPress('Space');
    expanded('b', true);
    cy.get('@toggle').should('have.been.calledOnce');
  });

  it('preserves an already open disabled panel but blocks user closure', () => {
    const toggle = cy.spy().as('toggle');
    render(
      <Accordion collapsible defaultOpenItems="a" onToggle={toggle}>
        {item('a', 'a', true)}
      </Accordion>,
    );
    cy.get('#panel-a').should('be.visible');
    cy.get('#header-a').realClick();
    expanded('a', true);
    cy.get('@toggle').should('not.have.been.called');
  });

  for (const [name, value] of [
    ['zero', 0],
    ['false', false],
    ['empty', ''],
    ['null', null],
    ['undefined', undefined],
  ] as const) {
    it(`preserves the ${name} scalar identity instead of treating it as a missing item`, () => {
      const toggle = cy.spy().as('toggle');
      render(
        <Accordion collapsible onToggle={toggle}>
          {item(value, 'a')}
          {item('b', 'b')}
        </Accordion>,
      );
      expanded('a', false);
      cy.get('#header-a').realClick();
      cy.get('@toggle')
        .should('have.been.calledOnce')
        .its('firstCall.args.1')
        .should('deep.equal', { value, openItems: [value] });
      expanded('a', true);
      cy.get('#header-a').realClick();
      expanded('a', false);
      cy.get('@toggle').its('lastCall.args.1.openItems').should('deep.equal', []);
    });
  }

  it('distinguishes numeric and string values without coercing identifiers', () => {
    render(
      <Accordion multiple collapsible>
        {item(1, 'number')}
        {item('1', 'string')}
      </Accordion>,
    );
    cy.get('#header-number').realClick();
    expanded('number', true);
    expanded('string', false);
    cy.get('#header-string').realClick();
    expanded('number', true);
    expanded('string', true);
    cy.get('#header-number').realClick();
    expanded('number', false);
    expanded('string', true);
  });

  it('accepts an undefined identity after another item is already open as an empty-state positive control', () => {
    const toggle = cy.spy().as('toggle');
    render(
      <Accordion collapsible defaultOpenItems="b" onToggle={toggle}>
        {item(undefined, 'a')}
        {item('b', 'b')}
      </Accordion>,
    );
    expanded('a', false);
    expanded('b', true);
    cy.get('#header-a').realClick();
    cy.get('@toggle')
      .should('have.been.calledOnce')
      .its('firstCall.args.1')
      .should('deep.equal', { value: undefined, openItems: [undefined] });
    expanded('a', true);
    expanded('b', false);
    cy.get('#header-a').realClick();
    expanded('a', false);
    cy.get('@toggle').its('lastCall.args.1.openItems').should('deep.equal', []);
  });

  it('distinguishes different object identities with equal contents', () => {
    const one = { id: 'same' };
    const two = { id: 'same' };
    const toggle = cy.spy().as('toggle');
    render(
      <Accordion multiple collapsible onToggle={toggle}>
        {item(one, 'one')}
        {item(two, 'two')}
      </Accordion>,
    );
    cy.get('#header-one').realClick();
    expanded('one', true);
    expanded('two', false);
    cy.get('@toggle').its('firstCall.args.1.value').should('equal', one);
    cy.get('#header-two').realClick();
    expanded('one', true);
    expanded('two', true);
    cy.get('@toggle').its('lastCall.args.1.value').should('equal', two);
    cy.get('#header-one').realClick();
    expanded('one', false);
    expanded('two', true);
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`keeps item identity and panel tab order independent of ${dir}`, () => {
      render(<Accordion collapsible>{item('a', 'a')}</Accordion>, dir);
      cy.get('#header-a').realClick().focus();
      cy.realPress('Tab');
      cy.get('#action-a').should('have.focus');
      cy.realPress(['Shift', 'Tab']);
      cy.get('#header-a').should('have.focus');
      expanded('a', true);
    });
  }

  it('passes ordinary axe rules for semantic item header and open panel content', () => {
    render(<Accordion collapsible>{item('a', 'a')}</Accordion>);
    cy.get('#header-a').realClick();
    cy.get('#panel-a').should('be.visible');
    cy.get('#item-a').then($node =>
      axe.run($node[0]).then(result => expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([])),
    );
  });
});

describe('AccordionItem source and conformance contracts', () => {
  it('opens and closes an undefined identity with an explicit empty default', () => {
    const toggle = cy.spy().as('toggle');
    render(
      <Accordion collapsible defaultOpenItems={[]} onToggle={toggle}>
        {item(undefined, 'a')}
      </Accordion>,
    );
    cy.get('#header-a').realClick();
    expanded('a', true);
    cy.get('@toggle')
      .its('firstCall.args.1')
      .should('deep.equal', { value: undefined, openItems: [undefined] });
    cy.get('#header-a').realClick();
    expanded('a', false);
    cy.get('@toggle').its('lastCall.args.1').should('deep.equal', { value: undefined, openItems: [] });
  });

  it('requests an undefined controlled identity without opening until its owner accepts', () => {
    const toggle = cy.spy().as('toggle');
    let requested: unknown[] = [];
    const Owner = () => {
      const [openItems, setOpenItems] = React.useState<unknown[]>([]);
      return (
        <>
          <Accordion
            collapsible
            openItems={openItems}
            onToggle={(event, data) => {
              toggle(event, data);
              requested = data.openItems;
            }}
          >
            {item(undefined, 'a')}
          </Accordion>
          <button id="accept" onClick={() => setOpenItems(requested)}>
            Accept
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#header-a').realClick();
    expanded('a', false);
    cy.get('@toggle')
      .its('firstCall.args.1')
      .should('deep.equal', { value: undefined, openItems: [undefined] });
    cy.get('#accept').realClick();
    expanded('a', true);
    settledPanel('#panel-a');
    cy.get('#header-a').realClick();
    expanded('a', true);
    cy.get('@toggle').its('lastCall.args.1').should('deep.equal', { value: undefined, openItems: [] });
    cy.get('#accept').realClick();
    expanded('a', false);
  });

  it('forwards native root metadata, custom classes and styles without leaking item value', () => {
    render(
      <Accordion collapsible>
        <AccordionItem
          value="private-id"
          id="root"
          className="custom-item"
          title="Section"
          data-owner="calendar"
          style={{ border: '3px solid red' }}
        >
          <AccordionHeader button={{ id: 'header-a' }}>Section</AccordionHeader>
        </AccordionItem>
      </Accordion>,
    );
    cy.get('#root')
      .should('have.prop', 'tagName', 'DIV')
      .and('have.class', 'fui-AccordionItem')
      .and('have.class', 'custom-item')
      .and('have.attr', 'title', 'Section')
      .and('have.attr', 'data-owner', 'calendar')
      .and('have.css', 'border-top-width', '3px');
    cy.get('#root').should('not.have.attr', 'value');
    cy.get('#header-a').realClick();
    expanded('a', true);
  });

  it('attaches object and callback refs to actual roots and clears them on committed unmount', () => {
    const objectRef = React.createRef<HTMLDivElement>();
    const callbackRef = cy.spy().as('ref');
    const Owner = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <Accordion>
            {show && (
              <>
                <AccordionItem value="a" id="object-root" ref={objectRef}>
                  Object
                </AccordionItem>
                <AccordionItem value="b" id="callback-root" ref={callbackRef}>
                  Callback
                </AccordionItem>
              </>
            )}
          </Accordion>
          <button id="remove" onClick={() => setShow(false)}>
            Remove
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#object-root').should($node => expect(objectRef.current).to.equal($node[0]));
    cy.get('#callback-root').then($node => cy.get('@ref').its('lastCall.args.0').should('equal', $node[0]));
    cy.get('#remove').realClick();
    cy.get('#object-root')
      .should('not.exist')
      .then(() => expect(objectRef.current).to.equal(null));
    cy.get('#callback-root').should('not.exist');
    cy.get('@ref').its('lastCall.args.0').should('be.null');
  });

  it('renders standalone children with default closed, enabled item context', () => {
    const Consumer = () => {
      const { value, disabled, open } = useAccordionItemContext_unstable();
      return <output id="context">{JSON.stringify({ value, disabled, open })}</output>;
    };
    render(
      <AccordionItem value="a" id="root">
        <Consumer />
      </AccordionItem>,
    );
    cy.get('#context').should('have.text', '{"value":"a","disabled":false,"open":false}');
    cy.get('#root').should('have.class', 'fui-AccordionItem');
  });

  it('updates item identity and descendant context on the same root', () => {
    const Consumer = () => {
      const { value, disabled, open } = useAccordionItemContext_unstable();
      return <output id="context">{JSON.stringify({ value, disabled, open })}</output>;
    };
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <Accordion collapsible defaultOpenItems="a">
            <AccordionItem id="root" value={updated ? 'b' : 'a'} disabled={updated}>
              <AccordionHeader button={{ id: 'header-a' }}>Section</AccordionHeader>
              <Consumer />
            </AccordionItem>
          </Accordion>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#root').then($original => {
      cy.get('#context').should('have.text', '{"value":"a","disabled":false,"open":true}');
      cy.get('#update').realClick();
      cy.get('#root').should($node => expect($node[0]).to.equal($original[0]));
      cy.get('#context').should('have.text', '{"value":"b","disabled":true,"open":false}');
      cy.get('#header-a').should('be.disabled');
      expanded('a', false);
    });
  });

  it('restores keyboard interaction after live disability changes without clearing open ownership', () => {
    const Owner = () => {
      const [disabled, setDisabled] = React.useState(false);
      return (
        <>
          <Accordion collapsible>{item('a', 'a', disabled)}</Accordion>
          <button id="disable" onClick={() => setDisabled(value => !value)}>
            Disable
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#header-a').realClick();
    expanded('a', true);
    cy.get('#disable').realClick();
    cy.get('#header-a').should('be.disabled').realClick();
    expanded('a', true);
    cy.get('#disable').realClick();
    cy.get('#header-a').should('not.be.disabled').focus();
    cy.realPress('Space');
    expanded('a', false);
  });

  it('keeps nested item selections isolated even when inner and outer values are equal', () => {
    const outer = cy.spy().as('outer');
    const inner = cy.spy().as('inner');
    render(
      <Accordion collapsible onToggle={outer}>
        <AccordionItem value="a">
          <AccordionHeader button={{ id: 'outer-header' }}>Outer</AccordionHeader>
          <AccordionPanel id="outer-panel">
            <Accordion collapsible onToggle={inner}>
              {item('a', 'inner')}
            </Accordion>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>,
    );
    cy.get('#outer-header').realClick();
    settledPanel('#outer-panel');
    cy.get('#header-inner').realClick();
    expanded('inner', true);
    cy.get('#outer-header').should('have.attr', 'aria-expanded', 'true');
    cy.get('@outer').should('have.been.calledOnce');
    cy.get('@inner').should('have.been.calledOnce');
    settledPanel('#panel-inner');
    cy.get('#header-inner').realClick();
    expanded('inner', false);
    cy.get('#outer-header').should('have.attr', 'aria-expanded', 'true');
  });

  it('retains selection for an item removed and reinserted under the same accordion owner', () => {
    const Owner = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <Accordion collapsible>{show && item('a', 'a')}</Accordion>
          <button id="show" onClick={() => setShow(value => !value)}>
            Show
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#header-a').realClick();
    cy.get('#show').realClick();
    cy.get('#item-a').should('not.exist');
    cy.get('#show').realClick();
    expanded('a', true);
    cy.get('#panel-a').should('be.visible');
  });

  for (const multiple of [false, true]) {
    it(`opens and collapses NaN identity with multiple=${multiple}`, () => {
      const toggle = cy.spy().as('toggle');
      render(
        <Accordion multiple={multiple} collapsible onToggle={toggle}>
          {item(NaN, 'a')}
        </Accordion>,
      );
      cy.get('#header-a').realClick();
      expanded('a', true);
      cy.get('@toggle')
        .its('firstCall.args.1')
        .should('deep.equal', { value: NaN, openItems: [NaN] });
      cy.get('#header-a').realClick();
      expanded('a', false);
      cy.get('@toggle').its('lastCall.args.1.openItems').should('deep.equal', []);
    });
  }

  it('opens and independently closes distinct symbol identities without coercion or lost callbacks', () => {
    const first = Symbol('section');
    const second = Symbol('section');
    const toggle = cy.spy().as('toggle');
    render(
      <Accordion multiple collapsible onToggle={toggle}>
        {item(first, 'first')}
        {item(second, 'second')}
      </Accordion>,
    );
    cy.get('#header-first').realClick();
    settledPanel('#panel-first');
    cy.get('#header-second').realClick();
    expanded('first', true);
    expanded('second', true);
    cy.get('@toggle').its('lastCall.args.1.openItems').should('deep.equal', [first, second]);
    cy.get('#header-first').realClick();
    expanded('first', false);
    cy.get('#panel-first').should('not.exist');
    expanded('second', true);
    settledPanel('#panel-second');
    cy.get('#header-second').realClick();
    expanded('second', false);
    cy.get('@toggle').should('have.callCount', 4).its('lastCall.args.1.openItems').should('deep.equal', []);
  });
});
