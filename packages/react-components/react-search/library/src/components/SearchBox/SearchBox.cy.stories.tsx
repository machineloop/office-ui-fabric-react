import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Field } from '@fluentui/react-field';
import { SearchBox } from './SearchBox';
import { Default } from '../../../../stories/src/SearchBox/SearchBoxDefault.stories';
import { Size } from '../../../../stories/src/SearchBox/SearchBoxSize.stories';
import { Appearance } from '../../../../stories/src/SearchBox/SearchBoxAppearance.stories';
import { Controlled } from '../../../../stories/src/SearchBox/SearchBoxControlled.stories';
import { ContentBeforeAfter } from '../../../../stories/src/SearchBox/SearchBoxContentBeforeAfter.stories';
import { Typeahead } from '../../../../stories/src/SearchBox/SearchBoxTypeahead.stories';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);
const input = 'input[type="search"]';

describe('SearchBox unit-derived contracts', () => {
  it('updates value without emitting change, while ignoring later defaultValue', () => {
    const change = cy.stub().as('change');
    const Harness = () => {
      const [value, setValue] = React.useState('hello');
      return (
        <>
          <button onClick={() => setValue('world')}>Update</button>
          <SearchBox id="controlled" value={value} defaultValue="ignored" onChange={change} />
          <SearchBox id="default" defaultValue={value} onChange={change} />
        </>
      );
    };
    mount(<Harness />);
    cy.get('#controlled').should('have.value', 'hello');
    cy.get('#default').should('have.value', 'hello');
    cy.contains('button', 'Update').click();
    cy.get('#controlled').should('have.value', 'world');
    cy.get('#default').should('have.value', 'hello');
    cy.get('@change').should('not.have.been.called');
  });
  it('forwards the primary input ref separately from root and dismiss refs', () => {
    const ref = React.createRef<HTMLInputElement>();
    const root = React.createRef<HTMLSpanElement>();
    const dismiss = React.createRef<HTMLSpanElement>();
    mount(
      <SearchBox
        ref={ref}
        id="search"
        name="query"
        title="Search title"
        input={{ className: 'consumer-input' }}
        root={{ ref: root, id: 'root', className: 'consumer-root' }}
        dismiss={{ ref: dismiss, id: 'dismiss', children: 'Clear', className: 'consumer-dismiss' }}
        contentBefore="Find"
      />,
    );
    cy.get('#search').should($input => {
      expect(ref.current).to.equal($input[0]);
      expect($input)
        .to.have.class('fui-SearchBox__input')
        .and.have.class('consumer-input')
        .and.have.attr('name', 'query')
        .and.have.attr('title', 'Search title');
    });
    cy.get('#root').should($root => {
      expect(root.current).to.equal($root[0]);
      expect($root).to.have.class('fui-SearchBox').and.have.class('consumer-root');
    });
    cy.get('#dismiss').should($dismiss => {
      expect(dismiss.current).to.equal($dismiss[0]);
      expect($dismiss)
        .to.have.class('fui-SearchBox__dismiss')
        .and.have.class('consumer-dismiss')
        .and.have.text('Clear');
    });
    cy.get('.fui-SearchBox__contentBefore').should('have.text', 'Find');
  });
  it('calls dismiss customization and onChange once with the mouse-event contract', () => {
    const click = cy.stub().as('click');
    const change = cy.stub().as('change');
    mount(<SearchBox aria-label="Search" defaultValue="hello" onChange={change} dismiss={{ onClick: click }} />);
    cy.get(input).focus();
    cy.get('[aria-label="clear"]').click();
    cy.get(input).should('have.value', '').and('be.focused');
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@change')
      .should('have.been.calledOnce')
      .then(() => {
        expect(change.firstCall.args[0].type).to.equal('click');
        expect(change.firstCall.args[1]).to.deep.equal({ value: '' });
      });
  });
  it('respects consumer key-event prevention on a tabbable dismiss slot', () => {
    const change = cy.stub().as('change');
    const keydown = cy.stub().as('keydown');
    const keyup = cy.stub().as('keyup');
    mount(
      <SearchBox
        aria-label="Search"
        defaultValue="hello"
        onChange={change}
        dismiss={{
          tabIndex: 0,
          onKeyDown: ev => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              keydown();
              ev.preventDefault();
            }
          },
          onKeyUp: ev => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              keyup();
              ev.preventDefault();
            }
          },
        }}
      />,
    );
    cy.get(input).focus().realPress('Tab');
    cy.get('[aria-label="clear"]').should('be.focused').realPress('Enter').realPress('Space');
    cy.get(input).should('have.value', 'hello');
    cy.get('@change').should('not.have.been.called');
    cy.get('@keydown').should('have.callCount', 2);
    cy.get('@keyup').should('have.callCount', 2);
  });
  it('does not clear a disabled input through a consumer-visible dismiss slot', () => {
    const change = cy.stub().as('change');
    const click = cy.stub().as('click');
    mount(
      <SearchBox
        disabled
        aria-label="Search"
        defaultValue="hello"
        onChange={change}
        contentAfter={{ style: { width: 'auto', height: 'auto' } }}
        dismiss={{ tabIndex: 0, onClick: click }}
      />,
    );
    cy.get('[aria-label="clear"]')
      .should('have.attr', 'aria-disabled', 'true')
      .click()
      .realPress('Enter')
      .realPress('Space');
    cy.get(input).should('have.value', 'hello');
    cy.get('@change').should('not.have.been.called');
    cy.get('@click').should('not.have.been.called');
  });
  it('respects Space keydown prevention without a consumer keyup handler', () => {
    const change = cy.stub().as('change');
    mount(
      <SearchBox
        aria-label="Search"
        defaultValue="hello"
        onChange={change}
        dismiss={{ tabIndex: 0, onKeyDown: ev => ev.preventDefault() }}
      />,
    );
    cy.get(input).focus().realPress('Tab');
    cy.get('[aria-label="clear"]').should('be.focused').realPress('Space');
    cy.get(input).should('have.value', 'hello');
    cy.get('@change').should('not.have.been.called');
  });
  it('allows removing decorative before and dismiss slots explicitly', () => {
    mount(<SearchBox aria-label="Search" contentBefore={null} dismiss={null} />);
    cy.get(input).type('query').should('have.value', 'query');
    cy.get('.fui-SearchBox__contentBefore').should('not.exist');
    cy.get('.fui-SearchBox__dismiss').should('not.exist');
  });
});

