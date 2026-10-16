import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import { getByRole } from '@testing-library/react';
import { Tab } from './Tab';
import { tabClassNames, tabReservedSpaceClassNames } from './useTabStyles.styles';
import type { TabSlots, TabValue } from './Tab.types';
import { TabList } from '../TabList/TabList';
import type { TabListContextValue, TabListProps } from '../TabList/TabList.types';
import { useTabListContext_unstable } from '../TabList/TabListContext';
import { useMergedRefs } from '@fluentui/react-utilities';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { useTabTestStyles } from './Tab.cy.styles';

const tab = (id: string) => `[data-testid="tab-${id}"]`;
const content = `.${tabClassNames.content}`;
const icon = `.${tabClassNames.icon}`;
const reserved = `.${tabReservedSpaceClassNames.content}`;
const tabs = '[role="tab"]';

function glyph() {
  return (
    <span aria-hidden="true">
      <span className="fui-Icon-regular">R</span>
      <span className="fui-Icon-filled">F</span>
    </span>
  );
}

function choices(disabled?: string) {
  return ['a', 'b', 'c'].map(id => (
    <Tab key={id} value={id} data-testid={`tab-${id}`} disabled={disabled === id}>
      {id.toUpperCase()}
    </Tab>
  ));
}

function render(props: TabListProps = {}, dir: 'ltr' | 'rtl' = 'ltr') {
  return mount(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      <button data-testid="before">Before</button>
      <TabList aria-label="Sections" {...props}>
        {props.children ?? choices()}
      </TabList>
      <button data-testid="after">After</button>
    </FluentProvider>,
  );
}

function selected(id?: string) {
  cy.get(tabs)
    .filter('[aria-selected="true"]')
    .should('have.length', id === undefined ? 0 : 1);
  if (id !== undefined) {
    cy.get(tab(id)).should('have.attr', 'aria-selected', 'true');
  }
}

function exactRequest(alias: string, index: number, value: TabValue, type = 'click', id = 'b') {
  cy.get(alias)
    .its(`args.${index}`)
    .should(args => {
      expect(args).to.have.length(2);
      expect(args[0].type).to.equal(type);
      expect(args[0].target.closest('[role="tab"]').getAttribute('data-testid')).to.equal(`tab-${id}`);
      expect(Object.keys(args[1])).to.deep.equal(['value']);
      expect(args[1].value).to.equal(value);
    });
}

