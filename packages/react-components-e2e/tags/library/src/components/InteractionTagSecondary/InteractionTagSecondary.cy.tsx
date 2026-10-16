import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme, teamsHighContrastTheme } from '@fluentui/react-theme';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { InteractionTag, InteractionTagPrimary, TagGroup } from '../../index';
import { InteractionTagSecondary } from './InteractionTagSecondary';
import type { InteractionTagProps } from '../InteractionTag/InteractionTag.types';
import type { TagGroupProps } from '../TagGroup/TagGroup.types';
import * as axe from 'axe-core';
import { InteractionTagContextProvider } from '../../contexts/interactionTagContext';
import type { InteractionTagContextValue } from '../../contexts/interactionTagContext';
import { useSecondaryFixtureStyles } from './InteractionTagSecondary.cy.styles';

const secondary = '.fui-InteractionTagSecondary';
const primary = '.fui-InteractionTagPrimary';
const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
type SecondaryFixtureProps = React.ComponentProps<typeof InteractionTagSecondary> & { 'data-testid'?: string };
const tag = (props: SecondaryFixtureProps = {}, parent: InteractionTagProps = {}) => (
  <InteractionTag value="calendar" {...parent}>
    <InteractionTagPrimary hasSecondaryAction>Calendar</InteractionTagPrimary>
    <InteractionTagSecondary aria-label="Remove" {...props} />
  </InteractionTag>
);
const color = (value: string) => {
  const probe = Cypress.$('<span>')[0];
  probe.style.color = value;
  return probe.style.color;
};
const name = (expected: string) =>
  cy.get(secondary).should($node => expect(computeAccessibleName($node[0])).to.equal(expected));
