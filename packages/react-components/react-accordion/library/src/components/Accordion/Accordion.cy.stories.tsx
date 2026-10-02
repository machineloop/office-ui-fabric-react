import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel } from '../../index';
import type { AccordionProps } from './Accordion.types';
import { computeAccessibleName } from 'dom-accessibility-api';
import * as axe from 'axe-core';

const items = (values: (string | number)[] = ['a', 'b', 'c']) =>
  values.map(value => (
    <AccordionItem value={value} key={value}>
      <AccordionHeader button={{ id: `header-${value}` }} as="h2">
        Section {value}
      </AccordionHeader>
      <AccordionPanel data-testid={`panel-${value}`}>
        <button id={`action-${value}`}>Action {value}</button>
      </AccordionPanel>
    </AccordionItem>
  ));

const mountAccordion = (props: AccordionProps = {}) =>
  mount(
    <FluentProvider theme={webLightTheme}>
      <Accordion id="accordion" {...props}>
        {items()}
      </Accordion>
    </FluentProvider>,
  );

const expanded = (value: string | number, open: boolean) =>
  cy.get(`#header-${value}`).should('have.attr', 'aria-expanded', String(open));

describe('Accordion documented state contracts', () => {
  it('starts with every panel closed when no open items are specified', () => {
    mountAccordion();
    for (const value of ['a', 'b', 'c']) {
      expanded(value, false);
      cy.get(`[data-testid="panel-${value}"]`).should('not.exist');
    }
  });

  describe('Accordion native interaction and boundary contracts', () => {
    for (const key of ['Enter', 'Space'] as const) {
      it(`opens and collapses via native ${key}, preserving focus and one callback per activation`, () => {
        const onToggle = cy.spy().as('toggle');
        mountAccordion({ collapsible: true, onToggle });
        cy.get('#header-a').focus();
        cy.realPress(key);
        expanded('a', true);
        cy.get('#header-a').should('have.focus');
        cy.get('@toggle').should('have.been.calledOnce');
        cy.get('@toggle')
          .its('firstCall.args.1')
          .should('deep.equal', { value: 'a', openItems: ['a'] });
        cy.realPress(key);
        expanded('a', false);
        cy.get('@toggle').should('have.been.calledTwice');
        cy.get('@toggle').its('lastCall.args.1').should('deep.equal', { value: 'a', openItems: [] });
      });
    }

    it('does not toggle for unrelated native keys', () => {
      const onToggle = cy.spy().as('toggle');
      mountAccordion({ collapsible: true, onToggle });
      cy.get('#header-a').focus();
      cy.realPress('Escape');
      cy.realPress('ArrowDown');
      cy.realPress('a');
      expanded('a', false);
      cy.get('#header-a').should('have.focus');
      cy.get('@toggle').should('not.have.been.called');
    });

    it('tabs into open content, skips closed content and supports reverse tab order', () => {
      mountAccordion({ collapsible: true, defaultOpenItems: 'a' });
      cy.get('#header-a').focus();
      cy.realPress('Tab');
      cy.get('#action-a').should('have.focus');
      cy.realPress('Tab');
      cy.get('#header-b').should('have.focus');
      cy.realPress('Tab');
      cy.get('#header-c').should('have.focus');
      cy.realPress(['Shift', 'Tab']);
      cy.get('#header-b').should('have.focus');
    });

    it('does not toggle when an action inside an open panel is activated', () => {
      const onToggle = cy.spy().as('toggle');
      mountAccordion({ collapsible: true, defaultOpenItems: 'a', onToggle });
      cy.get('#action-a').realClick();
      cy.realPress('Enter');
      expanded('a', true);
      cy.get('@toggle').should('not.have.been.called');
    });

    for (const dir of ['ltr', 'rtl'] as const) {
      it(`keeps linear arrow navigation bounded and excludes panel actions in ${dir}`, () => {
        mount(
          <FluentProvider theme={webLightTheme} dir={dir}>
            <Accordion navigation="linear" defaultOpenItems="a" collapsible>
              {items()}
            </Accordion>
          </FluentProvider>,
        );
        cy.get('#header-a').focus();
        cy.realPress('ArrowDown');
        cy.get('#header-b').should('have.focus');
        cy.realPress('ArrowDown');
        cy.get('#header-c').should('have.focus');
        cy.realPress('ArrowDown');
        cy.get('#header-c').should('have.focus');
        cy.realPress('ArrowUp');
        cy.get('#header-b').should('have.focus');
        cy.realPress('ArrowUp');
        cy.realPress('ArrowUp');
        cy.get('#header-a').should('have.focus');
        expanded('a', true);
        expanded('b', false);
        cy.realPress('Space');
        expanded('a', false);
      });
    }

    it('wraps circular arrow navigation without toggling sections', () => {
      const onToggle = cy.spy().as('toggle');
      mountAccordion({ navigation: 'circular', onToggle });
      cy.get('#header-c').focus();
      cy.realPress('ArrowDown');
      cy.get('#header-a').should('have.focus');
      cy.realPress('ArrowUp');
      cy.get('#header-c').should('have.focus');
      cy.get('@toggle').should('not.have.been.called');
    });

    it('skips disabled items for tab and arrow navigation while enabled sections still toggle', () => {
      const onToggle = cy.spy().as('toggle');
      mount(
        <FluentProvider theme={webLightTheme}>
          <button id="before">Before</button>
          <Accordion navigation="linear" collapsible onToggle={onToggle}>
            <AccordionItem value="disabled" disabled>
              <AccordionHeader button={{ id: 'disabled' }}>Disabled section</AccordionHeader>
              <AccordionPanel>Disabled content</AccordionPanel>
            </AccordionItem>
            {items()}
          </Accordion>
        </FluentProvider>,
      );
      cy.get('#disabled').should('be.disabled');
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('#header-a').should('have.focus');
      cy.realPress('ArrowUp');
      cy.get('#header-a').should('have.focus');
      cy.realPress('Enter');
      expanded('a', true);
      cy.get('#disabled').should('have.attr', 'aria-expanded', 'false');
      cy.get('@toggle').should('have.been.calledOnce');
    });

    it('does not optimistically change a controlled scalar when its owner declines the request', () => {
      const onToggle = cy.spy().as('toggle');
      mountAccordion({ openItems: 'a', collapsible: true, onToggle });
      cy.get('#header-b').realClick();
      expanded('a', true);
      expanded('b', false);
      cy.get('@toggle')
        .its('firstCall.args.1')
        .should('deep.equal', { value: 'b', openItems: ['b'] });
      cy.get('#header-a').realClick();
      expanded('a', true);
      cy.get('@toggle').its('lastCall.args.1').should('deep.equal', { value: 'a', openItems: [] });
    });

    it('uses controlled arrays as supplied even in single mode', () => {
      const onToggle = cy.spy().as('toggle');
      mountAccordion({ openItems: ['a', 'b'], onToggle });
      expanded('a', true);
      expanded('b', true);
      cy.get('#header-c').realClick();
      cy.get('@toggle')
        .its('firstCall.args.1')
        .should('deep.equal', { value: 'c', openItems: ['c'] });
      expanded('a', true);
      expanded('b', true);
      expanded('c', false);
    });

    it('accepts empty controlled and default arrays', () => {
      mountAccordion({ openItems: [], defaultOpenItems: ['a'], collapsible: true });
      expanded('a', false);
      cy.get('#header-a').realClick();
      expanded('a', false);
    });

    it('starts closed for an empty default array and can still open a section', () => {
      mountAccordion({ defaultOpenItems: [], collapsible: true });
      expanded('a', false);
      cy.get('#header-a').realClick();
      expanded('a', true);
    });

    it('preserves an empty default across a switch to multiple mode without phantom open values', () => {
      const toggle = cy.spy().as('toggle');
      function Example() {
        const [multiple, setMultiple] = React.useState(false);
        return (
          <FluentProvider theme={webLightTheme}>
            <button id="enable-multiple" onClick={() => setMultiple(true)}>
              Enable multiple
            </button>
            <Accordion defaultOpenItems={[]} multiple={multiple} onToggle={toggle}>
              {items()}
            </Accordion>
          </FluentProvider>
        );
      }
      mount(<Example />);
      expanded('a', false);
      cy.get('#enable-multiple').realClick();
      cy.get('#header-a').realClick();
      expanded('a', true);
      cy.get('@toggle')
        .its('firstCall.args.1')
        .should('deep.equal', { value: 'a', openItems: ['a'] });
      cy.get('#header-a').should('have.attr', 'aria-disabled', 'true');
      cy.get('#header-a').realClick();
      expanded('a', true);
      cy.get('@toggle').should('have.been.calledOnce');
    });

    it('does not mutate caller-owned controlled arrays and reports sorted additions', () => {
      const openItems = Object.freeze(['c', 'a']) as unknown as string[];
      const onToggle = cy.spy().as('toggle');
      mountAccordion({ openItems, multiple: true, collapsible: true, onToggle });
      cy.get('#header-b').realClick();
      cy.get('@toggle')
        .its('firstCall.args.1')
        .should('deep.equal', { value: 'b', openItems: ['a', 'b', 'c'] });
      cy.then(() => expect(openItems).to.deep.equal(['c', 'a']));
      cy.get('#header-a').realClick();
      cy.get('@toggle')
        .its('lastCall.args.1')
        .should('deep.equal', { value: 'a', openItems: ['c'] });
      expanded('a', true);
    });

    it('keeps nested accordions independently controlled by their nearest context', () => {
      const outer = cy.spy().as('outer');
      const inner = cy.spy().as('inner');
      mount(
        <FluentProvider theme={webLightTheme}>
          <Accordion defaultOpenItems="a" collapsible onToggle={outer}>
            <AccordionItem value="a">
              <AccordionHeader button={{ id: 'outer-header' }}>Outer</AccordionHeader>
              <AccordionPanel>
                <Accordion collapsible onToggle={inner}>
                  {items()}
                </Accordion>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </FluentProvider>,
      );
      cy.get('#header-a').realClick();
      expanded('a', true);
      cy.get('#outer-header').should('have.attr', 'aria-expanded', 'true');
      cy.get('@inner').should('have.been.calledOnce');
      cy.get('@outer').should('not.have.been.called');
      cy.get('#outer-header').realClick();
      cy.get('#header-a').should('not.exist');
      cy.get('@outer').should('have.been.calledOnce');
    });

    it('does not submit a containing form when headers are activated by pointer or keyboard', () => {
      const submit = cy.spy().as('submit');
      mount(
        <FluentProvider theme={webLightTheme}>
          <form
            onSubmit={event => {
              event.preventDefault();
              submit();
            }}
          >
            <Accordion collapsible>{items()}</Accordion>
            <button type="submit" id="submit">
              Submit
            </button>
          </form>
        </FluentProvider>,
      );
      cy.get('#header-a').realClick();
      cy.get('#header-b').focus();
      cy.realPress('Enter');
      expanded('b', true);
      cy.get('@submit').should('not.have.been.called');
      cy.get('#submit').realClick();
      cy.get('@submit').should('have.been.calledOnce');
    });

    it('exposes named heading buttons and passes a scoped axe check in closed and open states', () => {
      mountAccordion({ collapsible: true });
      cy.get('#accordion h2').should('have.length', 3);
      cy.get('#header-a').should(header => expect(computeAccessibleName(header[0])).to.equal('Section a'));
      cy.get('#accordion').then(async root => {
        const result = await axe.run(root[0]);
        expect(result.violations).to.deep.equal([]);
      });
      cy.get('#header-a').realClick();
      cy.get('#action-a').should('be.visible');
      cy.get('#accordion').then(async root => {
        const result = await axe.run(root[0]);
        expect(result.violations).to.deep.equal([]);
      });
    });
  });

  it('opens one section and replaces it when another is activated', () => {
    mountAccordion();
    cy.get('#header-a').realClick();
    expanded('a', true);
    cy.get('#action-a').should('be.visible');
    cy.get('#header-b').realClick();
    expanded('b', true);
    expanded('a', false);
    cy.get('#action-a').should('not.exist');
    cy.get('#action-b').should('be.visible');
  });

  it('keeps the sole open section expanded and focusable when not collapsible', () => {
    mountAccordion({ defaultOpenItems: 'a' });
    cy.get('#header-a').should('have.attr', 'aria-disabled', 'true');
    cy.get('#header-a').should('not.have.attr', 'disabled');
    cy.get('#header-a').focus();
    cy.realPress('Enter');
    expanded('a', true);
    cy.get('#header-a').should('have.focus');
    cy.get('#header-b').realClick();
    expanded('b', true);
    expanded('a', false);
    cy.get('#header-a').should('not.have.attr', 'aria-disabled');
  });

  it('allows every panel to close when collapsible', () => {
    mountAccordion({ collapsible: true, defaultOpenItems: 'a' });
    cy.get('#header-a').realClick();
    expanded('a', false);
    cy.get('#action-a').should('not.exist');
    cy.get('#header-b').realClick();
    expanded('b', true);
    cy.get('#header-b').realClick();
    expanded('b', false);
  });

  it('allows multiple open sections but preserves the final open section', () => {
    mountAccordion({ multiple: true });
    cy.get('#header-a').realClick();
    cy.get('#header-b').realClick();
    expanded('a', true);
    expanded('b', true);
    cy.get('#header-a').realClick();
    expanded('a', false);
    cy.get('#header-b').should('have.attr', 'aria-disabled', 'true');
    cy.get('#header-b').realClick();
    expanded('b', true);
  });

  it('allows multiple sections to open and all to collapse', () => {
    mountAccordion({ multiple: true, collapsible: true });
    cy.get('#header-a').realClick();
    cy.get('#header-b').realClick();
    cy.get('#header-a').realClick();
    cy.get('#header-b').realClick();
    expanded('a', false);
    expanded('b', false);
    cy.get('[data-testid^="panel-"]').should('not.exist');
  });

  it('initializes an uncontrolled scalar default', () => {
    mountAccordion({ defaultOpenItems: 'b', collapsible: true });
    expanded('a', false);
    expanded('b', true);
    cy.get('#action-b').should('be.visible');
  });

  it('initializes an uncontrolled array to its first entry in single mode', () => {
    mountAccordion({ defaultOpenItems: ['b', 'a'] });
    expanded('b', true);
    expanded('a', false);
  });

  it('initializes all default entries in multiple mode', () => {
    mountAccordion({ multiple: true, defaultOpenItems: ['b', 'a'] });
    expanded('a', true);
    expanded('b', true);
    expanded('c', false);
  });

  it('supports the documented controlled multiple and collapsible callback pattern', () => {
    const toggle = cy.spy().as('toggle');
    function Example() {
      const [openItems, setOpenItems] = React.useState(['a']);
      return (
        <FluentProvider theme={webLightTheme}>
          <Accordion
            openItems={openItems}
            multiple
            collapsible
            onToggle={(event, data) => {
              toggle(event.type, data);
              setOpenItems(data.openItems as string[]);
            }}
          >
            {items()}
          </Accordion>
        </FluentProvider>
      );
    }
    mount(<Example />);
    cy.get('#header-b').realClick();
    cy.get('@toggle').should('have.been.calledOnceWithExactly', 'click', { value: 'b', openItems: ['a', 'b'] });
    expanded('a', true);
    expanded('b', true);
    cy.get('#header-a').realClick();
    expanded('a', false);
    expanded('b', true);
    cy.get('@toggle')
      .its('lastCall.args.1')
      .should('deep.equal', { value: 'a', openItems: ['b'] });
  });
});

