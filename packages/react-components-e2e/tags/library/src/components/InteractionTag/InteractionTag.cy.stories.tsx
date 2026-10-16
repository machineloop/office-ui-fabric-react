import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme } from '@fluentui/react-theme';
import { useInteractionTagContext_unstable } from '../../contexts/interactionTagContext';
import { InteractionTag } from './InteractionTag';
import { InteractionTagPrimary, InteractionTagSecondary, TagGroup } from '../../index';
import { computeAccessibleName } from 'dom-accessibility-api';
import { Default } from '../../../../stories/src/InteractionTag/InteractionTagDefault.stories';
import { Appearance } from '../../../../stories/src/InteractionTag/InteractionTagAppearance.stories';
import { Selected } from '../../../../stories/src/InteractionTag/InteractionTagSelected.stories';
import { Size } from '../../../../stories/src/InteractionTag/InteractionTagSize.stories';
import { Shape } from '../../../../stories/src/InteractionTag/InteractionTagShape.stories';
import { Disabled } from '../../../../stories/src/InteractionTag/InteractionTagDisabled.stories';
import { Icon } from '../../../../stories/src/InteractionTag/InteractionTagIcon.stories';
import { Media } from '../../../../stories/src/InteractionTag/InteractionTagMedia.stories';
import { SecondaryText } from '../../../../stories/src/InteractionTag/InteractionTagSecondaryText.stories';
import { Dismiss } from '../../../../stories/src/InteractionTag/InteractionTagDismiss.stories';
import { HasPrimaryAction } from '../../../../stories/src/InteractionTag/InteractionTagHasPrimaryAction.stories';
import * as axe from 'axe-core';
const cssColor = (value: string) => {
  const probe = document.createElement('span');
  probe.style.color = value;
  return probe.style.color;
};

const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
const root = '.fui-InteractionTag';
const primary = '.fui-InteractionTagPrimary';
const secondary = '.fui-InteractionTagSecondary';

