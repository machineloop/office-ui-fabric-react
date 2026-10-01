import * as React from 'react';
import 'cypress-real-events';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme, teamsHighContrastTheme } from '@fluentui/react-theme';
import type { Theme } from '@fluentui/react-theme';
import { Field } from '@fluentui/react-field';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { Radio } from './Radio';
import { RadioGroup } from '../RadioGroup/RadioGroup';

const input = (value: string) => `input[type="radio"][value="${value}"]`;
const themed = (children: React.ReactNode, theme: Theme = webLightTheme, dir: 'ltr' | 'rtl' = 'ltr') => (
  <FluentProvider theme={theme} dir={dir}>
    {children}
  </FluentProvider>
);
const mountRadio = (children: React.ReactNode) => mount(themed(children));
const fruits = (
  <>
    <Radio value="apple" label="Apple" />
    <Radio value="pear" label="Pear" />
    <Radio value="banana" label="Banana" />
  </>
);

function selected(value?: string) {
  cy.get('input[type="radio"]:checked').should('have.length', value === undefined ? 0 : 1);
  if (value !== undefined) {
    cy.get(input(value)).should('be.checked');
  }
}

function scan(theme: Theme = webLightTheme) {
  // Light-theme unchecked labels and Field messages meet AA, not AAA; measured evidence is in Radio.cy.md.
  // Exclude these slots only from the enhanced-contrast rule, not from AA contrast or any semantic rule.
  const enhancedContrastExceptions = [
    '.fui-Radio__input:enabled:not(:checked) ~ .fui-Radio__label',
    '.fui-Radio__input:enabled:not(:checked) ~ .fui-Radio__label *',
    '.fui-Field__hint',
    '.fui-Field__hint *',
    '.fui-Field__validationMessage',
    '.fui-Field__validationMessage *',
  ];
  cy.get('[data-testid="scan"]')
    .then($root => {
      const forcedColors = $root[0].ownerDocument.defaultView!.matchMedia('(forced-colors: active)').matches;
      const exceptions = theme === webLightTheme && !forcedColors ? enhancedContrastExceptions : [];
      axe.configure({
        rules: [
          {
            id: 'color-contrast-enhanced',
            selector: `*${exceptions.map(selector => `:not(${selector})`).join('')}`,
          },
        ],
      });
      return axe.run($root[0], {
        rules: Object.fromEntries(axe.getRules().map(rule => [rule.ruleId, { enabled: true }])),
      });
    })
    .then(result => {
      expect(
        result.violations.map(violation =>
          JSON.stringify({
            id: violation.id,
            nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })),
          }),
        ),
      ).to.deep.equal([]);
    });
}