describe('Accordion source and conformance contracts', () => {
  it('keeps a disabled default-open item visible without allowing user toggles', () => {
    const toggle = cy.spy().as('toggle');
    mount(
      <FluentProvider theme={webLightTheme}>
        <button id="disabled-before">Before</button>
        <Accordion defaultOpenItems="disabled" collapsible onToggle={toggle}>
          <AccordionItem disabled value="disabled">
            <AccordionHeader button={{ id: 'disabled-open' }}>Disabled open</AccordionHeader>
            <AccordionPanel id="disabled-content">Disabled content</AccordionPanel>
          </AccordionItem>
          {items()}
        </Accordion>
      </FluentProvider>,
    );
    cy.get('#disabled-open').should('be.disabled').and('have.attr', 'aria-expanded', 'true');
    cy.get('#disabled-content').should('be.visible');
    cy.get('#disabled-before').focus();
    cy.realPress('Tab');
    cy.get('#header-a').should('have.focus');
    cy.realPress('Enter');
    expanded('a', true);
    cy.get('#disabled-open').should('have.attr', 'aria-expanded', 'false');
    cy.get('@toggle').should('have.been.calledOnce');
  });

  it('does not treat onToggle preventDefault as a state veto', () => {
    const toggle = cy.spy().as('toggle');
    mountAccordion({
      collapsible: true,
      onToggle: (event, data) => {
        event.preventDefault();
        toggle(event.type, data);
      },
    });
    cy.get('#header-a').realClick();
    expanded('a', true);
    cy.get('@toggle').should('have.been.calledOnceWithExactly', 'click', { value: 'a', openItems: ['a'] });
  });

  it('updates navigation policy on the same root while preserving expanded values', () => {
    function Example() {
      const [navigation, setNavigation] = React.useState<AccordionProps['navigation']>();
      return (
        <FluentProvider theme={webLightTheme}>
          <button id="set-linear" onClick={() => setNavigation('linear')}>
            Linear
          </button>
          <button id="clear-navigation" onClick={() => setNavigation(undefined)}>
            Default navigation
          </button>
          <Accordion id="navigation-root" navigation={navigation} defaultOpenItems="a" collapsible>
            {items()}
          </Accordion>
        </FluentProvider>
      );
    }
    mount(<Example />);
    cy.get('#navigation-root').then(root => {
      cy.get('#header-a').focus();
      cy.realPress('ArrowDown');
      cy.get('#header-a').should('have.focus');
      cy.get('#set-linear').realClick();
      cy.get('#navigation-root').should(current => expect(current[0]).to.equal(root[0]));
      cy.get('#header-a').focus();
      cy.realPress('ArrowDown');
      cy.get('#header-b').should('have.focus');
      cy.get('#clear-navigation').realClick();
      cy.get('#header-b').focus();
      cy.realPress('ArrowDown');
      cy.get('#header-b').should('have.focus');
      expanded('a', true);
    });
  });

  for (const value of [0, '', false]) {
    it(`initializes the valid falsy scalar default ${JSON.stringify(value)}`, () => {
      mount(
        <FluentProvider theme={webLightTheme}>
          <Accordion defaultOpenItems={value} collapsible>
            <AccordionItem value={value}>
              <AccordionHeader button={{ id: 'falsy-header' }}>Falsy value section</AccordionHeader>
              <AccordionPanel id="falsy-panel">Falsy value content</AccordionPanel>
            </AccordionItem>
          </Accordion>
        </FluentProvider>,
      );
      cy.get('#falsy-header').should('have.attr', 'aria-expanded', 'true');
      cy.get('#falsy-panel').should('be.visible');
      cy.get('#falsy-header').realClick();
      cy.get('#falsy-header').should('have.attr', 'aria-expanded', 'false');
      cy.get('#falsy-panel').should('not.exist');
    });
  }

  it('matches number and string values without coercion and sorts numeric additions by the source contract', () => {
    const onToggle = cy.spy().as('toggle');
    mount(
      <FluentProvider theme={webLightTheme}>
        <Accordion openItems={[2]} multiple collapsible onToggle={onToggle}>
          {[2, '2', 10].map((value, index) => (
            <AccordionItem value={value} key={index}>
              <AccordionHeader button={{ id: `typed-${index}` }}>Typed value {index}</AccordionHeader>
            </AccordionItem>
          ))}
        </Accordion>
      </FluentProvider>,
    );
    cy.get('#typed-0').should('have.attr', 'aria-expanded', 'true');
    cy.get('#typed-1').should('have.attr', 'aria-expanded', 'false');
    cy.get('#typed-2').realClick();
    cy.get('@toggle')
      .its('firstCall.args.1')
      .should('deep.equal', { value: 10, openItems: [10, 2] });
  });

  it('matches object values by identity without converting callback values', () => {
    const selected = { id: 'same' };
    const other = { id: 'same' };
    const onToggle = cy.spy().as('toggle');
    mount(
      <FluentProvider theme={webLightTheme}>
        <Accordion openItems={selected} collapsible onToggle={onToggle}>
          <AccordionItem value={selected}>
            <AccordionHeader button={{ id: 'selected-object' }}>Selected object</AccordionHeader>
          </AccordionItem>
          <AccordionItem value={other}>
            <AccordionHeader button={{ id: 'other-object' }}>Other object</AccordionHeader>
          </AccordionItem>
        </Accordion>
      </FluentProvider>,
    );
    cy.get('#selected-object').should('have.attr', 'aria-expanded', 'true');
    cy.get('#other-object').should('have.attr', 'aria-expanded', 'false');
    cy.get('#other-object').realClick();
    cy.get('@toggle').should(() => {
      expect(onToggle.firstCall.args[1].value).to.equal(other);
      expect(onToggle.firstCall.args[1].openItems[0]).to.equal(other);
    });
  });

  it('ignores later default values without resetting uncontrolled state', () => {
    function Example() {
      const [defaultValue, setDefaultValue] = React.useState('a');
      return (
        <FluentProvider theme={webLightTheme}>
          <button id="change-default" onClick={() => setDefaultValue('c')}>
            Change default
          </button>
          <Accordion defaultOpenItems={defaultValue} collapsible>
            {items()}
          </Accordion>
        </FluentProvider>
      );
    }
    mount(<Example />);
    expanded('a', true);
    cy.get('#header-b').realClick();
    cy.get('#change-default').realClick();
    expanded('a', false);
    expanded('b', true);
    expanded('c', false);
  });

  it('uses updated controlled props and handlers on the same mounted DOM', () => {
    const first = cy.spy().as('first');
    const second = cy.spy().as('second');
    function Example() {
      const [updated, setUpdated] = React.useState(false);
      return (
        <FluentProvider theme={webLightTheme}>
          <button id="update-owner" onClick={() => setUpdated(value => !value)}>
            Update owner
          </button>
          <Accordion id="live-root" openItems={updated ? ['b'] : ['a']} collapsible onToggle={updated ? second : first}>
            {items()}
          </Accordion>
        </FluentProvider>
      );
    }
    mount(<Example />);
    cy.get('#live-root').then(root => {
      cy.get('#header-c').realClick();
      cy.get('@first').should('have.been.calledOnce');
      cy.get('#update-owner').realClick();
      cy.get('#live-root').should(current => expect(current[0]).to.equal(root[0]));
      expanded('a', false);
      expanded('b', true);
      cy.get('#header-c').realClick();
      cy.get('@second').should('have.been.calledOnce');
      cy.get('@second')
        .its('firstCall.args.1')
        .should('deep.equal', { value: 'c', openItems: ['c'] });
      cy.get('@first').should('have.been.calledOnce');
      expanded('c', false);
    });
  });

  it('updates multiple and collapsible policies without resetting open state', () => {
    function Example() {
      const [multiple, setMultiple] = React.useState(true);
      const [collapsible, setCollapsible] = React.useState(false);
      return (
        <FluentProvider theme={webLightTheme}>
          <button id="single" onClick={() => setMultiple(false)}>
            Single mode
          </button>
          <button id="collapse" onClick={() => setCollapsible(true)}>
            Collapsible mode
          </button>
          <Accordion multiple={multiple} collapsible={collapsible} defaultOpenItems={['a', 'b']}>
            {items()}
          </Accordion>
        </FluentProvider>
      );
    }
    mount(<Example />);
    cy.get('#single').realClick();
    expanded('a', true);
    expanded('b', true);
    cy.get('#header-c').realClick();
    expanded('a', false);
    expanded('b', false);
    expanded('c', true);
    cy.get('#header-c').should('have.attr', 'aria-disabled', 'true');
    cy.get('#collapse').realClick();
    cy.get('#header-c').should('not.have.attr', 'aria-disabled');
    cy.get('#header-c')
      .closest('.fui-Accordion')
      .should($root => {
        expect(
          $root[0].getAnimations({ subtree: true }).filter(animation => animation.playState === 'running'),
        ).to.have.length(0);
      });
    cy.get('#header-c').realClick();
    expanded('c', false);
  });

  it('preserves open values across keyed child reorder and removal/reinsertion', () => {
    function Example() {
      const [values, setValues] = React.useState(['a', 'b', 'c']);
      return (
        <FluentProvider theme={webLightTheme}>
          <button id="reorder" onClick={() => setValues(['c', 'b', 'a'])}>
            Reorder
          </button>
          <button id="remove" onClick={() => setValues(['c', 'a'])}>
            Remove b
          </button>
          <button id="restore" onClick={() => setValues(['a', 'b', 'c'])}>
            Restore b
          </button>
          <Accordion id="reordered" defaultOpenItems="b" collapsible>
            {items(values)}
          </Accordion>
        </FluentProvider>
      );
    }
    mount(<Example />);
    cy.get('#header-b').then(header => {
      cy.get('#reorder').realClick();
      cy.get('#header-b').should(current => expect(current[0]).to.equal(header[0]));
      expanded('b', true);
      cy.get('#reordered button[aria-expanded]').then(headers =>
        expect(Array.from(headers, element => element.id)).to.deep.equal(['header-c', 'header-b', 'header-a']),
      );
      cy.get('#remove').realClick();
      cy.get('#header-b').should('not.exist');
      cy.get('#restore').realClick();
      expanded('b', true);
    });
  });

  it('lets header consumers cancel a toggle while root handlers observe the native event', () => {
    const onToggle = cy.spy().as('toggle');
    const rootClick = cy.spy().as('rootClick');
    const headerClick = cy.spy().as('headerClick');
    mount(
      <FluentProvider theme={webLightTheme}>
        <Accordion collapsible onToggle={onToggle} onClick={rootClick}>
          <AccordionItem value="cancel">
            <AccordionHeader
              button={{
                id: 'cancel',
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                  headerClick(event.type);
                  event.preventDefault();
                },
              }}
            >
              Cancel toggle
            </AccordionHeader>
          </AccordionItem>
          {items()}
        </Accordion>
      </FluentProvider>,
    );
    cy.get('#cancel').realClick();
    cy.get('#cancel').should('have.attr', 'aria-expanded', 'false');
    cy.get('@headerClick').should('have.been.calledOnceWithExactly', 'click');
    cy.get('@rootClick').should('have.been.calledOnce');
    cy.get('@toggle').should('not.have.been.called');
    cy.get('#header-a').realClick();
    expanded('a', true);
    cy.get('@toggle').should('have.been.calledOnce');
    cy.get('@rootClick').should('have.been.calledTwice');
  });

  it('characterizes root click cancellation after the header has already requested a toggle', () => {
    const toggle = cy.spy().as('toggle');
    mountAccordion({ collapsible: true, onToggle: toggle, onClick: event => event.preventDefault() });
    cy.get('#header-a').realClick();
    expanded('a', true);
    cy.get('@toggle').should('have.been.calledOnce');
  });

  it('forwards class, native style, data and ARIA attributes while keeping internal props off the DOM', () => {
    mountAccordion({
      className: 'consumer-accordion',
      style: { border: '3px solid rgb(255, 0, 0)' },
      role: 'region',
      'aria-label': 'Sections',
      multiple: true,
      collapsible: true,
      defaultOpenItems: 'a',
    });
    cy.get('#accordion').should('have.class', 'fui-Accordion').and('have.class', 'consumer-accordion');
    cy.get('#accordion').should('have.css', 'border-top-width', '3px').and('have.attr', 'role', 'region');
    cy.get('#accordion').should(root => {
      expect(computeAccessibleName(root[0])).to.equal('Sections');
      for (const name of ['multiple', 'collapsible', 'defaultopenitems', 'openitems', 'ontoggle']) {
        expect(root[0].hasAttribute(name), name).to.equal(false);
      }
    });
  });

  it('forwards an object ref to the real root and clears it after unmount', () => {
    const ref = React.createRef<HTMLDivElement>();
    function Example() {
      const [visible, setVisible] = React.useState(true);
      return (
        <FluentProvider theme={webLightTheme}>
          <button id="unmount" onClick={() => setVisible(false)}>
            Unmount
          </button>
          {visible && (
            <Accordion id="ref-root" ref={ref}>
              {items()}
            </Accordion>
          )}
        </FluentProvider>
      );
    }
    mount(<Example />);
    cy.get('#ref-root').should(root => expect(ref.current).to.equal(root[0]));
    cy.get('#unmount').realClick();
    cy.get('#ref-root').should('not.exist');
    cy.then(() => expect(ref.current).to.equal(null));
  });

  it('notifies a callback ref of the real root and its cleanup', () => {
    const ref = cy.spy().as('ref');
    function Example() {
      const [visible, setVisible] = React.useState(true);
      return (
        <FluentProvider theme={webLightTheme}>
          <button id="unmount-callback" onClick={() => setVisible(false)}>
            Unmount
          </button>
          {visible && (
            <Accordion id="callback-root" ref={ref}>
              {items()}
            </Accordion>
          )}
        </FluentProvider>
      );
    }
    mount(<Example />);
    cy.get('#callback-root').then(root => cy.get('@ref').should('have.been.calledWith', root[0]));
    cy.get('#unmount-callback').realClick();
    cy.get('#callback-root').should('not.exist');
    cy.get('@ref').should('have.been.calledWith', null);
  });

  it('renders an empty root and arbitrary non-item children without inventing buttons', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <Accordion id="data-root" data-testid="forwarded-data" />
        <Accordion id="empty-root" />
        <Accordion id="plain-root">
          <p>Plain child</p>
        </Accordion>
      </FluentProvider>,
    );
    cy.get('#empty-root').should('exist').and('be.empty');
    cy.get('#data-root').should('have.attr', 'data-testid', 'forwarded-data');
    cy.get('#plain-root').should('contain.text', 'Plain child');
    cy.get('#plain-root button').should('not.exist');
  });
});