const labelledByTokens = (node: HTMLElement) =>
  (node.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
const labelledByTargets = (node: HTMLElement) =>
  labelledByTokens(node).map(id => node.ownerDocument.getElementById(id));

describe('InteractionTagSecondary documented contracts', () => {
  it('renders a native button with a decorative dismiss icon and combined primary-action name', () => {
    render(tag());
    cy.get(secondary).should('have.prop', 'tagName', 'BUTTON').and('have.attr', 'type', 'button');
    cy.get(`${secondary} svg`).should('be.visible').and('have.attr', 'aria-hidden', 'true');
    cy.get(primary).then($primary => {
      cy.get(secondary).should($node => {
        expect(labelledByTokens($node[0])).to.deep.equal([$primary[0].id, $node[0].id]);
        expect(labelledByTargets($node[0])).to.deep.equal([$primary[0], $node[0]]);
      });
    });
    name('Calendar Remove');
  });
});

describe('InteractionTagSecondary edges and accessibility', () => {
  for (const key of ['Delete', 'Backspace'] as const) {
    it(`dismisses on ${key} keydown with the exact keyboard event and does not synthesize a click`, () => {
      const click = cy.spy().as('click');
      const down = cy.spy().as('down');
      const dismiss = cy.spy().as('dismiss');
      render(
        <TagGroup aria-label="Calendars" onDismiss={dismiss}>
          {tag({ onClick: click, onKeyDown: down })}
        </TagGroup>,
      );
      cy.get(secondary).focus();
      cy.realPress(key);
      cy.get('@down').should('have.been.calledOnce');
      cy.get('@dismiss')
        .should('have.been.calledOnce')
        .then(() => {
          expect(dismiss.firstCall.args[0]).to.equal(down.firstCall.args[0]);
          expect(dismiss.firstCall.args[0].type).to.equal('keydown');
          expect(dismiss.firstCall.args[0].key).to.equal(key);
          expect(dismiss.firstCall.args[1]).to.deep.equal({ value: 'calendar' });
        });
      cy.get('@click').should('not.have.been.called');
      cy.get(secondary).should('exist');
    });

    it(`consumer prevention cancels ${key} dismissal while a later pointer click still works`, () => {
      const dismiss = cy.spy().as('dismiss');
      render(
        <TagGroup aria-label="Calendars" onDismiss={dismiss}>
          {tag({ onKeyDown: event => event.preventDefault() })}
        </TagGroup>,
      );
      cy.get(secondary).focus();
      cy.realPress(key);
      cy.get('@dismiss').should('not.have.been.called');
      cy.get(secondary).realClick();
      cy.get('@dismiss').should('have.been.calledOnce');
    });
  }

  it('ignores Escape letters and modifier keys with native Enter as the positive control', () => {
    const dismiss = cy.spy().as('dismiss');
    render(
      <TagGroup aria-label="Calendars" onDismiss={dismiss}>
        {tag()}
      </TagGroup>,
    );
    cy.get(secondary).focus();
    for (const key of ['Escape', 'a', 'Shift', 'Control', 'Alt'] as const) {
      cy.realPress(key);
    }
    cy.get('@dismiss').should('not.have.been.called');
    cy.realPress('Enter');
    cy.get('@dismiss').should('have.been.calledOnce');
  });

  for (const key of ['Enter', 'Space'] as const) {
    it(`consumer keydown prevention cancels native ${key} activation but not pointer activation`, () => {
      const dismiss = cy.spy().as('dismiss');
      render(
        <TagGroup aria-label="Calendars" onDismiss={dismiss}>
          {tag({ onKeyDown: event => event.preventDefault() })}
        </TagGroup>,
      );
      cy.get(secondary).focus();
      cy.realPress(key);
      cy.get('@dismiss').should('not.have.been.called');
      cy.get(secondary).realClick();
      cy.get('@dismiss').should('have.been.calledOnce');
    });
  }

  it('composes consumer click before dismissal and ancestor bubbling using the same event', () => {
    const sequence: string[] = [];
    const events: React.SyntheticEvent[] = [];
    render(
      <TagGroup
        aria-label="Calendars"
        onDismiss={event => {
          sequence.push('dismiss');
          events.push(event);
        }}
      >
        {tag(
          {
            onClick: event => {
              sequence.push('consumer');
              events.push(event);
            },
          },
          {
            onClick: event => {
              sequence.push('ancestor');
              events.push(event);
            },
          },
        )}
      </TagGroup>,
    );
    cy.get(`${secondary} svg`).realClick();
    cy.then(() => {
      expect(sequence).to.deep.equal(['consumer', 'dismiss', 'ancestor']);
      expect(events[0]).to.equal(events[1]).and.to.equal(events[2]);
      expect(events[0].target).to.have.property('tagName', 'path');
    });
  });

  it('consumer click cancellation blocks dismissal but preserves bubbling and the mounted tag', () => {
    const dismiss = cy.spy().as('dismiss');
    const bubble = cy.spy().as('bubble');
    render(
      <TagGroup aria-label="Calendars" onDismiss={dismiss}>
        {tag({ onClick: event => event.preventDefault() }, { onClick: bubble })}
      </TagGroup>,
    );
    cy.get(secondary).realClick();
    cy.get('@dismiss').should('not.have.been.called');
    cy.get('@bubble').should('have.been.calledOnce');
    cy.get(secondary).should('exist');
    cy.get(primary).realClick();
    cy.get('@bubble').should('have.been.calledTwice');
  });

  it('ancestor capture prevention is visible to the consumer and cancels dismissal', () => {
    const dismiss = cy.spy().as('dismiss');
    const prevented = cy.spy().as('prevented');
    render(
      <TagGroup aria-label="Calendars" onDismiss={dismiss}>
        {tag(
          { onClick: event => prevented(event.defaultPrevented) },
          { onClickCapture: event => event.preventDefault() },
        )}
      </TagGroup>,
    );
    cy.get(secondary).realClick();
    cy.get('@prevented').should('have.been.calledWithExactly', true);
    cy.get('@dismiss').should('not.have.been.called');
  });

  it('stopPropagation alone stops bubbling but does not cancel the dismiss callback', () => {
    const dismiss = cy.spy().as('dismiss');
    const bubble = cy.spy().as('bubble');
    render(
      <TagGroup aria-label="Calendars" onDismiss={dismiss}>
        {tag({ onClick: event => event.stopPropagation() }, { onClick: bubble })}
      </TagGroup>,
    );
    cy.get(secondary).realClick();
    cy.get('@dismiss').should('have.been.calledOnce');
    cy.get('@bubble').should('not.have.been.called');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`provides two standalone tab stops in ${dir} logical order with mirrored split geometry`, () => {
      render(
        <>
          <button id="before">Before</button>
          {tag()}
          <button id="after">After</button>
        </>,
        dir,
      );
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get(primary).should('have.focus');
      cy.realPress('Tab');
      cy.get(secondary).should('have.focus');
      cy.realPress('Tab');
      cy.get('#after').should('have.focus');
      cy.realPress(['Shift', 'Tab']);
      cy.get(secondary).should('have.focus');
      cy.get(primary).then($p =>
        cy.get(secondary).should($s => {
          const p = $p[0].getBoundingClientRect();
          const s = $s[0].getBoundingClientRect();
          expect(dir === 'ltr' ? s.left : s.right).to.be.closeTo(dir === 'ltr' ? p.right : p.left, 1);
        }),
      );
      cy.get(secondary).should('have.css', dir === 'ltr' ? 'border-top-left-radius' : 'border-top-right-radius', '0px');
    });
  }

  it('skips a disabled secondary in native tab order and reaches the enabled positive control', () => {
    render(
      <>
        <button id="before">Before</button>
        {tag({ disabled: true })}
        <button id="after">After</button>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get(primary).should('have.focus');
    cy.realPress('Tab');
    cy.get('#after').should('have.focus');
    cy.get(secondary).should('be.disabled');
  });

  it('uses toolbar arrow navigation and one group Tab entry without dismissing on arrows', () => {
    const dismiss = cy.spy().as('dismiss');
    render(
      <>
        <button id="before">Before</button>
        <TagGroup aria-label="Calendars" onDismiss={dismiss}>
          {tag()}
          {tag({ id: 'second' }, { value: 'second' })}
        </TagGroup>
        <button id="after">After</button>
      </>,
    );
    cy.get('[role="toolbar"]').should('have.attr', 'aria-label', 'Calendars');
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get(primary).first().should('have.focus');
    cy.realPress('ArrowRight');
    cy.get(secondary).first().should('have.focus');
    cy.realPress('ArrowRight');
    cy.get(primary).last().should('have.focus');
    cy.realPress('ArrowLeft');
    cy.get(secondary).first().should('have.focus');
    cy.get('@dismiss').should('not.have.been.called');
    cy.realPress('Tab');
    cy.get('#after').should('have.focus');
    cy.realPress(['Shift', 'Tab']);
    cy.get(secondary).first().should('have.focus');
  });

  it('moves group focus to the next primary even when onDismiss does not remove the tag', () => {
    const dismiss = cy.spy().as('dismiss');
    render(
      <TagGroup aria-label="Calendars" onDismiss={dismiss}>
        {tag()}
        {tag({}, { value: 'second' })}
      </TagGroup>,
    );
    cy.get(secondary).first().focus();
    cy.realPress('Delete');
    cy.get(primary).last().should('have.focus');
    cy.get(secondary).should('have.length', 2);
    cy.get(secondary).last().focus();
    cy.realPress('Backspace');
    cy.get(secondary).first().should('have.focus');
    cy.get('@dismiss').should('have.been.calledTwice');
  });

  it('characterizes group onDismiss prevention as not cancelling its subsequent focus management', () => {
    render(
      <TagGroup aria-label="Calendars" onDismiss={event => event.preventDefault()}>
        {tag()}
        {tag({}, { value: 'second' })}
      </TagGroup>,
    );
    cy.get(secondary).first().focus();
    cy.realPress('Delete');
    cy.get(primary).last().should('have.focus');
    cy.get(secondary).should('have.length', 2);
  });

  it('characterizes the known inherited-ID mismatch for a custom primary ID without pretending the missing reference resolves', () => {
    render(
      <InteractionTag>
        <InteractionTagPrimary id="custom-primary" hasSecondaryAction>
          Calendar
        </InteractionTagPrimary>
        <InteractionTagSecondary aria-label="Remove" />
      </InteractionTag>,
    );
    cy.get(secondary).should($node => {
      const [firstId, ownId] = labelledByTokens($node[0]);
      expect(firstId).not.to.equal('custom-primary');
      expect(ownId).to.equal($node[0].id);
      expect(labelledByTargets($node[0])).to.deep.equal([null, $node[0]]);
      expect($node[0].ownerDocument.getElementById(firstId)).to.equal(null);
      expect(computeAccessibleName($node[0])).to.equal('Remove');
    });
  });

  it('updates the live name and description without recreating the action', () => {
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <span id="help">{updated ? 'New help' : 'Old help'}</span>
          <InteractionTag>
            <InteractionTagPrimary hasSecondaryAction>{updated ? 'Work' : 'Calendar'}</InteractionTagPrimary>
            <InteractionTagSecondary aria-label={updated ? 'Delete' : 'Remove'} aria-describedby="help" />
          </InteractionTag>
        </>
      );
    };
    render(<Example />);
    name('Calendar Remove');
    cy.get(secondary).then($before => {
      cy.get('#update').realClick();
      name('Work Delete');
      cy.get(secondary).should($after => {
        expect($after[0]).to.equal($before[0]);
        expect(computeAccessibleDescription($after[0])).to.equal('New help');
      });
    });
  });

  for (const variant of ['default', 'custom-label', 'disabled', 'selected', 'compact'] as const) {
    it(`passes ordinary axe rules for the ${variant} secondary fixture`, () => {
      render(
        <div>
          {tag(variant === 'custom-label' ? { 'aria-label': 'Remove Calendar', 'aria-labelledby': null } : {}, {
            disabled: variant === 'disabled',
            selected: variant === 'selected',
            size: variant === 'compact' ? 'extra-small' : 'medium',
          })}
        </div>,
      );
      cy.get('.fui-InteractionTag').then(async $root => {
        const result = await axe.run($root[0]);
        expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).to.deep.equal([]);
      });
    });
  }
});
describe('InteractionTagSecondary group accessibility characterization', () => {
  it('characterizes the inherited Tabster sentinel aria-hidden-focus finding without excluding axe rules or nodes', () => {
    render(<TagGroup aria-label="Calendars">{tag()}</TagGroup>);
    cy.get('[role="toolbar"] [data-tabster-dummy]').should('have.length', 2);
    cy.get('[role="toolbar"]').then(async $root => {
      const result = await axe.run($root[0]);
      expect(result.violations.map(v => v.id)).to.deep.equal(['aria-hidden-focus']);
      expect(result.violations[0].nodes).to.have.length(2);
      for (const node of result.violations[0].nodes) {
        expect(node.html).to.contain('data-tabster-dummy').and.to.contain('aria-hidden="true"');
      }
      expect(result.passes.some(pass => pass.id === 'button-name')).to.equal(true);
    });
  });
});