describe('Tab documented scenarios', () => {
  for (const size of ['small', 'medium', 'large'] as const) {
    for (const appearance of ['transparent', 'subtle', 'subtle-circular', 'filled-circular'] as const) {
      for (const vertical of [false, true]) {
        for (const kind of ['text', 'icon-text', 'icon-only'] as const) {
          it(`renders and selects ${size}/${appearance}/${vertical ? 'vertical' : 'horizontal'}/${kind}`, () => {
            const onTabSelect = cy.stub().as('select');
            render({
              size,
              appearance,
              vertical,
              defaultSelectedValue: 'a',
              onTabSelect,
              children: ['a', 'b', 'c'].map(id => (
                <Tab
                  key={id}
                  value={id}
                  data-testid={`tab-${id}`}
                  disabled={id === 'c'}
                  icon={kind === 'text' ? undefined : glyph()}
                  aria-label={kind === 'icon-only' ? id.toUpperCase() : undefined}
                >
                  {kind === 'icon-only' ? undefined : id.toUpperCase()}
                </Tab>
              )),
            });
            selected('a');
            cy.get(tab('a')).should('have.prop', 'tagName', 'BUTTON').and('have.attr', 'type', 'button');
            cy.get(tab('c')).should('be.disabled').and('not.have.attr', 'aria-selected');
            cy.get(tab('c')).should('have.css', 'cursor', 'not-allowed');
            cy.get(tabs).should($tabs => {
              const first = $tabs[0].getBoundingClientRect();
              const second = $tabs[1].getBoundingClientRect();
              expect(first.width).to.be.greaterThan(0);
              expect(first.height).to.be.greaterThan(0);
              if (vertical) {
                expect(second.top).to.be.at.least(first.bottom);
              } else {
                expect(second.left).to.be.at.least(first.right);
              }
              expect(getByRole($tabs[0].parentElement!, 'tab', { name: 'A' })).to.equal($tabs[0]);
            });
            if (kind === 'icon-only') {
              cy.get(tab('b')).find(content).should('not.exist');
              cy.get(tab('b')).find(reserved).should('not.exist');
            } else {
              cy.get(tab('a')).find(content).should('have.css', 'font-weight', '600');
              cy.get(tab('b')).find(content).should('have.css', 'font-weight', '400');
              cy.get(tab('b'))
                .find(content)
                .should('have.css', 'font-size', size === 'large' ? '16px' : '14px');
            }
            if (kind !== 'text') {
              cy.get(tab('a'))
                .find(icon)
                .should('have.css', 'width', size === 'large' ? '24px' : '20px');
              cy.get(tab('a')).find('.fui-Icon-filled').should('be.visible');
              cy.get(tab('b')).find('.fui-Icon-regular').should('be.visible');
              if (kind === 'icon-text') {
                cy.get(tab('b')).should($tab => {
                  const iconRect = $tab.find(icon)[0].getBoundingClientRect();
                  const contentRect = $tab.find(content)[0].getBoundingClientRect();
                  expect(iconRect.right).to.be.at.most(contentRect.left);
                });
              }
            }
            const circular = appearance.endsWith('circular');
            cy.get(tab('a')).should('have.css', 'border-radius', circular ? '10000px' : '4px');
            cy.get(tab('a')).should($tab => {
              const after = $tab[0].ownerDocument.defaultView!.getComputedStyle($tab[0], '::after');
              expect(after.content).to.equal(circular ? 'none' : '""');
              if (!circular) {
                expect(vertical ? after.width : after.height).to.equal(!vertical && size === 'small' ? '2px' : '3px');
              }
            });
            cy.get(tab('b')).realClick();
            selected('b');
            cy.get('@select').should('have.been.calledOnce');
            exactRequest('@select', 0, 'b');
            if (kind !== 'text') {
              cy.get(tab('b')).find('.fui-Icon-filled').should('be.visible');
              cy.get(tab('a')).find('.fui-Icon-regular').should('be.visible');
            }
          });
        }
      }
    }
  }

  it('does not own selection outside a TabList context', () => {
    const onClick = cy.stub().as('click');
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Tab value="standalone" onClick={onClick}>
          Standalone
        </Tab>
      </FluentProvider>,
    );
    cy.get(tabs).should('have.attr', 'aria-selected', 'false').realClick();
    cy.get(tabs).should('have.attr', 'aria-selected', 'false');
    cy.get('@click').should('have.been.calledOnce');
    cy.get('[role="tabpanel"]').should('not.exist');
  });

  it('starts unselected and reports repeated pointer selection exactly', () => {
    render({ onTabSelect: cy.stub().as('select') });
    selected();
    cy.get(tab('b')).realClick().realClick();
    selected('b');
    cy.get('@select').should('have.been.calledTwice');
    exactRequest('@select', 0, 'b');
    exactRequest('@select', 1, 'b');
  });

  for (const accept of [false, true]) {
    it(`requests controlled selection with consumer ${accept ? 'acceptance' : 'refusal'}`, () => {
      const onTabSelect = cy.stub().as('select');
      const Controlled = () => {
        const [value, setValue] = React.useState<TabValue>('a');
        return (
          <TabList
            selectedValue={value}
            onTabSelect={(event, data) => {
              onTabSelect(event, data);
              if (accept) {
                setValue(data.value);
              }
            }}
          >
            {choices()}
          </TabList>
        );
      };
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <Controlled />
        </FluentProvider>,
      );
      cy.get(tab('b')).realClick();
      selected(accept ? 'b' : 'a');
      cy.get('@select').should('have.been.calledOnce');
      exactRequest('@select', 0, 'b');
    });
  }

  it('composes consumer-owned reciprocal tab and panel relationships', () => {
    const Panels = () => {
      const [value, setValue] = React.useState<TabValue>('a');
      return (
        <>
          <TabList selectedValue={value} onTabSelect={(_, data) => setValue(data.value)}>
            {['a', 'b'].map(id => (
              <Tab key={id} id={`label-${id}`} aria-controls={`panel-${id}`} value={id} data-testid={`tab-${id}`}>
                {id.toUpperCase()}
              </Tab>
            ))}
          </TabList>
          {['a', 'b'].map(id => (
            <section key={id} role="tabpanel" id={`panel-${id}`} aria-labelledby={`label-${id}`} hidden={value !== id}>
              {id} panel
            </section>
          ))}
        </>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Panels />
      </FluentProvider>,
    );
    cy.get('#panel-a').should('be.visible').and('have.attr', 'aria-labelledby', 'label-a');
    cy.get(tab('b')).should('have.attr', 'aria-controls', 'panel-b').realClick();
    selected('b');
    cy.get('#panel-a').should('not.be.visible');
    cy.get('#panel-b')
      .should('be.visible')
      .then($panel => {
        expect(getByRole($panel[0].parentElement!, 'tabpanel', { name: 'B' })).to.equal($panel[0]);
      });
  });

  it('list disabling cannot be overridden by disabled false on a Tab', () => {
    render({
      disabled: true,
      defaultSelectedValue: 'a',
      onTabSelect: cy.stub().as('select'),
      children: (
        <Tab value="a" data-testid="tab-a" disabled={false}>
          A
        </Tab>
      ),
    });
    cy.get(tab('a')).should('be.disabled').and('not.have.attr', 'aria-selected');
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.get('@select').should('not.have.been.called');
  });

  for (const reserveSelectedTabSpace of [true, false]) {
    it(`reserves bold text width only when requested (${reserveSelectedTabSpace})`, () => {
      render({
        reserveSelectedTabSpace,
        defaultSelectedValue: 'a',
        children: (
          <>
            <Tab value="a" data-testid="tab-a">
              A
            </Tab>
            <Tab value="b" data-testid="tab-b">
              MMMMMMMMMMMMMMMMMMMMMMMM
            </Tab>
          </>
        ),
      });
      cy.get(tab('a')).find(reserved).should('not.exist');
      if (reserveSelectedTabSpace) {
        cy.get(tab('b'))
          .find(reserved)
          .should('have.css', 'visibility', 'hidden')
          .and('have.css', 'font-weight', '600');
      } else {
        cy.get(tab('b')).find(reserved).should('not.exist');
      }
      cy.get(tab('b')).then($tab => {
        const before = $tab[0].getBoundingClientRect().width;
        cy.get(tab('b')).realClick();
        cy.get(tab('b')).should($selected => {
          const after = $selected[0].getBoundingClientRect().width;
          if (reserveSelectedTabSpace) {
            expect(Math.abs(after - before)).to.be.lessThan(0.5);
          } else {
            expect(after).to.be.greaterThan(before);
          }
        });
      });
      cy.get(tab('b')).find(reserved).should('not.exist');
    });
  }

  it('uses medium transparent horizontal defaults with icon before text', () => {
    render({
      children: (
        <Tab value="b" data-testid="tab-b" icon={glyph()}>
          B
        </Tab>
      ),
    });
    cy.get(tab('b')).should('have.css', 'padding', '12px 10px');
    cy.get(tab('b')).find(icon).should('have.css', 'grid-column-start', '1');
    cy.get(tab('b')).find(content).should('have.css', 'grid-column-start', '2');
    cy.get(tab('b')).find(reserved).should('have.css', 'grid-column-start', '2');
  });

  for (const appearance of ['transparent', 'subtle', 'subtle-circular', 'filled-circular'] as const) {
    it(`applies hover and pressed appearance tokens (${appearance})`, () => {
      render({ appearance, defaultSelectedValue: 'a' });
      cy.get(tab('b')).realHover();
      cy.get(tab('b')).should($tab => {
        const style = $tab[0].ownerDocument.defaultView!.getComputedStyle($tab[0]);
        const expected =
          appearance === 'filled-circular'
            ? teamsLightTheme.colorNeutralBackground3Hover
            : appearance === 'transparent'
            ? teamsLightTheme.colorTransparentBackgroundHover
            : teamsLightTheme.colorSubtleBackgroundHover;
        expect(style.backgroundColor).to.equal(cssColor(expected));
      });
      cy.get(tab('b')).realMouseDown();
      cy.get(tab('b')).should($tab => {
        const style = $tab[0].ownerDocument.defaultView!.getComputedStyle($tab[0]);
        const expected =
          appearance === 'filled-circular'
            ? teamsLightTheme.colorNeutralBackground3Pressed
            : appearance === 'transparent'
            ? teamsLightTheme.colorTransparentBackgroundPressed
            : teamsLightTheme.colorSubtleBackgroundPressed;
        expect(style.backgroundColor).to.equal(cssColor(expected));
      });
      cy.get(tab('b')).realMouseUp();
      selected('b');
    });
  }
});

