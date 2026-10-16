import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { Breadcrumb, BreadcrumbItem, BreadcrumbButton } from '@fluentui/react-breadcrumb';
import { BreadcrumbDivider } from './BreadcrumbDivider';
import { useBreadcrumbDividerBase_unstable } from './useBreadcrumbDivider';
import { renderBreadcrumbDivider_unstable } from './renderBreadcrumbDivider';
import type { BreadcrumbDividerProps } from './BreadcrumbDivider.types';

const divider = () => cy.get('.fui-BreadcrumbDivider');
const BaseDivider = React.forwardRef<HTMLLIElement, BreadcrumbDividerProps>((props, ref) =>
  renderBreadcrumbDivider_unstable(useBreadcrumbDividerBase_unstable(props, ref)),
);

describe('BreadcrumbDivider documented contracts (round 1)', () => {
  it('defaults to a hidden, noninteractive list separator outside context', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <ol>
          <BreadcrumbDivider />
        </ol>
      </FluentProvider>,
    );
    divider().should('have.prop', 'tagName', 'LI').and('have.attr', 'aria-hidden', 'true');
    divider().should('have.css', 'display', 'flex').and('have.css', 'font-size', '16px');
    divider().find('svg').should('have.length', 1).and('have.attr', 'aria-hidden', 'true');
    divider().should('have.prop', 'tabIndex', -1);
  });

  describe('BreadcrumbDivider adversarial improvements (final)', () => {
    it('isolates sibling breadcrumb sizes and nested provider directions', () => {
      mount(
        <FluentProvider theme={teamsLightTheme} dir="ltr">
          <Breadcrumb size="small">
            <BreadcrumbDivider id="small" />
          </Breadcrumb>
          <FluentProvider theme={teamsLightTheme} dir="rtl">
            <Breadcrumb size="large">
              <BreadcrumbDivider id="large" />
            </Breadcrumb>
          </FluentProvider>
          <Breadcrumb>
            <BreadcrumbDivider id="default" />
          </Breadcrumb>
        </FluentProvider>,
      );
      cy.get('#small').should('have.css', 'font-size', '12px');
      cy.get('#large').should('have.css', 'font-size', '20px');
      cy.get('#default').should('have.css', 'font-size', '16px');
      cy.get('#small path')
        .invoke('attr', 'd')
        .then(small => {
          cy.get('#default path').should('have.attr', 'd', small);
          cy.get('#large path').invoke('attr', 'd').should('not.equal', small);
        });
    });

    it('detaches the forwarded ref on removal and restores a new separator with current context', () => {
      const ref = React.createRef<HTMLLIElement>();
      let initial: HTMLLIElement | null;
      const Example = () => {
        const [visible, setVisible] = React.useState(true);
        return (
          <FluentProvider theme={teamsLightTheme}>
            <button onClick={() => setVisible(value => !value)}>Toggle</button>
            <Breadcrumb size="large">{visible && <BreadcrumbDivider ref={ref} />}</Breadcrumb>
          </FluentProvider>
        );
      };
      mount(<Example />);
      divider().then(() => {
        initial = ref.current;
        expect(initial).not.to.equal(null);
      });
      cy.contains('button', 'Toggle').realClick();
      divider()
        .should('not.exist')
        .then(() => expect(ref.current).to.equal(null));
      cy.contains('button', 'Toggle').realClick();
      divider()
        .should('have.css', 'font-size', '20px')
        .should($el => {
          expect(ref.current).to.equal($el[0]);
          expect(ref.current).not.to.equal(initial);
        });
    });
  });

  describe('BreadcrumbDivider unit-derived contracts (round 3)', () => {
    it('matches the unit default icon structure and currentColor inheritance in the browser', () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <BreadcrumbDivider />
        </FluentProvider>,
      );
      divider()
        .find('svg')
        .should('have.attr', 'data-fui-icon', '')
        .and('have.attr', 'fill', 'currentColor')
        .and('have.attr', 'viewBox', '0 0 20 20')
        .and('have.attr', 'width', '1em')
        .and('have.attr', 'height', '1em');
      divider().find('svg path').should('have.length', 1).and('have.attr', 'fill', 'currentColor');
    });

    it('full design hook intentionally replaces caller children with the directional icon', () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <BreadcrumbDivider>
            <span>Caller child</span>
          </BreadcrumbDivider>
        </FluentProvider>,
      );
      divider().should('not.contain.text', 'Caller child').find('svg').should('have.length', 1);
    });

    it('base hook retains children, native overrides and forwarded ref without design styling', () => {
      const ref = React.createRef<HTMLLIElement>();
      mount(
        <BaseDivider ref={ref} id="base" aria-hidden={false}>
          <span>Custom separator</span>
        </BaseDivider>,
      );
      cy.get('#base')
        .should('have.prop', 'tagName', 'LI')
        .and('have.attr', 'aria-hidden', 'false')
        .and('contain.text', 'Custom separator')
        .and('not.have.class', 'fui-BreadcrumbDivider')
        .should($el => expect(ref.current).to.equal($el[0]));
      cy.get('#base svg').should('not.exist');
    });

    it('root aria-hidden override wins over default in the full hook', () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <BreadcrumbDivider aria-hidden={false} aria-label="Custom separator" />
        </FluentProvider>,
      );
      divider().should('have.attr', 'aria-hidden', 'false').and('have.attr', 'aria-label', 'Custom separator');
      divider().find('svg').should('have.attr', 'aria-hidden', 'true');
    });
  });

  describe('BreadcrumbDivider edges and accessibility (round 2)', () => {
    it('does not enter native tab order between breadcrumb buttons', () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <button id="before">Before</button>
          <Breadcrumb aria-label="Location">
            <BreadcrumbItem>
              <BreadcrumbButton id="parent">Parent</BreadcrumbButton>
            </BreadcrumbItem>
            <BreadcrumbDivider />
            <BreadcrumbItem>
              <BreadcrumbButton id="current" current>
                Current
              </BreadcrumbButton>
            </BreadcrumbItem>
          </Breadcrumb>
          <button id="after">After</button>
        </FluentProvider>,
      );
      cy.get('#before').focus().realPress('Tab');
      cy.get('#parent').should('have.focus').realPress('Tab');
      cy.get('#current').should('have.focus').realPress('Tab');
      cy.get('#after').should('have.focus').realPress(['Shift', 'Tab']);
      cy.get('#current').should('have.focus').realPress(['Shift', 'Tab']);
      cy.get('#parent').should('have.focus');
      divider().should('not.have.attr', 'role');
    });

    it('preserves root native attributes, ref identity and custom styles', () => {
      const ref = React.createRef<HTMLLIElement>();
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <BreadcrumbDivider
            ref={ref}
            id="separator"
            title="Separator"
            data-native="yes"
            className="custom-divider"
            style={{ color: 'rgb(1, 2, 3)', marginInline: 7 }}
          />
        </FluentProvider>,
      );
      divider()
        .should('have.id', 'separator')
        .and('have.class', 'custom-divider')
        .and('have.attr', 'title', 'Separator')
        .and('have.attr', 'data-native', 'yes')
        .and('have.css', 'color', 'rgb(1, 2, 3)')
        .and('have.css', 'margin-left', '7px')
        .should($el => expect(ref.current).to.equal($el[0]));
    });

    it('updates inherited direction and size without remounting the separator', () => {
      let initial: HTMLElement;
      const Example = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <FluentProvider theme={teamsLightTheme} dir={changed ? 'rtl' : 'ltr'}>
            <button onClick={() => setChanged(value => !value)}>Change</button>
            <Breadcrumb size={changed ? 'large' : 'small'}>
              <BreadcrumbDivider />
            </Breadcrumb>
          </FluentProvider>
        );
      };
      mount(<Example />);
      divider().then($el => {
        initial = $el[0];
      });
      divider().should('have.css', 'font-size', '12px');
      cy.contains('button', 'Change').realClick();
      divider()
        .should('have.css', 'font-size', '20px')
        .should($el => expect($el[0]).to.equal(initial));
      divider().find('path').invoke('attr', 'd').should('match', /^M12/);
      cy.contains('button', 'Change').realClick();
      divider().should('have.css', 'font-size', '12px');
      divider().find('path').invoke('attr', 'd').should('match', /^M7/);
    });
  });

  (['small', 'medium', 'large'] as const).forEach((size, index) => {
    (['ltr', 'rtl'] as const).forEach(dir => {
      it(`${size}/${dir}: context size determines actual chevron dimensions`, () => {
        mount(
          <FluentProvider theme={teamsLightTheme} dir={dir}>
            <Breadcrumb aria-label="Location" size={size}>
              <BreadcrumbItem>
                <BreadcrumbButton>Parent</BreadcrumbButton>
              </BreadcrumbItem>
              <BreadcrumbDivider />
              <BreadcrumbItem>
                <BreadcrumbButton current>Current</BreadcrumbButton>
              </BreadcrumbItem>
            </Breadcrumb>
          </FluentProvider>,
        );
        divider()
          .should('have.attr', 'aria-hidden', 'true')
          .and('have.css', 'font-size', `${12 + index * 4}px`);
        divider()
          .find('svg')
          .should($svg => {
            const rect = $svg[0].getBoundingClientRect();
            expect(rect.width).to.equal(12 + index * 4);
            expect(rect.height).to.equal(12 + index * 4);
          });
        cy.get('[aria-current="page"]').should('contain.text', 'Current');
        divider()
          .find('path')
          .invoke('attr', 'd')
          .should('match', dir === 'rtl' ? /^M12/ : /^M7/);
      });
    });
  });
});