describe('InteractionTagSecondary documented contracts', () => {
  for (const labelledBy of [null, undefined] as const) {
    it(`uses a complete aria-label when aria-labelledby is explicitly ${labelledBy}`, () => {
      render(tag({ 'aria-label': 'Remove Calendar', 'aria-labelledby': labelledBy }));
      cy.get(secondary).should('not.have.attr', 'aria-labelledby');
      name('Remove Calendar');
    });
  }

  it('supports custom primary and secondary IDs with an explicit naming relationship and description', () => {
    render(
      <>
        <span id="help">Removes this calendar from the list</span>
        <InteractionTag>
          <InteractionTagPrimary id="custom-primary" hasSecondaryAction>
            Work calendar
          </InteractionTagPrimary>
          <InteractionTagSecondary
            id="custom-secondary"
            aria-label="Dismiss"
            aria-labelledby="custom-primary custom-secondary"
            aria-describedby="help"
          />
        </InteractionTag>
      </>,
    );
    name('Work calendar Dismiss');
    cy.get('#custom-primary').then($primary => {
      cy.get(secondary).should($node => {
        expect(labelledByTokens($node[0])).to.deep.equal([$primary[0].id, $node[0].id]);
        expect(labelledByTargets($node[0])).to.deep.equal([$primary[0], $node[0]]);
        expect(computeAccessibleDescription($node[0])).to.equal('Removes this calendar from the list');
      });
    });
  });

  it('preserves explicit children instead of adding the default icon', () => {
    render(
      tag({
        children: (
          <span data-testid="custom-icon" aria-hidden="true">
            X
          </span>
        ),
      }),
    );
    cy.get(`${secondary} svg`).should('not.exist');
    cy.get('[data-testid="custom-icon"]').should('have.text', 'X');
    name('Calendar Remove');
  });

  for (const appearance of ['filled', 'outline', 'brand'] as const) {
    it(`inherits ${appearance} appearance and divider tokens`, () => {
      render(tag({}, { appearance }));
      cy.get('body').realHover({ position: 'bottomRight' });
      cy.get(secondary)
        .should(
          'have.css',
          'background-color',
          appearance === 'outline'
            ? 'rgba(0, 0, 0, 0)'
            : color(
                appearance === 'brand' ? webLightTheme.colorBrandBackground2 : webLightTheme.colorNeutralBackground3,
              ),
        )
        .and(
          'have.css',
          'border-left-color',
          color(appearance === 'brand' ? webLightTheme.colorBrandStroke2 : webLightTheme.colorNeutralStroke1),
        );
    });
  }

  for (const [size, height, icon, padding] of [
    ['medium', 32, 20, 5],
    ['small', 24, 16, 3],
    ['extra-small', 20, 12, 5],
  ] as const) {
    it(`inherits ${size} geometry and icon sizing from the tag`, () => {
      render(tag({}, { size }));
      cy.get(secondary)
        .should('have.css', 'font-size', `${icon}px`)
        .and('have.css', 'padding-left', `${padding}px`)
        .should($node => expect($node[0].getBoundingClientRect().height).to.equal(height));
      cy.get(`${secondary} svg`).should($node => expect($node[0].getBoundingClientRect().height).to.equal(icon));
    });
  }

  for (const shape of ['rounded', 'circular'] as const) {
    it(`inherits ${shape} outer corners while flattening the primary seam`, () => {
      render(tag({}, { shape }));
      cy.get(secondary)
        .should('have.css', 'border-top-left-radius', '0px')
        .and(
          'have.css',
          'border-top-right-radius',
          shape === 'rounded' ? webLightTheme.borderRadiusMedium : webLightTheme.borderRadiusCircular,
        );
    });
  }

  for (const origin of ['local', 'tag', 'group'] as const) {
    it(`honors ${origin} disability without disabledFocusable and blocks native activation`, () => {
      const click = cy.spy().as('click');
      const dismiss = cy.spy().as('dismiss');
      render(
        <TagGroup aria-label="Calendars" disabled={origin === 'group'} onDismiss={dismiss}>
          {tag({ disabled: origin === 'local' ? true : false, onClick: click }, { disabled: origin === 'tag' })}
        </TagGroup>,
      );
      cy.get(secondary).should('be.disabled').realClick();
      cy.get('@click').should('not.have.been.called');
      cy.get('@dismiss').should('not.have.been.called');
      cy.get(primary).should(origin === 'local' ? 'be.enabled' : 'be.disabled');
    });
  }

  for (const key of ['Enter', 'Space'] as const) {
    it(`dispatches one native ${key} click and exact dismiss value without automatic removal or primary selection`, () => {
      const click = cy.spy().as('click');
      const dismiss = cy.spy().as('dismiss');
      const select = cy.spy().as('select');
      render(
        <TagGroup aria-label="Calendars" onDismiss={dismiss} onTagSelect={select}>
          {tag({ onClick: click })}
        </TagGroup>,
      );
      cy.get(secondary).focus();
      cy.realPress(key);
      cy.get('@click').should('have.been.calledOnce');
      cy.get('@dismiss')
        .should('have.been.calledOnce')
        .then(() => {
          expect(dismiss.firstCall.args[0].type).to.equal('click');
          expect(dismiss.firstCall.args[1]).to.deep.equal({ value: 'calendar' });
          expect(dismiss.firstCall.args[0]).to.equal(click.firstCall.args[0]);
        });
      cy.get('@select').should('not.have.been.called');
      cy.get(secondary).should('exist');
      cy.get(primary).should('have.attr', 'aria-pressed', 'false');
    });
  }

  it('allows the consumer to remove an item and restore the last-item focus explicitly', () => {
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      const restore = React.useRef<HTMLButtonElement>(null);
      React.useEffect(() => {
        if (!visible) {
          restore.current?.focus();
        }
      }, [visible]);
      return (
        <>
          <TagGroup aria-label="Calendars" onDismiss={() => setVisible(false)}>
            {visible && tag()}
          </TagGroup>
          <button ref={restore} onClick={() => setVisible(true)}>
            Restore
          </button>
        </>
      );
    };
    render(<Example />);
    cy.get(secondary).realClick();
    cy.get(secondary).should('not.exist');
    cy.contains('button', 'Restore').should('have.focus').realClick();
    cy.get(secondary).should('be.visible');
    name('Calendar Remove');
  });

  it('inherits selected styling without publishing pressed state on the dismiss action', () => {
    render(tag({}, { selected: true }));
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.get(secondary)
      .should('have.css', 'background-color', color(webLightTheme.colorBrandBackground))
      .and('have.css', 'color', color(webLightTheme.colorNeutralForegroundOnBrand))
      .and('not.have.attr', 'aria-pressed');
  });
});