describe('InteractionTag documented stories', () => {
  it('renders a noninteractive container around its accessible primary action', () => {
    render(<Default id="tag" />);
    cy.get('#tag').should('have.prop', 'tagName', 'DIV').and('have.class', 'fui-InteractionTag');
    cy.get(primary)
      .should('have.prop', 'tagName', 'BUTTON')
      .should($node => expect(computeAccessibleName($node[0])).to.equal('Primary text'));
    cy.get('#tag').should('not.have.attr', 'tabindex');
    cy.get(secondary).should('not.exist');
  });

  it('propagates documented filled, outline and brand appearances to both actions', () => {
    render(<Appearance />);
    cy.get(primary).eq(0).should('have.css', 'background-color', 'rgb(245, 245, 245)');
    cy.get(primary).eq(1).should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
    cy.get(primary)
      .eq(2)
      .should($node => expect(getComputedStyle($node[0]).backgroundColor).not.to.equal('rgba(0, 0, 0, 0)'));
    cy.get(secondary).should('have.length', 3);
    cy.get(secondary).each($node => expect(computeAccessibleName($node[0])).to.contain('remove'));
  });

  it('applies the documented selected appearance without inventing standalone selection ownership', () => {
    render(<Selected />);
    cy.get(primary).should('have.length', 3);
    cy.get(primary).each($node => {
      cy.wrap($node).should('have.css', 'background-color', cssColor(webLightTheme.colorBrandBackground));
      cy.wrap($node).should('have.css', 'color', cssColor(webLightTheme.colorNeutralForegroundOnBrand));
      cy.wrap($node).should('not.have.attr', 'aria-pressed');
    });
  });

  it('measures medium, small and extra-small actual container heights', () => {
    render(<Size />);
    for (const [index, height] of [
      [0, 32],
      [3, 24],
      [6, 20],
    ] as const) {
      cy.get(root)
        .eq(index)
        .should($node => expect($node[0].getBoundingClientRect().height).to.equal(height));
    }
  });

  it('measures rounded and circular roots and propagates avatar shapes', () => {
    render(<Shape />);
    cy.get(root)
      .eq(0)
      .then($rounded => {
        const radius = parseFloat(getComputedStyle($rounded[0]).borderTopLeftRadius);
        expect(radius).to.be.greaterThan(0);
        cy.get(root)
          .eq(1)
          .should($circular =>
            expect(parseFloat(getComputedStyle($circular[0]).borderTopLeftRadius)).to.be.greaterThan(radius),
          );
      });
    cy.get('.fui-Avatar').should('have.length', 2);
    cy.get('.fui-Avatar').eq(0).should('have.css', 'border-top-left-radius', '4px');
    cy.get('.fui-Avatar').eq(1).should('have.css', 'border-top-left-radius', webLightTheme.borderRadiusCircular);
  });

  it('renders both actions disabled across all documented appearances', () => {
    render(<Disabled />);
    cy.get(`${primary},${secondary}`)
      .should('have.length', 6)
      .each($node => cy.wrap($node).should('be.disabled'));
  });

  it('keeps content icons out of the accessible name', () => {
    render(<Icon />);
    cy.get('.fui-InteractionTagPrimary__icon svg').should('be.visible');
    cy.get(primary).should($node => expect(computeAccessibleName($node[0])).to.equal('Primary text'));
  });

  it('renders local avatar media with the tag height and primary label', () => {
    render(<Media />);
    cy.get('.fui-InteractionTagPrimary__media .fui-Avatar')
      .should('be.visible')
      .should($node => expect($node[0].getBoundingClientRect().height).to.equal(28));
    cy.get(primary).should($node => expect(computeAccessibleName($node[0])).to.contain('Primary text'));
  });

  it('includes secondary text as visible primary-action content', () => {
    render(<SecondaryText />);
    cy.get('.fui-InteractionTagPrimary__secondaryText').should('have.text', 'Secondary text');
    cy.get(primary).should($node => expect(computeAccessibleName($node[0])).to.equal('Primary text Secondary text'));
  });

  it('dismisses every story tag, focuses reset, and restores focus to the first recreated tag', () => {
    render(<Dismiss />);
    for (const remaining of [2, 1, 0]) {
      cy.get(secondary).first().realClick();
      cy.get(root).should('have.length', remaining);
    }
    cy.contains('button', 'Reset the example').should('have.focus').and('not.be.disabled').realClick();
    cy.get(root).should('have.length', 3);
    cy.get(primary).first().should('have.focus');
  });

  it('opens the documented primary-action popover and restores trigger focus on Escape', () => {
    render(<HasPrimaryAction />);
    cy.contains('button', 'Golden retriever').focus();
    cy.realPress('Enter');
    cy.get('.fui-PopoverSurface').should('be.visible');
    cy.realPress('Escape');
    cy.get('.fui-PopoverSurface').should('not.exist');
    cy.contains('button', 'Golden retriever').should('have.focus');
  });
});