describe('Radio browser semantics', () => {
  it('associates unique generated input IDs with visible labels and hides only the indicator', () => {
    mountRadio(
      <Field label="Favorite fruit" data-testid="scan">
        <RadioGroup>{fruits}</RadioGroup>
      </Field>,
    );
    selected();
    cy.get('input[type="radio"]').should($inputs => {
      const ids = Array.from($inputs, element => element.id);
      expect(new Set(ids).size).to.equal(3);
      $inputs.each((_, element) => {
        const radio = element as HTMLInputElement;
        expect(radio.id).not.to.equal('');
        expect(radio.labels).to.have.length(1);
        expect(radio.labels![0].htmlFor).to.equal(radio.id);
        expect(computeAccessibleName(radio)).to.equal(radio.labels![0].textContent);
        expect(radio.getAttribute('aria-hidden')).to.equal(null);
      });
    });
    cy.get('.fui-Radio__indicator').should('have.length', 3).and('have.attr', 'aria-hidden', 'true');
    cy.contains('label', 'Pear').realClick();
    selected('pear');
    scan();
  });

  it('routes native props to input while className/style and root overrides stay on the wrapper', () => {
    mountRadio(
      <Radio
        label="Native option"
        id="native-option"
        name="choice"
        value="native"
        title="Input title"
        lang="fr"
        data-testid="native"
        className="consumer"
        style={{ marginLeft: 17 }}
        root={{ title: 'Root title', ...{ 'data-testid': 'root' } }}
      />,
    );
    cy.get('[data-testid="native"]')
      .should('have.prop', 'tagName', 'INPUT')
      .and('have.attr', 'id', 'native-option')
      .and('have.attr', 'name', 'choice')
      .and('have.attr', 'title', 'Input title')
      .and('have.attr', 'lang', 'fr')
      .and('not.have.class', 'consumer');
    cy.get('[data-testid="root"]')
      .should('have.prop', 'tagName', 'SPAN')
      .and('have.class', 'consumer')
      .and('have.css', 'margin-left', '17px')
      .and('not.have.attr', 'name');
    cy.contains('label', 'Native option').should('have.attr', 'for', 'native-option').realClick();
    selected('native');
  });

  it('selects on indicator-area and label clicks, reports the native event/value only on selection', () => {
    const apple = cy.spy().as('apple');
    const pear = cy.spy().as('pear');
    const group = cy.spy().as('group');
    mountRadio(
      <RadioGroup aria-label="Fruit" name="fruit" onChange={group}>
        <Radio value="apple" label="Apple" onChange={apple} />
        <Radio value="pear" label="Pear" onChange={pear} />
      </RadioGroup>,
    );
    cy.get(input('apple')).realClick();
    cy.contains('label', 'Apple').realClick();
    cy.get('@apple').should('have.been.calledOnce');
    cy.get('@pear').should('not.have.been.called');
    cy.contains('label', 'Pear').realClick();
    selected('pear');
    cy.get('@apple').should('have.been.calledOnce');
    cy.get('@pear').should('have.been.calledOnce');
    cy.get('@group').should('have.been.calledTwice');
    cy.then(() => {
      expect(pear.firstCall.args[1]).to.deep.equal({ value: 'pear' });
      expect(pear.firstCall.args[0].target).to.equal(Cypress.$(input('pear'))[0]);
      expect(group.lastCall.args[1]).to.deep.equal({ value: 'pear' });
    });
  });

  it('tabs into the first unchecked radio, Space selects it, and Tab/Shift+Tab traverse one group stop', () => {
    mountRadio(
      <>
        <button>Before</button>
        <RadioGroup aria-label="Fruit">{fruits}</RadioGroup>
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').realClick();
    cy.realPress('Tab');
    cy.get(input('apple')).should('be.focused').and('not.be.checked');
    cy.realPress('Space');
    selected('apple');
    cy.realPress('Space');
    selected('apple');
    cy.realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    cy.get(input('apple')).should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    cy.contains('button', 'Before').should('be.focused');
  });

  it('uses all four real arrow keys, wraps, and skips disabled items', () => {
    mountRadio(
      <RadioGroup aria-label="Fruit" defaultValue="apple">
        <Radio value="apple" label="Apple" />
        <Radio value="pear" label="Pear" disabled />
        <Radio value="banana" label="Banana" />
      </RadioGroup>,
    );
    cy.get(input('apple')).realClick();
    cy.realPress('ArrowRight');
    cy.get(input('banana')).should('be.focused').and('be.checked');
    cy.realPress('ArrowDown');
    cy.get(input('apple')).should('be.focused').and('be.checked');
    cy.realPress('ArrowLeft');
    cy.get(input('banana')).should('be.focused').and('be.checked');
    cy.realPress('ArrowUp');
    cy.get(input('apple')).should('be.focused').and('be.checked');
    cy.get(input('pear')).should('not.be.checked');
  });

  it('uses a selected defaultValue as the tab entry point and ignores subsequent defaultValue updates', () => {
    const Example = () => {
      const [value, setValue] = React.useState('pear');
      return (
        <>
          <button onClick={() => setValue('banana')}>Update default</button>
          <RadioGroup aria-label="Fruit" defaultValue={value}>
            {fruits}
          </RadioGroup>
        </>
      );
    };
    mountRadio(<Example />);
    selected('pear');
    cy.contains('button', 'Update default').realClick();
    selected('pear');
    cy.realPress('Tab');
    cy.get(input('pear')).should('be.focused');
    cy.contains('label', 'Apple').realClick();
    selected('apple');
  });

  it('keeps defaultChecked uncontrolled after updates and subsequent native selection', () => {
    const Example = () => {
      const [initial, setInitial] = React.useState(true);
      return (
        <>
          <button onClick={() => setInitial(false)}>Update default</button>
          <RadioGroup aria-label="Fruit">
            <Radio value="apple" label="Apple" defaultChecked={initial} />
            <Radio value="pear" label="Pear" />
          </RadioGroup>
        </>
      );
    };
    mountRadio(<Example />);
    selected('apple');
    cy.contains('button', 'Update default').realClick();
    selected('apple');
    cy.contains('label', 'Pear').realClick();
    selected('pear');
  });

  it('updates a controlled group through selection and supports clearing selection externally', () => {
    const Example = () => {
      const [value, setValue] = React.useState('pear');
      return (
        <>
          <RadioGroup aria-label="Fruit" value={value} onChange={(_, data) => setValue(data.value)}>
            {fruits}
          </RadioGroup>
          <button onClick={() => setValue('')}>Clear</button>
          <button onClick={() => setValue('banana')}>Choose banana</button>
        </>
      );
    };
    mountRadio(<Example />);
    selected('pear');
    cy.contains('label', 'Apple').realClick();
    selected('apple');
    cy.contains('button', 'Clear').realClick();
    selected();
    cy.contains('button', 'Choose banana').realClick();
    selected('banana');
  });

  it('restores controlled checked state when the consumer declines a selection, then accepts prop updates', () => {
    const changed = cy.spy().as('changed');
    const Example = () => {
      const [checked, setChecked] = React.useState(false);
      return (
        <>
          <Radio label="Controlled" value="controlled" checked={checked} onChange={changed} />
          <button onClick={() => setChecked(!checked)}>Toggle checked</button>
        </>
      );
    };
    mountRadio(<Example />);
    cy.contains('label', 'Controlled').realClick();
    selected();
    cy.get('@changed').should('have.been.calledOnce');
    cy.contains('button', 'Toggle checked').realClick();
    selected('controlled');
    cy.contains('button', 'Toggle checked').realClick();
    selected();
  });

  it('disables the whole group, preserves its selection, blocks label activation and removes its tab stop', () => {
    const changed = cy.spy().as('changed');
    mountRadio(
      <>
        <button>Before</button>
        <RadioGroup aria-label="Fruit" disabled defaultValue="pear" onChange={changed}>
          {fruits}
        </RadioGroup>
        <button>After</button>
      </>,
    );
    cy.get('input[type="radio"]').each($radio => cy.wrap($radio).should('be.disabled'));
    cy.contains('label', 'Apple').realClick();
    selected('pear');
    cy.get('@changed').should('not.have.been.called');
    cy.contains('button', 'Before').realClick();
    cy.realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
  });

  it('honors explicit item disabled/required/name overrides over group context', () => {
    mountRadio(
      <RadioGroup aria-label="Options" disabled required name="group-name">
        <Radio value="inherited" label="Inherited" />
        <Radio value="override" label="Override" disabled={false} required={false} name="own-name" />
      </RadioGroup>,
    );
    cy.get(input('inherited'))
      .should('be.disabled')
      .and('have.prop', 'required', true)
      .and('have.attr', 'name', 'group-name');
    cy.get(input('override'))
      .should('be.enabled')
      .and('have.prop', 'required', false)
      .and('have.attr', 'name', 'own-name');
    cy.contains('label', 'Override').realClick();
    selected('override');
  });

  it('generates independent group names and enforces native exclusivity within each group', () => {
    mountRadio(
      <>
        <RadioGroup aria-label="First" data-testid="first">
          {fruits}
        </RadioGroup>
        <RadioGroup aria-label="Second" data-testid="second">
          {fruits}
        </RadioGroup>
      </>,
    );
    cy.get('[data-testid="first"] input').then($first => {
      cy.get('[data-testid="second"] input').should($second => {
        const firstName = ($first[0] as HTMLInputElement).name;
        const secondName = ($second[0] as HTMLInputElement).name;
        expect(firstName).not.to.equal('');
        expect(secondName).not.to.equal(firstName);
        $first.each((_, item) => {
          expect((item as HTMLInputElement).name).to.equal(firstName);
        });
        $second.each((_, item) => {
          expect((item as HTMLInputElement).name).to.equal(secondName);
        });
      });
    });
    cy.get('[data-testid="first"]').contains('label', 'Apple').realClick();
    cy.get('[data-testid="second"]').contains('label', 'Pear').realClick();
    cy.get('input:checked').should('have.length', 2);
    cy.get('[data-testid="first"]').contains('label', 'Banana').realClick();
    cy.get('[data-testid="first"] input:checked').should('have.value', 'banana');
    cy.get('[data-testid="second"] input:checked').should('have.value', 'pear');
  });

  it('submits only the selected enabled named native radio, with the default value "on" when value is omitted', () => {
    const submit = cy.spy().as('submit');
    mountRadio(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit(Array.from(new FormData(event.currentTarget).entries()));
        }}
      >
        <RadioGroup aria-label="Fruit" name="fruit" defaultValue="pear">
          {fruits}
        </RadioGroup>
        <Radio label="Disabled" name="disabled" value="ignored" defaultChecked disabled />
        <Radio label="Unnamed" value="ignored" defaultChecked />
        <Radio label="Native default" name="native" defaultChecked />
        <button type="submit">Submit</button>
      </form>,
    );
    cy.contains('button', 'Submit').realClick();
    cy.get('@submit').should('have.been.calledWithExactly', [
      ['fruit', 'pear'],
      ['native', 'on'],
    ]);
    cy.contains('label', 'Banana').realClick();
    cy.contains('button', 'Submit').realClick();
    cy.then(() =>
      expect(submit.lastCall.args[0]).to.deep.equal([
        ['fruit', 'banana'],
        ['native', 'on'],
      ]),
    );
  });

  it('requires one selection natively, blocks invalid submission, and submits once the group is valid', () => {
    const submitted = cy.spy().as('submitted');
    const invalid = cy.spy().as('invalid');
    mountRadio(
      <form
        onInvalid={invalid}
        onSubmit={event => {
          event.preventDefault();
          submitted();
        }}
      >
        <Field label="Favorite fruit" required>
          <RadioGroup name="fruit" required>
            {fruits}
          </RadioGroup>
        </Field>
        <button type="submit">Submit</button>
      </form>,
    );
    cy.get('input[type="radio"]').each($radio => {
      cy.wrap($radio).should('have.prop', 'required', true);
      expect(($radio[0] as HTMLInputElement).validity.valueMissing).to.equal(true);
    });
    cy.contains('button', 'Submit').realClick();
    cy.get('@submitted').should('not.have.been.called');
    cy.get('@invalid').should('have.been.called');
    cy.contains('label', 'Pear').realClick();
    cy.get('form').should($form => expect(($form[0] as HTMLFormElement).checkValidity()).to.equal(true));
    cy.contains('button', 'Submit').realClick();
    cy.get('@submitted').should('have.been.calledOnce');
  });
});