describe('InteractionTagSecondary source and unit-derived contracts', () => {
  it('uses the standalone default context without inventing a primary name or removal owner', () => {
    const click = cy.spy().as('click');
    render(<InteractionTagSecondary aria-label="Dismiss" onClick={click} />);
    name('Dismiss');
    cy.get(secondary).should($node => {
      expect(labelledByTokens($node[0])).to.deep.equal([$node[0].id]);
      expect(labelledByTargets($node[0])).to.deep.equal([$node[0]]);
    });
    cy.get(secondary).should('have.attr', 'type', 'button').and('be.enabled').realClick();
    cy.get('@click').should('have.been.calledOnce');
    cy.get(secondary).should('exist');
  });

  for (const children of [null, undefined, false, '', 0] as const) {
    it(`uses nullish-only icon fallback for children=${String(children)}`, () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(tag({ children, ref }));
      cy.get(`${secondary} svg`).should(children === null || children === undefined ? 'exist' : 'not.exist');
      cy.get(primary).then($primary => {
        cy.get(secondary).should($node => {
          expect($node[0].textContent).to.equal(children === 0 ? '0' : '');
          expect(ref.current).to.equal($node[0]);
          expect(labelledByTokens($node[0])).to.deep.equal([$primary[0].id, $node[0].id]);
          expect(labelledByTargets($node[0])).to.deep.equal([$primary[0], $node[0]]);
        });
      });
      name('Calendar Remove');
    });
  }

  it('forwards the sole root slot native attributes as a button without inventing an icon slot', () => {
    render(
      tag({
        as: 'button',
        id: 'native',
        name: 'action',
        value: 'native-value',
        title: 'Close calendar',
        lang: 'fr',
        dir: 'rtl',
        'data-testid': 'native-action',
        'aria-label': 'Remove Calendar',
        'aria-labelledby': null,
      }),
    );
    cy.get('#native')
      .should('have.prop', 'tagName', 'BUTTON')
      .and('have.attr', 'name', 'action')
      .and('have.attr', 'value', 'native-value')
      .and('have.attr', 'title', 'Close calendar')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'dir', 'rtl')
      .and('have.attr', 'data-testid', 'native-action');
    name('Remove Calendar');
  });

  it('keeps native button value separate from the InteractionTag dismiss value including the empty tag value', () => {
    const dismiss = cy.spy().as('dismiss');
    render(
      <TagGroup aria-label="Calendars" onDismiss={dismiss}>
        {tag({ value: 'dom-value' }, { value: '' })}
      </TagGroup>,
    );
    cy.get(secondary).should('have.value', 'dom-value').realClick();
    cy.get('@dismiss')
      .should('have.been.calledOnce')
      .then(() => expect(dismiss.firstCall.args[1]).to.deep.equal({ value: '' }));
  });

  it('uses the generated parent identity as default dismiss value and keeps generated child IDs unique and stable', () => {
    const dismiss = cy.spy().as('dismiss');
    const Example = () => {
      const [count, setCount] = React.useState(0);
      return (
        <>
          <button id="update" onClick={() => setCount(count + 1)}>
            Update {count}
          </button>
          <TagGroup aria-label="Calendars" onDismiss={dismiss}>
            {tag({ id: undefined }, { value: undefined })}
            {tag({}, { value: 'second' })}
          </TagGroup>
        </>
      );
    };
    render(<Example />);
    cy.get(secondary).then($before => {
      const ids = Array.from($before, node => node.id);
      expect(new Set(ids).size).to.equal(2);
      expect(ids.every(id => id.startsWith('fui-InteractionTagSecondary-'))).to.equal(true);
      cy.get('#update').realClick();
      cy.get(secondary).should($after => expect(Array.from($after, node => node.id)).to.deep.equal(ids));
    });
    cy.get('.fui-InteractionTag')
      .first()
      .then($parent => {
        cy.get(secondary).first().realClick();
        cy.get('@dismiss')
          .should('have.been.calledOnce')
          .then(() => expect(dismiss.firstCall.args[1]).to.deep.equal({ value: $parent[0].id }));
      });
  });

  it('observes latest click keydown context value and dismiss callbacks after a committed update', () => {
    const oldClick = cy.spy().as('oldClick');
    const newClick = cy.spy().as('newClick');
    const oldKey = cy.spy().as('oldKey');
    const newKey = cy.spy().as('newKey');
    const oldDismiss = cy.spy().as('oldDismiss');
    const newDismiss = cy.spy().as('newDismiss');
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <TagGroup aria-label="Calendars" onDismiss={updated ? newDismiss : oldDismiss}>
            {tag(
              { onClick: updated ? newClick : oldClick, onKeyDown: updated ? newKey : oldKey },
              { value: updated ? 'new-value' : 'old-value' },
            )}
          </TagGroup>
        </>
      );
    };
    render(<Example />);
    cy.get(secondary).realClick();
    cy.get('@oldClick').should('have.been.calledOnce');
    cy.get('@oldDismiss').should('have.been.calledOnce');
    cy.get('#update').realClick();
    cy.get(secondary).realClick();
    cy.get(secondary).focus();
    cy.realPress('Delete');
    cy.get('@newClick').should('have.been.calledOnce');
    cy.get('@newKey').should('have.been.calledOnce');
    cy.get('@newDismiss')
      .should('have.been.calledTwice')
      .then(() => {
        for (const call of newDismiss.getCalls()) {
          expect(call.args[1]).to.deep.equal({ value: 'new-value' });
        }
      });
    cy.get('@oldClick').should('have.been.calledOnce');
    cy.get('@oldKey').should('not.have.been.called');
    cy.get('@oldDismiss').should('have.been.calledOnce');
  });

  it('replaces provider context live while preserving the native node and updating all inherited styles', () => {
    const first = cy.spy().as('first');
    const second = cy.spy().as('second');
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      const context: InteractionTagContextValue = {
        appearance: updated ? 'brand' : 'outline',
        disabled: updated,
        selected: updated,
        size: updated ? 'small' : 'medium',
        shape: updated ? 'circular' : 'rounded',
        value: updated ? 'second' : 'first',
        selectedValues: [],
        interactionTagPrimaryId: updated ? 'new-primary' : 'old-primary',
        handleTagDismiss: updated ? second : first,
      };
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <span id={context.interactionTagPrimaryId}>{context.value}</span>
          <InteractionTagContextProvider value={context}>
            <InteractionTagSecondary aria-label="Remove" />
          </InteractionTagContextProvider>
        </>
      );
    };
    render(<Example />);
    name('first Remove');
    cy.get(secondary).then($before => {
      cy.get(secondary).realClick();
      cy.get('@first').should('have.been.calledOnce');
      cy.get('#update').realClick();
      name('second Remove');
      cy.get(secondary)
        .should('be.disabled')
        .and('have.css', 'font-size', '16px')
        .and('have.css', 'border-top-right-radius', webLightTheme.borderRadiusCircular)
        .should($after => expect($after[0]).to.equal($before[0]));
      cy.get(secondary).realClick();
      cy.get('@second').should('not.have.been.called');
    });
  });

  it('recovers from inherited disability and context size appearance replacement without stale local state', () => {
    const dismiss = cy.spy().as('dismiss');
    const Example = () => {
      const [enabled, setEnabled] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setEnabled(true)}>
            Enable
          </button>
          <TagGroup
            aria-label="Calendars"
            disabled={!enabled}
            size={enabled ? 'extra-small' : 'medium'}
            appearance={enabled ? 'brand' : 'filled'}
            onDismiss={dismiss}
          >
            {tag({ disabled: false })}
          </TagGroup>
        </>
      );
    };
    render(<Example />);
    cy.get(secondary).should('be.disabled');
    cy.get('#update').realClick();
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.get(secondary)
      .should('be.enabled')
      .and('have.css', 'font-size', '12px')
      .and('have.css', 'background-color', color(webLightTheme.colorBrandBackground2))
      .realClick();
    cy.get('@dismiss').should('have.been.calledOnce');
  });

  it('keeps nested and sibling group values disability and dismiss handlers isolated', () => {
    const outer = cy.spy().as('outer');
    const inner = cy.spy().as('inner');
    const sibling = cy.spy().as('sibling');
    render(
      <>
        <TagGroup aria-label="Outer" disabled onDismiss={outer}>
          {tag({ id: 'outer' })}
          <TagGroup aria-label="Inner" onDismiss={inner}>
            {tag({ id: 'inner' }, { value: 'inner-value' })}
          </TagGroup>
        </TagGroup>
        <TagGroup aria-label="Sibling" onDismiss={sibling}>
          {tag({ id: 'sibling' }, { value: 'sibling-value' })}
        </TagGroup>
      </>,
    );
    cy.get('#outer').should('be.disabled');
    cy.get('#inner').should('be.enabled').realClick();
    cy.get('@inner')
      .should('have.been.calledOnce')
      .then(() => expect(inner.firstCall.args[1]).to.deep.equal({ value: 'inner-value' }));
    cy.get('#sibling').realClick();
    cy.get('@sibling')
      .should('have.been.calledOnce')
      .then(() => expect(sibling.firstCall.args[1]).to.deep.equal({ value: 'sibling-value' }));
    cy.get('@outer').should('not.have.been.called');
  });

  it('forwards object and callback refs and clears both on committed unmount without stale remount identity', () => {
    const object = React.createRef<HTMLButtonElement>();
    const callback = cy.spy().as('callback');
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button id="toggle" onClick={() => setVisible(!visible)}>
            Toggle
          </button>
          {visible && (
            <>
              {tag({ id: 'object', ref: object })}
              {tag({ id: 'callback', ref: callback })}
            </>
          )}
        </>
      );
    };
    render(<Example />);
    cy.get('#object').then($node => expect(object.current).to.equal($node[0]));
    cy.get('#callback').then($node => expect(callback.lastCall.args[0]).to.equal($node[0]));
    cy.get('#object').then($old => {
      cy.get('#toggle').realClick();
      cy.get(secondary).should('not.exist');
      cy.then(() => {
        expect(object.current).to.equal(null);
        expect(callback.lastCall.args[0]).to.equal(null);
      });
      cy.get('#toggle').realClick();
      cy.get('#object').should($new => {
        expect(object.current).to.equal($new[0]);
        expect($new[0]).not.to.equal($old[0]);
      });
      cy.get('#callback').then($new => expect(callback.lastCall.args[0]).to.equal($new[0]));
    });
  });

  for (const type of ['button', 'submit', 'reset'] as const) {
    it(`preserves native form ${type} behavior alongside dismissal`, () => {
      const submit = cy.spy().as('submit');
      const reset = cy.spy().as('reset');
      const dismiss = cy.spy().as('dismiss');
      render(
        <form
          onSubmit={event => {
            event.preventDefault();
            submit(event.nativeEvent);
          }}
          onReset={reset}
        >
          <input id="field" defaultValue="initial" aria-label="Text" />
          <TagGroup aria-label="Calendars" onDismiss={dismiss}>
            {tag(type === 'button' ? {} : { type })}
          </TagGroup>
        </form>,
      );
      cy.get('#field').clear().type('changed');
      cy.get(secondary).should('have.attr', 'type', type).realClick();
      cy.get('@dismiss').should('have.been.calledOnce');
      cy.get('@submit').should(type === 'submit' ? 'have.been.calledOnce' : 'not.have.been.called');
      cy.get('@reset').should(type === 'reset' ? 'have.been.calledOnce' : 'not.have.been.called');
      cy.get('#field').should('have.value', type === 'reset' ? 'initial' : 'changed');
      if (type === 'submit') {
        cy.get(secondary).then($node => expect(submit.firstCall.args[0].submitter).to.equal($node[0]));
      }
    });
  }

  it('forwards external form metadata and prevents both submit and dismiss through consumer cancellation', () => {
    const submit = cy.spy().as('submit');
    const dismiss = cy.spy().as('dismiss');
    render(
      <>
        <form
          id="external"
          onSubmit={event => {
            event.preventDefault();
            submit();
          }}
        />
        <TagGroup aria-label="Calendars" onDismiss={dismiss}>
          {tag({
            type: 'submit',
            form: 'external',
            formAction: '/secondary-action',
            formMethod: 'post',
            formEncType: 'text/plain',
            formTarget: '_self',
            formNoValidate: true,
            onClick: event => event.preventDefault(),
          })}
          {tag({ id: 'positive', type: 'submit', form: 'external' })}
        </TagGroup>
      </>,
    );
    cy.get(secondary)
      .first()
      .should('have.attr', 'formaction', '/secondary-action')
      .and('have.attr', 'formmethod', 'post')
      .and('have.attr', 'formenctype', 'text/plain')
      .and('have.attr', 'formtarget', '_self')
      .and('have.attr', 'formnovalidate');
    cy.get(secondary).first().realClick();
    cy.get('@submit').should('not.have.been.called');
    cy.get('@dismiss').should('not.have.been.called');
    cy.get('#positive').realClick();
    cy.get('@submit').should('have.been.calledOnce');
    cy.get('@dismiss').should('have.been.calledOnce');
  });

  it('preserves caller Griffel classes last and native inline styles on the root', () => {
    const Example = () => {
      const styles = useSecondaryFixtureStyles();
      return tag({ className: styles.root, style: { paddingRight: webLightTheme.spacingHorizontalXL } });
    };
    render(<Example />);
    cy.get(secondary)
      .should('have.class', 'fui-InteractionTagSecondary')
      .and('have.css', 'color', color(webLightTheme.colorPaletteRedForeground1))
      .and('have.css', 'padding-left', webLightTheme.spacingHorizontalL)
      .and('have.css', 'padding-right', webLightTheme.spacingHorizontalXL);
  });

  for (const appearance of ['filled', 'outline', 'brand'] as const) {
    it(`uses exact ${appearance} hover held-press and disabled-selected token endpoints`, () => {
      const hover =
        appearance === 'brand'
          ? webLightTheme.colorBrandBackground2Hover
          : appearance === 'outline'
          ? webLightTheme.colorSubtleBackgroundHover
          : webLightTheme.colorNeutralBackground3Hover;
      const pressed =
        appearance === 'brand'
          ? webLightTheme.colorBrandBackground2Pressed
          : appearance === 'outline'
          ? webLightTheme.colorSubtleBackgroundPressed
          : webLightTheme.colorNeutralBackground3Pressed;
      render(tag({}, { appearance }));
      cy.get(secondary).realHover().should('have.css', 'background-color', color(hover));
      cy.get(secondary).realMouseDown().should('have.css', 'background-color', color(pressed));
      cy.get(secondary).realMouseUp();
      render(tag({ disabled: true }, { appearance, selected: true }));
      cy.get('body').realHover({ position: 'bottomRight' });
      cy.get(secondary)
        .should('have.css', 'color', color(webLightTheme.colorNeutralForegroundDisabled))
        .and(
          'have.css',
          'background-color',
          appearance === 'outline' ? 'rgba(0, 0, 0, 0)' : color(webLightTheme.colorNeutralBackgroundDisabled),
        );
    });
  }

  for (const [label, theme] of [
    ['dark', webDarkTheme],
    ['high-contrast-theme', teamsHighContrastTheme],
  ] as const) {
    it(`resolves ${label} provider tokens without claiming OS forced colors`, () => {
      mount(<FluentProvider theme={theme}>{tag({}, { appearance: 'brand' })}</FluentProvider>);
      cy.get('body').realHover({ position: 'bottomRight' });
      cy.get(secondary)
        .should('have.css', 'background-color', color(theme.colorBrandBackground2))
        .and('have.css', 'color', color(theme.colorBrandForeground2));
    });
  }

  it('refreshes overridden provider tokens live without remounting the native button', () => {
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <FluentProvider
          theme={
            updated
              ? {
                  ...webLightTheme,
                  colorNeutralBackground3: webDarkTheme.colorNeutralBackground3,
                  colorNeutralStroke1: webDarkTheme.colorNeutralStroke1,
                }
              : webLightTheme
          }
        >
          <button id="update" onClick={() => setUpdated(true)}>
            Update theme
          </button>
          {tag()}
        </FluentProvider>
      );
    };
    mount(<Example />);
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.get(secondary)
      .should('have.css', 'background-color', color(webLightTheme.colorNeutralBackground3))
      .then($before => {
        cy.get('#update').realClick();
        cy.get('body').realHover({ position: 'bottomRight' });
        cy.get(secondary)
          .should('have.css', 'background-color', color(webDarkTheme.colorNeutralBackground3))
          .and('have.css', 'border-left-color', color(webDarkTheme.colorNeutralStroke1))
          .should($after => expect($after[0]).to.equal($before[0]));
      });
  });

  for (const appearance of ['filled', 'outline', 'brand'] as const) {
    it(`provides bounded extra-small ${appearance} hit extensions above and below the visible button`, () => {
      const click = cy.spy().as('click');
      const Example = () => {
        const styles = useSecondaryFixtureStyles();
        return <div className={styles.container}>{tag({ onClick: click }, { size: 'extra-small', appearance })}</div>;
      };
      render(<Example />);
      cy.get(secondary).then($node => {
        const node = $node[0];
        const rect = node.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const doc = node.ownerDocument;
        for (const y of [rect.top - 1.5, rect.bottom + 1.5]) {
          expect(doc.elementFromPoint(x, y)).to.equal(node);
        }
        for (const y of [rect.top - 3, rect.bottom + 3]) {
          expect(doc.elementFromPoint(x, y)).not.to.equal(node);
        }
      });
      cy.get(secondary).realClick({ x: 10, y: -1 });
      cy.get(secondary).realClick({ x: 10, y: 21 });
      cy.get('@click').should('have.been.calledTwice');
    });
  }

  it('retains exact icon and root geometry under border-box sizing', () => {
    const Example = () => {
      const styles = useSecondaryFixtureStyles();
      return <div className={styles.borderBox}>{tag()}</div>;
    };
    render(<Example />);
    cy.get(secondary).should($node => expect($node[0].getBoundingClientRect().height).to.equal(32));
    cy.get(`${secondary} svg`).should($node => {
      expect($node[0].getBoundingClientRect().width).to.equal(20);
      expect($node[0].getBoundingClientRect().height).to.equal(20);
    });
  });

  for (const controlled of [false, true] as const) {
    it(`inherits ${
      controlled ? 'controlled' : 'uncontrolled'
    } group selection without toggling selection on dismissal`, () => {
      const select = cy.spy().as('select');
      const dismiss = cy.spy().as('dismiss');
      const groupProps: TagGroupProps = controlled
        ? { selectedValues: ['calendar'] }
        : { defaultSelectedValues: ['calendar'] };
      render(
        <TagGroup aria-label="Calendars" {...groupProps} onTagSelect={select} onDismiss={dismiss}>
          {tag()}
        </TagGroup>,
      );
      cy.get('body').realHover({ position: 'bottomRight' });
      cy.get(secondary).should('have.css', 'background-color', color(webLightTheme.colorBrandBackground));
      cy.get(secondary).realClick();
      cy.get('@select').should('not.have.been.called');
      cy.get('@dismiss').should('have.been.calledOnce');
      cy.get(primary).should('have.attr', 'aria-pressed', 'true').realClick();
      cy.get('@select').should('have.been.calledOnce');
      cy.get(primary).should('have.attr', 'aria-pressed', controlled ? 'true' : 'false');
      cy.get('body').realHover({ position: 'bottomRight' });
      cy.get(secondary).should(
        'have.css',
        'background-color',
        color(controlled ? webLightTheme.colorBrandBackground : webLightTheme.colorNeutralBackground3),
      );
    });
  }
});