describe('InteractionTag native action and group boundaries', () => {
  for (const key of ['Enter', 'Space'] as const) {
    it(`composes native ${key} primary activation with tag-group selection`, () => {
      const click = cy.spy().as('click');
      const select = cy.spy().as('select');
      render(
        <TagGroup aria-label="Calendar" onTagSelect={select}>
          <InteractionTag value="a" id="tag">
            <InteractionTagPrimary id="primary" onClick={click} hasSecondaryAction>
              Calendar
            </InteractionTagPrimary>
            <InteractionTagSecondary id="secondary" aria-label="Remove calendar" aria-labelledby={null} />
          </InteractionTag>
        </TagGroup>,
      );
      cy.get('#primary').focus();
      cy.realPress(key);
      cy.get('@click').should('have.been.calledOnce');
      cy.get('@select').should('have.been.calledOnce').its('firstCall.args.1.value').should('equal', 'a');
      cy.get('#primary').should('have.attr', 'aria-pressed', 'true');
      cy.realPress(key);
      cy.get('#primary').should('have.attr', 'aria-pressed', 'false');
      cy.get('@click').should('have.been.calledTwice');
      cy.get('@select').should('have.been.calledTwice');
    });
  }

  it('keeps primary selection and secondary dismissal independent', () => {
    const select = cy.spy().as('select');
    const dismiss = cy.spy().as('dismiss');
    render(
      <TagGroup aria-label="Calendar" onTagSelect={select} onDismiss={dismiss}>
        <InteractionTag value="a" id="tag">
          <InteractionTagPrimary id="primary" hasSecondaryAction>
            Calendar
          </InteractionTagPrimary>
          <InteractionTagSecondary id="secondary" aria-label="remove" />
        </InteractionTag>
      </TagGroup>,
    );
    cy.get('#primary').realClick();
    cy.get('#primary').should('have.attr', 'aria-pressed', 'true');
    cy.get('@dismiss').should('not.have.been.called');
    cy.get('#secondary').realClick();
    cy.get('@dismiss').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { value: 'a' });
    cy.get('@select').should('have.been.calledOnce');
    cy.get('#tag').should('exist');
  });

  for (const key of ['Enter', 'Space', 'Backspace', 'Delete'] as const) {
    it(`requests secondary dismissal with native ${key} without selecting or removing an owner-retained tag`, () => {
      const dismiss = cy.spy().as('dismiss');
      const select = cy.spy().as('select');
      render(
        <TagGroup aria-label="Calendar" onDismiss={dismiss} onTagSelect={select}>
          <InteractionTag value="a" id="tag">
            <InteractionTagPrimary hasSecondaryAction>Calendar</InteractionTagPrimary>
            <InteractionTagSecondary id="secondary" aria-label="remove" />
          </InteractionTag>
        </TagGroup>,
      );
      cy.get('#secondary').focus();
      cy.realPress(key);
      cy.get('@dismiss').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { value: 'a' });
      cy.get('@select').should('not.have.been.called');
      cy.get('#tag').should('exist');
    });
  }

  it('honors consumer secondary cancellation while an uncanceled action remains a positive control', () => {
    const dismiss = cy.spy().as('dismiss');
    const click = cy.spy().as('click');
    render(
      <TagGroup aria-label="Calendar" onDismiss={dismiss}>
        <InteractionTag value="a">
          <InteractionTagPrimary hasSecondaryAction>Calendar</InteractionTagPrimary>
          <InteractionTagSecondary
            id="canceled"
            aria-label="remove"
            onClick={event => {
              click();
              event.preventDefault();
            }}
            onKeyDown={event => event.preventDefault()}
          />
        </InteractionTag>
        <InteractionTag value="b">
          <InteractionTagPrimary hasSecondaryAction>Other</InteractionTagPrimary>
          <InteractionTagSecondary id="enabled" aria-label="remove" />
        </InteractionTag>
      </TagGroup>,
    );
    cy.get('#canceled').realClick();
    cy.get('#canceled').focus();
    cy.realPress('Delete');
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@dismiss').should('not.have.been.called');
    cy.get('#enabled').realClick();
    cy.get('@dismiss').should('have.been.calledOnce').its('firstCall.args.1.value').should('equal', 'b');
  });

  it('blocks disabled tag actions and skips both in tab traversal with enabled positive controls', () => {
    const click = cy.spy().as('click');
    const dismiss = cy.spy().as('dismiss');
    render(
      <>
        <button id="before">Before</button>
        <TagGroup aria-label="Calendar" onDismiss={dismiss}>
          <InteractionTag disabled>
            <InteractionTagPrimary id="disabled-primary" onClick={click} hasSecondaryAction>
              Disabled
            </InteractionTagPrimary>
            <InteractionTagSecondary id="disabled-secondary" aria-label="remove" />
          </InteractionTag>
          <InteractionTag>
            <InteractionTagPrimary id="enabled-primary" onClick={click} hasSecondaryAction>
              Enabled
            </InteractionTagPrimary>
            <InteractionTagSecondary id="enabled-secondary" aria-label="remove" />
          </InteractionTag>
        </TagGroup>
      </>,
    );
    cy.get('#disabled-primary').realClick();
    cy.get('#disabled-secondary').realClick();
    cy.get('@click').should('not.have.been.called');
    cy.get('@dismiss').should('not.have.been.called');
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#enabled-primary').should('have.focus');
    cy.realPress('Enter');
    cy.get('@click').should('have.been.calledOnce');
    cy.get('#enabled-secondary').focus();
    cy.realPress('Enter');
    cy.get('@dismiss').should('have.been.calledOnce');
  });

  it('forces group disability even when the tag explicitly requests enabled state', () => {
    const select = cy.spy().as('select');
    render(
      <TagGroup disabled aria-label="Calendar" onTagSelect={select}>
        <InteractionTag disabled={false}>
          <InteractionTagPrimary id="primary" hasSecondaryAction>
            Calendar
          </InteractionTagPrimary>
          <InteractionTagSecondary aria-label="remove" />
        </InteractionTag>
      </TagGroup>,
    );
    cy.get(primary).should('be.disabled');
    cy.get(secondary).should('be.disabled');
    cy.get('#primary').realClick();
    cy.get('@select').should('not.have.been.called');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`lays out independent action hit targets and keyboard activation in ${dir}`, () => {
      const select = cy.spy().as('select');
      const dismiss = cy.spy().as('dismiss');
      render(
        <TagGroup aria-label="Calendar" onTagSelect={select} onDismiss={dismiss}>
          <InteractionTag>
            <InteractionTagPrimary id="primary" hasSecondaryAction>
              Calendar
            </InteractionTagPrimary>
            <InteractionTagSecondary id="secondary" aria-label="remove" />
          </InteractionTag>
        </TagGroup>,
        dir,
      );
      cy.get('#primary').then($primary => {
        cy.get('#secondary').should($secondary => {
          const p = $primary[0].getBoundingClientRect();
          const s = $secondary[0].getBoundingClientRect();
          expect(Math.min(p.right, s.right) - Math.max(p.left, s.left)).to.be.at.most(0);
          expect(p.height).to.equal(s.height);
        });
      });
      cy.get('#primary').focus();
      cy.realPress('Space');
      cy.get('@select').should('have.been.calledOnce');
      cy.get('#secondary').focus();
      cy.realPress('Space');
      cy.get('@dismiss').should('have.been.calledOnce');
    });
  }

  it('passes ordinary axe rules with generated combined secondary naming', () => {
    render(
      <InteractionTag id="tag">
        <InteractionTagPrimary hasSecondaryAction>Calendar</InteractionTagPrimary>
        <InteractionTagSecondary aria-label="remove" />
      </InteractionTag>,
    );
    cy.get(secondary).should($node => expect(computeAccessibleName($node[0])).to.equal('Calendar remove'));
    cy.get('#tag').then($node =>
      axe.run($node[0]).then(result => expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([])),
    );
  });

  for (const action of ['pointer', 'Enter', 'Space'] as const) {
    it(`activates and selects with ${action} without submitting a form, while explicit submit still works`, () => {
      const click = cy.spy().as('click');
      const select = cy.spy().as('select');
      const submit = cy.spy().as('submit');
      render(
        <form
          onSubmit={event => {
            event.preventDefault();
            submit();
          }}
        >
          <TagGroup aria-label="Calendar" onTagSelect={select}>
            <InteractionTag value="a">
              <InteractionTagPrimary id="primary" onClick={click}>
                Calendar
              </InteractionTagPrimary>
            </InteractionTag>
          </TagGroup>
          <InteractionTag>
            <InteractionTagPrimary id="submit" type="submit">
              Submit
            </InteractionTagPrimary>
          </InteractionTag>
        </form>,
      );
      cy.get('#primary').focus();
      if (action === 'pointer') {
        cy.get('#primary').realClick();
      } else {
        cy.realPress(action);
      }
      cy.get('@click').should('have.been.calledOnce');
      cy.get('@select').should('have.been.calledOnce');
      cy.get('#primary').should('have.attr', 'aria-pressed', 'true');
      cy.get('@submit').should('not.have.been.called');
      cy.get('#primary').should('have.attr', 'type', 'button');
      cy.get('#submit').should('have.attr', 'type', 'submit').realClick();
      cy.get('@submit').should('have.been.calledOnce');
    });
  }
});