describe('Radio composition and updates', () => {
  it('forwards an object ref to the actual input for focus and clears it when removed', () => {
    const ref = React.createRef<HTMLInputElement>();
    mountRadio(<Radio label="Referenced" value="ref" ref={ref} />).then(({ rerender }) => {
      cy.get(input('ref')).then($input => {
        expect(ref.current).to.equal($input[0]);
        ref.current!.focus();
      });
      cy.get(input('ref')).should('be.focused');
      cy.realPress('Space');
      selected('ref');
      cy.then(() => rerender(themed(null)));
      cy.get('input[type="radio"]').should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
    });
  });

  it('cleans up replaced forwarded callback refs and slot callback refs on replacement and removal', () => {
    const firstInput = cy.spy();
    const secondInput = cy.spy();
    const firstRoot = cy.spy();
    const secondRoot = cy.spy();
    const firstIndicator = cy.spy();
    const secondIndicator = cy.spy();
    const firstLabel = cy.spy();
    const secondLabel = cy.spy();
    const tree = (updated: boolean) =>
      themed(
        <Radio
          value="ref"
          label={{ children: 'Referenced', ref: updated ? secondLabel : firstLabel }}
          ref={updated ? secondInput : firstInput}
          root={{ ref: updated ? secondRoot : firstRoot }}
          indicator={{ ref: updated ? secondIndicator : firstIndicator }}
        />,
      );
    mount(tree(false)).then(({ rerender }) => {
      cy.get(input('ref')).then($input => {
        expect(firstInput.lastCall.args[0]).to.equal($input[0]);
        expect(firstRoot.lastCall.args[0]).to.equal($input[0].parentElement);
        expect(firstIndicator.lastCall.args[0]).to.equal($input[0].nextElementSibling);
        expect(firstLabel.lastCall.args[0]).to.equal(($input[0] as HTMLInputElement).labels![0]);
      });
      cy.then(() => rerender(tree(true)));
      cy.get(input('ref')).should($input => {
        [firstInput, firstRoot, firstIndicator, firstLabel].forEach(ref => expect(ref.lastCall.args[0]).to.equal(null));
        expect(secondInput.lastCall.args[0]).to.equal($input[0]);
        expect(secondRoot.lastCall.args[0]).to.equal($input[0].parentElement);
        expect(secondIndicator.lastCall.args[0]).to.equal($input[0].nextElementSibling);
        expect(secondLabel.lastCall.args[0]).to.equal(($input[0] as HTMLInputElement).labels![0]);
      });
      cy.then(() => rerender(themed(null)));
      cy.get('input[type="radio"]').should('not.exist');
      cy.then(() => {
        [secondInput, secondRoot, secondIndicator, secondLabel].forEach(ref =>
          expect(ref.lastCall.args[0]).to.equal(null),
        );
      });
    });
  });

  it('allows the input slot to override native props and still merges slot and top-level change callbacks', () => {
    const slotChanged = cy.spy();
    const changed = cy.spy();
    const ref = cy.spy();
    mountRadio(
      <Radio
        id="outer"
        value="outer"
        name="outer"
        label="Slot option"
        onChange={changed}
        input={{ id: 'inner', value: 'inner', name: 'inner', ref, onChange: slotChanged }}
      />,
    ).then(({ rerender }) => {
      cy.get('#inner').should('have.value', 'inner').and('have.attr', 'name', 'inner');
      cy.get('#outer').should('not.exist');
      cy.contains('label', 'Slot option').should('have.attr', 'for', 'inner').realClick();
      cy.get('#inner').should('be.checked');
      cy.then(() => {
        expect(slotChanged).to.have.been.calledOnce;
        expect(changed).to.have.been.calledOnce;
        expect(slotChanged.firstCall.calledBefore(changed.firstCall)).to.equal(true);
        expect(changed.firstCall.args[1]).to.deep.equal({ value: 'inner' });
        expect(ref.lastCall.args[0]).to.equal(Cypress.$('#inner')[0]);
      });
      cy.then(() => rerender(themed(null)));
      cy.get('input[type="radio"]').should('not.exist');
      cy.then(() => expect(ref.lastCall.args[0]).to.equal(null));
    });
  });

  it('renders label omissions with an accessible name and keeps the native input and default indicator', () => {
    mountRadio(
      <RadioGroup aria-label="Icon choices" data-testid="scan">
        <Radio value="omitted" aria-label="Omitted label" />
        <Radio value="null" label={null} aria-label="Null label" />
      </RadioGroup>,
    );
    cy.get('.fui-Radio__label').should('not.exist');
    cy.get('.fui-Radio__indicator').should('have.length', 2);
    cy.get(input('null')).realClick();
    selected('null');
    cy.get(input('null')).should($radio => expect(computeAccessibleName($radio[0])).to.equal('Null label'));
    scan();
  });

  it('supports non-void slot render functions without losing native selection, association or static classes', () => {
    const root: SlotRenderFunction<ExtractSlotProps<React.ComponentProps<typeof Radio>['root']>> = (
      Component,
      props,
    ) => (
      <Component {...props} data-rendered="root">
        {props.children}
        <span aria-hidden="true">Decoration</span>
      </Component>
    );
    const indicator: SlotRenderFunction<ExtractSlotProps<React.ComponentProps<typeof Radio>['indicator']>> = (
      Component,
      props,
    ) => (
      <Component {...props} data-rendered="indicator">
        <span>●</span>
      </Component>
    );
    const label: SlotRenderFunction<ExtractSlotProps<React.ComponentProps<typeof Radio>['label']>> = (
      Component,
      props,
    ) => (
      <Component {...props} data-rendered="label">
        <strong>Rendered label</strong>
      </Component>
    );
    mountRadio(
      <Radio
        value="rendered"
        root={{ children: root }}
        input={{ className: 'rendered-input', ...{ 'data-rendered': 'input' } }}
        indicator={{ children: indicator }}
        label={{ children: label }}
      />,
    );
    cy.get('[data-rendered="root"]').should('have.class', 'fui-Radio');
    cy.get('[data-rendered="input"]').should('have.class', 'fui-Radio__input').and('have.attr', 'type', 'radio');
    cy.get('[data-rendered="indicator"]')
      .should('have.class', 'fui-Radio__indicator')
      .and('have.attr', 'aria-hidden', 'true');
    cy.get('[data-rendered="label"]').should('have.class', 'fui-Radio__label').realClick();
    selected('rendered');
    cy.get(input('rendered')).should($radio => expect(computeAccessibleName($radio[0])).to.equal('Rendered label'));
  });

  it('supports formatted multiline labels and external descriptive subtext without changing the value', () => {
    mountRadio(
      <Field label="Favorite fruit" data-testid="scan">
        <RadioGroup>
          <Radio
            value="banana"
            label={
              <>
                <strong>Banana </strong>
                <br />
                <small>Ripe fruit</small>
              </>
            }
          />
          <Radio value="pear" label="Pear" aria-describedby="pear-help" />
          <span id="pear-help">Locally grown</span>
        </RadioGroup>
      </Field>,
    );
    cy.contains('small', 'Ripe fruit').realClick();
    selected('banana');
    cy.get(input('banana')).should($radio => expect(computeAccessibleName($radio[0])).to.equal('Banana Ripe fruit'));
    cy.get(input('pear')).should($radio => {
      expect(computeAccessibleName($radio[0])).to.equal('Pear');
      expect(computeAccessibleDescription($radio[0])).to.equal('Locally grown');
    });
    scan();
  });

  it('inherits Field labels, validation/hint descriptions and ARIA required while documenting native-required separation', () => {
    mountRadio(
      <div data-testid="scan">
        <Field label="Favorite fruit" hint="Choose a fruit" validationMessage="Selection needed" required>
          <RadioGroup aria-describedby="extra">
            <Radio value="apple" label="Apple" />
            <Radio value="pear" label="Pear" aria-describedby="local" />
          </RadioGroup>
        </Field>
        <span id="extra">Group detail</span>
        <span id="local">Pear detail</span>
      </div>,
    );
    cy.get('[role="radiogroup"]').should($group => {
      expect(computeAccessibleName($group[0])).to.equal('Favorite fruit');
      expect(computeAccessibleDescription($group[0])).to.equal('Selection needed Choose a fruit Group detail');
      expect($group.attr('aria-required')).to.equal('true');
    });
    cy.get(input('apple')).should($radio => {
      expect(computeAccessibleDescription($radio[0])).to.equal('Selection needed Choose a fruit Group detail');
      // RadioGroup currently receives only aria-required from Field (see Radio.cy.md).
      expect(($radio[0] as HTMLInputElement).required).to.equal(false);
    });
    cy.get(input('pear')).should($radio => expect(computeAccessibleDescription($radio[0])).to.equal('Pear detail'));
    scan();
  });

  it('uses latest top-level and input-slot handlers and native props while preserving input identity', () => {
    const first = cy.spy().as('first');
    const latest = cy.spy().as('latest');
    const firstSlot = cy.spy().as('firstSlot');
    const latestSlot = cy.spy().as('latestSlot');
    let original: HTMLElement;
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update</button>
          <Radio
            value={updated ? 'new' : 'old'}
            label={updated ? 'New label' : 'Old label'}
            name={updated ? 'new-name' : 'old-name'}
            id={updated ? 'new-id' : 'old-id'}
            onChange={updated ? latest : first}
            input={{ onChange: updated ? latestSlot : firstSlot }}
          />
        </>
      );
    };
    mountRadio(<Example />);
    cy.get('#old-id').then($radio => {
      original = $radio[0];
    });
    cy.contains('button', 'Update').realClick();
    cy.get('#new-id')
      .should('have.attr', 'name', 'new-name')
      .then($radio => expect($radio[0]).to.equal(original));
    cy.contains('label', 'New label').should('have.attr', 'for', 'new-id').realClick();
    selected('new');
    cy.get('@first').should('not.have.been.called');
    cy.get('@firstSlot').should('not.have.been.called');
    cy.get('@latest').should('have.been.calledOnce');
    cy.get('@latestSlot').should('have.been.calledOnce');
    cy.then(() => expect(latest.firstCall.args[1]).to.deep.equal({ value: 'new' }));
  });

  it('updates disabled and required at runtime while preserving checked selection', () => {
    const Example = () => {
      const [disabled, setDisabled] = React.useState(true);
      return (
        <>
          <button onClick={() => setDisabled(!disabled)}>Toggle</button>
          <RadioGroup aria-label="Fruit" disabled={disabled} required={!disabled} defaultValue="pear">
            {fruits}
          </RadioGroup>
        </>
      );
    };
    mountRadio(<Example />);
    cy.contains('button', 'Toggle').realClick();
    selected('pear');
    cy.get('input[type="radio"]').each($radio =>
      cy.wrap($radio).should('be.enabled').and('have.prop', 'required', true),
    );
    cy.contains('label', 'Apple').realClick();
    selected('apple');
    cy.contains('button', 'Toggle').realClick();
    cy.get('input[type="radio"]').each($radio =>
      cy.wrap($radio).should('be.disabled').and('have.prop', 'required', false),
    );
    cy.contains('label', 'Pear').realClick();
    selected('apple');
  });

  it('honors explicit Radio checked/defaultChecked rather than inherited group selection defaults', () => {
    mountRadio(
      <RadioGroup key="uncontrolled" aria-label="Fruit" defaultValue="apple">
        <Radio value="apple" label="Apple" defaultChecked={false} />
        <Radio value="pear" label="Pear" defaultChecked />
      </RadioGroup>,
    ).then(({ rerender }) => {
      selected('pear');
      cy.then(() =>
        rerender(
          themed(
            <RadioGroup key="controlled" aria-label="Fruit" value="apple">
              <Radio value="apple" label="Apple" checked={false} onChange={() => undefined} />
              <Radio value="pear" label="Pear" checked onChange={() => undefined} />
            </RadioGroup>,
          ),
        ),
      );
      selected('pear');
    });
  });
});