describe('SearchBox accessibility and value edges', () => {
  it('preserves Unicode, spaces and empty input with exact change data', () => {
    const change = cy.stub().as('change');
    mount(<SearchBox aria-label="Search" onChange={change} />);
    cy.get(input).type(' café 東京 ').should('have.value', ' café 東京 ');
    cy.get('@change').should('have.been.calledWithMatch', Cypress.sinon.match.any, { value: ' café 東京 ' });
    cy.get('[aria-label="clear"]').click();
    cy.get(input).should('have.value', '').and('be.focused');
    cy.get('@change').should('have.been.calledWithMatch', Cypress.sinon.match.any, { value: '' });
  });
  it('inherits Field descriptions, invalid state and native required validation', () => {
    mount(
      <form id="search-form">
        <Field
          label="Search catalog"
          required
          validationState="error"
          validationMessage="Enter search terms"
          hint="Use keywords"
        >
          <SearchBox />
        </Field>
      </form>,
    );
    cy.get(input).should('have.attr', 'required');
    cy.get(input).should('have.attr', 'aria-invalid', 'true');
    cy.get(input)
      .invoke('attr', 'aria-describedby')
      .then(ids => {
        expect(ids).to.be.a('string');
        const described = ids!
          .split(' ')
          .map(id => `[id="${id}"]`)
          .join(',');
        cy.get(described).should('contain.text', 'Enter search terms').and('contain.text', 'Use keywords');
      });
    cy.get('#search-form').should($form => expect(($form[0] as HTMLFormElement).checkValidity()).to.equal(false));
    cy.get(input).type('query');
    cy.get('#search-form').should($form => expect(($form[0] as HTMLFormElement).checkValidity()).to.equal(true));
  });
  it('keeps the default pointer dismiss out of the native tab order', () => {
    mount(
      <>
        <button>Before</button>
        <SearchBox aria-label="Search" defaultValue="query" />
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.get(input).should('be.focused');
    cy.get('[aria-label="clear"]').should('have.attr', 'tabindex', '-1');
    cy.get(input).realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
  });
  for (const key of ['Enter', 'Space'] as const) {
    it(`supports ${key} activation when the dismiss slot is made tabbable`, () => {
      const change = cy.stub().as('change');
      mount(
        <SearchBox
          aria-label="Search"
          defaultValue="query"
          onChange={change}
          dismiss={{ tabIndex: 0, 'aria-label': 'Clear search' }}
        />,
      );
      cy.get(input).focus().realPress('Tab');
      cy.get('[aria-label="Clear search"]').should('be.focused').realPress(key);
      cy.get(input).should('have.value', '').and('be.focused');
      cy.get('@change')
        .should('have.been.calledOnce')
        .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: '' });
    });
  }
  it('rejects controlled typing and dismiss changes while reporting the requested values', () => {
    const change = cy.stub().as('change');
    mount(<SearchBox aria-label="Search" value="query" onChange={change} />);
    cy.get(input).type('x').should('have.value', 'query');
    cy.get('@change').should('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'queryx' });
    cy.get('[aria-label="clear"]').click();
    cy.get(input).should('have.value', 'query').and('be.focused');
    cy.get('@change').should('have.been.calledWithMatch', Cypress.sinon.match.any, { value: '' });
  });
});

