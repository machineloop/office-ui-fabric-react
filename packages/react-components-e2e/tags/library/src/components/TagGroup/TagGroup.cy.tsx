import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import { InteractionTag } from '../InteractionTag/InteractionTag';
import { InteractionTagPrimary } from '../InteractionTagPrimary/InteractionTagPrimary';
import { InteractionTagSecondary } from '../InteractionTagSecondary/InteractionTagSecondary';
import { TagGroup } from './TagGroup';
import type { TagGroupProps } from './TagGroup.types';
import { Tag } from '../Tag/Tag';
import type { JSXElement } from '@fluentui/react-utilities';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import { useCoverageStyles } from './TagGroupCoverage.styles';
import { Overflow, OverflowItem, useOverflowMenu } from '@fluentui/react-overflow';

const mount = (element: JSXElement) => {
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
};

const initialTags = [
  {
    value: '1',
    children: (
      <Tag dismissible value={'1'} key={'1'} id="tag-1">
        Tag 1
      </Tag>
    ),
  },
  {
    value: '2',
    children: (
      <InteractionTag value={'2'} key={'2'} id="tag-2">
        <InteractionTagPrimary id="tag-2-primary" hasSecondaryAction>
          Interaction Tag 2
        </InteractionTagPrimary>
        <InteractionTagSecondary id="tag-2-secondary" />
      </InteractionTag>
    ),
  },
  {
    value: '3',
    children: (
      <Tag dismissible value={'3'} key={'3'} id="tag-3">
        Tag 3
      </Tag>
    ),
  },
];

const selectableTags = [
  {
    value: '1',
    children: (
      <InteractionTag value={'1'} key={'1'} id="tag-1">
        <InteractionTagPrimary id="tag-1-primary">Tag 1</InteractionTagPrimary>
      </InteractionTag>
    ),
  },
  {
    value: '2',
    children: (
      <InteractionTag value={'2'} key={'2'} id="tag-2">
        <InteractionTagPrimary id="tag-2-primary" hasSecondaryAction>
          Tag 2
        </InteractionTagPrimary>
        <InteractionTagSecondary id="tag-2-secondary" />
      </InteractionTag>
    ),
  },
  {
    value: '3',
    children: (
      <InteractionTag value={'3'} key={'3'} id="tag-3">
        <InteractionTagPrimary id="tag-3-primary">Tag 3</InteractionTagPrimary>
      </InteractionTag>
    ),
  },
];

const DismissExample = () => {
  const [visibleTags, setVisibleTags] = React.useState(initialTags);
  const removeItem: TagGroupProps['onDismiss'] = (_e, { value }) => {
    setVisibleTags([...visibleTags].filter(tag => tag.value !== value));
  };

  return <TagGroup onDismiss={removeItem}>{visibleTags.map(({ children }) => children)}</TagGroup>;
};

const SelectExample = () => {
  const [seletedTags, setSelectedTags] = React.useState<Array<string> | undefined>([]);
  const selectItem: TagGroupProps['onTagSelect'] = (_e, { value }) => {
    if (!seletedTags) {
      return;
    }
    if (seletedTags.includes(value)) {
      setSelectedTags(seletedTags.filter(tag => tag !== value));
    } else {
      setSelectedTags([...seletedTags, value]);
    }
  };

  return (
    <>
      <div id="selected-tags">{seletedTags?.join(', ')}</div>
      <TagGroup onTagSelect={selectItem}>{selectableTags.map(({ children }) => children)}</TagGroup>
    </>
  );
};

const MixedTags = ({ disabled = false }: { disabled?: boolean }) => (
  <>
    <Tag id="plain">Static</Tag>
    <Tag id="dismiss" dismissible value="plain-value" disabled={disabled} dismissIcon={{ 'aria-label': 'Remove' }}>
      Alpha
    </Tag>
    <InteractionTag id="interaction" value="interaction-value" disabled={disabled}>
      <InteractionTagPrimary id="primary" hasSecondaryAction>
        Beta
      </InteractionTagPrimary>
      <InteractionTagSecondary id="secondary" aria-label="Remove" aria-labelledby="primary secondary" />
    </InteractionTag>
    <InteractionTag value="last-value">
      <InteractionTagPrimary id="last">Gamma</InteractionTagPrimary>
    </InteractionTag>
  </>
);

const scanNamedGroupWithoutTabsterSentinels = () => {
  cy.get('.fui-TagGroup [data-tabster-dummy]')
    .should('have.length', 2)
    .each($sentinel => {
      expect($sentinel.attr('aria-hidden')).to.equal('true');
      expect($sentinel.attr('tabindex')).to.equal('0');
    });
  cy.get('.fui-TagGroup').then($root =>
    axe.run({ include: [$root[0]], exclude: [['[data-tabster-dummy]']] }).then(result => {
      expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([]);
      expect(result.passes.length).to.be.greaterThan(0);
    }),
  );
};

const RemovalExample = ({ interaction = false }: { interaction?: boolean }) => {
  const [values, setValues] = React.useState(['a', 'b', 'c']);
  const reset = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!values.length) {
      reset.current?.focus();
    }
  }, [values.length]);
  return (
    <>
      <TagGroup
        aria-label="Removable"
        onDismiss={(_event, data) => setValues(current => current.filter(value => value !== data.value))}
      >
        {values.map(value =>
          interaction ? (
            <InteractionTag key={value} value={value} id={`item-${value}`}>
              <InteractionTagPrimary id={`item-${value}-primary`} hasSecondaryAction>
                {value}
              </InteractionTagPrimary>
              <InteractionTagSecondary id={`item-${value}-remove`} aria-label="Remove" />
            </InteractionTag>
          ) : (
            <Tag key={value} value={value} id={`item-${value}`} dismissible>
              {value}
            </Tag>
          ),
        )}
      </TagGroup>
      <button ref={reset} id="reset" onClick={() => setValues(['a', 'b', 'c'])}>
        Reset
      </button>
    </>
  );
};

