'use client';

import * as React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies -- Opt-in Cypress probe uses the existing test dependency.
import { mount } from '@fluentui/scripts-cypress';
// eslint-disable-next-line import/no-extraneous-dependencies -- Opt-in Cypress fixture uses the existing test dependency.
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { Option } from '@fluentui/react-combobox';
import { Listbox } from './Listbox';
import { assertAbsentOrLiveActiveDescendant } from './Listbox.cy.assertions';

const Fixture = ({ empty, multiselect = false }: { empty: boolean; multiselect?: boolean }) => {
  const [removed, setRemoved] = React.useState(false);
  return (
    <>
      <button id="remove" onClick={() => setRemoved(true)}>
        Remove active option
      </button>
      <Listbox id="list" aria-label="Defect reproduction" multiselect={multiselect}>
        {!removed && <Option id="defect-cat">Cat</Option>}
        {!empty && <Option id="defect-dog">Dog</Option>}
      </Listbox>
    </>
  );
};

describe('Listbox - inherited dangling active-descendant regressions', () => {
  [false, true].forEach(empty => {
    it(`must not retain a removed option ID when the remaining list is ${empty ? 'empty' : 'nonempty'}`, () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <Fixture empty={empty} />
        </FluentProvider>,
      );
      cy.get('#list').should('have.attr', 'aria-activedescendant', 'defect-cat');
      cy.get('#defect-cat').should('have.attr', 'data-activedescendant');
      cy.get('#list').then(element => assertAbsentOrLiveActiveDescendant(element[0]));
      cy.get('#list').focus();
      cy.get('#remove').realClick();
      cy.get('#defect-cat').should('not.exist');
      cy.get('[role="option"]').should('have.length', empty ? 0 : 1);
      cy.get('#list').then(element => {
        assertAbsentOrLiveActiveDescendant(element[0]);
      });
    });
  });
});

describe('Listbox - inherited menu checkbox dangling active-descendant regressions', () => {
  [false, true].forEach(empty => {
    it(`must not retain a removed menuitemcheckbox ID when the remaining menu is ${
      empty ? 'empty' : 'nonempty'
    }`, () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <Fixture empty={empty} multiselect />
        </FluentProvider>,
      );
      cy.get('#list').should('have.attr', 'role', 'menu');
      cy.get('#list').should('have.attr', 'aria-activedescendant', 'defect-cat');
      cy.get('#defect-cat').should('have.attr', 'role', 'menuitemcheckbox').and('have.attr', 'data-activedescendant');
      cy.get('#list').then(element => assertAbsentOrLiveActiveDescendant(element[0]));
      cy.get('#list').focus();
      cy.get('#remove').realClick();
      cy.get('#defect-cat').should('not.exist');
      cy.get('[role="menuitemcheckbox"]').should('have.length', empty ? 0 : 1);
      cy.get('#list').then(element => assertAbsentOrLiveActiveDescendant(element[0]));
    });
  });
});