describe('InteractionTagSecondary finite inherited style matrix', () => {
  for (const appearance of ['filled', 'outline', 'brand'] as const) {
    for (const [size, height, font] of [
      ['medium', 32, 20],
      ['small', 24, 16],
      ['extra-small', 20, 12],
    ] as const) {
      for (const shape of ['rounded', 'circular'] as const) {
        for (const disabled of [false, true]) {
          for (const selected of [false, true]) {
            it(`resolves ${appearance}/${size}/${shape}/disabled=${disabled}/selected=${selected} inherited endpoints`, () => {
              render(tag({}, { appearance, size, shape, disabled, selected }));
              cy.get('body').realHover({ position: 'bottomRight' });
              const background = disabled
                ? appearance === 'outline'
                  ? 'rgba(0, 0, 0, 0)'
                  : color(webLightTheme.colorNeutralBackgroundDisabled)
                : selected
                ? color(webLightTheme.colorBrandBackground)
                : appearance === 'outline'
                ? 'rgba(0, 0, 0, 0)'
                : color(
                    appearance === 'brand'
                      ? webLightTheme.colorBrandBackground2
                      : webLightTheme.colorNeutralBackground3,
                  );
              const foreground = disabled
                ? webLightTheme.colorNeutralForegroundDisabled
                : selected
                ? webLightTheme.colorNeutralForegroundOnBrand
                : appearance === 'brand'
                ? webLightTheme.colorBrandForeground2
                : webLightTheme.colorNeutralForeground2;
              cy.get(secondary)
                .should(disabled ? 'be.disabled' : 'be.enabled')
                .and('have.css', 'font-size', `${font}px`)
                .and('have.css', 'background-color', background)
                .and('have.css', 'color', color(foreground))
                .and(
                  'have.css',
                  'border-top-right-radius',
                  shape === 'rounded' ? webLightTheme.borderRadiusMedium : webLightTheme.borderRadiusCircular,
                )
                .and('have.css', 'border-top-left-radius', '0px')
                .should($node => expect($node[0].getBoundingClientRect().height).to.equal(height));
            });
          }
        }
      }
    }
  }
});