describe('Radio native forms', () => {
  it('resets uncontrolled selection to the initial default without firing change callbacks', () => {
    const changed = cy.spy().as('changed');
    const reset = cy.spy().as('reset');
    mountRadio(
      <form onReset={reset}>
        <RadioGroup aria-label="Fruit" name="fruit" defaultValue="pear" onChange={changed}>
          {fruits}
        </RadioGroup>
        <button type="reset">Reset</button>
      </form>,
    );
    cy.contains('label', 'Banana').realClick();
    selected('banana');
    cy.get('@changed').should('have.been.calledOnce');
    cy.contains('button', 'Reset').realClick();
    selected('pear');
    cy.get('@changed').should('have.been.calledOnce');
    cy.get('@reset').should('have.been.calledOnce');
    cy.get('form').then($form => expect(new FormData($form[0] as HTMLFormElement).get('fruit')).to.equal('pear'));
  });

  it('resets a group with no initial selection to empty and honors canceled native resets', () => {
    const Example = () => {
      const [cancel, setCancel] = React.useState(true);
      return (
        <form
          onReset={event => {
            if (cancel) {
              event.preventDefault();
            }
          }}
        >
          <RadioGroup aria-label="Fruit">{fruits}</RadioGroup>
          <button type="button" onClick={() => setCancel(false)}>
            Allow reset
          </button>
          <button type="reset">Reset</button>
        </form>
      );
    };
    mountRadio(<Example />);
    cy.contains('label', 'Pear').realClick();
    cy.contains('button', 'Reset').realClick();
    selected('pear');
    cy.contains('button', 'Allow reset').realClick();
    cy.contains('button', 'Reset').realClick();
    selected();
  });

  it('lets consumers synchronize controlled state explicitly on form reset', () => {
    const Example = () => {
      const [value, setValue] = React.useState('pear');
      return (
        <form
          onReset={event => {
            event.preventDefault();
            setValue('pear');
          }}
        >
          <RadioGroup aria-label="Fruit" value={value} onChange={(_, data) => setValue(data.value)}>
            {fruits}
          </RadioGroup>
          <button type="reset">Reset</button>
        </form>
      );
    };
    mountRadio(<Example />);
    cy.contains('label', 'Banana').realClick();
    selected('banana');
    cy.contains('button', 'Reset').realClick();
    selected('pear');
    cy.get(input('pear')).realClick();
    cy.realPress('ArrowDown');
    selected('banana');
  });

  it('associates an out-of-form input through form and keeps same-name radios in different forms independent', () => {
    const submit = cy.spy().as('submit');
    mountRadio(
      <>
        <form
          id="first-form"
          onSubmit={event => {
            event.preventDefault();
            submit(new FormData(event.currentTarget).get('fruit'));
          }}
        >
          <Radio label="Inside" name="fruit" value="inside" defaultChecked />
          <button type="submit">Submit first</button>
        </form>
        <Radio label="Outside" name="fruit" value="outside" form="first-form" />
        <form id="second-form">
          <Radio label="Second form" name="fruit" value="second" defaultChecked />
        </form>
      </>,
    );
    cy.contains('label', 'Outside').realClick();
    cy.get(input('inside')).should('not.be.checked');
    cy.get(input('outside')).should('be.checked');
    cy.get(input('second')).should('be.checked');
    cy.contains('button', 'Submit first').realClick();
    cy.get('@submit').should('have.been.calledWithExactly', 'outside');
    cy.get(input('outside')).should($radio => expect(($radio[0] as HTMLInputElement).form!.id).to.equal('first-form'));
  });

  it('honors native disabled fieldsets for focus, required validation and successful form controls', () => {
    mountRadio(
      <form>
        <button type="button">Before</button>
        <fieldset disabled>
          <legend>Unavailable fruit</legend>
          <RadioGroup aria-label="Fruit" name="fruit" required defaultValue="pear">
            {fruits}
          </RadioGroup>
        </fieldset>
        <button type="button">After</button>
      </form>,
    );
    cy.get('input[type="radio"]').each($radio => {
      cy.wrap($radio).should('be.disabled');
      expect(($radio[0] as HTMLInputElement).willValidate).to.equal(false);
    });
    cy.contains('label', 'Apple').realClick();
    selected('pear');
    cy.contains('button', 'Before').realClick();
    cy.realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
    cy.get('form').then($form => {
      expect(($form[0] as HTMLFormElement).checkValidity()).to.equal(true);
      expect(new FormData($form[0] as HTMLFormElement).has('fruit')).to.equal(false);
    });
  });
});

