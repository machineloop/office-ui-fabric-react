import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Toolbar, ToolbarButton } from '@fluentui/react-toolbar';
import { ToolbarDivider } from './ToolbarDivider';
import { useToolbarDividerBase_unstable } from './useToolbarDivider';
import { renderDivider_unstable } from '@fluentui/react-divider';
import type { ToolbarDividerProps } from './ToolbarDivider.types';

const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const divider = () => cy.get('[role="separator"]');
const checkLine = (vertical: boolean) =>
  divider().should($divider => {
    const element = $divider[0];
    const style = getComputedStyle(element, '::before');
    expect(style.getPropertyValue(vertical ? 'border-right-width' : 'border-top-width')).to.equal('1px');
    expect(style.getPropertyValue(vertical ? 'border-right-style' : 'border-top-style')).to.equal('solid');
    expect(element.getBoundingClientRect().width).to.be.greaterThan(0);
    expect(element.getBoundingClientRect().height).to.be.greaterThan(0);
  });

describe('ToolbarDivider adversarial improvements (final)', () => {
  it('sibling toolbar contexts do not leak orientation across dividers', () => {
    mount(
      <>
        <Toolbar aria-label="Horizontal">
          <ToolbarDivider id="horizontal-context" />
        </Toolbar>
        <Toolbar vertical aria-label="Vertical">
          <ToolbarDivider id="vertical-context" />
        </Toolbar>
      </>,
    );
    cy.get('#horizontal-context').should('have.attr', 'aria-orientation', 'vertical');
    cy.get('#vertical-context').should('have.attr', 'aria-orientation', 'horizontal');
  });

  it('removing/readding text updates naming and wrapper ref while preserving root; final removal detaches root ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const wrapperRef = React.createRef<HTMLDivElement>();
    let initial: HTMLElement;
    const Example = () => {
      const [stage, setStage] = React.useState(0);
      return (
        <>
          <button onClick={() => setStage(value => value + 1)}>Next</button>
          {stage < 3 && (
            <ToolbarDivider ref={ref} wrapper={{ ref: wrapperRef }}>
              {stage === 1 ? undefined : 'Group'}
            </ToolbarDivider>
          )}
        </>
      );
    };
    mount(<Example />);
    divider().then($divider => {
      initial = $divider[0];
    });
    divider().should('have.attr', 'aria-labelledby');
    cy.contains('button', 'Next').realClick();
    divider().should('not.have.attr', 'aria-labelledby');
    divider()
      .should($divider => expect($divider[0]).to.equal(initial))
      .then(() => expect(wrapperRef.current).to.equal(null));
    cy.contains('button', 'Next').realClick();
    cy.get('.fui-Divider__wrapper')
      .should('have.text', 'Group')
      .should($wrapper => expect(wrapperRef.current).to.equal($wrapper[0]));
    cy.contains('button', 'Next').realClick();
    divider()
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });

  it('caller style overrides native layout constraints without replacing the separator line', () => {
    mount(<ToolbarDivider className="custom" style={{ width: 80, maxWidth: 'none', height: 60, padding: 10 }} />);
    divider()
      .should('have.class', 'custom')
      .and('have.css', 'padding', '10px')
      .should($divider => {
        const rect = $divider[0].getBoundingClientRect();
        expect(rect.width).to.equal(80);
        expect(rect.height).to.equal(60);
      });
    checkLine(true);
  });
});

describe('ToolbarDivider unit-derived contracts (round 3)', () => {
  it('base hook inherits perpendicular orientation without injecting design state or classes', () => {
    let state: ReturnType<typeof useToolbarDividerBase_unstable>;
    const Base = (props: ToolbarDividerProps) => {
      state = useToolbarDividerBase_unstable(props, null);
      return renderDivider_unstable(state);
    };
    mount(
      <Toolbar vertical>
        <Base>Base separator</Base>
      </Toolbar>,
    );
    divider()
      .should('have.attr', 'aria-orientation', 'horizontal')
      .and('contain.text', 'Base separator')
      .and('not.have.class', 'fui-Divider')
      .then(() => {
        expect(state).not.to.have.property('appearance');
        expect(state).not.to.have.property('alignContent');
        expect(state).not.to.have.property('inset');
      });
  });

  ([undefined, '', null] as const).forEach((children, index) => {
    it(`child boundary ${index}: wrapper presence follows defined children while accessible naming follows truthiness`, () => {
      mount(<ToolbarDivider>{children}</ToolbarDivider>);
      divider().should('not.have.attr', 'aria-labelledby');
      divider()
        .find('.fui-Divider__wrapper')
        .should(children === undefined ? 'not.exist' : 'exist');
    });
  });

  it('native root role/ARIA overrides are forwarded without changing the real line axis', () => {
    mount(<ToolbarDivider role="presentation" aria-label="Custom separator" vertical={false} />);
    cy.get('.fui-Divider')
      .should('have.attr', 'role', 'presentation')
      .and('have.attr', 'aria-label', 'Custom separator')
      .and('have.attr', 'aria-orientation', 'horizontal');
    cy.get('.fui-Divider').should($divider =>
      expect(getComputedStyle($divider[0], '::before').borderTopWidth).to.equal('1px'),
    );
  });
});