function rgb(hex: string) {
  return `rgb(${[1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
}

function cssColor(color: string) {
  return color === 'transparent' ? 'rgba(0, 0, 0, 0)' : color.startsWith('#') ? rgb(color) : color;
}

describe('Tab edges and accessibility', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const vertical of [false, true]) {
      for (const automatic of [false, true]) {
        it(`moves real focus and wraps with disabled skipping ${dir}/${vertical ? 'vertical' : 'horizontal'}/${
          automatic ? 'automatic' : 'manual'
        }`, () => {
          render(
            {
              vertical,
              selectTabOnFocus: automatic,
              defaultSelectedValue: 'a',
              onTabSelect: cy.stub().as('select'),
              children: choices('b'),
            },
            dir,
          );
          const next = vertical ? 'ArrowDown' : dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
          const previous = vertical ? 'ArrowUp' : dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
          cy.get('[data-testid="before"]').focus();
          cy.realPress('Tab');
          cy.get(tab('a')).should('be.focused');
          cy.realPress(next);
          cy.get(tab('c')).should('be.focused');
          selected(automatic ? 'c' : 'a');
          cy.realPress(next);
          cy.get(tab('a')).should('be.focused');
          cy.realPress(previous);
          cy.get(tab('c')).should('be.focused');
          cy.realPress('Home');
          cy.get(tab('a')).should('be.focused');
          cy.realPress('End');
          cy.get(tab('c')).should('be.focused');
          cy.realPress(vertical ? 'ArrowRight' : 'ArrowDown');
          cy.get(tab('c')).should('be.focused');
          if (automatic) {
            cy.get('@select').should('have.callCount', 6);
            exactRequest('@select', 5, 'c', 'focus', 'c');
          } else {
            cy.get('@select').should('not.have.been.called');
          }
          selected(automatic ? 'c' : 'a');
          cy.realPress('Tab');
          cy.get('[data-testid="after"]').should('be.focused');
          cy.realPress(['Shift', 'Tab']);
          cy.get(tab(automatic ? 'c' : 'a')).should('be.focused');
          cy.realPress(['Shift', 'Tab']);
          cy.get('[data-testid="before"]').should('be.focused');
        });
      }
    }
  }

  for (const key of ['Enter', 'Space'] as const) {
    it(`selects once by real ${key} with a click event and the exact value`, () => {
      render({ defaultSelectedValue: 'a', onTabSelect: cy.stub().as('select') });
      cy.get(tab('b')).focus();
      selected('a');
      cy.realPress(key);
      selected('b');
      cy.get('@select').should('have.been.calledOnce');
      exactRequest('@select', 0, 'b');
    });
  }

  it('automatic pointer selection reports both focus and click rather than deduplicating', () => {
    render({ defaultSelectedValue: 'a', selectTabOnFocus: true, onTabSelect: cy.stub().as('select') });
    cy.get('[data-testid="before"]').focus();
    cy.get(tab('b')).realClick();
    selected('b');
    cy.get('@select').should('have.been.calledTwice');
    exactRequest('@select', 0, 'b', 'focus');
    exactRequest('@select', 1, 'b');
  });

  it('controlled automatic requests do not assign selection ownership to Tab', () => {
    render({ selectedValue: 'a', selectTabOnFocus: true, onTabSelect: cy.stub().as('select') });
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.realPress('ArrowRight');
    cy.get(tab('b')).should('be.focused');
    selected('a');
    cy.realPress('Enter');
    selected('a');
    cy.get('@select').should('have.callCount', 3);
    exactRequest('@select', 1, 'b', 'focus');
    exactRequest('@select', 2, 'b');
  });

  it('disabled tabs reject real pointer activation and disabled selected tabs are not keyboard defaults', () => {
    render({ defaultSelectedValue: 'a', onTabSelect: cy.stub().as('select'), children: choices('a') });
    cy.get(tab('a')).realClick();
    cy.get(tab('a')).should('not.be.focused').and('not.have.attr', 'aria-selected');
    cy.get('@select').should('not.have.been.called');
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get(tab('b')).should('be.focused');
    cy.realPress('Space');
    selected('b');
    exactRequest('@select', 0, 'b');
  });

  it('preserves accessible label and description precedence without implicit panels', () => {
    render({
      children: (
        <>
          <span id="external-label">External name</span>
          <span id="help">More information</span>
          <Tab
            value="a"
            data-testid="tab-a"
            aria-labelledby="external-label"
            aria-label="Fallback"
            aria-describedby="help"
            icon={glyph()}
          >
            Visible label
          </Tab>
          <Tab value="b" data-testid="tab-b" aria-label="Calendar" icon={glyph()} />
        </>
      ),
    });
    cy.get(tab('a')).then($tab => {
      expect(
        getByRole($tab[0].parentElement!, 'tab', {
          name: 'External name',
          description: 'More information',
        }),
      ).to.equal($tab[0]);
    });
    cy.get(tab('b')).then($tab => {
      expect(getByRole($tab[0].parentElement!, 'tab', { name: 'Calendar' })).to.equal($tab[0]);
    });
    cy.get(tabs).should('not.have.attr', 'aria-controls');
    cy.get('[role="tabpanel"]').should('not.exist');
  });

  it('places icons before text in RTL without changing DOM order', () => {
    render(
      {
        children: (
          <Tab value="a" data-testid="tab-a" icon={glyph()}>
            A
          </Tab>
        ),
      },
      'rtl',
    );
    cy.get(tab('a')).should($tab => {
      expect($tab[0].firstElementChild!.classList.contains(tabClassNames.icon)).to.equal(true);
      expect($tab.find(icon)[0].getBoundingClientRect().left).to.be.at.least(
        $tab.find(content)[0].getBoundingClientRect().right,
      );
    });
  });

  for (const [name, value] of [
    ['zero', 0],
    ['false', false],
    ['empty', ''],
    ['null', null],
  ] as const) {
    for (const controlled of [false, true]) {
      it(`preserves ${name} strict value identity in ${controlled ? 'controlled' : 'default'} integration`, () => {
        const first = cy.stub().as('first');
        const latest = cy.stub().as('latest');
        const Values = () => {
          const [revision, setRevision] = React.useState(false);
          const [external, setExternal] = React.useState<TabValue>(value);
          const selection = controlled ? { selectedValue: external } : { defaultSelectedValue: value };
          return (
            <>
              <button
                data-testid="update"
                onClick={() => {
                  setRevision(true);
                  setExternal('other');
                }}
              >
                Update
              </button>
              <button data-testid="restore" onClick={() => setExternal(value)}>
                Restore
              </button>
              <TabList {...selection} onTabSelect={revision ? latest : first}>
                <Tab value={value} data-testid="tab-a">
                  Falsy
                </Tab>
                <Tab value="other" data-testid="tab-b">
                  Other
                </Tab>
              </TabList>
            </>
          );
        };
        mount(
          <FluentProvider theme={teamsLightTheme}>
            <Values />
          </FluentProvider>,
        );
        selected('a');
        cy.get(tab('b')).realClick();
        selected(controlled ? 'a' : 'b');
        exactRequest('@first', 0, 'other');
        cy.get('[data-testid="update"]').realClick();
        selected('b');
        cy.get('[data-testid="restore"]').realClick();
        selected(controlled ? 'a' : 'b');
        cy.get(tab('a')).realClick();
        selected('a');
        exactRequest('@latest', 0, value, 'click', 'a');
        cy.get('@first').should('have.been.calledOnce');
        cy.get('@latest').should('have.been.calledOnce');
      });
    }
  }

  for (const [name, value] of [
    ['object', { id: 'a' }],
    ['array', ['a']],
  ] as const) {
    it(`compares stable ${name} values by identity rather than JSON equality`, () => {
      const equalButDistinct = name === 'object' ? { id: 'a' } : ['a'];
      const onTabSelect = cy.stub().as('select');
      const Identity = () => {
        const [selectedValue, setSelectedValue] = React.useState<TabValue>(equalButDistinct);
        return (
          <>
            <button data-testid="accept" onClick={() => setSelectedValue(value)}>
              Accept exact object
            </button>
            <TabList selectedValue={selectedValue} onTabSelect={onTabSelect}>
              <Tab value={value} data-testid="tab-a">
                A
              </Tab>
              <Tab value="other" data-testid="tab-b">
                B
              </Tab>
            </TabList>
          </>
        );
      };
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <Identity />
        </FluentProvider>,
      );
      selected();
      cy.get(tab('a')).realClick();
      selected();
      exactRequest('@select', 0, value, 'click', 'a');
      cy.get('[data-testid="accept"]').realClick();
      selected('a');
      cy.get('@select').should('have.been.calledOnce');
    });
  }

  it('distinguishes number and string identifiers', () => {
    render({
      defaultSelectedValue: 1,
      onTabSelect: cy.stub().as('select'),
      children: (
        <>
          <Tab value={1} data-testid="tab-a">
            Number
          </Tab>
          <Tab value="1" data-testid="tab-b">
            String
          </Tab>
        </>
      ),
    });
    selected('a');
    cy.get(tab('b')).realClick();
    selected('b');
    exactRequest('@select', 0, '1');
  });

  it('registers new values, follows DOM reorder, unregisters removed refs and restores selection', () => {
    let inspect: TabListContextValue['getRegisteredTabs'];
    const Registry = () => {
      const getter = useTabListContext_unstable(ctx => ctx.getRegisteredTabs);
      React.useEffect(() => {
        inspect = getter;
      }, [getter]);
      return null;
    };
    const Dynamic = () => {
      const [order, setOrder] = React.useState(['a', 'b', 'c']);
      const [value, setValue] = React.useState('b');
      return (
        <>
          <button data-testid="reorder" onClick={() => setOrder(['c', 'b', 'a'])}>
            Reorder
          </button>
          <button data-testid="rename" onClick={() => setValue('new')}>
            Rename
          </button>
          <button data-testid="remove" onClick={() => setOrder(['c', 'a'])}>
            Remove
          </button>
          <button
            data-testid="restore"
            onClick={() => {
              setOrder(['c', 'b', 'a']);
              setValue('b');
            }}
          >
            Restore
          </button>
          <TabList defaultSelectedValue="b">
            {order.map(id => (
              <Tab key={id} value={id === 'b' ? value : id} data-testid={`tab-${id}`}>
                {id.toUpperCase()}
              </Tab>
            ))}
            <Registry />
          </TabList>
        </>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Dynamic />
      </FluentProvider>,
    );
    cy.get('[role="tablist"]').should(() => expect(inspect).to.be.a('function'));
    cy.then(() => {
      const registry = inspect().registeredTabs;
      expect(Object.keys(registry).sort()).to.deep.equal(['"a"', '"b"', '"c"']);
      expect(registry['"b"'].ref.current).to.equal(Cypress.$(tab('b'))[0]);
    });
    cy.get('[data-testid="reorder"]').realClick();
    cy.get(tabs).should($tabs =>
      expect($tabs.toArray().map(element => element.textContent)).to.deep.equal(['CC', 'B', 'AA']),
    );
    cy.get(tab('c')).focus();
    cy.realPress('ArrowRight');
    cy.get(tab('b')).should('be.focused');
    selected('b');
    cy.get('[data-testid="rename"]').realClick();
    selected();
    cy.then(() => {
      expect(inspect().registeredTabs).not.to.have.property('"b"');
      expect(inspect().registeredTabs['"new"'].ref.current).to.equal(Cypress.$(tab('b'))[0]);
    });
    cy.get(tab('b')).realClick();
    selected('b');
    cy.get('[data-testid="remove"]').realClick();
    selected();
    cy.then(() => expect(inspect().registeredTabs).not.to.have.property('"new"'));
    cy.get('[data-testid="restore"]').realClick();
    selected();
    cy.get(tab('b')).realClick();
    selected('b');
    cy.then(() => expect(inspect().registeredTabs['"b"'].ref.current).to.equal(Cypress.$(tab('b'))[0]));
  });

  it('isolates identical values in nested contexts and prevents cross-list selection', () => {
    render({
      defaultSelectedValue: 'a',
      onTabSelect: cy.stub().as('outer'),
      children: (
        <>
          <Tab value="a" data-testid="tab-a">
            Outer A
          </Tab>
          <Tab value="b" data-testid="tab-b">
            Outer B
          </Tab>
          <TabList
            defaultSelectedValue="a"
            size="large"
            appearance="filled-circular"
            onTabSelect={cy.stub().as('inner')}
          >
            <Tab value="a" data-testid="inner-a">
              Inner A
            </Tab>
            <Tab value="b" data-testid="inner-b">
              Inner B
            </Tab>
          </TabList>
        </>
      ),
    });
    cy.get('[data-testid="inner-b"]').realClick().should('have.attr', 'aria-selected', 'true');
    cy.get(tab('a')).should('have.attr', 'aria-selected', 'true');
    cy.get('@outer').should('not.have.been.called');
    cy.get('@inner').should('have.been.calledOnce');
    cy.get('[data-testid="inner-b"]').find(content).should('have.css', 'font-size', '16px');
    cy.get(tab('b')).find(content).should('have.css', 'font-size', '14px');
    cy.get(tab('b')).realClick();
    cy.get('@outer').should('have.been.calledOnce');
    cy.get('@inner').should('have.been.calledOnce');
  });

  it('updates size appearance orientation disabled and automatic context without remounting Tab', () => {
    const ChangeContext = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button data-testid="change" onClick={() => setChanged(value => !value)}>
            Change
          </button>
          <TabList
            size={changed ? 'large' : 'small'}
            appearance={changed ? 'filled-circular' : 'transparent'}
            vertical={changed}
            disabled={changed}
            selectTabOnFocus={changed}
            defaultSelectedValue="a"
          >
            {choices()}
          </TabList>
        </>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <ChangeContext />
      </FluentProvider>,
    );
    let original: HTMLElement;
    cy.get(tab('a')).then($tab => {
      original = $tab[0];
    });
    cy.get('[data-testid="change"]').realClick();
    cy.get(tab('a'))
      .should($tab => expect($tab[0]).to.equal(original))
      .and('be.disabled')
      .and('not.have.attr', 'aria-selected');
    cy.get(tab('a')).should('have.css', 'border-radius', '10000px');
    cy.get(tab('a')).find(content).should('have.css', 'font-size', '16px');
    cy.get('[role="tablist"]').should('have.attr', 'aria-orientation', 'vertical');
    cy.get('[data-testid="change"]').realClick();
    cy.get(tab('a')).should('not.be.disabled').and('have.attr', 'aria-selected', 'true');
    cy.get(tab('b')).focus();
    cy.get(tab('a')).should('have.attr', 'aria-selected', 'true');
  });

  for (const [name, theme] of [
    ['light', teamsLightTheme],
    ['dark', teamsDarkTheme],
  ] as const) {
    it(`resolves selected disabled and circular tokens in ${name} theme`, () => {
      mount(
        <FluentProvider theme={theme}>
          <TabList appearance="filled-circular" defaultSelectedValue="a">
            <Tab value="a" data-testid="tab-a" icon={glyph()}>
              A
            </Tab>
            <Tab value="b" data-testid="tab-b" disabled>
              B
            </Tab>
          </TabList>
        </FluentProvider>,
      );
      cy.get(tab('b')).realHover();
      cy.get(tab('a')).should('have.css', 'background-color', rgb(theme.colorBrandBackground));
      cy.get(tab('a')).find(content).should('have.css', 'color', rgb(theme.colorNeutralForegroundOnBrand));
      cy.get(tab('b')).should('have.css', 'background-color', rgb(theme.colorNeutralBackgroundDisabled));
      cy.get(tab('b')).find(content).should('have.css', 'color', rgb(theme.colorNeutralForegroundDisabled));
    });
  }
});

describe('Tab unit and source-derived regressions', () => {
  it('updates reserved-space context without remounting a Tab or changing selection', () => {
    const onTabSelect = cy.stub().as('select');
    const Reserve = () => {
      const [reserve, setReserve] = React.useState(true);
      return (
        <>
          <button data-testid="reserve" onClick={() => setReserve(value => !value)}>
            Reserve
          </button>
          <TabList reserveSelectedTabSpace={reserve} defaultSelectedValue="a" onTabSelect={onTabSelect}>
            <Tab value="a" data-testid="tab-a">
              A
            </Tab>
            <Tab value="b" data-testid="tab-b">
              Long label
            </Tab>
          </TabList>
        </>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Reserve />
      </FluentProvider>,
    );
    let original: HTMLElement;
    cy.get(tab('b')).then($tab => {
      original = $tab[0];
    });
    cy.get(tab('b')).find(reserved).should('exist');
    cy.get('[data-testid="reserve"]').realClick();
    cy.get(tab('b')).find(reserved).should('not.exist');
    selected('a');
    cy.get('[data-testid="reserve"]').realClick();
    cy.get(tab('b')).find(reserved).should('exist');
    cy.get(tab('b')).should($tab => expect($tab[0]).to.equal(original));
    cy.get('@select').should('not.have.been.called');
  });

  it('characterizes undefined registration diagnostics and exact uncontrolled payload without promising serializability', () => {
    cy.window().then(view => cy.spy(view.console, 'error').as('diagnostic'));
    render({
      defaultSelectedValue: 'a',
      onTabSelect: cy.stub().as('select'),
      children: (
        <>
          <Tab value="a" data-testid="tab-a">
            A
          </Tab>
          <Tab value={undefined} data-testid="tab-b">
            Undefined
          </Tab>
        </>
      ),
    });
    selected('a');
    cy.get('@diagnostic')
      .its('args')
      .should(args => {
        expect(
          args.some(
            (call: unknown[]) =>
              typeof call[0] === 'string' && call[0].includes('Tab component requires serializable values'),
          ),
        ).to.equal(true);
      });
    cy.get(tab('b')).realClick();
    selected('b');
    exactRequest('@select', 0, undefined);
  });

  it('disables indicator transition under browser-emulated reduced motion', () => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
      }),
    );
    render({ defaultSelectedValue: 'a' });
    cy.get(tab('a')).should($tab => {
      const view = $tab[0].ownerDocument.defaultView!;
      expect(view.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(true);
      const after = view.getComputedStyle($tab[0], '::after');
      expect(after.transitionProperty).to.equal('none');
      expect(parseFloat(after.transitionDuration)).to.be.lessThan(0.001);
    });
    cy.get(tab('b')).realClick();
    selected('b');
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
  });

  it('uses latest icon and content event handlers after rerender without stale selection payloads', () => {
    const firstIcon = cy.stub().as('firstIcon');
    const firstContent = cy.stub().as('firstContent');
    const latestIcon = cy.stub().as('latestIcon');
    const latestContent = cy.stub().as('latestContent');
    const select = cy.stub().as('select');
    const Slots = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button data-testid="change" onClick={() => setChanged(true)}>
            Change handlers
          </button>
          <TabList onTabSelect={select}>
            <Tab
              value={changed ? 'new' : 'old'}
              data-testid="tab-b"
              icon={{ children: glyph(), onClick: changed ? latestIcon : firstIcon }}
              content={{ onClick: changed ? latestContent : firstContent }}
            >
              B
            </Tab>
          </TabList>
        </>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Slots />
      </FluentProvider>,
    );
    cy.get(tab('b')).find(icon).realClick();
    cy.get(tab('b')).find(content).realClick();
    exactRequest('@select', 0, 'old');
    exactRequest('@select', 1, 'old');
    cy.get('[data-testid="change"]').realClick();
    cy.get(tab('b')).find(icon).realClick();
    cy.get(tab('b')).find(content).realClick();
    exactRequest('@select', 2, 'new');
    exactRequest('@select', 3, 'new');
    for (const alias of ['@firstIcon', '@firstContent', '@latestIcon', '@latestContent']) {
      cy.get(alias).should('have.been.calledOnce');
    }
  });

  it('nested automatic keyboard focus remains within the inner enabled context when the outer list is disabled', () => {
    render({
      disabled: true,
      defaultSelectedValue: 'a',
      onTabSelect: cy.stub().as('outer'),
      children: (
        <>
          <Tab value="a" data-testid="tab-a">
            Outer A
          </Tab>
          <TabList defaultSelectedValue="a" selectTabOnFocus onTabSelect={cy.stub().as('inner')}>
            <Tab value="a" data-testid="inner-a">
              Inner A
            </Tab>
            <Tab value="b" data-testid="inner-b">
              Inner B
            </Tab>
          </TabList>
        </>
      ),
    });
    cy.get(tab('a')).should('be.disabled');
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get('[data-testid="inner-a"]').should('not.be.disabled').and('be.focused');
    cy.get('@inner').should('have.been.calledOnce');
    cy.realPress('ArrowRight');
    cy.get('[data-testid="inner-b"]').should('be.focused').and('have.attr', 'aria-selected', 'true');
    cy.realPress('ArrowRight');
    cy.get('[data-testid="inner-a"]').should('be.focused');
    cy.get('@outer').should('not.have.been.called');
    cy.get('@inner').should('have.callCount', 3);
  });

  for (const appearance of ['transparent', 'subtle-circular'] as const) {
    it(`shows a real keyboard focus indicator separate from selection (${appearance})`, () => {
      render({ appearance, defaultSelectedValue: 'a' });
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.realPress('ArrowRight');
      cy.get(tab('b')).should('be.focused').and('have.attr', 'aria-selected', 'false');
      cy.get(tab('b')).should($tab => {
        const style = $tab[0].ownerDocument.defaultView!.getComputedStyle($tab[0]);
        expect(style.boxShadow).not.to.equal('none');
        expect(style.outlineStyle).to.equal('solid');
      });
      selected('a');
    });
  }

  for (const vertical of [false, true]) {
    it(`reserves selected content in the same grid cell with icon (${vertical ? 'vertical' : 'horizontal'})`, () => {
      render({
        vertical,
        defaultSelectedValue: 'a',
        children: (
          <>
            <Tab value="a" data-testid="tab-a">
              A
            </Tab>
            <Tab value="b" data-testid="tab-b" icon={glyph()}>
              MMMMMMMMMMMM
            </Tab>
          </>
        ),
      });
      cy.get(tab('b')).should($tab => {
        const actual = $tab.find(content)[0].getBoundingClientRect();
        const hidden = $tab.find(reserved)[0].getBoundingClientRect();
        expect(actual.left).to.equal(hidden.left);
        expect(actual.top).to.equal(hidden.top);
        expect(actual.width).to.equal(hidden.width);
      });
      cy.get(tab('b')).then($tab => {
        const before = $tab[0].getBoundingClientRect().width;
        cy.get(tab('b')).realClick();
        cy.get(tab('b')).should($selected =>
          expect(Math.abs($selected[0].getBoundingClientRect().width - before)).to.be.lessThan(0.5),
        );
      });
    });
  }

  it('forwards root native props without leaking slot props or submitting its form by default', () => {
    const submit = cy.stub().as('submit');
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <form
          onSubmit={event => {
            event.preventDefault();
            submit();
          }}
        >
          <TabList>
            <Tab
              value="a"
              data-testid="tab-a"
              id="native-id"
              name="section"
              title="Native title"
              lang="fr"
              className="consumer-root"
              style={{ marginTop: teamsLightTheme.spacingVerticalS }}
              aria-describedby="native-help"
              content={{ title: 'Content title' }}
              icon={glyph()}
            >
              A
            </Tab>
          </TabList>
          <span id="native-help">Help</span>
          <button data-testid="submit" type="submit">
            Submit
          </button>
        </form>
      </FluentProvider>,
    );
    cy.get(tab('a'))
      .should('have.attr', 'id', 'native-id')
      .and('have.attr', 'name', 'section')
      .and('have.attr', 'title', 'Native title')
      .and('have.attr', 'lang', 'fr')
      .and('have.class', 'consumer-root')
      .and('have.class', tabClassNames.root);
    cy.get(tab('a')).should('have.css', 'margin-top', teamsLightTheme.spacingVerticalS);
    cy.get(tab('a')).should('not.have.attr', 'content');
    cy.get(tab('a')).should('not.have.attr', 'icon');
    cy.get(tab('a')).find(content).should('have.attr', 'title', 'Content title');
    cy.get(tab('a')).realClick();
    cy.realPress('Enter');
    cy.get('@submit').should('not.have.been.called');
    cy.get('[data-testid="submit"]').realClick();
    cy.get('@submit').should('have.been.calledOnce');
  });

  it('supports an explicit native submit type without changing the button root', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <form
          onSubmit={event => {
            event.preventDefault();
          }}
        >
          <TabList onTabSelect={cy.stub().as('select')}>
            <Tab value="a" type="submit" data-testid="tab-a">
              Submit choice
            </Tab>
          </TabList>
        </form>
      </FluentProvider>,
    );
    cy.get(tab('a')).should('have.attr', 'type', 'submit').and('have.prop', 'tagName', 'BUTTON').realClick();
    selected('a');
    exactRequest('@select', 0, 'a', 'click', 'a');
  });

  it('composes forwarded root and slot refs while reserving space without duplicating the content ref', () => {
    const rootRef = React.createRef<HTMLButtonElement>();
    const iconRef = React.createRef<HTMLSpanElement>();
    const contentRef = React.createRef<HTMLSpanElement>();
    const rootCallback = cy.stub().as('rootRef');
    const iconCallback = cy.stub().as('iconRef');
    const contentCallback = cy.stub().as('contentRef');
    const Refs = () => {
      const [shown, setShown] = React.useState(true);
      const root = useMergedRefs(rootRef, rootCallback);
      const iconSlotRef = useMergedRefs(iconRef, iconCallback);
      const contentSlotRef = useMergedRefs(contentRef, contentCallback);
      return (
        <>
          <button data-testid="remove" onClick={() => setShown(false)}>
            Remove
          </button>
          <TabList>
            {shown && (
              <Tab
                value="b"
                data-testid="tab-b"
                ref={root}
                icon={{ ref: iconSlotRef, children: glyph() }}
                content={{ ref: contentSlotRef }}
              >
                B
              </Tab>
            )}
          </TabList>
        </>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Refs />
      </FluentProvider>,
      { strict: false },
    );
    cy.get(tab('b')).should($tab => {
      expect(rootRef.current).to.equal($tab[0]);
      expect(iconRef.current).to.equal($tab.find(icon)[0]);
      expect(contentRef.current).to.equal($tab.find(content)[0]);
    });
    cy.get(tab('b')).find(reserved).should('have.length', 1);
    for (const alias of ['@rootRef', '@iconRef', '@contentRef']) {
      cy.get(alias)
        .its('args')
        .should(args => expect(args.filter((call: unknown[]) => call[0] !== null)).to.have.length(1));
    }
    cy.get('[data-testid="remove"]').realClick();
    cy.get(tab('b')).should('not.exist');
    cy.then(() => {
      expect(rootRef.current).to.equal(null);
      expect(iconRef.current).to.equal(null);
      expect(contentRef.current).to.equal(null);
    });
    for (const alias of ['@rootRef', '@iconRef', '@contentRef']) {
      cy.get(alias).its('lastCall.args').should('deep.equal', [null]);
    }
  });

  it('keeps static slot classes and gives consumer Griffel classes precedence over selected styling', () => {
    const Styled = () => {
      const styles = useTabTestStyles();
      return (
        <TabList defaultSelectedValue="a">
          <Tab
            value="a"
            data-testid="tab-a"
            className={styles.root}
            icon={{ className: styles.icon, children: glyph(), title: 'Icon title' }}
            content={{ className: styles.content, title: 'Content title' }}
          >
            A
          </Tab>
        </TabList>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Styled />
      </FluentProvider>,
    );
    cy.get(tab('a'))
      .should('have.class', tabClassNames.root)
      .and('have.css', 'border-radius', teamsLightTheme.borderRadiusXLarge);
    cy.get(tab('a')).find(icon).should('have.class', tabClassNames.icon).and('have.attr', 'title', 'Icon title');
    cy.get(tab('a')).find(icon).should('have.css', 'width', teamsLightTheme.spacingHorizontalXXXL);
    cy.get(tab('a'))
      .find(content)
      .should('have.class', tabClassNames.content)
      .and('have.attr', 'title', 'Content title');
    cy.get(tab('a')).find(content).should('have.css', 'font-size', teamsLightTheme.fontSizeBase500);
  });

  it('preserves inline root icon and content style overrides including indicator CSS variables', () => {
    const rootStyle: React.CSSProperties & { '--fui-Tab__indicator--offset': string } = {
      borderRadius: teamsLightTheme.borderRadiusXLarge,
      '--fui-Tab__indicator--offset': '7px',
    };
    render({
      defaultSelectedValue: 'a',
      children: (
        <Tab
          value="a"
          data-testid="tab-a"
          style={rootStyle}
          icon={{ children: glyph(), style: { width: '32px', color: teamsLightTheme.colorPaletteRedForeground1 } }}
          content={{
            style: {
              fontWeight: teamsLightTheme.fontWeightRegular,
              color: teamsLightTheme.colorPaletteGreenForeground1,
            },
          }}
        >
          A
        </Tab>
      ),
    });
    cy.get(tab('a')).should('have.css', 'border-radius', teamsLightTheme.borderRadiusXLarge);
    cy.get(tab('a')).should($tab =>
      expect($tab[0].style.getPropertyValue('--fui-Tab__indicator--offset')).to.equal('7px'),
    );
    cy.get(tab('a')).find(icon).should('have.css', 'width', '32px');
    cy.get(tab('a')).find(icon).should('have.css', 'color', rgb(teamsLightTheme.colorPaletteRedForeground1));
    cy.get(tab('a')).find(content).should('have.css', 'font-weight', String(teamsLightTheme.fontWeightRegular));
    cy.get(tab('a')).find(content).should('have.css', 'color', rgb(teamsLightTheme.colorPaletteGreenForeground1));
  });

  it('renders a customized root button with retained native semantics handlers and forwarded ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const rootRenderer: SlotRenderFunction<ExtractSlotProps<TabSlots['root']>> = (Component, props) =>
      React.createElement(Component, props, <strong>Custom root</strong>);
    render({
      onTabSelect: cy.stub().as('select'),
      children: (
        <Tab value="a" data-testid="tab-a" ref={ref} onClick={cy.stub().as('click')}>
          {rootRenderer}
        </Tab>
      ),
    });
    cy.get(tab('a'))
      .should('have.prop', 'tagName', 'BUTTON')
      .and('have.attr', 'role', 'tab')
      .and('have.attr', 'type', 'button')
      .and('contain.text', 'Custom root');
    cy.get(tab('a'))
      .should($tab => expect(ref.current).to.equal($tab[0]))
      .realClick();
    selected('a');
    cy.get('@click').should('have.been.calledOnce');
    exactRequest('@select', 0, 'a', 'click', 'a');
  });

  it('renders customized icon and content spans while preserving props refs and bubbling child clicks', () => {
    const ref = React.createRef<HTMLSpanElement>();
    const iconRenderer: SlotRenderFunction<ExtractSlotProps<TabSlots['icon']>> = (Component, props) =>
      React.createElement(Component, props, <span aria-hidden="true">Custom icon</span>);
    const contentRenderer: SlotRenderFunction<ExtractSlotProps<TabSlots['content']>> = (Component, props) =>
      React.createElement(Component, props, <strong data-testid="label-child">Custom label</strong>);
    render({
      onTabSelect: cy.stub().as('select'),
      children: (
        <Tab
          value="b"
          data-testid="tab-b"
          icon={{ title: 'icon props', children: iconRenderer }}
          content={{ ref, title: 'content props', children: contentRenderer }}
        />
      ),
    });
    cy.get(tab('b')).find(icon).should('have.prop', 'tagName', 'SPAN').and('have.attr', 'title', 'icon props');
    cy.get(tab('b'))
      .find(content)
      .should('have.prop', 'tagName', 'SPAN')
      .and('have.attr', 'title', 'content props')
      .and('contain.text', 'Custom label');
    cy.get(tab('b'))
      .find(content)
      .should($content => expect(ref.current).to.equal($content[0]));
    cy.get(tab('b')).find(content).find('[data-testid="label-child"]').realClick();
    selected('b');
    exactRequest('@select', 0, 'b');
  });

  it('supports null icon and explicit content children precedence over component children', () => {
    render({
      children: (
        <Tab value="a" data-testid="tab-a" icon={null} content={{ children: 'Slot label' }}>
          Component label
        </Tab>
      ),
    });
    cy.get(tab('a')).find(icon).should('not.exist');
    cy.get(tab('a')).find(content).should('have.text', 'Slot label').and('have.css', 'grid-column-start', '1');
    cy.get(tab('a')).then($tab =>
      expect(getByRole($tab[0].parentElement!, 'tab', { name: 'Slot label' })).to.equal($tab[0]),
    );
  });

  it('switches text icon-text and named icon-only without replacing the root', () => {
    const ContentChange = () => {
      const [mode, setMode] = React.useState(0);
      return (
        <>
          <button data-testid="change" onClick={() => setMode(value => value + 1)}>
            Change
          </button>
          <TabList>
            <Tab
              value="a"
              data-testid="tab-a"
              icon={mode > 0 ? glyph() : undefined}
              aria-label={mode === 2 ? 'Named icon' : undefined}
            >
              {mode === 2 ? undefined : 'A'}
            </Tab>
          </TabList>
        </>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <ContentChange />
      </FluentProvider>,
    );
    let original: HTMLElement;
    cy.get(tab('a')).then($tab => {
      original = $tab[0];
    });
    cy.get(tab('a')).find(icon).should('not.exist');
    cy.get('[data-testid="change"]').realClick();
    cy.get(tab('a')).find(icon).should('exist');
    cy.get(tab('a')).find(content).should('have.css', 'grid-column-start', '2');
    cy.get('[data-testid="change"]').realClick();
    cy.get(tab('a'))
      .should($tab => expect($tab[0]).to.equal(original))
      .and('have.attr', 'aria-label', 'Named icon');
    cy.get(tab('a')).find(content).should('not.exist');
    cy.get(tab('a')).find(reserved).should('not.exist');
  });

  it('characterizes inherited explicit-content reservation even when selected or reservation is false', () => {
    render({
      reserveSelectedTabSpace: false,
      defaultSelectedValue: 'a',
      children: (
        <Tab value="a" data-testid="tab-a" content={{ title: 'Explicit content' }}>
          A
        </Tab>
      ),
    });
    cy.get(tab('a')).find(content).should('have.text', 'A');
    cy.get(tab('a')).find(reserved).should('have.text', 'A').and('have.css', 'visibility', 'hidden');
    cy.get(tab('a')).should('have.attr', 'aria-selected', 'true');
  });

  it('uses latest onClick onFocus and value closures while composing selection in order', () => {
    const oldClick = cy.stub().as('oldClick');
    const newClick = cy.stub().as('newClick');
    const oldFocus = cy.stub().as('oldFocus');
    const newFocus = cy.stub().as('newFocus');
    const select = cy.stub().as('select');
    const Latest = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button data-testid="change" onClick={() => setChanged(true)}>
            Change
          </button>
          <TabList selectTabOnFocus onTabSelect={select}>
            <Tab
              value={changed ? 'new' : 'old'}
              data-testid="tab-b"
              onClick={changed ? newClick : oldClick}
              onFocus={changed ? newFocus : oldFocus}
            >
              B
            </Tab>
          </TabList>
        </>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Latest />
      </FluentProvider>,
    );
    cy.get(tab('b')).realClick();
    exactRequest('@select', 0, 'old', 'focus');
    exactRequest('@select', 1, 'old');
    cy.get('[data-testid="change"]').realClick();
    cy.get(tab('b')).realClick();
    exactRequest('@select', 2, 'new', 'focus');
    exactRequest('@select', 3, 'new');
    cy.get('@oldClick').should('have.been.calledOnce');
    cy.get('@oldFocus').should('have.been.calledOnce');
    cy.get('@newClick').should('have.been.calledOnce');
    cy.get('@newFocus').should('have.been.calledOnce');
    cy.then(() => {
      expect(newFocus.firstCall.calledBefore(select.getCall(2))).to.equal(true);
      expect(newClick.firstCall.calledBefore(select.getCall(3))).to.equal(true);
      expect(newClick.firstCall.args[0]).to.equal(select.getCall(3).args[0]);
    });
  });

  it('characterizes inherited click prevention: selection still occurs and callback sees defaultPrevented', () => {
    render({
      defaultSelectedValue: 'a',
      onTabSelect: cy.stub().as('select'),
      children: (
        <>
          <Tab value="a" data-testid="tab-a">
            A
          </Tab>
          <Tab value="b" data-testid="tab-b" onClick={event => event.preventDefault()}>
            B
          </Tab>
        </>
      ),
    });
    cy.get(tab('b')).realClick();
    selected('b');
    exactRequest('@select', 0, 'b');
    cy.get('@select').its('firstCall.args.0.defaultPrevented').should('equal', true);
  });

  it('characterizes inherited focus prevention: automatic selection still occurs', () => {
    render({
      defaultSelectedValue: 'a',
      selectTabOnFocus: true,
      onTabSelect: cy.stub().as('select'),
      children: (
        <>
          <Tab value="a" data-testid="tab-a">
            A
          </Tab>
          <Tab value="b" data-testid="tab-b" onFocus={event => event.preventDefault()}>
            B
          </Tab>
        </>
      ),
    });
    cy.get(tab('b')).focus();
    selected('b');
    exactRequest('@select', 0, 'b', 'focus');
    cy.get('@select').its('firstCall.args.0.defaultPrevented').should('equal', true);
  });

  for (const key of ['Enter', 'Space'] as const) {
    it(`respects native ${key} keydown prevention with positive pointer control`, () => {
      render({
        defaultSelectedValue: 'a',
        onTabSelect: cy.stub().as('select'),
        children: (
          <>
            <Tab value="a" data-testid="tab-a">
              A
            </Tab>
            <Tab value="b" data-testid="tab-b" onKeyDown={event => event.preventDefault()}>
              B
            </Tab>
          </>
        ),
      });
      cy.get(tab('b')).focus();
      cy.realPress(key);
      selected('a');
      cy.get('@select').should('not.have.been.called');
      cy.get(tab('b')).realClick();
      selected('b');
      cy.get('@select').should('have.been.calledOnce');
    });
  }

  it('stopPropagation prevents ancestor click without suppressing the composed selection callback', () => {
    const ancestor = cy.stub().as('ancestor');
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <div onClick={ancestor}>
          <TabList onTabSelect={cy.stub().as('select')}>
            <Tab value="b" data-testid="tab-b" onClick={event => event.stopPropagation()}>
              B
            </Tab>
            <Tab value="a" data-testid="tab-a">
              A
            </Tab>
          </TabList>
        </div>
      </FluentProvider>,
    );
    cy.get(tab('b')).realClick();
    selected('b');
    cy.get('@ancestor').should('not.have.been.called');
    cy.get('@select').should('have.been.calledOnce');
    cy.get(tab('a')).realClick();
    cy.get('@ancestor').should('have.been.calledOnce');
    selected('a');
  });

  it('reports custom slot pointer handlers and root handlers on the same bubbled event', () => {
    const slotClick = cy.stub().as('slotClick');
    const rootClick = cy.stub().as('rootClick');
    const onTabSelect = cy.stub().as('select');
    render({
      onTabSelect,
      children: (
        <Tab value="b" data-testid="tab-b" onClick={rootClick} icon={{ children: glyph(), onClick: slotClick }}>
          B
        </Tab>
      ),
    });
    cy.get(tab('b')).find(icon).realClick();
    selected('b');
    cy.get('@slotClick').should('have.been.calledOnce');
    cy.get('@rootClick').should('have.been.calledOnce');
    exactRequest('@select', 0, 'b');
    cy.then(() => {
      expect(slotClick.calledBefore(rootClick)).to.equal(true);
      expect(rootClick.calledBefore(onTabSelect)).to.equal(true);
      expect(slotClick.firstCall.args[0]).to.equal(onTabSelect.firstCall.args[0]);
    });
  });

  it('keeps manual onFocus native handler without selecting and consumes ordinary key handlers', () => {
    render({
      defaultSelectedValue: 'a',
      onTabSelect: cy.stub().as('select'),
      children: (
        <>
          <Tab value="a" data-testid="tab-a">
            A
          </Tab>
          <Tab
            value="b"
            data-testid="tab-b"
            onFocus={cy.stub().as('focus')}
            onBlur={cy.stub().as('blur')}
            onKeyDown={cy.stub().as('key')}
          >
            B
          </Tab>
        </>
      ),
    });
    cy.get(tab('b')).focus();
    cy.realPress('x');
    selected('a');
    cy.get('@focus').should('have.been.calledOnce');
    cy.get('@key').its('firstCall.args.0.key').should('equal', 'x');
    cy.get(tab('a')).focus();
    cy.get('@blur').should('have.been.calledOnce');
    cy.get('@select').should('not.have.been.called');
  });

  it('preserves explicit Tabster attributes over generated selected-default attributes', () => {
    const attributes = JSON.stringify({ observed: { names: ['custom-tab'] } });
    render({
      defaultSelectedValue: 'a',
      children: (
        <>
          <Tab value="a" data-testid="tab-a" data-tabster={attributes}>
            A
          </Tab>
          <Tab value="b" data-testid="tab-b">
            B
          </Tab>
        </>
      ),
    });
    cy.get(tab('a')).should('have.attr', 'data-tabster', attributes);
    cy.get(tab('b'))
      .invoke('attr', 'data-tabster')
      .then(value => expect(JSON.parse(value!)).to.deep.equal({ focusable: { isDefault: false } }));
    cy.get(tab('b')).realClick();
    cy.get(tab('b'))
      .invoke('attr', 'data-tabster')
      .then(value => expect(JSON.parse(value!)).to.deep.equal({ focusable: { isDefault: true } }));
    cy.get(tab('a')).should('have.attr', 'data-tabster', attributes);
  });

  it('retains uncontrolled selection through default changes and unrelated rerenders', () => {
    const onTabSelect = cy.stub().as('select');
    const Defaults = () => {
      const [initial, setInitial] = React.useState('a');
      return (
        <>
          <button data-testid="change" onClick={() => setInitial('c')}>
            Change default
          </button>
          <TabList defaultSelectedValue={initial} onTabSelect={onTabSelect}>
            {choices()}
          </TabList>
        </>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Defaults />
      </FluentProvider>,
    );
    cy.get(tab('b')).realClick();
    selected('b');
    cy.get('[data-testid="change"]').realClick();
    selected('b');
  });

  it('keeps selected-disabled visual semantics while omitting aria-selected until reenabled', () => {
    const onTabSelect = cy.stub().as('select');
    const DisabledSelection = () => {
      const [disabled, setDisabled] = React.useState(true);
      return (
        <>
          <button data-testid="toggle" onClick={() => setDisabled(value => !value)}>
            Toggle
          </button>
          <TabList defaultSelectedValue="a" onTabSelect={onTabSelect}>
            <Tab value="a" data-testid="tab-a" disabled={disabled} icon={glyph()}>
              A
            </Tab>
            <Tab value="b" data-testid="tab-b">
              B
            </Tab>
          </TabList>
        </>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <DisabledSelection />
      </FluentProvider>,
    );
    cy.get(tab('a')).should('be.disabled').and('not.have.attr', 'aria-selected');
    cy.get(tab('a'))
      .find(content)
      .should('have.css', 'font-weight', '600')
      .and('have.css', 'color', rgb(teamsLightTheme.colorNeutralForegroundDisabled));
    cy.get(tab('a')).find('.fui-Icon-filled').should('be.visible');
    cy.get('[data-testid="toggle"]').realClick();
    selected('a');
    cy.get('@select').should('not.have.been.called');
    cy.get(tab('b')).realClick();
    selected('b');
  });

  it('settles animated indicator values after unequal-width horizontal and vertical selections', () => {
    const Animation = () => {
      const [vertical, setVertical] = React.useState(false);
      return (
        <>
          <button data-testid="axis" onClick={() => setVertical(true)}>
            Vertical
          </button>
          <TabList vertical={vertical} defaultSelectedValue="a">
            <Tab value="a" data-testid="tab-a">
              Short
            </Tab>
            <Tab value="b" data-testid="tab-b">
              Much longer tab
            </Tab>
          </TabList>
        </>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Animation />
      </FluentProvider>,
    );
    const settled = (id: string) =>
      cy.get(tab(id)).should($tab => {
        expect($tab[0].style.getPropertyValue('--fui-Tab__indicator--offset')).to.equal('0px');
        expect($tab[0].style.getPropertyValue('--fui-Tab__indicator--scale')).to.equal('1');
      });
    cy.get(tab('b')).realClick();
    selected('b');
    settled('b');
    cy.get(tab('a')).realClick();
    settled('a');
    cy.get('[data-testid="axis"]').realClick();
    cy.get(tab('b')).realClick();
    selected('b');
    settled('b');
    cy.get(tab('b')).should($tab =>
      expect($tab[0].ownerDocument.defaultView!.getComputedStyle($tab[0], '::after').transformOrigin).to.match(/ 0px$/),
    );
  });
});

describe('Tab forced colors in the real browser', () => {
  beforeEach(() => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'forced-colors', value: 'active' }] },
      }),
    );
  });
  afterEach(() => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
  });

  for (const appearance of ['transparent', 'subtle', 'subtle-circular', 'filled-circular'] as const) {
    it(`keeps system-color selection and disabled distinction (${appearance})`, () => {
      render({
        appearance,
        defaultSelectedValue: 'a',
        children: (
          <>
            <span data-testid="button-text" style={{ color: 'ButtonText' }} />
            <span data-testid="highlight" style={{ color: 'Highlight' }} />
            <span data-testid="button-face" style={{ color: 'ButtonFace' }} />
            {choices('c')}
          </>
        ),
      });
      cy.get(tab('a')).should($tab => {
        const view = $tab[0].ownerDocument.defaultView!;
        expect(view.matchMedia('(forced-colors: active)').matches).to.equal(true);
        const systemColor = (id: string) =>
          view.getComputedStyle($tab[0].parentElement!.querySelector<HTMLElement>(`[data-testid="${id}"]`)!).color;
        const style = view.getComputedStyle($tab[0]);
        if (appearance === 'subtle-circular') {
          expect(style.borderTopColor).to.equal(systemColor('highlight'));
        } else if (appearance === 'filled-circular') {
          expect(style.backgroundColor).to.equal(systemColor('button-text'));
          expect(view.getComputedStyle($tab.find(content)[0]).color).to.equal(systemColor('button-face'));
        } else {
          expect(view.getComputedStyle($tab[0], '::after').backgroundColor).to.equal(systemColor('button-text'));
        }
      });
      cy.get(tab('c')).should('be.disabled').and('not.have.attr', 'aria-selected');
      cy.get(tab('b')).realClick();
      selected('b');
    });
  }
});