function css(element: Element, pseudo?: string) {
  return element.ownerDocument.defaultView!.getComputedStyle(element, pseudo);
}

function color(element: HTMLElement, value: string) {
  const probe = element.ownerDocument.createElement('span');
  probe.style.color = value;
  probe.style.forcedColorAdjust = 'none';
  element.appendChild(probe);
  const result = css(probe).color;
  probe.remove();
  return result;
}

describe('Radio layout and visuals', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const layout of ['vertical', 'horizontal', 'horizontal-stacked'] as const) {
      it(`has real ${dir} ${layout} indicator/label/hit-target geometry and working native navigation`, () => {
        mount(
          themed(
            <Field label="Favorite fruit" data-testid="scan">
              <RadioGroup layout={layout} defaultValue="apple">
                {fruits}
              </RadioGroup>
            </Field>,
            webLightTheme,
            dir,
          ),
        );
        cy.get('.fui-Radio').should($roots => {
          const first = $roots[0].getBoundingClientRect();
          const second = $roots[1].getBoundingClientRect();
          if (layout === 'vertical') {
            expect(second.top).to.be.at.least(first.bottom);
          } else {
            expect(second.top).to.be.closeTo(first.top, 1);
            if (dir === 'ltr') {
              expect(second.left).to.be.at.least(first.right);
            } else {
              expect(second.right).to.be.at.most(first.left);
            }
          }
          $roots.each((_, root) => {
            const indicator = root.querySelector('.fui-Radio__indicator')!.getBoundingClientRect();
            const label = root.querySelector('label')!.getBoundingClientRect();
            const hit = root.querySelector('input')!.getBoundingClientRect();
            expect(indicator.width).to.equal(16);
            expect(indicator.height).to.equal(16);
            expect(hit.left).to.be.at.most(indicator.left);
            expect(hit.right).to.be.at.least(indicator.right);
            expect(hit.top).to.be.at.most(indicator.top);
            expect(hit.bottom).to.be.at.least(indicator.bottom);
            if (layout === 'horizontal-stacked') {
              expect(label.top).to.be.at.least(indicator.bottom);
              expect((label.left + label.right) / 2).to.be.closeTo((indicator.left + indicator.right) / 2, 1);
            } else {
              if (dir === 'ltr') {
                expect(label.left).to.be.at.least(indicator.right);
              } else {
                expect(label.right).to.be.at.most(indicator.left);
              }
              expect(hit.height).to.equal(root.getBoundingClientRect().height);
            }
          });
        });
        cy.contains('label', 'Apple').realClick();
        cy.realPress('ArrowDown');
        cy.get(input('pear')).should('be.focused').and('be.checked');
        cy.contains('label', 'Banana').realClick();
        selected('banana');
        scan();
      });
    }
  }

  it('lets explicit labelPosition override horizontal-stacked defaults and dynamically removes obsolete layout styles', () => {
    const Example = () => {
      const [below, setBelow] = React.useState(false);
      return (
        <>
          <button onClick={() => setBelow(!below)}>Switch position</button>
          <RadioGroup aria-label="Fruit" layout="horizontal-stacked">
            <Radio value="apple" label="Apple" labelPosition={below ? 'below' : 'after'} defaultChecked />
          </RadioGroup>
        </>
      );
    };
    mountRadio(<Example />);
    const assertPosition = (below: boolean) =>
      cy.get('.fui-Radio').should($root => {
        const root = $root[0];
        const indicator = root.querySelector('.fui-Radio__indicator')!.getBoundingClientRect();
        const label = root.querySelector('label')!.getBoundingClientRect();
        expect(css(root).flexDirection).to.equal(below ? 'column' : 'row');
        if (below) {
          expect(label.top).to.be.at.least(indicator.bottom);
        } else {
          expect(label.left).to.be.at.least(indicator.right);
        }
      });
    assertPosition(false);
    cy.contains('button', 'Switch position').realClick();
    assertPosition(true);
    selected('apple');
    cy.contains('button', 'Switch position').realClick();
    assertPosition(false);
    selected('apple');
  });

  it('supports native external labels before and after an unlabeled Radio with the same explicit input ID', () => {
    mountRadio(
      <form>
        <label htmlFor="external">Before</label>
        <Radio id="external" value="external" />
        <label htmlFor="external">After</label>
        <button type="reset">Reset</button>
      </form>,
    );
    cy.get('#external').should($radio => {
      expect(($radio[0] as HTMLInputElement).labels).to.have.length(2);
      expect(computeAccessibleName($radio[0])).to.equal('Before After');
    });
    cy.contains('label', 'Before').realClick();
    selected('external');
    cy.contains('button', 'Reset').realClick();
    selected();
    cy.contains('label', 'After').realClick();
    selected('external');
  });

  it('draws a visible keyboard focus outline on the root while the native focused input remains transparent', () => {
    mountRadio(
      <>
        <button>Before</button>
        <RadioGroup aria-label="Fruit">{fruits}</RadioGroup>
      </>,
    );
    cy.contains('button', 'Before').realClick();
    cy.realPress('Tab');
    cy.get(input('apple')).should('be.focused').and('have.css', 'opacity', '0');
    cy.get(input('apple'))
      .parent()
      .should($root => {
        const outline = css($root[0], '::after');
        expect(outline.content).to.equal('""');
        expect(outline.borderTopStyle).to.equal('solid');
        expect(outline.borderTopWidth).to.equal('2px');
        expect(outline.borderTopColor).to.equal(color($root[0], webLightTheme.colorStrokeFocus2));
        expect(outline.pointerEvents).to.equal('none');
      });
  });

  it('uses a checked pseudo-element for the default indicator and hides custom children only when unchecked', () => {
    mountRadio(
      <RadioGroup aria-label="Indicators">
        <Radio value="default" label="Default" />
        <Radio value="custom" label="Custom" indicator={{ children: <span data-testid="glyph">●</span> }} />
      </RadioGroup>,
    );
    cy.get(input('default'))
      .next()
      .should($indicator => expect(css($indicator[0], '::after').content).to.equal('none'));
    cy.get('[data-testid="glyph"]').should('have.css', 'opacity', '0');
    cy.contains('label', 'Custom').realClick();
    cy.get('[data-testid="glyph"]').should('have.css', 'opacity', '1');
    cy.get(input('custom'))
      .next()
      .should($indicator => expect(css($indicator[0], '::after').content).to.equal('none'));
    cy.contains('label', 'Default').realClick();
    cy.get('[data-testid="glyph"]').should('have.css', 'opacity', '0');
    cy.get(input('default'))
      .next()
      .should($indicator => {
        expect(css($indicator[0], '::after').content).to.equal('""');
        expect(css($indicator[0], '::after').transform).to.equal('matrix(0.625, 0, 0, 0.625, 0, 0)');
      });
  });

  for (const [themeName, theme] of [
    ['light', webLightTheme],
    ['dark', webDarkTheme],
    ['Teams contrast', teamsHighContrastTheme],
  ] as const) {
    it(`resolves ${themeName} unchecked, checked, disabled and real hover/pressed token colors`, () => {
      mount(
        themed(
          <div data-testid="scan">
            <button>Move pointer away</button>
            <RadioGroup aria-label="Fruit">
              <Radio value="apple" label="Apple" />
              <Radio value="pear" label="Pear" disabled />
            </RadioGroup>
          </div>,
          theme,
        ),
      );
      cy.contains('button', 'Move pointer away').realHover();
      cy.get(input('apple'))
        .next()
        .should($indicator => {
          expect(css($indicator[0]).borderTopColor).to.equal(color($indicator[0], theme.colorNeutralStrokeAccessible));
        });
      cy.get(input('pear'))
        .next()
        .should($indicator => {
          expect(css($indicator[0]).borderTopColor).to.equal(color($indicator[0], theme.colorNeutralStrokeDisabled));
        });
      cy.contains('label', 'Pear').should($label => {
        expect(css($label[0]).color).to.equal(color($label[0], theme.colorNeutralForegroundDisabled));
      });
      cy.get(input('apple')).realHover();
      cy.get(input('apple'))
        .next()
        .should($indicator => {
          expect(css($indicator[0]).borderTopColor).to.equal(
            color($indicator[0], theme.colorNeutralStrokeAccessibleHover),
          );
        });
      cy.get(input('apple')).realMouseDown();
      cy.get(input('apple'))
        .next()
        .should($indicator => {
          expect(css($indicator[0]).borderTopColor).to.equal(
            color($indicator[0], theme.colorNeutralStrokeAccessiblePressed),
          );
        });
      cy.get(input('apple')).realMouseUp();
      selected('apple');
      cy.get(input('apple'))
        .next()
        .should($indicator => {
          expect(css($indicator[0]).borderTopColor).to.equal(color($indicator[0], theme.colorCompoundBrandStrokeHover));
        });
      cy.contains('button', 'Move pointer away').realHover();
      cy.get(input('apple'))
        .next()
        .should($indicator => {
          expect(css($indicator[0]).borderTopColor).to.equal(color($indicator[0], theme.colorCompoundBrandStroke));
          expect(css($indicator[0], '::after').backgroundColor).to.equal(
            color($indicator[0], theme.colorCompoundBrandForeground1),
          );
        });
      scan(theme);
    });
  }
});

