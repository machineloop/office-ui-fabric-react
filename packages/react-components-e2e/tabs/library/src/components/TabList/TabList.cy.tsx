import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { Overflow, OverflowItem } from '@fluentui/react-overflow';
import { getByRole } from '@testing-library/react';
import { Tab } from '../Tab/Tab';
import { tabClassNames, tabReservedSpaceClassNames } from '../Tab/useTabStyles.styles';
import { TabList } from './TabList';
import type { TabListContextValue, TabListProps, TabListSlots } from './TabList.types';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { useMergedRefs } from '@fluentui/react-utilities';
import { useTabListContext_unstable } from './TabListContext';

const list = '[data-testid="list"]';
const tabs = `${list} [role="tab"]`;
const tab = (value: string) => `${list} [data-testid="tab-${value}"]`;
const content = `.${tabClassNames.content}`;
const reserved = `.${tabReservedSpaceClassNames.content}`;

function children(disabled?: string) {
  return ['a', 'b', 'c'].map(value => (
    <Tab key={value} value={value} data-testid={`tab-${value}`} disabled={disabled === value}>
      {value.toUpperCase()}
    </Tab>
  ));
}

function render(props: TabListProps & { [key: `data-${string}`]: string } = {}, dir: 'ltr' | 'rtl' = 'ltr') {
  return mount(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      <button data-testid="before">Before</button>
      <TabList aria-label="Sections" data-testid="list" {...props}>
        {props.children ?? children()}
      </TabList>
      <button data-testid="after">After</button>
    </FluentProvider>,
  );
}

function selected(value?: string) {
  cy.get(tabs)
    .filter('[aria-selected="true"]')
    .should('have.length', value === undefined ? 0 : 1);
  if (value !== undefined) {
    cy.get(tab(value)).should('have.attr', 'aria-selected', 'true');
  }
}