describe('TagGroup', () => {
  describe('Dismiss', () => {
    beforeEach(() => {
      mount(<DismissExample />);
    });

    it('click Tag should dismiss it and focus on the next focusable', () => {
      cy.get('#tag-1').realClick();
      cy.get('#tag-2-primary').should('have.focus');
      cy.get('#tag-1').should('not.exist');
    });

    it('backspace keydown on last Tag should dismiss it and focus on the prev focusable', () => {
      cy.get('#tag-3').focus().realPress('Backspace');
      cy.get('#tag-2-secondary').should('have.focus');
      cy.get('#tag-3').should('not.exist');
    });

    it('delete keydown on InteractionTag secondary should dismiss it and focus on the next focusable', () => {
      cy.get('#tag-2-secondary').focus().realPress('Delete');
      cy.get('#tag-3').should('have.focus');
      cy.get('#tag-2').should('not.exist');
    });
  });

  describe('TagGroup documented contracts', () => {
    it('defaults to a named toolbar rather than the stale spec listbox default', () => {
      mount(
        <TagGroup aria-label="Tools">
          <MixedTags />
        </TagGroup>,
      );
      cy.get('.fui-TagGroup').should('have.attr', 'role', 'toolbar').and('have.attr', 'aria-label', 'Tools');
      cy.get('#primary').should('have.prop', 'tagName', 'BUTTON').and('not.have.attr', 'aria-pressed');
      cy.get('#plain').should('have.prop', 'tagName', 'SPAN').and('not.have.attr', 'tabindex');
    });

    describe('TagGroup keyboard and accessibility edges', () => {
      (['ltr', 'rtl'] as const).forEach(dir => {
        it(`uses circular real horizontal navigation across both interaction buttons in ${dir}`, () => {
          mountBase(
            <FluentProvider theme={teamsLightTheme} dir={dir}>
              <button id="before">Before</button>
              <TagGroup aria-label="Navigation">
                <MixedTags />
              </TagGroup>
              <button id="after">After</button>
            </FluentProvider>,
          );
          const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
          const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
          cy.get('.fui-TagGroup').should('have.css', 'direction', dir);
          cy.get('#before').realClick().realPress('Tab');
          cy.get('#dismiss').should('have.focus').realPress(forward);
          cy.get('#primary').should('have.focus').realPress(forward);
          cy.get('#secondary').should('have.focus').realPress(forward);
          cy.get('#last').should('have.focus').realPress(forward);
          cy.get('#dismiss').should('have.focus').realPress(backward);
          cy.get('#last').should('have.focus');
        });

        it(`Tab and ShiftTab leave one group stop and memorize the current secondary action in ${dir}`, () => {
          mountBase(
            <FluentProvider theme={teamsLightTheme} dir={dir}>
              <button id="before">Before</button>
              <TagGroup aria-label="Navigation">
                <MixedTags />
              </TagGroup>
              <button id="after">After</button>
            </FluentProvider>,
          );
          cy.get('#primary')
            .realClick()
            .realPress(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
          cy.get('#secondary').should('have.focus').realPress('Tab');
          cy.get('#after').should('have.focus').realPress(['Shift', 'Tab']);
          cy.get('#secondary').should('have.focus').realPress(['Shift', 'Tab']);
          cy.get('#before').should('have.focus').realPress('Tab');
          cy.get('#secondary').should('have.focus');
        });
      });

      it('uses both-axis real vertical navigation and circular boundaries', () => {
        mount(
          <TagGroup aria-label="Vertical">
            <MixedTags />
          </TagGroup>,
        );
        cy.get('#dismiss').focus().realPress('ArrowDown');
        cy.get('#primary').should('have.focus').realPress('ArrowDown');
        cy.get('#secondary').should('have.focus').realPress('ArrowUp');
        cy.get('#primary').should('have.focus');
      });

      it('skips passive and disabled tags while retaining enabled primary and secondary actions', () => {
        mount(
          <TagGroup aria-label="Skip disabled">
            <Tag>Static</Tag>
            <Tag dismissible disabled id="disabled-tag">
              Disabled
            </Tag>
            <InteractionTag disabled>
              <InteractionTagPrimary hasSecondaryAction>Disabled primary</InteractionTagPrimary>
              <InteractionTagSecondary aria-label="Remove" />
            </InteractionTag>
            <MixedTags />
          </TagGroup>,
        );
        cy.get('#last').focus().realPress('ArrowRight');
        cy.get('#dismiss').should('have.focus').realPress('ArrowLeft');
        cy.get('#last').should('have.focus');
        cy.get('#disabled-tag').should('be.disabled').and('not.have.focus');
      });

      (['a', 'b', 'c'] as const).forEach(value => {
        (['tag', 'interaction'] as const).forEach(composition => {
          it(`consumer removal of ${value} ${composition} focuses the next or previous tag boundary`, () => {
            mount(<RemovalExample interaction={composition === 'interaction'} />);
            const suffix = composition === 'interaction' ? '-remove' : '';
            cy.get(`#item-${value}${suffix}`).focus().realPress('Delete');
            cy.get(`#item-${value}`).should('not.exist');
            const next = value === 'c' ? 'b' : value === 'a' ? 'b' : 'c';
            const focusSuffix = composition === 'interaction' ? (value === 'c' ? '-remove' : '-primary') : '';
            cy.get(`#item-${next}${focusSuffix}`).should('have.focus');
          });
        });
      });

      it('consumer removal of all InteractionTags focuses the consumer reset action', () => {
        mount(<RemovalExample interaction />);
        cy.get('#item-a-remove').focus().realPress('Backspace');
        cy.get('#item-b-primary').should('have.focus');
        cy.get('#item-b-remove').focus().realPress('Enter');
        cy.get('#item-c-primary').should('have.focus');
        cy.get('#item-c-remove').focus().realPress('Space');
        cy.get('#reset').should('have.focus');
        cy.get('.fui-TagGroup button').should('not.exist');
      });

      it('does not dismiss on unrelated keys or on an InteractionTag primary action', () => {
        const dismiss = cy.spy().as('dismiss');
        const select = cy.spy().as('select');
        mount(
          <TagGroup onDismiss={dismiss} onTagSelect={select}>
            <MixedTags />
          </TagGroup>,
        );
        cy.get('#dismiss').focus().realPress('Escape').realPress('a');
        cy.get('#primary').focus().realPress('Delete').realPress('Backspace').realPress('Enter');
        cy.get('@dismiss').should('not.have.been.called');
        cy.get('@select').should('have.been.calledOnce');
        cy.get('#primary').should('have.attr', 'aria-pressed', 'true');
      });

      (['Escape', 'a'] as const).forEach(key => {
        it(`secondary ${key} does not activate either callback while Enter and Space each dismiss once`, () => {
          const dismiss = cy.spy().as('dismiss');
          const select = cy.spy().as('select');
          mount(
            <TagGroup aria-label="Secondary key controls" onDismiss={dismiss} onTagSelect={select}>
              <MixedTags />
            </TagGroup>,
          );
          cy.get('#secondary').focus().realPress(key);
          cy.get('#secondary').should('have.focus');
          cy.get('@dismiss').should('not.have.been.called');
          cy.get('@select').should('not.have.been.called');
          cy.get('#primary').should('have.attr', 'aria-pressed', 'false');
          cy.get('#secondary').realPress('Enter');
          cy.get('@dismiss').should('have.been.calledOnce');
          cy.get('#last').should('have.focus');
          cy.get('#secondary').focus().realPress('Space');
          cy.get('@dismiss')
            .should('have.been.calledTwice')
            .then(() => {
              dismiss.getCalls().forEach(call => {
                expect(call.args[0].type).to.equal('click');
                expect(call.args[1]).to.deep.equal({ value: 'interaction-value' });
              });
            });
          cy.get('#last').should('have.focus');
          cy.get('#interaction').should('exist');
          cy.get('#primary').should('have.attr', 'aria-pressed', 'false');
          cy.get('@select').should('not.have.been.called');
        });
      });

      it('computes group label and description with valid child dismiss name references', () => {
        mount(
          <>
            <h2 id="group-label">Chosen categories</h2>
            <p id="group-description">Use arrow keys</p>
            <TagGroup aria-labelledby="group-label" aria-describedby="group-description">
              <MixedTags />
            </TagGroup>
          </>,
        );
        cy.get('.fui-TagGroup').should($root => {
          expect(computeAccessibleName($root[0])).to.equal('Chosen categories');
          expect(computeAccessibleDescription($root[0])).to.equal('Use arrow keys');
        });
        cy.get('#dismiss').should($root => expect(computeAccessibleName($root[0])).to.equal('Alpha Remove'));
        cy.get('#secondary').should($root => {
          expect(computeAccessibleName($root[0])).to.equal('Beta Remove');
          const ids = $root.attr('aria-labelledby')?.split(' ');
          expect(ids).to.deep.equal(['primary', 'secondary']);
          ids?.forEach(id => expect($root[0].ownerDocument.getElementById(id)).not.to.equal(null));
        });
      });

      (['toolbar', 'list', 'listbox'] as const).forEach(role => {
        it(`passes axe excluding inherited hidden focusable Tabster sentinels for the named ${role} composition`, () => {
          mount(
            <TagGroup role={role} aria-label="Categories">
              {role === 'toolbar' ? (
                <MixedTags />
              ) : (
                <>
                  <Tag role={role === 'list' ? 'listitem' : 'option'} selected={role === 'listbox' ? true : undefined}>
                    Alpha
                  </Tag>
                  <Tag role={role === 'list' ? 'listitem' : 'option'} selected={role === 'listbox' ? false : undefined}>
                    Beta
                  </Tag>
                </>
              )}
            </TagGroup>,
          );
          scanNamedGroupWithoutTabsterSentinels();
        });
      });

      (['selected', 'disabled'] as const).forEach(state => {
        it(`passes scoped axe for named mixed toolbar ${state} actions excluding only inherited Tabster sentinels`, () => {
          mount(
            <TagGroup
              aria-label={`Categories ${state}`}
              disabled={state === 'disabled'}
              defaultSelectedValues={['interaction-value']}
              onTagSelect={cy.spy().as('select')}
            >
              <MixedTags />
            </TagGroup>,
          );
          cy.get('.fui-TagGroup').should($root => {
            expect($root.attr('role')).to.equal('toolbar');
            expect(computeAccessibleName($root[0])).to.equal(`Categories ${state}`);
            expect($root.attr('aria-disabled')).to.equal(String(state === 'disabled'));
          });
          cy.get('.fui-TagGroup button')
            .should('have.length', 4)
            .each($button => {
              expect($button.prop('disabled')).to.equal(state === 'disabled');
            });
          [
            ['#dismiss', 'Alpha Remove'],
            ['#primary', 'Beta'],
            ['#secondary', 'Beta Remove'],
            ['#last', 'Gamma'],
          ].forEach(([selector, name]) => {
            cy.get(selector).should($action => expect(computeAccessibleName($action[0])).to.equal(name));
          });
          cy.get('#primary').should('have.attr', 'aria-pressed', 'true');
          cy.get('#last').should('have.attr', 'aria-pressed', 'false');
          scanNamedGroupWithoutTabsterSentinels();
        });
      });

      (['ltr', 'rtl'] as const).forEach(dir => {
        (['medium', 'small', 'extra-small'] as const).forEach(size => {
          it(`lays out every mixed child and both interaction actions with ${size} dimensions and token gaps in ${dir}`, () => {
            mountBase(
              <FluentProvider theme={teamsLightTheme} dir={dir}>
                <TagGroup size={size} aria-label="Measured mixed tags">
                  <MixedTags />
                </TagGroup>
              </FluentProvider>,
            );
            const height = { medium: 32, small: 24, 'extra-small': 20 }[size];
            const gap = {
              medium: teamsLightTheme.spacingHorizontalS,
              small: teamsLightTheme.spacingHorizontalSNudge,
              'extra-small': teamsLightTheme.spacingHorizontalXS,
            }[size];
            cy.get('.fui-TagGroup')
              .should('have.css', 'direction', dir)
              .and('have.css', 'column-gap', gap)
              .should($root => {
                const children = Array.from($root[0].children).filter(child =>
                  child.matches('.fui-Tag, .fui-InteractionTag'),
                );
                expect(children).to.have.length(4);
                expect(children.map(child => child.textContent?.trim())).to.deep.equal([
                  'Static',
                  'Alpha',
                  'Beta',
                  'Gamma',
                ]);
                const rectangles = children.map(child => child.getBoundingClientRect());
                const root = $root[0].getBoundingClientRect();
                rectangles.forEach((rect, index) => {
                  expect(rect.width, `child ${index} width`).to.be.greaterThan(0);
                  expect(rect.height, `child ${index} height`).to.be.closeTo(height, 0.5);
                  expect(rect.top, `child ${index} alignment`).to.be.closeTo(root.top, 0.5);
                  expect(rect.left, `child ${index} contained left`).to.be.at.least(root.left - 0.5);
                  expect(rect.right, `child ${index} contained right`).to.be.at.most(root.right + 0.5);
                  if (index > 0) {
                    const previous = rectangles[index - 1];
                    const separation = dir === 'rtl' ? previous.left - rect.right : rect.left - previous.right;
                    expect(separation, `gap before child ${index}`).to.be.closeTo(parseFloat(gap), 0.5);
                  }
                });
                expect(root.height).to.be.closeTo(height, 0.5);
                expect(root.width).to.be.closeTo(
                  rectangles.reduce((width, rect) => width + rect.width, 0) + parseFloat(gap) * (rectangles.length - 1),
                  0.5,
                );
                const actions = Array.from(children[2].querySelectorAll('button')).map(action =>
                  action.getBoundingClientRect(),
                );
                expect(actions).to.have.length(2);
                actions.forEach(action => {
                  expect(action.width).to.be.greaterThan(0);
                  expect(action.height).to.be.closeTo(height, 0.5);
                  expect(action.top).to.be.closeTo(rectangles[2].top, 0.5);
                });
                const actionGap =
                  dir === 'rtl' ? actions[0].left - actions[1].right : actions[1].left - actions[0].right;
                expect(actionGap, 'primary/secondary adjacency').to.be.closeTo(0, 0.5);
                expect(actions[0].width + actions[1].width).to.be.closeTo(rectangles[2].width, 0.5);
              });
          });
        });
      });

      it('forwards the root ref native attributes style class and composed root events', () => {
        const ref = React.createRef<HTMLDivElement>();
        const click = cy.spy().as('root-click');
        const key = cy.spy().as('root-key');
        const dismiss = cy.spy().as('dismiss');
        mount(
          <TagGroup
            ref={ref}
            id="native-root"
            title="Native title"
            data-test="native"
            className="consumer-class"
            style={{ flexWrap: 'wrap' }}
            onClick={click}
            onKeyDown={key}
            onDismiss={dismiss}
          >
            <MixedTags />
          </TagGroup>,
        );
        cy.get('#native-root')
          .should('have.class', 'fui-TagGroup')
          .and('have.class', 'consumer-class')
          .and('have.attr', 'title', 'Native title')
          .and('have.attr', 'data-test', 'native')
          .and('have.css', 'flex-wrap', 'wrap')
          .then($root => expect(ref.current).to.equal($root[0]));
        cy.get('#dismiss').realClick().focus().realPress('Delete');
        cy.get('@root-click').should('have.been.calledOnce');
        cy.get('@root-key').should('have.been.calledOnce');
        cy.get('@dismiss').should('have.been.calledTwice');
      });

      it('root render functions retain context events and generated root attributes', () => {
        const dismiss = cy.spy().as('dismiss');
        mount(
          <TagGroup size="small" dismissible aria-label="Rendered" onDismiss={dismiss}>
            {(
              Root: React.ElementType<React.ComponentPropsWithRef<'div'>>,
              props: React.ComponentPropsWithRef<'div'>,
            ) => (
              <Root {...props} data-rendered="yes">
                <Tag id="rendered-child" value="rendered">
                  Rendered child
                </Tag>
              </Root>
            )}
          </TagGroup>,
        );
        cy.get('[data-rendered=yes]').should('have.attr', 'role', 'toolbar').and('have.attr', 'aria-label', 'Rendered');
        cy.get('#rendered-child').should('have.css', 'height', '24px').realClick();
        cy.get('@dismiss').should('have.been.calledOnce');
      });
    });

    it('supports the documented passive list and listitem composition', () => {
      mount(
        <TagGroup role="list" aria-label="Categories">
          <Tag role="listitem">First</Tag>
          <Tag role="listitem">Second</Tag>
        </TagGroup>,
      );
      cy.get('[role=list]').should('have.attr', 'aria-label', 'Categories');
      cy.get('[role=listitem]').should('have.length', 2);
      cy.get('.fui-TagGroup button').should('not.exist');
    });

    it('supports explicit listbox option roles and consumer-owned Tag selection', () => {
      mount(
        <TagGroup role="listbox" aria-label="Picked">
          <Tag dismissible selected value="a">
            Alpha
          </Tag>
          <Tag dismissible selected={false} value="b">
            Beta
          </Tag>
        </TagGroup>,
      );
      cy.get('[role=option]').should('have.length', 2);
      cy.contains('[role=option]', 'Alpha').should('have.attr', 'aria-selected', 'true');
      cy.contains('[role=option]', 'Beta').should('have.attr', 'aria-selected', 'false');
      cy.get('[role=option]').should('not.have.attr', 'aria-pressed');
    });

    (['medium', 'small', 'extra-small'] as const).forEach(size => {
      (['filled', 'outline', 'brand'] as const).forEach(appearance => {
        it(`inherits ${size} size and ${appearance} appearance across both tag compositions`, () => {
          mount(
            <TagGroup size={size} appearance={appearance}>
              <MixedTags />
            </TagGroup>,
          );
          const height = { medium: '32px', small: '24px', 'extra-small': '20px' }[size];
          const gap = { medium: '8px', small: '6px', 'extra-small': '4px' }[size];
          const background = {
            filled: teamsLightTheme.colorNeutralBackground3,
            outline: teamsLightTheme.colorSubtleBackground,
            brand: teamsLightTheme.colorBrandBackground2,
          }[appearance];
          cy.get('.fui-TagGroup').should('have.css', 'display', 'inline-flex').and('have.css', 'column-gap', gap);
          cy.get('#dismiss').should('have.css', 'height', height);
          cy.get('#primary').should('have.css', 'height', height);
          cy.get('#dismiss').then($tag => {
            const probe = $tag[0].ownerDocument.createElement('span');
            probe.style.backgroundColor = background;
            $tag[0].appendChild(probe);
            expect($tag.css('background-color')).to.equal(
              probe.ownerDocument.defaultView?.getComputedStyle(probe).backgroundColor,
            );
            probe.remove();
          });
          cy.get('#dismiss').then($tag => {
            cy.get('#primary').should('have.css', 'background-color', $tag.css('background-color'));
          });
        });
      });
    });

    it('allows explicit child size appearance and dismissibility overrides', () => {
      mount(
        <TagGroup size="small" appearance="brand" dismissible>
          <Tag id="inherited">Inherited</Tag>
          <Tag id="override" size="medium" appearance="outline" dismissible={false}>
            Override
          </Tag>
          <InteractionTag size="extra-small" appearance="outline">
            <InteractionTagPrimary id="interaction-override">Override interaction</InteractionTagPrimary>
          </InteractionTag>
        </TagGroup>,
      );
      cy.get('#inherited').should('have.prop', 'tagName', 'BUTTON').and('have.css', 'height', '24px');
      cy.get('#override').should('have.prop', 'tagName', 'SPAN').and('have.css', 'height', '32px');
      cy.get('#interaction-override').should('have.css', 'height', '20px');
      cy.get('.fui-InteractionTagSecondary').should('not.exist');
      cy.get('#override')
        .should('have.css', 'border-top-color')
        .then(color => {
          cy.get('#interaction-override').should('have.css', 'border-top-color', color);
        });
    });

    it('group disabled overrides explicit enabled children and blocks real actions', () => {
      const dismiss = cy.spy().as('dismiss');
      const select = cy.spy().as('select');
      mount(
        <>
          <TagGroup disabled onDismiss={dismiss} onTagSelect={select}>
            <MixedTags disabled={false} />
          </TagGroup>
          <button id="outside">Outside</button>
        </>,
      );
      cy.get('.fui-TagGroup').should('have.attr', 'aria-disabled', 'true');
      cy.get('.fui-TagGroup button').each($button => cy.wrap($button).should('be.disabled'));
      cy.get('#dismiss').realClick();
      cy.get('#primary').realClick();
      cy.get('#secondary').realClick();
      cy.get('@dismiss').should('not.have.been.called');
      cy.get('@select').should('not.have.been.called');
      cy.get('#outside').realClick().realPress(['Shift', 'Tab']);
      cy.get('.fui-TagGroup button').should('not.have.focus');
    });

    (['click', 'Enter', 'Space', 'Backspace', 'Delete'] as const).forEach(action => {
      (['dismiss', 'secondary'] as const).forEach(target => {
        it(`reports exact ${target} dismissal payload for ${action} without removing consumer children`, () => {
          const dismiss = cy.spy().as('dismiss');
          mount(
            <TagGroup onDismiss={dismiss}>
              <MixedTags />
            </TagGroup>,
          );
          if (action === 'click') {
            cy.get(`#${target}`).realClick({ position: 'center' });
          } else {
            cy.get(`#${target}`).focus().realPress(action);
          }
          cy.get('@dismiss')
            .should('have.been.calledOnce')
            .then(() => {
              const [event, data] = dismiss.firstCall.args;
              expect(data).to.deep.equal({ value: target === 'dismiss' ? 'plain-value' : 'interaction-value' });
              expect(event.type).to.equal(['Delete', 'Backspace'].includes(action) ? 'keydown' : 'click');
              if (event.type === 'keydown') {
                expect(event.key).to.equal(action);
              }
            });
          cy.get('#dismiss').should('exist');
          cy.get('#interaction').should('exist');
        });
      });
    });

    it('toggles uncontrolled default selection only with a selection callback and reports pre-toggle data', () => {
      const select = cy.spy().as('select');
      mount(
        <TagGroup defaultSelectedValues={['interaction-value']} onTagSelect={select}>
          <MixedTags />
        </TagGroup>,
      );
      cy.get('#primary').should('have.attr', 'aria-pressed', 'true').realClick();
      cy.get('#primary').should('have.attr', 'aria-pressed', 'false');
      cy.get('@select')
        .should('have.been.calledOnce')
        .then(() => {
          const [event, data] = select.firstCall.args;
          expect(data).to.have.all.keys('type', 'event', 'value', 'selectedValues');
          expect(data.type).to.equal('click');
          expect(data.event).to.equal(event);
          expect(data.value).to.equal('interaction-value');
          expect(data.selectedValues).to.deep.equal(['interaction-value']);
        });
      cy.get('#last').realClick().should('have.attr', 'aria-pressed', 'true');
      cy.get('#primary').focus().realPress('Space');
      cy.get('#primary').should('have.attr', 'aria-pressed', 'true');
      cy.get('@select').should('have.been.calledThrice');
    });

    it('controlled selectedValues remain authoritative when the consumer does not update', () => {
      const select = cy.spy().as('select');
      mount(
        <TagGroup selectedValues={['interaction-value']} onTagSelect={select}>
          <MixedTags />
        </TagGroup>,
      );
      cy.get('#primary').realClick().should('have.attr', 'aria-pressed', 'true');
      cy.get('#last').realClick().should('have.attr', 'aria-pressed', 'false');
      cy.get('@select').should('have.been.calledTwice');
    });

    it('consumer removes all Tags and explicitly owns final focus and reset', () => {
      mount(<RemovalExample />);
      cy.get('#item-a').realClick();
      cy.get('#item-b').should('have.focus').realClick();
      cy.get('#item-c').should('have.focus').realClick();
      cy.get('.fui-TagGroup button').should('not.exist');
      cy.get('#reset').should('have.focus').realClick();
      cy.get('.fui-TagGroup button').should('have.length', 3);
    });
  });

  describe('Select', () => {
    beforeEach(() => {
      mount(<SelectExample />);
    });

    it('click InteractionTag should select it', () => {
      cy.get('#tag-1-primary').realClick();
      cy.get('#tag-1-primary').should('have.attr', 'aria-pressed', 'true');
    });

    it('click selected InteractionTag should unselect it', () => {
      cy.get('#tag-1-primary').realClick();
      cy.get('#tag-1-primary').should('have.attr', 'aria-pressed', 'true');
      cy.get('#tag-1-primary').realClick();
      cy.get('#tag-1-primary').should('have.attr', 'aria-pressed', 'false');
    });

    it('click dismissable InteractionTag should select it', () => {
      cy.get('#tag-2-primary').realClick();
      cy.get('#tag-2-primary').should('have.attr', 'aria-pressed', 'true');
    });

    it('multiple InteractionTags should be selected', () => {
      cy.get('#tag-1-primary').realClick();
      cy.get('#tag-2-primary').realClick();
      cy.get('#selected-tags').should('have.text', '1, 2');
    });

    it('multiple selected InteractionTags should be unselected', () => {
      cy.get('#tag-1-primary').realClick();
      cy.get('#tag-2-primary').realClick();
      cy.get('#tag-3-primary').realClick();
      cy.get('#selected-tags').should('have.text', '1, 2, 3');
      cy.get('#tag-2-primary').realClick();
      cy.get('#selected-tags').should('have.text', '1, 3');
    });

    it('keypress InteractionTag should select it', () => {
      cy.get('#tag-2-primary').focus().realPress('Enter');
      cy.get('#tag-2-primary').should('have.attr', 'aria-pressed', 'true');
    });
  });
});

describe('TagGroup unit and source regressions', () => {
  ['', 'value with spaces / 日本語'].forEach(value => {
    it(`preserves exact ${value === '' ? 'empty' : 'Unicode'} values in selection and dismissal payloads`, () => {
      const select = cy.spy().as('select');
      const dismiss = cy.spy().as('dismiss');
      mount(
        <TagGroup onTagSelect={select} onDismiss={dismiss}>
          <InteractionTag value={value}>
            <InteractionTagPrimary id="exact-primary" hasSecondaryAction>
              Exact value
            </InteractionTagPrimary>
            <InteractionTagSecondary id="exact-secondary" aria-label="Remove" />
          </InteractionTag>
        </TagGroup>,
      );
      cy.get('#exact-primary').realClick().should('have.attr', 'aria-pressed', 'true');
      cy.get('#exact-secondary').realClick();
      cy.get('@select')
        .should('have.been.calledOnce')
        .then(() => expect(select.firstCall.args[1].value).to.equal(value));
      cy.get('@dismiss')
        .should('have.been.calledOnce')
        .then(() => expect(dismiss.firstCall.args[1]).to.deep.equal({ value }));
    });
  });
  it('accepts an empty group and passive children without inventing selection or dismissal', () => {
    const dismiss = cy.spy().as('dismiss');
    const select = cy.spy().as('select');
    mount(
      <>
        <TagGroup id="empty" aria-label="Empty" />
        <TagGroup role="list" aria-label="Passive" onDismiss={dismiss} onTagSelect={select}>
          <Tag role="listitem" id="passive">
            Passive
          </Tag>
        </TagGroup>
      </>,
    );
    cy.get('#empty').should('have.attr', 'role', 'toolbar').and('have.attr', 'aria-disabled', 'false');
    cy.get('#empty .fui-Tag').should('not.exist');
    cy.get('#passive').realClick().should('not.have.attr', 'aria-pressed');
    cy.get('@dismiss').should('not.have.been.called');
    cy.get('@select').should('not.have.been.called');
  });

  it('consumer controlled removal clears selected values without secondary triggering selection', () => {
    const select = cy.spy().as('select');
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      const [selected, setSelected] = React.useState<string[]>([]);
      return (
        <>
          <output id="consumer-selected">{selected.join(',')}</output>
          <TagGroup
            selectedValues={selected}
            onTagSelect={(_event, { value }) => {
              select(value);
              setSelected([value]);
            }}
            onDismiss={(_event, { value }) => {
              setSelected(current => current.filter(item => item !== value));
              setVisible(false);
            }}
          >
            {visible && (
              <InteractionTag value="a">
                <InteractionTagPrimary id="consumer-primary" hasSecondaryAction>
                  Alpha
                </InteractionTagPrimary>
                <InteractionTagSecondary id="consumer-secondary" aria-label="Remove" />
              </InteractionTag>
            )}
          </TagGroup>
        </>
      );
    };
    mount(<Example />);
    cy.get('#consumer-primary').realClick().should('have.attr', 'aria-pressed', 'true');
    cy.get('#consumer-selected').should('have.text', 'a');
    cy.get('#consumer-secondary').realClick();
    cy.get('#consumer-primary').should('not.exist');
    cy.get('#consumer-selected').should('have.text', '');
    cy.get('@select').should('have.been.calledOnce');
  });

  it('listbox InteractionTag recipe needs consumer primary keyboard removal and a non-tabbable secondary', () => {
    const select = cy.spy().as('select');
    const Example = () => {
      const [values, setValues] = React.useState(['a', 'b']);
      const [selected, setSelected] = React.useState<string[]>([]);
      return (
        <TagGroup
          role="listbox"
          aria-label="Picker recipe"
          selectedValues={selected}
          onTagSelect={(_event, { value }) => {
            select(value);
            setSelected(current =>
              current.includes(value) ? current.filter(item => item !== value) : [...current, value],
            );
          }}
          onDismiss={(_event, { value }) => setValues(current => current.filter(item => item !== value))}
        >
          {values.map(value => (
            <InteractionTag key={value} value={value}>
              <InteractionTagPrimary
                id={`option-${value}`}
                role="option"
                aria-pressed={undefined}
                aria-selected={selected.includes(value)}
                hasSecondaryAction
                onKeyDown={event => {
                  if (event.key === 'Delete' || event.key === 'Backspace') {
                    event.preventDefault();
                    setValues(current => current.filter(item => item !== value));
                  }
                }}
              >
                {value}
              </InteractionTagPrimary>
              <InteractionTagSecondary tabIndex={-1} aria-label="Remove" aria-labelledby={null} />
            </InteractionTag>
          ))}
        </TagGroup>
      );
    };
    mount(<Example />);
    cy.get('#option-a').focus().realPress('Enter');
    cy.get('#option-a').should('have.attr', 'aria-selected', 'true').and('not.have.attr', 'aria-pressed');
    cy.get('#option-b').focus().realPress('Space');
    cy.get('#option-b').should('have.attr', 'aria-selected', 'true').realPress('Backspace');
    cy.get('#option-b').should('not.exist');
    cy.get('.fui-InteractionTagSecondary').should('have.attr', 'tabindex', '-1');
    cy.get('@select').should('have.been.calledTwice');
    cy.get('#option-a').focus().realPress('Delete');
    cy.get('#option-a').should('not.exist');
  });

  it('supports documented external Overflow composition with measured overflow and expansion', () => {
    const OverflowIndicator = () => {
      const { ref, overflowCount, isOverflowing } = useOverflowMenu<HTMLButtonElement>();
      return (
        <InteractionTag>
          <InteractionTagPrimary id="overflow-count" ref={ref} aria-label={`${overflowCount} more tags`}>
            {isOverflowing ? overflowCount : 0}
          </InteractionTagPrimary>
        </InteractionTag>
      );
    };
    const Example = () => {
      const styles = useCoverageStyles();
      const [expanded, setExpanded] = React.useState(false);
      return (
        <>
          <button id="expand" onClick={() => setExpanded(true)}>
            Expand
          </button>
          <Overflow minimumVisible={1}>
            <TagGroup
              className={styles.overflow}
              style={expanded ? { width: '100%' } : undefined}
              aria-label="Overflow"
            >
              {['Alpha', 'Beta', 'Gamma'].map(value => (
                <OverflowItem key={value} id={value}>
                  <InteractionTag>
                    <InteractionTagPrimary>{value}</InteractionTagPrimary>
                  </InteractionTag>
                </OverflowItem>
              ))}
              <OverflowIndicator />
            </TagGroup>
          </Overflow>
        </>
      );
    };
    mount(<Example />);
    cy.get('#overflow-count').should('have.text', '2').and('have.attr', 'aria-label', '2 more tags');
    cy.get('.fui-TagGroup [data-overflowing]').should('have.length', 2);
    cy.get('#expand').realClick();
    cy.get('#overflow-count').should('have.text', '0');
    cy.get('.fui-TagGroup [data-overflowing]').should('not.exist');
  });

  it('default selected values without onTagSelect do not enable selection behavior', () => {
    mount(
      <TagGroup defaultSelectedValues={['interaction-value']}>
        <MixedTags />
      </TagGroup>,
    );
    cy.get('#primary').should('not.have.attr', 'aria-pressed');
    cy.get('#primary').realClick();
    cy.get('#primary').should('not.have.attr', 'aria-pressed');
    cy.get('#last').realClick().should('not.have.attr', 'aria-pressed');
  });

  it('dismissal does not prune uncontrolled selection and reinsertion preserves the value', () => {
    const select = cy.spy().as('select');
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button id="restore" onClick={() => setVisible(true)}>
            Restore
          </button>
          <TagGroup defaultSelectedValues={['a']} onTagSelect={select} onDismiss={() => setVisible(false)}>
            {visible && (
              <InteractionTag value="a">
                <InteractionTagPrimary id="retained" hasSecondaryAction>
                  Alpha
                </InteractionTagPrimary>
                <InteractionTagSecondary id="remove-retained" aria-label="Remove" />
              </InteractionTag>
            )}
          </TagGroup>
        </>
      );
    };
    mount(<Example />);
    cy.get('#retained').should('have.attr', 'aria-pressed', 'true');
    cy.get('#remove-retained').realClick();
    cy.get('#retained').should('not.exist');
    cy.get('#restore').realClick();
    cy.get('#retained').should('have.attr', 'aria-pressed', 'true');
    cy.get('@select').should('not.have.been.called');
  });

  it('consumer can commit controlled selection and clear it while changing group context', () => {
    const Example = () => {
      const [selected, setSelected] = React.useState<string[]>([]);
      const [compact, setCompact] = React.useState(false);
      return (
        <>
          <button
            id="change-context"
            onClick={() => {
              setCompact(true);
              setSelected([]);
            }}
          >
            Change
          </button>
          <TagGroup
            size={compact ? 'extra-small' : 'medium'}
            appearance={compact ? 'outline' : 'filled'}
            selectedValues={selected}
            onTagSelect={(_event, { value }) =>
              setSelected(current =>
                current.includes(value) ? current.filter(item => item !== value) : [...current, value],
              )
            }
          >
            <MixedTags />
          </TagGroup>
        </>
      );
    };
    mount(<Example />);
    cy.get('#primary').realClick().should('have.attr', 'aria-pressed', 'true');
    cy.get('#last').realClick().should('have.attr', 'aria-pressed', 'true');
    cy.get('#change-context').realClick();
    cy.get('#primary').should('have.attr', 'aria-pressed', 'false').and('have.css', 'height', '20px');
    cy.get('#last').should('have.attr', 'aria-pressed', 'false');
    cy.get('.fui-TagGroup').should('have.css', 'column-gap', '4px');
    cy.get('#primary').realClick().should('have.attr', 'aria-pressed', 'true');
  });

  it('latest dismissal and selection callbacks use new closures without duplicate old calls', () => {
    const report = cy.spy().as('report');
    const Example = () => {
      const [revision, setRevision] = React.useState(0);
      return (
        <>
          <button id="revision" onClick={() => setRevision(1)}>
            Update
          </button>
          <TagGroup
            onDismiss={(_event, data) => report('dismiss', revision, data.value)}
            onTagSelect={(_event, data) => report('select', revision, data.value, data.selectedValues)}
          >
            <MixedTags />
          </TagGroup>
        </>
      );
    };
    mount(<Example />);
    cy.get('#primary').realClick();
    cy.get('@report').should('have.been.calledWithExactly', 'select', 0, 'interaction-value', []);
    cy.get('#revision').realClick();
    cy.get('#primary').realClick();
    cy.get('#dismiss').focus().realPress('Delete');
    cy.get('@report')
      .should('have.been.calledThrice')
      .then(() => {
        expect(report.secondCall.args).to.deep.equal(['select', 1, 'interaction-value', ['interaction-value']]);
        expect(report.thirdCall.args).to.deep.equal(['dismiss', 1, 'plain-value']);
      });
  });

  it('adding and removing the selection callback updates interactivity and keeps the selected values', () => {
    const select = cy.spy().as('select');
    const Example = () => {
      const [enabled, setEnabled] = React.useState(false);
      return (
        <>
          <button id="toggle-selection" onClick={() => setEnabled(current => !current)}>
            Toggle selection
          </button>
          <TagGroup onTagSelect={enabled ? select : undefined}>
            <MixedTags />
          </TagGroup>
        </>
      );
    };
    mount(<Example />);
    cy.get('#primary').realClick().should('not.have.attr', 'aria-pressed');
    cy.get('@select').should('not.have.been.called');
    cy.get('#toggle-selection').realClick();
    cy.get('#primary')
      .should('have.attr', 'aria-pressed', 'false')
      .realClick()
      .should('have.attr', 'aria-pressed', 'true');
    cy.get('#toggle-selection').realClick();
    cy.get('#primary').should('not.have.attr', 'aria-pressed');
    cy.get('#primary').realClick();
    cy.get('@select').should('have.been.calledOnce');
    cy.get('#toggle-selection').realClick();
    cy.get('#primary').should('have.attr', 'aria-pressed', 'true');
  });

  it('dynamic child insertion reordering and disabling update real navigation', () => {
    const Example = () => {
      const [changed, setChanged] = React.useState(false);
      const values = changed ? ['c', 'b', 'd', 'a'] : ['a', 'b', 'c'];
      return (
        <>
          <button id="reorder" onClick={() => setChanged(true)}>
            Reorder
          </button>
          <TagGroup aria-label="Dynamic">
            {values.map(value => (
              <InteractionTag key={value} value={value} disabled={changed && value === 'b'}>
                <InteractionTagPrimary id={`dynamic-${value}`}>{value}</InteractionTagPrimary>
              </InteractionTag>
            ))}
          </TagGroup>
        </>
      );
    };
    mount(<Example />);
    cy.get('#dynamic-a').realClick().realPress('ArrowRight');
    cy.get('#dynamic-b').should('have.focus');
    cy.get('#reorder').realClick();
    cy.get('#dynamic-b').should('be.disabled');
    cy.get('#dynamic-c').realClick().realPress('ArrowRight');
    cy.get('#dynamic-d').should('have.focus').realPress('ArrowRight');
    cy.get('#dynamic-a').should('have.focus').realPress('ArrowRight');
    cy.get('#dynamic-c').should('have.focus');
  });

  it('group disabled changes on existing children without losing selection and then re-enables actions', () => {
    const select = cy.spy().as('select');
    const Example = () => {
      const [disabled, setDisabled] = React.useState(false);
      return (
        <>
          <button id="toggle-disabled" onClick={() => setDisabled(current => !current)}>
            Toggle disabled
          </button>
          <TagGroup disabled={disabled} onTagSelect={select}>
            <MixedTags />
          </TagGroup>
        </>
      );
    };
    mount(<Example />);
    cy.get('#primary').realClick().should('have.attr', 'aria-pressed', 'true');
    cy.get('#toggle-disabled').realClick();
    cy.get('#primary').should('be.disabled').and('have.attr', 'aria-pressed', 'true').realClick();
    cy.get('@select').should('have.been.calledOnce');
    cy.get('#toggle-disabled').realClick();
    cy.get('#primary').should('not.be.disabled').realClick().should('have.attr', 'aria-pressed', 'false');
    cy.get('@select').should('have.been.calledTwice');
  });

  (['Tag', 'secondary'] as const).forEach(composition => {
    it(`${composition} child handlers can cancel click and keyboard dismissal before the group callback`, () => {
      const dismiss = cy.spy().as('dismiss');
      const child = cy.spy().as('child');
      const cancel = (event: React.MouseEvent | React.KeyboardEvent) => {
        child(event.type);
        event.preventDefault();
      };
      mount(
        <TagGroup onDismiss={dismiss}>
          {composition === 'Tag' ? (
            <Tag id="cancel" dismissible onClick={cancel} onKeyDown={cancel}>
              Cancel
            </Tag>
          ) : (
            <InteractionTag>
              <InteractionTagPrimary hasSecondaryAction>Cancel</InteractionTagPrimary>
              <InteractionTagSecondary id="cancel" onClick={cancel} onKeyDown={cancel} aria-label="Remove" />
            </InteractionTag>
          )}
          <Tag id="positive" dismissible value="positive">
            Positive
          </Tag>
        </TagGroup>,
      );
      cy.get('#cancel').realClick().focus().realPress('Delete').realPress('Backspace');
      cy.get('@child').should('have.been.calledThrice');
      cy.get('@dismiss').should('not.have.been.called');
      cy.get('#positive').realClick();
      cy.get('@dismiss').should('have.been.calledOnce');
    });
  });

  it('characterizes selection callback composition continuing after primary preventDefault', () => {
    const select = cy.spy().as('select');
    const child = cy.spy().as('child');
    mount(
      <TagGroup onTagSelect={select}>
        <InteractionTag value="prevented">
          <InteractionTagPrimary
            id="prevent-select"
            onClick={event => {
              child();
              event.preventDefault();
            }}
          >
            Prevent default
          </InteractionTagPrimary>
        </InteractionTag>
      </TagGroup>,
    );
    cy.get('#prevent-select').realClick().should('have.attr', 'aria-pressed', 'true');
    cy.get('@child').should('have.been.calledOnce');
    cy.get('@select')
      .should('have.been.calledOnce')
      .then(() => {
        expect(select.firstCall.args[0].defaultPrevented).to.equal(true);
      });
  });

  it('isolates sibling group selection dismissal sizes and disabled context', () => {
    const firstDismiss = cy.spy().as('first-dismiss');
    const secondDismiss = cy.spy().as('second-dismiss');
    const firstSelect = cy.spy().as('first-select');
    const secondSelect = cy.spy().as('second-select');
    mount(
      <>
        <TagGroup id="first-group" size="small" onDismiss={firstDismiss} onTagSelect={firstSelect}>
          <InteractionTag value="same">
            <InteractionTagPrimary id="first-primary" hasSecondaryAction>
              First
            </InteractionTagPrimary>
            <InteractionTagSecondary id="first-secondary" aria-label="Remove" />
          </InteractionTag>
        </TagGroup>
        <TagGroup id="second-group" disabled onDismiss={secondDismiss} onTagSelect={secondSelect}>
          <InteractionTag value="same">
            <InteractionTagPrimary id="second-primary" hasSecondaryAction>
              Second
            </InteractionTagPrimary>
            <InteractionTagSecondary id="second-secondary" aria-label="Remove" />
          </InteractionTag>
        </TagGroup>
        <Tag id="outside-tag" dismissible>
          Outside
        </Tag>
      </>,
    );
    cy.get('#first-primary').realClick().should('have.attr', 'aria-pressed', 'true').and('have.css', 'height', '24px');
    cy.get('#second-primary')
      .should('be.disabled')
      .and('have.attr', 'aria-pressed', 'false')
      .and('have.css', 'height', '32px');
    cy.get('#first-secondary').realClick();
    cy.get('@first-select').should('have.been.calledOnce');
    cy.get('@first-dismiss').should('have.been.calledOnce');
    cy.get('@second-select').should('not.have.been.called');
    cy.get('@second-dismiss').should('not.have.been.called');
    cy.get('#outside-tag').should('not.be.disabled').and('have.css', 'height', '32px');
  });

  it('uses generated fallback values and combined secondary names with resolvable IDs', () => {
    const dismiss = cy.spy().as('dismiss');
    const select = cy.spy().as('select');
    mount(
      <TagGroup onDismiss={dismiss} onTagSelect={select}>
        <Tag dismissible id="fallback-tag">
          Fallback
        </Tag>
        <InteractionTag id="fallback-interaction">
          <InteractionTagPrimary hasSecondaryAction>Generated primary</InteractionTagPrimary>
          <InteractionTagSecondary aria-label="Remove" />
        </InteractionTag>
      </TagGroup>,
    );
    cy.get('#fallback-tag').realClick();
    cy.get('@dismiss').should('have.been.calledWithMatch', { type: 'click' }, { value: 'fallback-tag' });
    cy.get('#fallback-interaction .fui-InteractionTagPrimary').realClick();
    cy.get('@select')
      .should('have.been.calledOnce')
      .then(() => expect(select.firstCall.args[1].value).to.equal('fallback-interaction'));
    cy.get('#fallback-interaction .fui-InteractionTagSecondary')
      .should($secondary => {
        expect(computeAccessibleName($secondary[0])).to.equal('Generated primary Remove');
        $secondary
          .attr('aria-labelledby')
          ?.split(' ')
          .forEach(id => {
            expect($secondary[0].ownerDocument.getElementById(id)).not.to.equal(null);
          });
      })
      .realClick();
    cy.get('@dismiss')
      .should('have.been.calledTwice')
      .then(() => {
        expect(dismiss.secondCall.args[1]).to.deep.equal({ value: 'fallback-interaction' });
      });
  });

  it('characterizes unresolved automatic secondary naming when a primary ID is overridden', () => {
    mount(
      <TagGroup aria-label="Custom ID characterization">
        <InteractionTag>
          <InteractionTagPrimary id="custom-primary" hasSecondaryAction>
            Custom primary
          </InteractionTagPrimary>
          <InteractionTagSecondary id="custom-secondary" aria-label="Remove" />
        </InteractionTag>
      </TagGroup>,
    );
    cy.get('#custom-primary').should($primary => expect(computeAccessibleName($primary[0])).to.equal('Custom primary'));
    cy.get('#custom-secondary').should($secondary => {
      const primaryReference = $secondary.attr('aria-labelledby')?.split(' ')[0];
      expect(primaryReference).not.to.equal('custom-primary');
      expect($secondary[0].ownerDocument.getElementById(primaryReference!)).to.equal(null);
      expect(computeAccessibleName($secondary[0])).to.equal('Remove');
    });
  });

  it('does not steal outside focus for a programmatic dismiss event', () => {
    const dismiss = cy.spy().as('dismiss');
    mount(
      <>
        <TagGroup onDismiss={dismiss}>
          <MixedTags />
        </TagGroup>
        <button id="outside-focus">Outside</button>
      </>,
    );
    cy.get('#outside-focus').realClick().should('have.focus');
    cy.get('#dismiss').then($tag => $tag[0].click());
    cy.get('@dismiss').should('have.been.calledOnce');
    cy.get('#outside-focus').should('have.focus');
  });

  it('forwards root ref cleanup and remount resets uncontrolled defaults', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button id="toggle-mount" onClick={() => setVisible(current => !current)}>
            Toggle mount
          </button>
          {visible && (
            <TagGroup ref={ref} defaultSelectedValues={['interaction-value']} onTagSelect={() => undefined}>
              <MixedTags />
            </TagGroup>
          )}
        </>
      );
    };
    mount(<Example />);
    cy.get('.fui-TagGroup').then($group => expect(ref.current).to.equal($group[0]));
    cy.get('#primary').realClick().should('have.attr', 'aria-pressed', 'false');
    cy.get('#toggle-mount').realClick();
    cy.get('.fui-TagGroup')
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
    cy.get('#toggle-mount').realClick();
    cy.get('#primary').should('have.attr', 'aria-pressed', 'true');
    cy.get('.fui-TagGroup').then($group => expect(ref.current).to.equal($group[0]));
  });

  it('consumer wrapping class overrides layout and preserves ordered visible children', () => {
    const Example = () => {
      const styles = useCoverageStyles();
      return (
        <TagGroup className={styles.wrapping} aria-label="Wrapping" role="list">
          <Tag id="wrap-a" role="listitem">
            Alpha
          </Tag>
          <Tag id="wrap-b" role="listitem">
            Beta
          </Tag>
        </TagGroup>
      );
    };
    mount(<Example />);
    cy.get('.fui-TagGroup').should('have.css', 'display', 'flex').and('have.css', 'flex-wrap', 'wrap');
    cy.get('#wrap-a')
      .should('be.visible')
      .then($first => {
        cy.get('#wrap-b')
          .should('be.visible')
          .then($second => {
            expect($second[0].getBoundingClientRect().top).to.be.greaterThan($first[0].getBoundingClientRect().bottom);
          });
      });
  });

  it('uses nearest light and dark provider tokens without changing semantic context', () => {
    mountBase(
      <FluentProvider theme={teamsLightTheme}>
        <TagGroup id="light" aria-label="Light" size="small">
          <Tag id="light-tag">Light</Tag>
        </TagGroup>
        <FluentProvider theme={teamsDarkTheme}>
          <TagGroup id="dark" aria-label="Dark" size="small">
            <Tag id="dark-tag">Dark</Tag>
          </TagGroup>
        </FluentProvider>
      </FluentProvider>,
    );
    cy.get('#light-tag')
      .should('have.css', 'height', '24px')
      .then($light => {
        cy.get('#dark-tag')
          .should('have.css', 'height', '24px')
          .then($dark => {
            expect($dark.css('background-color')).not.to.equal($light.css('background-color'));
            expect($dark.css('color')).not.to.equal($light.css('color'));
          });
      });
    cy.get('#light').should('have.attr', 'role', 'toolbar');
    cy.get('#dark').should('have.attr', 'role', 'toolbar');
  });
});