describe('InteractionTagSecondary additional native boundaries', () => {
  it('ignores standalone navigation keys without dismissal and retains native activation as a positive control', () => {
    const dismiss = cy.spy().as('dismiss');
    const context: InteractionTagContextValue = {
      appearance: 'filled',
      disabled: false,
      selected: false,
      selectedValues: [],
      shape: 'rounded',
      size: 'medium',
      value: 'standalone',
      interactionTagPrimaryId: 'label',
      handleTagDismiss: dismiss,
    };
    render(
      <>
        <span id="label">Calendar</span>
        <InteractionTagContextProvider value={context}>
          <InteractionTagSecondary aria-label="Remove" />
        </InteractionTagContextProvider>
      </>,
    );
    cy.get(secondary).focus();
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'] as const) {
      cy.realPress(key);
    }
    cy.get('@dismiss').should('not.have.been.called');
    cy.get(secondary).should('have.focus');
    cy.realPress('Enter');
    cy.get('@dismiss').should('have.been.calledOnce');
  });

  it('shows the token focus outline on keyboard Tab entry without invoking dismissal', () => {
    const click = cy.spy().as('click');
    render(
      <>
        <button id="before">Before</button>
        {tag({ onClick: click })}
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get(primary).should('have.focus');
    cy.realPress('Tab');
    cy.get(secondary)
      .should('have.focus')
      .and('have.css', 'outline-style', 'solid')
      .and('have.css', 'outline-width', webLightTheme.strokeWidthThick)
      .and('have.css', 'outline-color', color(webLightTheme.colorStrokeFocus2));
    cy.get('@click').should('not.have.been.called');
  });

  for (const appearance of ['filled', 'outline', 'brand'] as const) {
    it(`keeps selected ${appearance} hover and held press endpoints above its appearance styling`, () => {
      render(tag({}, { appearance, selected: true }));
      cy.get(secondary)
        .realHover()
        .should('have.css', 'background-color', color(webLightTheme.colorBrandBackgroundHover))
        .and('have.css', 'color', color(webLightTheme.colorNeutralForegroundOnBrand));
      cy.get(secondary)
        .realMouseDown()
        .should('have.css', 'background-color', color(webLightTheme.colorBrandBackgroundPressed))
        .and('have.css', 'color', color(webLightTheme.colorNeutralForegroundOnBrand));
      cy.get(secondary).realMouseUp();
    });
  }

  it('updates controlled group selectedValues live without remounting or letting dismiss mutate them', () => {
    const dismiss = cy.spy().as('dismiss');
    const Example = () => {
      const [selectedValues, setSelectedValues] = React.useState<string[]>([]);
      return (
        <>
          <button id="update" onClick={() => setSelectedValues(['calendar'])}>
            Select externally
          </button>
          <TagGroup
            aria-label="Calendars"
            selectedValues={selectedValues}
            onTagSelect={() => undefined}
            onDismiss={dismiss}
          >
            {tag()}
          </TagGroup>
        </>
      );
    };
    render(<Example />);
    cy.get(primary).should('have.attr', 'aria-pressed', 'false');
    cy.get(secondary).then($before => {
      cy.get('#update').realClick();
      cy.get(primary).should('have.attr', 'aria-pressed', 'true');
      cy.get(secondary)
        .should($after => expect($after[0]).to.equal($before[0]))
        .realClick();
      cy.get('@dismiss').should('have.been.calledOnce');
      cy.get(primary).should('have.attr', 'aria-pressed', 'true');
    });
  });

  it('honors explicit empty and external aria-labelledby overrides instead of restoring the inherited name', () => {
    const Example = () => {
      const [external, setExternal] = React.useState(false);
      return (
        <>
          <span id="action-label">Close Work Calendar</span>
          <button id="update" onClick={() => setExternal(true)}>
            Update
          </button>
          {tag({ 'aria-labelledby': external ? 'action-label' : '', 'aria-label': 'Standalone label' })}
        </>
      );
    };
    render(<Example />);
    cy.get(secondary).should($node => {
      expect(labelledByTokens($node[0])).to.deep.equal([]);
      expect(labelledByTargets($node[0])).to.deep.equal([]);
    });
    name('Standalone label');
    cy.get('#update').realClick();
    cy.get('#action-label').then($label => {
      cy.get(secondary).should($node => {
        expect(labelledByTokens($node[0])).to.deep.equal([$label[0].id]);
        expect(labelledByTargets($node[0])).to.deep.equal([$label[0]]);
      });
    });
    name('Close Work Calendar');
  });

  it('preserves native tabIndex autofocus focus and blur callbacks without fabricating disabled focusability', () => {
    const focus = cy.spy().as('focus');
    const blur = cy.spy().as('blur');
    render(
      <>
        {tag({ autoFocus: true, tabIndex: -1, onFocus: focus, onBlur: blur })}
        <button id="after">After</button>
      </>,
    );
    cy.get(secondary).should('have.focus').and('have.attr', 'tabindex', '-1');
    cy.get('@focus').should('have.been.calledOnce');
    cy.get('#after').focus();
    cy.get('@blur').should('have.been.calledOnce');
    cy.get(secondary).focus();
    cy.get('@focus').should('have.been.calledTwice');
  });

  it('honors capture-phase keyboard prevention before the consumer keydown and dismiss handler', () => {
    const dismiss = cy.spy().as('dismiss');
    const prevented = cy.spy().as('prevented');
    render(
      <TagGroup aria-label="Calendars" onDismiss={dismiss}>
        {tag(
          { onKeyDown: event => prevented(event.defaultPrevented) },
          { onKeyDownCapture: event => event.preventDefault() },
        )}
      </TagGroup>,
    );
    cy.get(secondary).focus();
    cy.realPress('Delete');
    cy.get('@prevented').should('have.been.calledWithExactly', true);
    cy.get('@dismiss').should('not.have.been.called');
    cy.get(secondary).realClick();
    cy.get('@dismiss').should('have.been.calledOnce');
  });

  it('characterizes modified Delete as dismissal because the hook tests the key not modifier state', () => {
    const dismiss = cy.spy().as('dismiss');
    render(
      <TagGroup aria-label="Calendars" onDismiss={dismiss}>
        {tag()}
      </TagGroup>,
    );
    cy.get(secondary).focus();
    cy.realPress(['Shift', 'Delete']);
    cy.get('@dismiss')
      .should('have.been.calledOnce')
      .then(() => {
        expect(dismiss.firstCall.args[0].key).to.equal('Delete');
        expect(dismiss.firstCall.args[0].shiftKey).to.equal(true);
      });
  });

  for (const type of ['submit', 'reset'] as const) {
    for (const key of ['Enter', 'Space'] as const) {
      it(`uses native ${key} ${type} form action once with the same dismiss click`, () => {
        const action = cy.spy().as('action');
        const dismiss = cy.spy().as('dismiss');
        render(
          <form
            onSubmit={event => {
              event.preventDefault();
              action('submit');
            }}
            onReset={() => action('reset')}
          >
            <input id="field" aria-label="Text" defaultValue="initial" />
            <TagGroup aria-label="Calendars" onDismiss={dismiss}>
              {tag({ type })}
            </TagGroup>
          </form>,
        );
        cy.get('#field').clear().type('changed');
        cy.get(secondary).focus();
        cy.realPress(key);
        cy.get('@action').should('have.been.calledOnce').and('have.been.calledWithExactly', type);
        cy.get('@dismiss').should('have.been.calledOnce');
        cy.get('#field').should('have.value', type === 'reset' ? 'initial' : 'changed');
      });
    }
  }
});