describe('ToolbarDivider edges and accessibility (round 2)', () => {
  ([false, true] as const).forEach(vertical => {
    (['ltr', 'rtl'] as const).forEach(dir => {
      it(`${vertical ? 'vertical' : 'horizontal'}/${dir}: native toolbar arrow navigation skips the separator`, () => {
        mount(
          <FluentProvider theme={webLightTheme} dir={dir}>
            <button id="before">Before</button>
            <Toolbar vertical={vertical} aria-label="Actions">
              <ToolbarButton id="first">First</ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton id="second">Second</ToolbarButton>
              <ToolbarButton id="third">Third</ToolbarButton>
            </Toolbar>
            <button id="after">After</button>
          </FluentProvider>,
        );
        cy.get('#before').focus().realPress('Tab');
        cy.get('#first')
          .should('have.focus')
          .realPress(vertical ? 'ArrowDown' : dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
        cy.get('#second')
          .should('have.focus')
          .realPress(vertical ? 'ArrowUp' : dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft');
        cy.get('#first').should('have.focus').realPress('Tab');
        cy.get('#after').should('have.focus');
        divider().should('have.prop', 'tabIndex', -1);
      });
    });
  });

  it('named wrapper/custom slots preserve native root attrs/styles and both refs', () => {
    const ref = React.createRef<HTMLDivElement>();
    const wrapperRef = React.createRef<HTMLDivElement>();
    mount(
      <ToolbarDivider
        ref={ref}
        id="native-divider"
        title="Separator"
        className="custom-divider"
        style={{ color: 'rgb(1, 2, 3)' }}
        wrapper={{
          id: 'section-label',
          title: 'Section',
          className: 'custom-wrapper',
          ref: wrapperRef,
          children: 'Override',
        }}
      >
        Section
      </ToolbarDivider>,
    );
    divider()
      .should('have.id', 'native-divider')
      .and('have.attr', 'title', 'Separator')
      .and('have.class', 'custom-divider')
      .and('have.css', 'color', 'rgb(1, 2, 3)')
      .and('have.attr', 'aria-labelledby', 'section-label')
      .should($divider => expect(ref.current).to.equal($divider[0]));
    cy.get('#section-label')
      .should('have.text', 'Section')
      .and('have.class', 'custom-wrapper')
      .and('have.attr', 'title', 'Section')
      .should($wrapper => expect(wrapperRef.current).to.equal($wrapper[0]));
  });

  it('dynamic toolbar orientation changes separator ARIA/line axis without replacing its DOM node', () => {
    let initial: HTMLElement;
    const Example = () => {
      const [vertical, setVertical] = React.useState(false);
      return (
        <>
          <button onClick={() => setVertical(value => !value)}>Rotate</button>
          <Toolbar vertical={vertical} style={{ width: 250, height: 150 }}>
            <ToolbarButton>One</ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton>Two</ToolbarButton>
            <ToolbarButton>Three</ToolbarButton>
          </Toolbar>
        </>
      );
    };
    mount(<Example />);
    divider().then($divider => {
      initial = $divider[0];
    });
    cy.contains('button', 'Rotate').realClick();
    divider()
      .should('have.attr', 'aria-orientation', 'horizontal')
      .should($divider => expect($divider[0]).to.equal(initial));
    checkLine(false);
    cy.contains('button', 'Rotate').realClick();
    divider().should('have.attr', 'aria-orientation', 'vertical');
    checkLine(true);
  });
});

describe('ToolbarDivider documented contracts (round 1)', () => {
  it('standalone defaults to a passive vertical separator using Divider styles', () => {
    mount(<ToolbarDivider />);
    divider()
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'aria-orientation', 'vertical')
      .and('have.class', 'fui-Divider')
      .and('not.have.attr', 'tabindex');
    divider().should('have.css', 'padding-left', '12px').and('have.css', 'padding-right', '12px');
    checkLine(true);
  });

  (['small', 'medium', 'large'] as const).forEach(size => {
    ([false, true] as const).forEach(vertical => {
      it(`${size}/${
        vertical ? 'vertical' : 'horizontal'
      } toolbar: separator is perpendicular and actually painted`, () => {
        mount(
          <Toolbar
            size={size}
            vertical={vertical}
            aria-label="Formatting"
            style={{ width: 300, height: vertical ? 180 : 48 }}
          >
            <ToolbarButton>First</ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton>Second</ToolbarButton>
            <ToolbarButton>Third</ToolbarButton>
          </Toolbar>,
        );
        divider().should('have.attr', 'aria-orientation', vertical ? 'horizontal' : 'vertical');
        checkLine(!vertical);
        divider().should('not.have.attr', 'aria-labelledby');
      });
    });
  });

  ([false, true] as const).forEach(vertical => {
    it(`explicit divider vertical=${vertical} overrides toolbar context inversion`, () => {
      mount(
        <Toolbar vertical={vertical} style={{ width: 300, height: 100 }}>
          <ToolbarButton>First</ToolbarButton>
          <ToolbarDivider vertical={vertical} />
          <ToolbarButton>Second</ToolbarButton>
          <ToolbarButton>Third</ToolbarButton>
        </Toolbar>,
      );
      divider().should('have.attr', 'aria-orientation', vertical ? 'vertical' : 'horizontal');
      checkLine(vertical);
    });
  });
});