function rgb(hex: string) {
  return `rgb(${[1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
}

describe('TabList documented scenarios', () => {
  it('starts without an implicit selection and selects exactly one tab on click', () => {
    const onTabSelect = cy.stub().as('select');
    render({ onTabSelect });
    cy.get(list).should('have.attr', 'role', 'tablist').and('have.attr', 'aria-orientation', 'horizontal');
    cy.get(tabs).should('have.length', 3).and('have.prop', 'tagName', 'BUTTON');
    selected();
    cy.get(tab('b')).click();
    selected('b');
    cy.get('@select').should('have.been.calledOnce');
    cy.get('@select')
      .its('firstCall.args')
      .should(args => {
        expect(args).to.have.length(2);
        expect(args[0].type).to.equal('click');
        expect(args[0].target.closest('[role="tab"]').getAttribute('data-testid')).to.equal('tab-b');
        expect(args[1]).to.deep.equal({ value: 'b' });
      });
    cy.get(tab('c')).click();
    selected('c');
  });
});

describe('TabList edges and accessibility', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const vertical of [false, true]) {
      for (const selectTabOnFocus of [false, true]) {
        it(`navigates and wraps ${dir}/${vertical ? 'vertical' : 'horizontal'}/${
          selectTabOnFocus ? 'automatic' : 'manual'
        }`, () => {
          const onTabSelect = cy.stub().as('select');
          render({ vertical, selectTabOnFocus, defaultSelectedValue: 'a', children: children('b'), onTabSelect }, dir);
          const next = vertical ? 'ArrowDown' : dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
          const previous = vertical ? 'ArrowUp' : dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
          cy.get(tab('a')).focus();
          cy.realPress(next);
          cy.get(tab('c')).should('be.focused');
          selected(selectTabOnFocus ? 'c' : 'a');
          cy.realPress(next);
          cy.get(tab('a')).should('be.focused');
          cy.realPress(previous);
          cy.get(tab('c')).should('be.focused');
          cy.realPress('Home');
          cy.get(tab('a')).should('be.focused');
          cy.realPress('End');
          cy.get(tab('c')).should('be.focused');
          selected(selectTabOnFocus ? 'c' : 'a');
          cy.realPress(vertical ? 'ArrowRight' : 'ArrowDown');
          cy.get(tab('c')).should('be.focused');
          if (selectTabOnFocus) {
            cy.get('@select')
              .its('lastCall.args')
              .should(args => {
                expect(args[0].type).to.equal('focus');
                expect(args[1]).to.deep.equal({ value: 'c' });
              });
          } else {
            cy.get('@select').should('not.have.been.called');
          }
        });
      }
    }
  }

  for (const key of ['Enter', 'Space'] as const) {
    it(`activates the focused tab with ${key} in manual mode`, () => {
      const onTabSelect = cy.stub().as('select');
      render({ defaultSelectedValue: 'a', onTabSelect });
      cy.get(tab('b')).focus();
      selected('a');
      cy.realPress(key);
      selected('b');
      cy.get('@select')
        .should('have.been.calledOnce')
        .its('firstCall.args')
        .should(args => {
          expect(args[0].type).to.equal('click');
          expect(args[1]).to.deep.equal({ value: 'b' });
        });
    });
  }

  for (const vertical of [false, true]) {
    it(`enters the selected tab, exits as one stop and reenters selected rather than last focused (${vertical})`, () => {
      render({ vertical, defaultSelectedValue: 'b' });
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get(tab('b')).should('be.focused');
      cy.realPress(vertical ? 'ArrowDown' : 'ArrowRight');
      cy.get(tab('c')).should('be.focused');
      selected('b');
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get(tab('b')).should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('[data-testid="before"]').should('be.focused');
    });
  }

  it('enters the first enabled tab when no tab is selected', () => {
    render({ children: children('a') });
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get(tab('b')).should('be.focused');
    selected();
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
  });

  it('skips a disabled selected value on keyboard entry', () => {
    render({ defaultSelectedValue: 'a', children: children('a') });
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get(tab('b')).should('be.focused');
    cy.get(tab('a')).should('not.have.attr', 'aria-selected');
    selected();
  });

  it('keeps controlled selection unchanged while automatic focus requests are reported', () => {
    const onTabSelect = cy.stub().as('select');
    render({ selectedValue: 'a', selectTabOnFocus: true, onTabSelect });
    cy.get(tab('a')).focus();
    cy.realPress('ArrowRight');
    cy.get(tab('b')).should('be.focused');
    selected('a');
    cy.get('@select').its('lastCall.args.1').should('deep.equal', { value: 'b' });
  });

  it('uses actual RTL layout while preserving logical DOM order', () => {
    render({ defaultSelectedValue: 'a' }, 'rtl');
    cy.get(tabs).should($tabs => {
      expect($tabs.toArray().map(element => element.textContent)).to.deep.equal(['A', 'BB', 'CC']);
      expect($tabs[0].getBoundingClientRect().left).to.be.greaterThan($tabs[1].getBoundingClientRect().left);
      expect($tabs[1].getBoundingClientRect().left).to.be.greaterThan($tabs[2].getBoundingClientRect().left);
    });
    cy.get(tab('a')).focus();
    cy.realPress('ArrowLeft');
    cy.get(tab('b')).should('be.focused');
  });

  it('exposes list naming, description and tab names without automatic panel relationships', () => {
    render({
      'aria-labelledby': 'list-label',
      'aria-describedby': 'list-help',
      children: (
        <>
          <Tab value="a" data-testid="tab-a" icon={<span aria-hidden="true">+</span>}>
            Overview
          </Tab>
          <Tab value="b" data-testid="tab-b" aria-label="Calendar" icon={<span aria-hidden="true">+</span>} />
        </>
      ),
    });
    cy.get(list).then($list => {
      const ownerDocument = $list[0].ownerDocument;
      const label = ownerDocument.createElement('span');
      label.id = 'list-label';
      label.textContent = 'Account sections';
      const help = ownerDocument.createElement('span');
      help.id = 'list-help';
      help.textContent = 'Choose a section';
      $list[0].parentElement!.append(label, help);
    });
    cy.get(list).should($list => {
      expect(
        getByRole($list[0].parentElement!, 'tablist', { name: 'Account sections', description: 'Choose a section' }),
      ).to.equal($list[0]);
      expect(getByRole($list[0], 'tab', { name: 'Overview' })).to.equal($list.find('[data-testid="tab-a"]')[0]);
      expect(getByRole($list[0], 'tab', { name: 'Calendar' })).to.equal($list.find('[data-testid="tab-b"]')[0]);
    });
    cy.get(tabs).each($tab => cy.wrap($tab).should('not.have.attr', 'aria-controls'));
    cy.get('[role="tabpanel"]').should('not.exist');
  });

  it('keeps lists independent even when their tab values match', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <TabList data-testid="list" aria-label="Primary" defaultSelectedValue="a">
          {children()}
        </TabList>
        <TabList data-testid="other" aria-label="Secondary" defaultSelectedValue="b">
          {children()}
        </TabList>
      </FluentProvider>,
    );
    cy.get(tab('c')).click();
    selected('c');
    cy.get('[data-testid="other"] [aria-selected="true"]')
      .should('have.length', 1)
      .and('have.attr', 'data-testid', 'tab-b');
  });

  it('handles additions, reorder, selected removal and restoration without inventing a fallback', () => {
    const Dynamic = () => {
      const [items, setItems] = React.useState(['a', 'b', 'c']);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="add" onClick={() => setItems(['a', 'b', 'c', 'd'])}>
            Add
          </button>
          <button data-testid="reorder" onClick={() => setItems(['d', 'b', 'a', 'c'])}>
            Reorder
          </button>
          <button data-testid="remove" onClick={() => setItems(['d', 'a', 'c'])}>
            Remove selected
          </button>
          <button data-testid="restore" onClick={() => setItems(['d', 'b', 'a', 'c'])}>
            Restore selected
          </button>
          <TabList data-testid="list" aria-label="Dynamic" defaultSelectedValue="b">
            {items.map(value => (
              <Tab key={value} data-testid={`tab-${value}`} value={value}>
                {value.toUpperCase()}
              </Tab>
            ))}
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Dynamic />);
    selected('b');
    cy.get('[data-testid="add"]').click();
    cy.get(tab('d')).should('exist');
    selected('b');
    cy.get('[data-testid="reorder"]').click();
    cy.get(tabs).should($tabs =>
      expect($tabs.toArray().map(element => element.getAttribute('data-testid'))).to.deep.equal([
        'tab-d',
        'tab-b',
        'tab-a',
        'tab-c',
      ]),
    );
    selected('b');
    cy.get(tab('b')).focus();
    cy.realPress('ArrowRight');
    cy.get(tab('a')).should('be.focused');
    cy.realPress('Home');
    cy.get(tab('d')).should('be.focused');
    cy.get('[data-testid="remove"]').click();
    cy.get(tab('b')).should('not.exist');
    selected();
    cy.get('[data-testid="restore"]').click();
    selected('b');
    cy.get(tab('d')).click();
    selected('d');
  });

  it('updates direction, orientation and activation after rerender', () => {
    const Dynamic = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme} dir={changed ? 'rtl' : 'ltr'}>
          <button data-testid="change" onClick={() => setChanged(!changed)}>
            Change
          </button>
          <TabList
            data-testid="list"
            aria-label="Dynamic"
            vertical={changed}
            selectTabOnFocus={changed}
            defaultSelectedValue="a"
          >
            {children()}
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Dynamic />);
    cy.get(tab('a')).focus();
    cy.realPress('ArrowRight');
    cy.get(tab('b')).should('be.focused');
    selected('a');
    cy.get('[data-testid="change"]').click();
    cy.get(list).should('have.attr', 'aria-orientation', 'vertical').and('have.css', 'flex-direction', 'column');
    cy.get(tab('a')).focus();
    cy.realPress('ArrowDown');
    cy.get(tab('b')).should('be.focused');
    selected('b');
    cy.realPress('ArrowLeft');
    cy.get(tab('b')).should('be.focused');
    cy.get('[data-testid="change"]').click();
    cy.get(list).should('have.attr', 'aria-orientation', 'horizontal');
    cy.get(tab('b')).focus();
    cy.realPress('ArrowRight');
    cy.get(tab('c')).should('be.focused');
    selected('b');
  });

  it('updates list-wide disabling while preserving individual disabled tabs', () => {
    const Dynamic = () => {
      const [disabled, setDisabled] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="change" onClick={() => setDisabled(!disabled)}>
            Change
          </button>
          <TabList data-testid="list" aria-label="Dynamic" disabled={disabled} defaultSelectedValue="a">
            {children('b')}
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Dynamic />);
    selected('a');
    cy.get('[data-testid="change"]').click();
    cy.get(tabs).each($tab => cy.wrap($tab).should('be.disabled').and('not.have.attr', 'aria-selected'));
    cy.get('[data-testid="change"]').click();
    selected('a');
    cy.get(tab('a')).should('not.be.disabled');
    cy.get(tab('b')).should('be.disabled');
    cy.get(tab('c')).click();
    selected('c');
  });

  it('composes with overflow and external controlled selection of an overflowed tab', () => {
    const WithOverflow = () => {
      const [value, setValue] = React.useState<unknown>('a');
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="external" onClick={() => setValue('c')}>
            Select overflowed C
          </button>
          <div style={{ width: 180 }}>
            <Overflow minimumVisible={1}>
              <TabList
                data-testid="list"
                aria-label="Overflow sections"
                selectedValue={value}
                onTabSelect={(_, d) => setValue(d.value)}
              >
                {['a', 'b', 'c'].map(item => (
                  <OverflowItem key={item} id={item} priority={item === value ? 2 : 1}>
                    <Tab data-testid={`tab-${item}`} value={item}>
                      Long section {item}
                    </Tab>
                  </OverflowItem>
                ))}
              </TabList>
            </Overflow>
          </div>
        </FluentProvider>
      );
    };
    mount(<WithOverflow />);
    selected('a');
    cy.get(tab('a')).should('be.visible');
    cy.get(tab('c')).should('not.be.visible');
    cy.get('[data-testid="external"]').click();
    selected('c');
    cy.get(tab('c')).should('be.visible');
    cy.get(tab('a')).should('not.be.visible');
  });
});

describe('TabList documented variants', () => {
  it('initializes uncontrolled selection from defaultSelectedValue', () => {
    render({ defaultSelectedValue: 'b' });
    selected('b');
    cy.get(tab('a')).click();
    selected('a');
  });

  it('reports a requested value without changing controlled selection', () => {
    const onTabSelect = cy.stub().as('select');
    render({ selectedValue: 'a', defaultSelectedValue: 'c', onTabSelect });
    selected('a');
    cy.get(tab('b')).click();
    selected('a');
    cy.get('@select').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { value: 'b' });
  });

  it('updates controlled selection and application-owned panel relationships', () => {
    const Panels = () => {
      const [value, setValue] = React.useState<unknown>('a');
      return (
        <FluentProvider theme={teamsLightTheme}>
          <TabList
            data-testid="list"
            aria-label="Sections"
            selectedValue={value}
            onTabSelect={(_, d) => setValue(d.value)}
          >
            {['a', 'b', 'c'].map(item => (
              <Tab
                key={item}
                id={`header-${item}`}
                aria-controls={`panel-${item}`}
                value={item}
                data-testid={`tab-${item}`}
              >
                {item.toUpperCase()}
              </Tab>
            ))}
          </TabList>
          {['a', 'b', 'c'].map(item => (
            <div
              key={item}
              id={`panel-${item}`}
              role="tabpanel"
              aria-labelledby={`header-${item}`}
              hidden={value !== item}
            >
              Content {item}
            </div>
          ))}
        </FluentProvider>
      );
    };
    mount(<Panels />);
    selected('a');
    cy.get('[role="tabpanel"]:visible').should('have.length', 1).and('have.text', 'Content a');
    cy.get(tab('b')).click();
    selected('b');
    cy.get('[role="tabpanel"]:visible').should('have.length', 1).and('have.text', 'Content b');
    cy.get(tabs).each($tab => {
      const panel = $tab[0].ownerDocument.getElementById($tab.attr('aria-controls')!);
      expect(panel?.getAttribute('aria-labelledby')).to.equal($tab.attr('id'));
      expect(panel?.hidden).to.equal($tab.attr('aria-selected') !== 'true');
    });
  });

  it('does not select on focus in the default manual mode', () => {
    const onTabSelect = cy.stub().as('select');
    render({ defaultSelectedValue: 'a', onTabSelect });
    cy.get(tab('b')).focus().should('be.focused');
    selected('a');
    cy.get('@select').should('not.have.been.called');
    cy.get(tab('b')).click();
    selected('b');
    cy.get('@select').should('have.been.calledOnce');
  });

  it('selects on focus when selectTabOnFocus is enabled', () => {
    const onTabSelect = cy.stub().as('select');
    render({ defaultSelectedValue: 'a', selectTabOnFocus: true, onTabSelect });
    cy.get(tab('b')).focus().should('be.focused');
    selected('b');
    cy.get('@select')
      .should('have.been.calledOnce')
      .its('firstCall.args')
      .should(args => {
        expect(args[0].type).to.equal('focus');
        expect(args[1]).to.deep.equal({ value: 'b' });
      });
  });

  it('disables every child through list context without exposing selectable ARIA state', () => {
    const onTabSelect = cy.stub().as('select');
    render({ defaultSelectedValue: 'b', disabled: true, onTabSelect });
    cy.get(tabs).each($tab => {
      cy.wrap($tab).should('be.disabled').and('not.have.attr', 'aria-selected');
      cy.wrap($tab).click({ force: true });
    });
    cy.get('@select').should('not.have.been.called');
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
  });

  it('preserves individual disabling while enabled siblings remain selectable', () => {
    const onTabSelect = cy.stub().as('select');
    render({ defaultSelectedValue: 'a', onTabSelect, children: children('b') });
    cy.get(tab('b')).should('be.disabled').and('not.have.attr', 'aria-selected');
    cy.get(tab('b')).click({ force: true });
    selected('a');
    cy.get('@select').should('not.have.been.called');
    cy.get(tab('c')).click();
    selected('c');
    cy.get('@select').should('have.been.calledOnce');
  });

  for (const vertical of [false, true]) {
    for (const size of ['small', 'medium', 'large'] as const) {
      for (const appearance of ['transparent', 'subtle', 'subtle-circular', 'filled-circular'] as const) {
        it(`propagates ${size}/${appearance}/${vertical ? 'vertical' : 'horizontal'} styling and selection`, () => {
          render({ size, appearance, vertical, defaultSelectedValue: 'a' });
          cy.get('[data-testid="before"]').realHover();
          const circular = appearance.endsWith('circular');
          const gap = circular
            ? teamsLightTheme[size === 'small' ? 'spacingHorizontalSNudge' : 'spacingHorizontalS']
            : '0px';
          cy.get(list).should('have.attr', 'aria-orientation', vertical ? 'vertical' : 'horizontal');
          cy.get(list).should('have.css', 'flex-direction', vertical ? 'column' : 'row');
          cy.get(tabs).should($tabs => {
            const a = $tabs[0].getBoundingClientRect();
            const b = $tabs[1].getBoundingClientRect();
            expect(a.width).to.be.greaterThan(0);
            expect(a.height).to.be.greaterThan(0);
            expect(vertical ? b.top - a.bottom : b.left - a.right).to.be.closeTo(parseFloat(gap), 0.5);
            expect(vertical ? b.left : b.top).to.be.closeTo(vertical ? a.left : a.top, 0.5);
          });
          cy.get(tab('a')).find(content).should('have.css', 'font-weight', String(teamsLightTheme.fontWeightSemibold));
          cy.get(tab('b')).find(content).should('have.css', 'font-weight', String(teamsLightTheme.fontWeightRegular));
          cy.get(tab('b'))
            .find(content)
            .should('have.css', 'font-size', teamsLightTheme[size === 'large' ? 'fontSizeBase400' : 'fontSizeBase300']);
          const padding = circular
            ? parseFloat(
                teamsLightTheme[
                  size === 'small'
                    ? 'spacingVerticalXXS'
                    : size === 'medium'
                    ? 'spacingVerticalSNudge'
                    : 'spacingVerticalS'
                ],
              ) - 1
            : parseFloat(
                teamsLightTheme[
                  vertical
                    ? size === 'small'
                      ? 'spacingVerticalXXS'
                      : size === 'medium'
                      ? 'spacingVerticalSNudge'
                      : 'spacingVerticalS'
                    : size === 'small'
                    ? 'spacingVerticalSNudge'
                    : size === 'medium'
                    ? 'spacingVerticalM'
                    : 'spacingVerticalL'
                ],
              );
          cy.get(tab('b')).should('have.css', 'padding-top', `${padding}px`);
          if (circular) {
            cy.get(tab('b')).should('have.css', 'border-radius', teamsLightTheme.borderRadiusCircular);
            cy.get(tab('a')).should(
              'have.css',
              'background-color',
              rgb(teamsLightTheme[appearance === 'filled-circular' ? 'colorBrandBackground' : 'colorBrandBackground2']),
            );
            cy.get(tab('b')).should(
              'have.css',
              'background-color',
              appearance === 'filled-circular' ? rgb(teamsLightTheme.colorNeutralBackground3) : 'rgba(0, 0, 0, 0)',
            );
          } else {
            cy.get(tab('a')).find(content).should('have.css', 'color', rgb(teamsLightTheme.colorNeutralForeground1));
            cy.get(tab('b')).find(content).should('have.css', 'color', rgb(teamsLightTheme.colorNeutralForeground2));
            cy.get(tab('b')).should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
          }
          const hoverColor =
            teamsLightTheme[
              appearance === 'transparent'
                ? 'colorTransparentBackgroundHover'
                : appearance === 'filled-circular'
                ? 'colorNeutralBackground3Hover'
                : 'colorSubtleBackgroundHover'
            ];
          cy.get(tab('b')).realHover();
          cy.get(tab('b')).should(
            'have.css',
            'background-color',
            hoverColor.startsWith('#')
              ? rgb(hoverColor)
              : hoverColor === 'transparent'
              ? 'rgba(0, 0, 0, 0)'
              : hoverColor,
          );
          cy.get(tab('b')).click();
          selected('b');
          cy.get(tab('b')).find(content).should('have.css', 'font-weight', String(teamsLightTheme.fontWeightSemibold));
          cy.get(tab('a')).find(content).should('have.css', 'font-weight', String(teamsLightTheme.fontWeightRegular));
        });
      }
    }
  }

  for (const reserveSelectedTabSpace of [true, false]) {
    it(`propagates reserveSelectedTabSpace=${reserveSelectedTabSpace}`, () => {
      render({
        defaultSelectedValue: 'b',
        reserveSelectedTabSpace,
        children: (
          <>
            <Tab value="a" data-testid="tab-a">
              Minimum width illustration
            </Tab>
            <Tab value="b" data-testid="tab-b">
              B
            </Tab>
          </>
        ),
      });
      cy.get(tab('a'))
        .find(reserved)
        .should(reserveSelectedTabSpace ? 'exist' : 'not.exist');
      cy.get(tab('b')).find(reserved).should('not.exist');
      cy.get(tab('a')).then($tab => {
        const width = $tab[0].getBoundingClientRect().width;
        if (reserveSelectedTabSpace) {
          cy.get(tab('a'))
            .find(reserved)
            .should('have.css', 'visibility', 'hidden')
            .and('have.css', 'font-weight', String(teamsLightTheme.fontWeightSemibold));
        }
        cy.get(tab('a')).click();
        selected('a');
        cy.get(tab('a')).find(reserved).should('not.exist');
        cy.get(tab('a')).should($selected => {
          const selectedWidth = $selected[0].getBoundingClientRect().width;
          if (reserveSelectedTabSpace) {
            expect(selectedWidth).to.be.closeTo(width, 0.5);
          } else {
            expect(selectedWidth).to.be.greaterThan(width);
          }
        });
      });
    });
  }

  for (const iconOnly of [false, true]) {
    it(`composes ${iconOnly ? 'explicitly named icon-only' : 'text and icon'} tabs`, () => {
      render({
        children: ['a', 'b'].map(value => (
          <Tab
            key={value}
            value={value}
            data-testid={`tab-${value}`}
            aria-label={iconOnly ? `Section ${value}` : undefined}
            icon={<span aria-hidden="true">+</span>}
          >
            {iconOnly ? undefined : `Section ${value}`}
          </Tab>
        )),
      });
      cy.get(tab('a')).find(`.${tabClassNames.icon}`).should('be.visible');
      if (iconOnly) {
        cy.get(tab('a')).find(content).should('not.exist');
      } else {
        cy.get(tab('a')).find(content).should('have.text', 'Section a');
      }
      if (iconOnly) {
        cy.get(tab('a')).should('have.attr', 'aria-label', 'Section a').find(reserved).should('not.exist');
      }
      cy.get(tab('b')).click();
      selected('b');
    });
  }
});

describe('TabList unit and source contracts', () => {
  it('renders an empty list with no implicit children, panel or keyboard stop', () => {
    render({ children: <></> });
    cy.get(list).should('have.attr', 'role', 'tablist').and('have.attr', 'aria-orientation', 'horizontal');
    cy.get(tabs).should('not.exist');
    cy.get('[role="tabpanel"]').should('not.exist');
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
  });

  it('keeps focus on a singleton through arrows, Home and End but allows Tab exit', () => {
    render({
      defaultSelectedValue: 'a',
      children: (
        <Tab value="a" data-testid="tab-a">
          Only
        </Tab>
      ),
    });
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get(tab('a')).should('be.focused');
    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End'] as const) {
      cy.realPress(key);
      cy.get(tab('a')).should('be.focused');
      selected('a');
    }
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
  });

  it('does not create an implicit selection when the controlled value has no match', () => {
    const onTabSelect = cy.stub().as('select');
    render({ selectedValue: 'absent', onTabSelect });
    selected();
    cy.get(tab('b')).click();
    selected();
    cy.get('@select').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { value: 'b' });
  });

  it('treats defaultSelectedValue as initialization rather than a rerender command', () => {
    const onTabSelect = cy.stub().as('select');
    const Defaults = () => {
      const [defaultValue, setDefaultValue] = React.useState('a');
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="change" onClick={() => setDefaultValue('c')}>
            Change default
          </button>
          <TabList
            data-testid="list"
            aria-label="Default"
            defaultSelectedValue={defaultValue}
            onTabSelect={onTabSelect}
          >
            {children()}
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Defaults />);
    selected('a');
    cy.get('[data-testid="change"]').click();
    selected('a');
    cy.get('@select').should('not.have.been.called');
    cy.get(tab('b')).click();
    selected('b');
  });

  for (const value of ['text', 0, 7, false, true, null]) {
    it(`preserves the selection payload and identity for ${JSON.stringify(value)} (${typeof value})`, () => {
      const onTabSelect = cy.stub().as('select');
      render({
        defaultSelectedValue: 'initial',
        onTabSelect,
        children: (
          <>
            <Tab value="initial" data-testid="tab-a">
              Initial
            </Tab>
            <Tab value={value} data-testid="tab-b">
              Target
            </Tab>
          </>
        ),
      });
      selected('a');
      cy.get(tab('b')).click();
      selected('b');
      cy.get('@select').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { value });
    });
  }

  for (const value of [0, false, '', null]) {
    it(`accepts controlled ${JSON.stringify(value)} with refusal, external updates and latest callbacks`, () => {
      const onTabSelect = cy.stub().as('select');
      const latestOnTabSelect = cy.stub().as('latestSelect');
      const Controlled = () => {
        const [selectedValue, setSelectedValue] = React.useState<unknown>(value);
        const [useLatestHandler, setUseLatestHandler] = React.useState(false);
        return (
          <FluentProvider theme={teamsLightTheme}>
            <button
              data-testid="truthy"
              onClick={() => {
                setSelectedValue('initial');
                setUseLatestHandler(true);
              }}
            >
              Select truthy value
            </button>
            <button data-testid="falsy" onClick={() => setSelectedValue(value)}>
              Restore falsy value
            </button>
            <TabList
              data-testid="list"
              aria-label="Controlled primitives"
              selectedValue={selectedValue}
              onTabSelect={useLatestHandler ? latestOnTabSelect : onTabSelect}
            >
              <Tab value="initial" data-testid="tab-a">
                Truthy
              </Tab>
              <Tab value={value} data-testid="tab-b">
                Falsy
              </Tab>
            </TabList>
          </FluentProvider>
        );
      };
      mount(<Controlled />);
      selected('b');
      cy.get('@select').should('not.have.been.called');
      cy.get(tab('a')).click();
      selected('b');
      cy.get('@select')
        .should('have.been.calledOnce')
        .its('lastCall.args')
        .should(args => {
          expect(args).to.have.length(2);
          expect(args[0].type).to.equal('click');
          expect(args[0].target.closest('[role="tab"]').getAttribute('data-testid')).to.equal('tab-a');
          expect(args[1]).to.deep.equal({ value: 'initial' });
        });
      cy.get('@latestSelect').should('not.have.been.called');
      cy.get('[data-testid="truthy"]').click();
      selected('a');
      cy.get('@select').should('have.been.calledOnce');
      cy.get('@latestSelect').should('not.have.been.called');
      cy.get(tab('b')).click();
      selected('a');
      cy.get('@latestSelect')
        .should('have.been.calledOnce')
        .its('lastCall.args')
        .should(args => {
          expect(args).to.have.length(2);
          expect(args[0].type).to.equal('click');
          expect(args[0].target.closest('[role="tab"]').getAttribute('data-testid')).to.equal('tab-b');
          expect(args[1]).to.deep.equal({ value });
        });
      cy.get('[data-testid="falsy"]').click();
      selected('b');
      cy.get('@select').should('have.been.calledOnce');
      cy.get('@latestSelect').should('have.been.calledOnce');
      cy.get(tab('b')).click();
      selected('b');
      cy.get('@latestSelect')
        .should('have.been.calledTwice')
        .its('lastCall.args')
        .should(args => {
          expect(args).to.have.length(2);
          expect(args[0].type).to.equal('click');
          expect(args[0].target.closest('[role="tab"]').getAttribute('data-testid')).to.equal('tab-b');
          expect(args[1]).to.deep.equal({ value });
        });
      cy.get(tab('a')).click();
      selected('b');
      cy.get('@latestSelect').should('have.been.calledThrice').its('lastCall.args.1').should('deep.equal', {
        value: 'initial',
      });
      cy.get('@select').should('have.been.calledOnce');
    });
  }

  it('selects serializable objects by reference, not by JSON equivalence', () => {
    const first = { id: 'a' };
    const second = { id: 'b' };
    const onTabSelect = cy.stub().as('select');
    const Objects = () => {
      const [value, setValue] = React.useState<unknown>({ id: 'a' });
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="match" onClick={() => setValue(first)}>
            Use same reference
          </button>
          <TabList
            data-testid="list"
            aria-label="Objects"
            selectedValue={value}
            onTabSelect={(event, data) => {
              onTabSelect(event, data);
              setValue(data.value);
            }}
          >
            <Tab data-testid="tab-a" value={first}>
              First
            </Tab>
            <Tab data-testid="tab-b" value={second}>
              Second
            </Tab>
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Objects />);
    selected();
    cy.get('[data-testid="match"]').click();
    selected('a');
    cy.get(tab('b')).click();
    selected('b');
    cy.get('@select').its('firstCall.args.1.value').should('equal', second);
  });

  it('uses latest selection and native root event handlers after rerender', () => {
    const first = cy.stub().as('first');
    const latest = cy.stub().as('latest');
    const firstClick = cy.stub().as('firstClick');
    const latestClick = cy.stub().as('latestClick');
    const Handlers = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="change" onClick={() => setChanged(true)}>
            Replace handlers
          </button>
          <TabList
            data-testid="list"
            aria-label="Handlers"
            defaultSelectedValue="a"
            onTabSelect={changed ? latest : first}
            onClick={changed ? latestClick : firstClick}
          >
            {children()}
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Handlers />);
    cy.get(tab('b')).click();
    selected('b');
    cy.get('@first').should('have.been.calledOnce');
    cy.get('@firstClick').should('have.been.calledOnce');
    cy.get('[data-testid="change"]').click();
    cy.get(tab('c')).click();
    selected('c');
    cy.get('@latest').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { value: 'c' });
    cy.get('@latestClick').should('have.been.calledOnce');
    cy.get('@first').should('have.been.calledOnce');
    cy.get('@firstClick').should('have.been.calledOnce');
  });

  it('reports repeated activation of the already selected tab', () => {
    const onTabSelect = cy.stub().as('select');
    render({ selectedValue: 'a', onTabSelect });
    cy.get(tab('a')).click().click();
    selected('a');
    cy.get('@select').should('have.been.calledTwice');
    cy.get('@select').its('secondCall.args.1').should('deep.equal', { value: 'a' });
  });

  it('forwards native root attributes and does not leak design props into DOM', () => {
    render({
      id: 'custom-list',
      title: 'List title',
      className: 'custom-list',
      'data-custom': 'native',
      appearance: 'filled-circular',
      size: 'large',
      reserveSelectedTabSpace: false,
      selectTabOnFocus: true,
      vertical: true,
      selectedValue: 'c',
      disabled: true,
    });
    cy.get(list).should('have.id', 'custom-list').and('have.class', 'fui-TabList').and('have.class', 'custom-list');
    cy.get(list).should('have.attr', 'title', 'List title').and('have.attr', 'data-custom', 'native');
    for (const prop of [
      'appearance',
      'size',
      'reserveselectedtabspace',
      'selecttabonfocus',
      'vertical',
      'selectedvalue',
      'disabled',
    ]) {
      cy.get(list).should('not.have.attr', prop);
    }
    render({ defaultSelectedValue: 'b' });
    cy.get(list).should('not.have.attr', 'defaultselectedvalue');
  });

  it('honors native semantic overrides and consumer-supplied Tabster attributes', () => {
    render({ role: 'group', 'aria-orientation': 'vertical', 'data-tabster': '{"focusable":{"isDefault":true}}' });
    cy.get(list).should('have.attr', 'role', 'group').and('have.attr', 'aria-orientation', 'vertical');
    cy.get(list).should('have.attr', 'data-tabster', '{"focusable":{"isDefault":true}}');
    cy.get(tab('b')).click();
    selected('b');
  });

  it('forwards root props and composed refs, and clears refs when unmounted', () => {
    const forwarded = React.createRef<HTMLDivElement>();
    const otherRef = React.createRef<HTMLDivElement>();
    const callback = cy.stub().as('ref');
    const Refs = () => {
      const [shown, setShown] = React.useState(true);
      const ref = useMergedRefs(forwarded, otherRef, callback);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="toggle" onClick={() => setShown(!shown)}>
            Toggle
          </button>
          {shown && (
            <TabList
              ref={ref}
              data-testid="list"
              aria-label="Refs"
              className="outer"
              title="Root title"
              data-slot="root"
            >
              {children()}
            </TabList>
          )}
        </FluentProvider>
      );
    };
    mount(<Refs />);
    cy.get(list)
      .should('have.attr', 'title', 'Root title')
      .and('have.attr', 'data-slot', 'root')
      .and('have.class', 'outer');
    cy.get(list).should($list => {
      expect(forwarded.current).to.equal($list[0]);
      expect(otherRef.current).to.equal($list[0]);
    });
    cy.get('[data-testid="toggle"]').click();
    cy.get(list).should('not.exist');
    cy.then(() => {
      expect(forwarded.current).to.equal(null);
      expect(otherRef.current).to.equal(null);
    });
    cy.get('@ref').its('lastCall.args.0').should('be.null');
    cy.get('[data-testid="toggle"]').click();
    cy.get(list).should($list => {
      expect(forwarded.current).to.equal($list[0]);
      expect(otherRef.current).to.equal($list[0]);
    });
    cy.get(tab('b')).click();
    selected('b');
  });

  it('supports the primary root render function through the children prop', () => {
    const rootRender: SlotRenderFunction<ExtractSlotProps<TabListSlots['root']>> = (Component, props) => (
      <Component {...props} data-rendered="true" title="Rendered root">
        {props.children}
      </Component>
    );
    render({ children: rootRender });
    cy.get(list)
      .should('have.attr', 'data-rendered', 'true')
      .and('have.attr', 'title', 'Rendered root')
      .and('have.attr', 'role', 'tablist');
    cy.get(tabs).should('not.exist');
    cy.get(list).should('have.attr', 'aria-orientation', 'horizontal').and('have.class', 'fui-TabList');
  });

  it('tracks registry refs, current/previous selection and cleanup through the context hook', () => {
    let getRegisteredTabs: TabListContextValue['getRegisteredTabs'] | undefined;
    const Probe = () => {
      const getter = useTabListContext_unstable(ctx => ctx.getRegisteredTabs);
      React.useEffect(() => {
        getRegisteredTabs = getter;
      }, [getter]);
      return null;
    };
    const Registry = () => {
      const [items, setItems] = React.useState(['a', 'b', 'c']);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="remove" onClick={() => setItems(['a', 'c'])}>
            Remove B
          </button>
          <button data-testid="restore" onClick={() => setItems(['a', 'b', 'c'])}>
            Restore B
          </button>
          <TabList data-testid="list" aria-label="Registry" defaultSelectedValue="a">
            {items.map(value => (
              <Tab key={value} data-testid={`tab-${value}`} value={value}>
                {value}
              </Tab>
            ))}
            <Probe />
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Registry />);
    const assertRegistry = (values: string[], current: string, previous?: string) => {
      cy.get(list).should($list => {
        expect(getRegisteredTabs, 'context getter installed').to.be.a('function');
        const snapshot = getRegisteredTabs!();
        expect(Object.keys(snapshot.registeredTabs).sort()).to.deep.equal(
          values.map(value => JSON.stringify(value)).sort(),
        );
        expect(snapshot.selectedValue).to.equal(current);
        expect(snapshot.previousSelectedValue).to.equal(previous);
        for (const value of values) {
          const registered = snapshot.registeredTabs[JSON.stringify(value)];
          expect(registered.value).to.equal(value);
          expect(registered.ref.current).to.equal($list.find(`[data-testid="tab-${value}"]`)[0]);
        }
      });
    };
    assertRegistry(['a', 'b', 'c'], 'a', 'a');
    cy.get(tab('b')).click();
    assertRegistry(['a', 'b', 'c'], 'b', 'a');
    cy.get('[data-testid="remove"]').click();
    selected();
    assertRegistry(['a', 'c'], 'b', 'a');
    cy.get('[data-testid="restore"]').click();
    selected('b');
    assertRegistry(['a', 'b', 'c'], 'b', 'a');
    cy.get(tab('c')).click();
    assertRegistry(['a', 'b', 'c'], 'c', 'b');
  });

  it('updates registration when a keyed tab changes its value', () => {
    let getRegisteredTabs: TabListContextValue['getRegisteredTabs'] | undefined;
    const Probe = () => {
      const getter = useTabListContext_unstable(ctx => ctx.getRegisteredTabs);
      React.useEffect(() => {
        getRegisteredTabs = getter;
      }, [getter]);
      return null;
    };
    const Values = () => {
      const [value, setValue] = React.useState('a');
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="change" onClick={() => setValue('b')}>
            Change value
          </button>
          <TabList data-testid="list" aria-label="Values" defaultSelectedValue="a">
            <Tab data-testid="tab-a" value={value}>
              Same keyed tab
            </Tab>
            <Probe />
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Values />);
    selected('a');
    cy.get('[data-testid="change"]').click();
    selected();
    cy.get(list).should(() => {
      expect(getRegisteredTabs).to.be.a('function');
      expect(Object.keys(getRegisteredTabs!().registeredTabs)).to.deep.equal(['"b"']);
    });
    cy.get(tab('a')).click();
    selected('a');
    cy.get(list).should(() => expect(getRegisteredTabs!().selectedValue).to.equal('b'));
  });

  it('updates size, appearance and reserved-space context without remounting children', () => {
    const Variants = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="change" onClick={() => setChanged(!changed)}>
            Change variants
          </button>
          <TabList
            data-testid="list"
            aria-label="Variants"
            defaultSelectedValue="a"
            size={changed ? 'large' : 'small'}
            appearance={changed ? 'filled-circular' : 'transparent'}
            reserveSelectedTabSpace={!changed}
          >
            {children()}
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Variants />);
    cy.get(tab('b')).find(reserved).should('exist');
    cy.get(tab('b')).find(content).should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
    cy.get(tab('a')).then($tab => {
      const original = $tab[0];
      cy.get('[data-testid="change"]').click();
      cy.get(tab('a')).should($current => expect($current[0]).to.equal(original));
    });
    selected('a');
    cy.get(tab('b')).find(reserved).should('not.exist');
    cy.get(tab('b')).find(content).should('have.css', 'font-size', teamsLightTheme.fontSizeBase400);
    cy.get(tab('a')).should('have.css', 'background-color', rgb(teamsLightTheme.colorBrandBackground));
    cy.get('[data-testid="change"]').click();
    cy.get(tab('b')).find(reserved).should('exist');
    cy.get(tab('b')).find(content).should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
    cy.get(tab('b')).click();
    selected('b');
  });

  it('does not inherit selection or disabling across a nested TabList context boundary', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <TabList data-testid="outer" aria-label="Outer" disabled defaultSelectedValue="a">
          <Tab data-testid="outer-tab" value="a">
            Outer A
          </Tab>
          <TabList data-testid="list" aria-label="Inner" defaultSelectedValue="b">
            {children()}
          </TabList>
        </TabList>
      </FluentProvider>,
    );
    cy.get('[data-testid="outer-tab"]').should('be.disabled').and('not.have.attr', 'aria-selected');
    selected('b');
    cy.get(tab('a')).should('not.be.disabled').click();
    selected('a');
    cy.get('[data-testid="outer-tab"]').should('be.disabled');
  });

  it('uses the latest automatic-selection handler and reports pointer focus followed by click', () => {
    const first = cy.stub().as('first');
    const latest = cy.stub().as('latest');
    const Handlers = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="change" onClick={() => setChanged(true)}>
            Replace
          </button>
          <TabList
            data-testid="list"
            aria-label="Automatic"
            selectTabOnFocus
            defaultSelectedValue="a"
            onTabSelect={changed ? latest : first}
          >
            {children()}
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Handlers />);
    cy.get(tab('b')).focus();
    selected('b');
    cy.get('@first').should('have.been.calledOnce');
    cy.get('[data-testid="change"]').click();
    cy.get(tab('c')).realClick();
    selected('c');
    cy.get('@latest')
      .should('have.been.calledTwice')
      .should(() => {
        expect(latest.getCalls().map(call => call.args[0].type)).to.deep.equal(['focus', 'click']);
        expect(latest.getCalls().map(call => call.args[1])).to.deep.equal([{ value: 'c' }, { value: 'c' }]);
      });
    cy.get('@first').should('have.been.calledOnce');
  });

  it('preserves native keyboard and focus bubbling with the latest handlers', () => {
    const firstKey = cy.stub().as('firstKey');
    const latestKey = cy.stub().as('latestKey');
    const focus = cy.stub().as('focus');
    const Handlers = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="change" onClick={() => setChanged(true)}>
            Replace
          </button>
          <TabList
            data-testid="list"
            aria-label="Events"
            defaultSelectedValue="a"
            onKeyDown={changed ? latestKey : firstKey}
            onFocus={focus}
          >
            {children()}
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Handlers />);
    cy.get(tab('a')).focus();
    cy.realPress('x');
    cy.realPress('ArrowRight');
    cy.get(tab('b')).should('be.focused');
    cy.get('@firstKey').should('have.been.calledOnce').its('firstCall.args.0.key').should('equal', 'x');
    cy.get('@focus').should('have.been.calledTwice');
    cy.get('[data-testid="change"]').click();
    cy.get(tab('a')).focus();
    cy.realPress('y');
    cy.realPress('End');
    cy.get(tab('c')).should('be.focused');
    cy.get('@latestKey').should('have.been.calledOnce').its('firstCall.args.0.key').should('equal', 'y');
    cy.get('@firstKey').should('have.been.calledOnce');
    selected('a');
  });

  it('preserves native root style overrides without changing semantic orientation', () => {
    render({ vertical: true, style: { display: 'inline-flex', flexDirection: 'row', flexWrap: 'wrap' } });
    cy.get(list)
      .should('have.css', 'display', 'inline-flex')
      .and('have.css', 'flex-direction', 'row')
      .and('have.css', 'flex-wrap', 'wrap');
    cy.get(list).should('have.attr', 'aria-orientation', 'vertical');
    cy.get(tab('a')).focus();
    cy.realPress('ArrowDown');
    cy.get(tab('b')).should('be.focused');
  });

  it('skips disabled endpoints for Home, End and circular navigation', () => {
    render({
      defaultSelectedValue: 'b',
      children: (
        <>
          <Tab value="a" data-testid="tab-a" disabled>
            A
          </Tab>
          <Tab value="b" data-testid="tab-b">
            B
          </Tab>
          <Tab value="c" data-testid="tab-c" disabled>
            C
          </Tab>
        </>
      ),
    });
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get(tab('b')).should('be.focused');
    for (const key of ['Home', 'End', 'ArrowRight', 'ArrowLeft'] as const) {
      cy.realPress(key);
      cy.get(tab('b')).should('be.focused');
      selected('b');
    }
  });

  it('reenters and navigates remaining children after the focused tab is removed', () => {
    const Removing = () => {
      const [showB, setShowB] = React.useState(true);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="before">Before</button>
          <TabList
            data-testid="list"
            aria-label="Removal"
            defaultSelectedValue="a"
            onKeyDown={event => {
              if (event.key === 'Delete') {
                setShowB(false);
              }
            }}
          >
            <Tab value="a" data-testid="tab-a">
              A
            </Tab>
            {showB && (
              <Tab value="b" data-testid="tab-b">
                B
              </Tab>
            )}
            <Tab value="c" data-testid="tab-c">
              C
            </Tab>
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Removing />);
    cy.get(tab('b')).focus();
    cy.realPress('Delete');
    cy.get(tab('b')).should('not.exist');
    selected('a');
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get(tab('a')).should('be.focused');
    cy.realPress('ArrowRight');
    cy.get(tab('c')).should('be.focused');
    cy.realPress('Enter');
    selected('c');
  });

  it('applies external controlled changes without emitting a selection event', () => {
    const onTabSelect = cy.stub().as('select');
    const Controlled = () => {
      const [value, setValue] = React.useState('a');
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="change" onClick={() => setValue('c')}>
            External change
          </button>
          <TabList data-testid="list" aria-label="Controlled" selectedValue={value} onTabSelect={onTabSelect}>
            {children()}
          </TabList>
        </FluentProvider>
      );
    };
    mount(<Controlled />);
    selected('a');
    cy.get('@select').should('not.have.been.called');
    cy.get('[data-testid="change"]').click();
    selected('c');
    cy.get('@select').should('not.have.been.called');
    cy.get(tab('b')).click();
    selected('c');
    cy.get('@select').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { value: 'b' });
  });
});