describe('InteractionTagSecondary emulated forced-colors contracts', () => {
  const media = (value: string) =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [{ name: 'forced-colors', value }] },
    });
  afterEach(() => cy.then(() => media('none')));

  for (const appearance of ['filled', 'outline', 'brand'] as const) {
    it(`activates ${appearance} forced-color borders and removes compact pseudo hit extensions`, () => {
      render(tag({}, { size: 'extra-small', appearance }));
      cy.then(() => media('active'));
      cy.window().should(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true));
      cy.get(secondary)
        .should('have.css', 'border-top-width', webLightTheme.strokeWidthThin)
        .and('have.css', 'border-bottom-width', webLightTheme.strokeWidthThin)
        .should($node => {
          const win = $node[0].ownerDocument.defaultView!;
          expect(win.getComputedStyle($node[0], '::before').content).to.equal('none');
          expect(win.getComputedStyle($node[0], '::after').content).to.equal('none');
        });
    });
  }

  it('retains selected system Highlight colors through hover and held press under forced colors', () => {
    render(tag({}, { selected: true }));
    cy.then(() => media('active'));
    cy.window().should(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true));
    cy.get(secondary)
      .should('have.css', 'forced-color-adjust', 'none')
      .then($node => {
        const probe = $node[0].ownerDocument.createElement('span');
        probe.style.backgroundColor = 'Highlight';
        probe.style.color = 'HighlightText';
        $node[0].parentElement!.appendChild(probe);
        const computed = $node[0].ownerDocument.defaultView!.getComputedStyle(probe);
        const background = computed.backgroundColor;
        const foreground = computed.color;
        probe.remove();
        cy.get(secondary).should('have.css', 'background-color', background).and('have.css', 'color', foreground);
        cy.get(secondary).realHover().should('have.css', 'background-color', background);
        cy.get(secondary).realMouseDown().should('have.css', 'background-color', background);
        cy.get(secondary).realMouseUp();
      });
  });
});