describe('Radio additional native prop contracts', () => {
  it('applies explicit root/label/indicator overrides without leaking them to the input', () => {
    mountRadio(
      <RadioGroup aria-label="Custom slots" data-testid="scan">
        <Radio
          value="custom"
          className="top-level"
          style={{ marginLeft: 17 }}
          root={{ className: 'slot-root', style: { marginLeft: 23 }, title: 'Root' }}
          label={{ children: 'Custom slots', className: 'slot-label', title: 'Label', required: true }}
          indicator={{ className: 'slot-indicator', title: 'Indicator' }}
        />
      </RadioGroup>,
    );
    cy.get('.fui-Radio')
      .should('have.class', 'slot-root')
      .and('not.have.class', 'top-level')
      .and('have.css', 'margin-left', '23px')
      .and('have.attr', 'title', 'Root');
    cy.get('.slot-label').should('have.class', 'fui-Radio__label').and('have.attr', 'title', 'Label').realClick();
    selected('custom');
    cy.get('.slot-indicator').should('have.class', 'fui-Radio__indicator').and('have.attr', 'title', 'Indicator');
    cy.get(input('custom')).should('not.have.class', 'slot-root').and('not.have.attr', 'title');
    scan();
  });

  it('gives input-slot checked/disabled/required/describedby precedence over top-level props and group context', () => {
    const changed = cy.spy().as('changed');
    mountRadio(
      <div data-testid="scan">
        <RadioGroup aria-label="Slot precedence" name="group" required aria-describedby="group-help">
          <Radio
            value="slot"
            label="Slot override"
            disabled={false}
            checked={false}
            onChange={changed}
            input={{
              disabled: true,
              required: false,
              checked: true,
              name: 'slot-name',
              'aria-describedby': 'slot-help',
            }}
          />
        </RadioGroup>
        <span id="group-help">Group help</span>
        <span id="slot-help">Slot help</span>
      </div>,
    );
    cy.get(input('slot'))
      .should('be.checked')
      .and('be.disabled')
      .and('have.prop', 'required', false)
      .and('have.attr', 'name', 'slot-name');
    cy.get(input('slot')).should($radio => expect(computeAccessibleDescription($radio[0])).to.equal('Slot help'));
    cy.contains('label', 'Slot override').realClick();
    selected('slot');
    cy.get('@changed').should('not.have.been.called');
    scan();
  });

  it('forwards native focus/blur/key events and allows a consumer to cancel arrow navigation', () => {
    const focused = cy.spy().as('focused');
    const blurred = cy.spy().as('blurred');
    const key = cy.spy().as('key');
    mountRadio(
      <>
        <button>Before</button>
        <RadioGroup aria-label="Fruit">
          <Radio
            value="apple"
            label="Apple"
            onFocus={focused}
            onBlur={blurred}
            onKeyDown={event => {
              key(event.key, event.currentTarget.tagName);
              if (event.key === 'ArrowRight') {
                event.preventDefault();
              }
            }}
          />
          <Radio value="pear" label="Pear" />
        </RadioGroup>
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').realClick();
    cy.realPress('Tab');
    cy.get(input('apple')).should('be.focused');
    cy.get('@focused').should('have.been.calledOnce');
    cy.realPress('Space');
    selected('apple');
    cy.realPress('ArrowRight');
    cy.get(input('apple')).should('be.focused').and('be.checked');
    cy.get('@key').should('have.been.calledWithExactly', 'ArrowRight', 'INPUT');
    cy.realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
    cy.get('@blurred').should('have.been.calledOnce');
    cy.then(() => {
      expect(focused.firstCall.args[0].target).to.equal(Cypress.$(input('apple'))[0]);
      expect(blurred.firstCall.args[0].target).to.equal(Cypress.$(input('apple'))[0]);
    });
  });

  it('removes and reinserts a controlled selected option without synthesizing change notifications', () => {
    const changed = cy.spy().as('changed');
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setVisible(!visible)}>Toggle option</button>
          <RadioGroup aria-label="Fruit" value="pear" onChange={changed}>
            <Radio value="apple" label="Apple" />
            {visible && <Radio value="pear" label="Pear" />}
          </RadioGroup>
        </>
      );
    };
    mountRadio(<Example />);
    selected('pear');
    cy.contains('button', 'Toggle option').realClick();
    cy.get(input('pear')).should('not.exist');
    selected();
    cy.contains('button', 'Toggle option').realClick();
    selected('pear');
    cy.get('@changed').should('not.have.been.called');
  });

  it('keeps dirty checked state after a defaultChecked update but resets to the updated native default', () => {
    const changed = cy.spy().as('changed');
    const Example = () => {
      const [defaultChecked, setDefaultChecked] = React.useState(true);
      return (
        <form>
          <Radio label="Default" value="default" defaultChecked={defaultChecked} onChange={changed} />
          <button type="button" onClick={() => setDefaultChecked(false)}>
            Remove default
          </button>
          <button type="reset">Reset</button>
        </form>
      );
    };
    mountRadio(<Example />);
    selected('default');
    cy.contains('button', 'Remove default').realClick();
    cy.get(input('default')).should('have.prop', 'defaultChecked', false).and('be.checked');
    cy.contains('button', 'Reset').realClick();
    selected();
    cy.get('@changed').should('not.have.been.called');
  });

  it('serializes updated name/value props of a checked input and omits it after the name is removed', () => {
    const changed = cy.spy().as('changed');
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <form>
          <Radio
            label="Live value"
            value={phase ? 'new-value' : 'old-value'}
            name={phase === 2 ? '' : phase ? 'new-name' : 'old-name'}
            defaultChecked
            onChange={changed}
          />
          <button type="button" onClick={() => setPhase(phase + 1)}>
            Update
          </button>
        </form>
      );
    };
    mountRadio(<Example />);
    const assertEntries = (entries: string[][]) =>
      cy.get('form').should($form => {
        expect(Array.from(new FormData($form[0] as HTMLFormElement).entries())).to.deep.equal(entries);
      });
    assertEntries([['old-name', 'old-value']]);
    cy.contains('button', 'Update').realClick();
    assertEntries([['new-name', 'new-value']]);
    selected('new-value');
    cy.contains('button', 'Update').realClick();
    assertEntries([]);
    selected('new-value');
    cy.get('@changed').should('not.have.been.called');
  });
});

