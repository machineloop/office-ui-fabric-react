'use client';

import * as React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies -- Opt-in Cypress probes intentionally do not use an autodiscovered test suffix.
import { mount } from '@fluentui/scripts-cypress';
// eslint-disable-next-line import/no-extraneous-dependencies -- Browser fixture dependency, not production code.
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { Tab } from './Tab';
import { TabList } from '../TabList/TabList';
import { tabReservedSpaceClassNames } from './useTabStyles.styles';
import { useTabTestStyles } from './Tab.cy.styles';

function preventClick(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault();
}
function preventFocus(event: React.FocusEvent<HTMLElement>) {
  event.preventDefault();
}

describe('Tab intentional nominal defect probes (explicit opt-in only)', () => {
  it('nominal: preventDefault on click cancels selection after a positive unprevented control', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <TabList defaultSelectedValue="a">
          <Tab value="a" data-testid="a">
            A
          </Tab>
          <Tab value="b" data-testid="b">
            B
          </Tab>
          <Tab value="c" data-testid="c" onClick={preventClick}>
            C
          </Tab>
        </TabList>
      </FluentProvider>,
    );
    cy.get('[data-testid="b"]').realClick().should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="c"]').realClick();
    cy.get('[data-testid="b"]').should('have.attr', 'aria-selected', 'true');
  });

  it('nominal: preventDefault on automatic focus cancels selection after a positive control', () => {
    const Focus = () => {
      const [focused, setFocused] = React.useState('');
      function reportFocus(event: React.FocusEvent<HTMLElement>) {
        setFocused(event.target.getAttribute('data-testid') ?? '');
      }
      return (
        <div onFocus={reportFocus}>
          <output data-testid="committed-focus">{focused}</output>
          <TabList defaultSelectedValue="a" selectTabOnFocus>
            <Tab value="a" data-testid="a">
              A
            </Tab>
            <Tab value="b" data-testid="b">
              B
            </Tab>
            <Tab value="c" data-testid="c" onFocus={preventFocus}>
              C
            </Tab>
          </TabList>
        </div>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Focus />
      </FluentProvider>,
    );
    cy.get('[data-testid="b"]').focus();
    cy.get('[data-testid="committed-focus"]').should('have.text', 'b');
    cy.get('[data-testid="b"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="c"]').focus();
    cy.get('[data-testid="committed-focus"]').should('have.text', 'c');
    cy.get('[data-testid="b"]').should('have.attr', 'aria-selected', 'true');
  });

  it('nominal: reserveSelectedTabSpace false suppresses explicit content reservation', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <TabList reserveSelectedTabSpace={false}>
          <Tab value="a" data-testid="a">
            A
          </Tab>
          <Tab value="b" data-testid="b" content={{ title: 'Explicit' }}>
            B
          </Tab>
        </TabList>
      </FluentProvider>,
    );
    cy.get('[data-testid="a"]').find(`.${tabReservedSpaceClassNames.content}`).should('not.exist');
    cy.get('[data-testid="b"]').find(`.${tabReservedSpaceClassNames.content}`).should('not.exist');
  });

  it('nominal: explicit content IDs remain unique when reserving selected width', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <TabList>
          <Tab value="a" content={{ id: 'tab-content' }}>
            A
          </Tab>
        </TabList>
      </FluentProvider>,
    );
    cy.get('.fui-Tab__content').should('have.attr', 'id', 'tab-content');
    cy.get('[id="tab-content"]').should('have.length', 1);
  });

  it('nominal: numeric zero remains visible content alongside an icon', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <TabList>
          <Tab value="a" data-testid="a" icon={<span aria-hidden="true">Icon</span>}>
            Text
          </Tab>
          <Tab value="b" data-testid="b" icon={<span aria-hidden="true">Icon</span>}>
            {0}
          </Tab>
        </TabList>
      </FluentProvider>,
    );
    cy.get('[data-testid="a"]').find('.fui-Tab__content').should('have.text', 'Text');
    cy.get('[data-testid="b"]').find('.fui-Tab__content').should('have.text', '0');
  });

  for (const slot of ['icon', 'content'] as const) {
    it(`nominal: plain consumer ${slot} color class overrides selected descendant color`, () => {
      const Styled = () => {
        const styles = useTabTestStyles();
        return (
          <>
            <span
              data-testid="color-control"
              className={slot === 'icon' ? styles.nominalIconColor : styles.nominalContentColor}
            >
              Color control
            </span>
            <TabList defaultSelectedValue="a">
              <Tab
                value="a"
                data-testid="a"
                icon={{ className: styles.nominalIconColor, children: 'Icon' }}
                content={{ className: styles.nominalContentColor }}
              >
                A
              </Tab>
            </TabList>
          </>
        );
      };
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <Styled />
        </FluentProvider>,
      );
      const color =
        slot === 'icon' ? teamsLightTheme.colorPaletteRedForeground1 : teamsLightTheme.colorPaletteGreenForeground1;
      const expected = `rgb(${[1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16)).join(', ')})`;
      cy.get('[data-testid="color-control"]').should('have.css', 'color', expected);
      cy.get(`[data-testid="a"] .fui-Tab__${slot}`).should('have.css', 'color', expected);
    });
  }
});