describe('InteractionTag source and conformance contracts', () => {
  it('inherits live group size and appearance while explicit tag values take precedence', () => {
    const Probe = ({ id }: { id: string }) => {
      const { size, appearance, shape, value } = useInteractionTagContext_unstable();
      return <output id={id}>{JSON.stringify({ size, appearance, shape, value })}</output>;
    };
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <TagGroup
            size={updated ? 'extra-small' : 'medium'}
            appearance={updated ? 'brand' : 'filled'}
            aria-label="Calendar"
          >
            <InteractionTag id="inherited" value="a">
              <InteractionTagPrimary>Inherited</InteractionTagPrimary>
              <Probe id="inherited-context" />
            </InteractionTag>
            <InteractionTag id="explicit" value="b" size="small" appearance="outline" shape="circular">
              <InteractionTagPrimary>Explicit</InteractionTagPrimary>
              <Probe id="explicit-context" />
            </InteractionTag>
          </TagGroup>
        </>
      );
    };
    render(<Owner />);
    cy.get('#inherited').should($node => expect($node[0].getBoundingClientRect().height).to.equal(32));
    cy.get('#update').realClick();
    cy.get('#inherited').should($node => expect($node[0].getBoundingClientRect().height).to.equal(20));
    cy.get('#inherited-context').should(
      'have.text',
      '{"size":"extra-small","appearance":"brand","shape":"rounded","value":"a"}',
    );
    cy.get('#explicit').should($node => expect($node[0].getBoundingClientRect().height).to.equal(24));
    cy.get('#explicit-context').should(
      'have.text',
      '{"size":"small","appearance":"outline","shape":"circular","value":"b"}',
    );
  });

  it('derives selection from controlled group values and preserves explicitly selected appearance', () => {
    const select = cy.spy().as('select');
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <TagGroup aria-label="Calendar" onTagSelect={select} selectedValues={updated ? ['b'] : ['a']}>
            <InteractionTag value="a" id="tag-a" selected={false}>
              <InteractionTagPrimary id="a">A</InteractionTagPrimary>
            </InteractionTag>
            <InteractionTag value="b">
              <InteractionTagPrimary id="b">B</InteractionTagPrimary>
            </InteractionTag>
            <InteractionTag value="c" selected>
              <InteractionTagPrimary id="c">C</InteractionTagPrimary>
            </InteractionTag>
          </TagGroup>
        </>
      );
    };
    render(<Owner />);
    cy.get('#a').should('have.attr', 'aria-pressed', 'true');
    cy.get('#b').should('have.attr', 'aria-pressed', 'false');
    cy.get('#c').should('have.attr', 'aria-pressed', 'true');
    cy.get('#tag-a').then($original => {
      cy.get('#a').realClick();
      cy.get('#a').should('have.attr', 'aria-pressed', 'true');
      cy.get('@select').should('have.been.calledOnce');
      cy.get('#update').realClick();
      cy.get('#tag-a').should($node => expect($node[0]).to.equal($original[0]));
      cy.get('#a').should('have.attr', 'aria-pressed', 'false');
      cy.get('#b').should('have.attr', 'aria-pressed', 'true');
      cy.get('#c').should('have.attr', 'aria-pressed', 'true');
    });
  });

  it('forwards root metadata, styles and bubbled activation without leaking visual props to the DOM', () => {
    const bubble = cy.spy().as('bubble');
    render(
      <InteractionTag
        id="tag"
        className="custom-tag"
        title="Schedule"
        value="private-value"
        size="small"
        shape="circular"
        style={{ marginLeft: '7px' }}
        data-owner="calendar"
        onClick={event => bubble(event.currentTarget.id, event.currentTarget.tagName)}
      >
        <InteractionTagPrimary id="primary">Calendar</InteractionTagPrimary>
      </InteractionTag>,
    );
    cy.get('#tag')
      .should('have.class', 'fui-InteractionTag')
      .and('have.class', 'custom-tag')
      .and('have.attr', 'title', 'Schedule')
      .and('have.attr', 'data-owner', 'calendar')
      .and('have.css', 'margin-left', '7px');
    cy.get('#tag').should('not.have.attr', 'value');
    cy.get('#tag').should('not.have.attr', 'size');
    cy.get('#tag').should('not.have.attr', 'shape');
    cy.get('#primary').realClick();
    cy.get('@bubble').should('have.been.calledOnce').its('firstCall.args').should('deep.equal', ['tag', 'DIV']);
  });

  it('attaches object and callback refs to actual roots and clears them on committed unmount', () => {
    const object = React.createRef<HTMLDivElement>();
    const callback = cy.spy().as('ref');
    const Owner = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          {show && (
            <>
              <InteractionTag id="object" ref={object}>
                <InteractionTagPrimary>Object</InteractionTagPrimary>
              </InteractionTag>
              <InteractionTag id="callback" ref={callback}>
                <InteractionTagPrimary>Callback</InteractionTagPrimary>
              </InteractionTag>
            </>
          )}
          <button id="remove" onClick={() => setShow(false)}>
            Remove
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#object').should($node => expect(object.current).to.equal($node[0]));
    cy.get('#callback').then($node => cy.get('@ref').its('lastCall.args.0').should('equal', $node[0]));
    cy.get('#remove').realClick();
    cy.get('#object')
      .should('not.exist')
      .then(() => expect(object.current).to.equal(null));
    cy.get('#callback').should('not.exist');
    cy.get('@ref').its('lastCall.args.0').should('be.null');
  });

  it('keeps generated root identities unique and stable and uses them as default dismissal values', () => {
    const dismiss = cy.spy().as('dismiss');
    const Owner = () => {
      const [revision, setRevision] = React.useState(0);
      return (
        <>
          <button id="update" onClick={() => setRevision(value => value + 1)}>
            Update {revision}
          </button>
          <TagGroup aria-label="Calendar" onDismiss={dismiss}>
            <InteractionTag>
              <InteractionTagPrimary hasSecondaryAction>A</InteractionTagPrimary>
              <InteractionTagSecondary aria-label="remove" />
            </InteractionTag>
            <InteractionTag>
              <InteractionTagPrimary hasSecondaryAction>B</InteractionTagPrimary>
              <InteractionTagSecondary aria-label="remove" />
            </InteractionTag>
          </TagGroup>
        </>
      );
    };
    render(<Owner />);
    cy.get(root).then($roots => {
      const ids = Array.from($roots, node => node.id);
      expect(ids[0]).not.to.equal(ids[1]);
      expect(ids.every(Boolean)).to.equal(true);
      cy.get('#update').realClick();
      cy.get(root).should($updated => expect(Array.from($updated, node => node.id)).to.deep.equal(ids));
      cy.get(secondary).first().realClick();
      cy.get('@dismiss').its('firstCall.args.1.value').should('equal', ids[0]);
    });
  });

  it('preserves an explicit empty value instead of substituting a generated identity', () => {
    const dismiss = cy.spy().as('dismiss');
    render(
      <TagGroup aria-label="Calendar" onDismiss={dismiss}>
        <InteractionTag value="">
          <InteractionTagPrimary hasSecondaryAction>Empty identity</InteractionTagPrimary>
          <InteractionTagSecondary aria-label="remove" />
        </InteractionTag>
      </TagGroup>,
    );
    cy.get(secondary).realClick();
    cy.get('@dismiss').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { value: '' });
  });

  it('supports both documented custom-id naming and a complete aria-label override', () => {
    render(
      <>
        <InteractionTag>
          <InteractionTagPrimary id="custom-primary" hasSecondaryAction>
            Calendar
          </InteractionTagPrimary>
          <InteractionTagSecondary
            id="custom-secondary"
            aria-label="remove"
            aria-labelledby="custom-primary custom-secondary"
          />
        </InteractionTag>
        <InteractionTag>
          <InteractionTagPrimary hasSecondaryAction>Other</InteractionTagPrimary>
          <InteractionTagSecondary id="label-only" aria-label="Remove Other" aria-labelledby={null} />
        </InteractionTag>
      </>,
    );
    cy.get('#custom-secondary').should($node => {
      expect(computeAccessibleName($node[0])).to.equal('Calendar remove');
      expect($node.attr('aria-labelledby')).to.equal('custom-primary custom-secondary');
      for (const id of ['custom-primary', 'custom-secondary']) {
        expect($node[0].ownerDocument.getElementById(id)).not.to.equal(null);
      }
    });
    cy.get('#label-only').should($node => expect(computeAccessibleName($node[0])).to.equal('Remove Other'));
  });

  it('propagates live group disability and restores both native actions when re-enabled', () => {
    const select = cy.spy().as('select');
    const dismiss = cy.spy().as('dismiss');
    const Owner = () => {
      const [disabled, setDisabled] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setDisabled(value => !value)}>
            Update
          </button>
          <TagGroup aria-label="Calendar" disabled={disabled} onTagSelect={select} onDismiss={dismiss}>
            <InteractionTag>
              <InteractionTagPrimary id="primary" hasSecondaryAction>
                Calendar
              </InteractionTagPrimary>
              <InteractionTagSecondary id="secondary" aria-label="remove" />
            </InteractionTag>
          </TagGroup>
        </>
      );
    };
    render(<Owner />);
    cy.get('#update').realClick();
    cy.get('#primary').should('be.disabled').realClick();
    cy.get('#secondary').should('be.disabled').realClick();
    cy.get('@select').should('not.have.been.called');
    cy.get('@dismiss').should('not.have.been.called');
    cy.get('#update').realClick();
    cy.get('#primary').focus();
    cy.realPress('Enter');
    cy.get('@select').should('have.been.calledOnce');
    cy.get('#secondary').focus();
    cy.realPress('Enter');
    cy.get('@dismiss').should('have.been.calledOnce');
  });

  it('uses updated group selection handlers without resetting uncontrolled selection', () => {
    const first = cy.spy().as('first');
    const second = cy.spy().as('second');
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <TagGroup aria-label="Calendar" onTagSelect={updated ? second : first}>
            <InteractionTag value="a">
              <InteractionTagPrimary id="primary">Calendar</InteractionTagPrimary>
            </InteractionTag>
          </TagGroup>
        </>
      );
    };
    render(<Owner />);
    cy.get('#primary').realClick().should('have.attr', 'aria-pressed', 'true');
    cy.get('#update').realClick();
    cy.get('#primary').realClick().should('have.attr', 'aria-pressed', 'false');
    cy.get('@first').should('have.been.calledOnce');
    cy.get('@second').should('have.been.calledOnce');
  });

  it('reflects exact provider theme colors without remounting the tag container', () => {
    const Owner = () => {
      const [dark, setDark] = React.useState(false);
      return (
        <FluentProvider theme={dark ? webDarkTheme : webLightTheme}>
          <button id="theme" onClick={() => setDark(true)}>
            Theme
          </button>
          <InteractionTag id="tag">
            <InteractionTagPrimary id="primary">Calendar</InteractionTagPrimary>
          </InteractionTag>
        </FluentProvider>
      );
    };
    mount(<Owner />);
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.get('#primary').should('have.css', 'background-color', cssColor(webLightTheme.colorNeutralBackground3));
    cy.get('#tag').then($original => {
      cy.get('#theme').realClick();
      cy.get('body').realHover({ position: 'bottomRight' });
      cy.get('#tag').should($node => expect($node[0]).to.equal($original[0]));
      cy.get('#primary').should('have.css', 'background-color', cssColor(webDarkTheme.colorNeutralBackground3));
    });
  });
});