describe('Radio forced colors', () => {
  afterEach(() =>
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    ),
  );

  it('uses system colors for unchecked/checked/disabled indicators and retains geometry and native selection', () => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'forced-colors', value: 'active' }] },
      }),
    );
    mountRadio(
      <div data-testid="scan">
        <button>Move pointer away</button>
        <RadioGroup aria-label="Fruit">
          <Radio value="apple" label="Apple" />
          <Radio value="pear" label="Pear" disabled defaultChecked />
        </RadioGroup>
      </div>,
    );
    cy.contains('button', 'Move pointer away').realHover();
    cy.get(input('apple'))
      .next()
      .should($indicator => {
        const element = $indicator[0];
        expect(element.ownerDocument.defaultView!.matchMedia('(forced-colors: active)').matches).to.equal(true);
        expect(css(element).borderTopColor).to.equal(color(element, 'ButtonBorder'));
        expect(element.getBoundingClientRect().width).to.equal(16);
      });
    cy.get(input('pear'))
      .next()
      .should($indicator => {
        expect(css($indicator[0]).borderTopColor).to.equal(color($indicator[0], 'GrayText'));
        expect(css($indicator[0], '::after').backgroundColor).to.equal(color($indicator[0], 'GrayText'));
      });
    cy.contains('label', 'Pear').should($label => expect(css($label[0]).color).to.equal(color($label[0], 'GrayText')));
    cy.contains('label', 'Apple').realClick();
    selected('apple');
    cy.contains('button', 'Move pointer away').realHover();
    cy.get(input('apple'))
      .next()
      .should($indicator => {
        expect(css($indicator[0]).borderTopColor).to.equal(color($indicator[0], 'Highlight'));
        expect(css($indicator[0], '::after').backgroundColor).to.equal(color($indicator[0], 'Highlight'));
        expect($indicator[0].getBoundingClientRect().height).to.equal(16);
      });
    scan();
  });
});