describe('SearchBox documented scenarios', () => {
  it('associates the default Field label and supports entry and clearing', () => {
    mount(<Default />);
    cy.contains('label', 'Sample SearchBox').click();
    cy.get(input).should('be.focused').type('query').should('have.value', 'query');
    cy.get('[role="button"][aria-label="clear"]').click();
    cy.get(input).should('have.value', '').and('be.focused');
  });
  it('renders all documented sizes with increasing control heights', () => {
    mount(<Size />);
    cy.get('.fui-SearchBox').then($roots => {
      expect($roots).to.have.length(3);
      const heights = $roots.toArray().map(root => root.getBoundingClientRect().height);
      expect(heights[0]).to.be.lessThan(heights[1]);
      expect(heights[1]).to.be.lessThan(heights[2]);
    });
    cy.get(input).each($input => cy.wrap($input).type('x').should('have.value', 'x'));
  });
  it('renders and edits all four documented appearances', () => {
    mount(<Appearance />);
    cy.get('.fui-SearchBox').should('have.length', 4);
    cy.get(input).each($input => cy.wrap($input).type('query').should('have.value', 'query'));
    cy.get('.fui-SearchBox').eq(0).should('have.css', 'border-top-style', 'solid');
    cy.get('.fui-SearchBox').eq(1).should('have.css', 'border-top-style', 'none');
  });
  it('shows placeholder text without using it as an accessible label', () => {
    mount(<SearchBox placeholder="Find items" aria-label="Search catalog" />);
    cy.get(input).should('have.attr', 'placeholder', 'Find items');
    cy.get(input).should('have.attr', 'aria-label', 'Search catalog').and('have.value', '');
  });
  it('keeps disabled input inert and outside tab order', () => {
    mount(
      <>
        <button>Before</button>
        <SearchBox disabled defaultValue="query" aria-label="Search" />
        <button>After</button>
      </>,
    );
    cy.get(input).should('be.disabled').and('have.value', 'query');
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
  });
  it('respects the controlled story length limit and clear callback', () => {
    mount(<Controlled />);
    cy.get(input)
      .should('have.value', 'initial value')
      .clear()
      .type('abcdefghijklmnopqrstu')
      .should('have.value', 'abcdefghijklmnopqrst');
    cy.contains('Input is limited to 20 characters.').should('be.visible');
    cy.get('[aria-label="clear"]').click();
    cy.get(input).should('have.value', '');
    cy.contains('Input is limited to 20 characters.').should('not.exist');
  });
  it('reveals documented contentAfter on focus and retains it for nested focus', () => {
    mount(<ContentBeforeAfter />);
    cy.get(input).eq(1).focus();
    cy.get('button[aria-label="Search by voice"]').should('be.visible').focus();
    cy.get('.fui-SearchBox')
      .eq(1)
      .find('.fui-SearchBox__contentAfter')
      .should('have.css', 'width')
      .and('not.equal', '0px');
    cy.get(input).eq(2).focus();
    cy.get('.fui-SearchBox').eq(2).should('contain.text', 'Search:').and('contain.text', 'Filter');
  });
  it('uses documented typeahead ARIA relationships, arrows and Escape', () => {
    mount(<Typeahead />);
    cy.get(input).type('Button').should('have.attr', 'aria-autocomplete', 'list');
    cy.contains('[role="option"]', 'Button component').should('be.visible');
    cy.get(input).should('have.attr', 'aria-expanded', 'true').realPress('ArrowDown');
    cy.get(input)
      .invoke('attr', 'aria-activedescendant')
      .then(id => cy.get(`[id="${id}"]`).should('have.text', 'Button component'));
    cy.get(input).realPress('Escape');
    cy.get(input).should('have.attr', 'aria-expanded', 'false');
    cy.get('[role="listbox"]').should('not.be.visible');
  });
});
