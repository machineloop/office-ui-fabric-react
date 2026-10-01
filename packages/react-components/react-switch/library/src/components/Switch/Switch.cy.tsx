import 'cypress-real-events';
import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme, tokens } from '@fluentui/react-theme';
import { Field } from '@fluentui/react-field';
import type { SlotRenderFunction } from '@fluentui/react-utilities';
import type { LabelProps } from '@fluentui/react-label';
import { Switch } from './Switch';
import { switchClassNames } from './useSwitchStyles.styles';

const input = '[role="switch"]';
const indicator = `.${switchClassNames.indicator}`;
const label = `.${switchClassNames.label}`;
const root = `.${switchClassNames.root}`;
const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const formEntries = (form: HTMLFormElement) => {
  const entries: [string, FormDataEntryValue][] = [];
  new FormData(form).forEach((value, name) => entries.push([name, value]));
  return entries;
};

const emulateMedia = (features: { name: string; value: string }[]) =>
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features },
    }),
  );

describe('Switch unit-derived updates and composition', () => {
  afterEach(() => {
    emulateMedia([]);
  });

  it('exposes actual accessibility-tree names, descriptions, checked state and disabled semantics', () => {
    mount(
      <>
        <Field label="Notifications" hint="Delivery preference" validationMessage="Choose a value" required>
          <Switch />
        </Field>
        <Switch aria-label="Silent mode" defaultChecked disabledFocusable />
        <Switch label="Unavailable" disabled />
      </>,
    );
    cy.get(input).should('have.length', 3);
    cy.document().then(async doc => {
      type Frame = { frame: { id: string; url: string }; childFrames?: Frame[] };
      const frames: { frameTree: Frame } = await Cypress.automation('remote:debugger:protocol', {
        command: 'Page.getFrameTree',
        params: {},
      });
      const flatten = (frame: Frame): Frame[] => [frame, ...(frame.childFrames || []).flatMap(flatten)];
      const aut = flatten(frames.frameTree).find(frame => frame.frame.url === doc.location.href);
      expect(aut, 'AUT accessibility frame').to.exist;
      const tree: {
        nodes: {
          role?: { value: string };
          name?: { value: string };
          description?: { value: string };
          properties?: { name: string; value: { value: string | boolean } }[];
        }[];
      } = await Cypress.automation('remote:debugger:protocol', {
        command: 'Accessibility.getFullAXTree',
        params: { frameId: aut!.frame.id },
      });
      const switches = tree.nodes.filter(node => node.role?.value === 'switch');
      expect(switches).to.have.length(3);
      const field = switches.find(node => node.name?.value === 'Notifications');
      expect(field, 'Field accessible name').to.exist;
      expect(field?.description?.value).to.contain('Delivery preference').and.contain('Choose a value');
      expect(field?.properties).to.deep.include({ name: 'checked', value: { type: 'tristate', value: 'false' } });
      const silent = switches.find(node => node.name?.value === 'Silent mode');
      expect(silent?.properties).to.deep.include({ name: 'disabled', value: { type: 'boolean', value: true } });
      expect(silent?.properties).to.deep.include({ name: 'checked', value: { type: 'tristate', value: 'true' } });
      expect(switches.find(node => node.name?.value === 'Unavailable')?.properties).to.deep.include({
        name: 'disabled',
        value: { type: 'boolean', value: true },
      });
    });
  });

  for (const defaultChecked of [false, true]) {
    it(`blocks native Space and Enter when disabledFocusable with checked=${defaultChecked}`, () => {
      const changes = cy.stub().as('changes');
      const nativeChanges = cy.stub().as('nativeChanges');
      mount(
        <Switch
          disabled
          disabledFocusable
          defaultChecked={defaultChecked}
          label="Keyboard disabled"
          onChange={changes}
          input={{ onChange: nativeChanges }}
        />,
      );
      cy.get(input).should('not.be.disabled').focus();
      cy.realPress('Space');
      cy.realPress('Enter');
      cy.get(input).should('be.focused').and('have.prop', 'checked', defaultChecked);
      cy.get('@changes').should('not.have.been.called');
      cy.get('@nativeChanges').should('not.have.been.called');
    });
  }

  it('activates the padded native input hit area rather than the pointer-inert indicator', () => {
    const change = cy.stub().as('change');
    mount(<Switch label="Hit area" onChange={change} />);
    cy.get(indicator).should('have.css', 'pointer-events', 'none');
    cy.get(input).click(2, 2).should('be.checked');
    cy.get('@change').should('have.been.calledOnce');
    cy.get(input).then($input => {
      const rect = $input[0].getBoundingClientRect();
      cy.get(input).click(rect.width - 2, rect.height - 2);
    });
    cy.get(input).should('not.be.checked');
    cy.get('@change').should('have.been.calledTwice');
  });

  it('uses the latest native-slot and component handlers in order after an unrelated rerender', () => {
    const events = cy.stub().as('events');
    const Latest = () => {
      const [generation, setGeneration] = React.useState(0);
      return (
        <>
          <button onClick={() => setGeneration(1)}>Update handlers</button>
          <Switch
            label="Latest"
            input={{ onChange: event => events('input', generation, event.currentTarget.checked) }}
            onChange={(event, data) => events('component', generation, event.currentTarget.checked, data)}
          />
        </>
      );
    };
    mount(<Latest />);
    cy.get(input).click().should('be.checked');
    cy.contains('button', 'Update handlers').click();
    cy.get(input).should('be.checked').click().should('not.be.checked');
    cy.then(() => {
      expect(events.args).to.deep.equal([
        ['input', 0, true],
        ['component', 0, true, { checked: true }],
        ['input', 1, false],
        ['component', 1, false, { checked: false }],
      ]);
    });
  });

  for (const checked of [false, true]) {
    it(`observes controlled checked=${checked} updates and the native reset divergence until rerender`, () => {
      const changes = cy.stub().as('changes');
      const Controlled = () => {
        const [value, setValue] = React.useState(checked);
        const [revision, setRevision] = React.useState(0);
        return (
          <form>
            <button type="button" onClick={() => setValue(!value)}>
              Update
            </button>
            <button type="button" onClick={() => setRevision(revision + 1)}>
              Rerender
            </button>
            <Switch checked={value} onChange={changes} label="Controlled" />
            <input type="checkbox" checked={value} readOnly aria-label="Controlled native" />
            <button type="reset">Reset</button>
          </form>
        );
      };
      mount(<Controlled />);
      cy.get(input).should('have.prop', 'checked', checked);
      cy.contains('button', 'Update').click();
      cy.get(input).should('have.prop', 'checked', !checked).and('have.prop', 'defaultChecked', checked);
      cy.contains('button', 'Reset').click();
      cy.get(input).should('have.prop', 'checked', checked);
      cy.get('[aria-label="Controlled native"]').should('have.prop', 'checked', checked);
      cy.contains('button', 'Rerender').click();
      cy.get(input).should('have.prop', 'checked', !checked);
      cy.get('[aria-label="Controlled native"]').should('have.prop', 'checked', !checked);
      cy.get('@changes').should('not.have.been.called');
      cy.get(input).click().should('have.prop', 'checked', !checked);
      cy.get('@changes').should('have.been.calledOnce');
    });
  }

  for (const defaultChecked of [false, true]) {
    it(`ignores defaultChecked=${defaultChecked} updates for current state but uses the updated native reset default`, () => {
      const Defaults = () => {
        const [value, setValue] = React.useState(defaultChecked);
        return (
          <form>
            <Switch defaultChecked={value} label="Default" />
            <input type="checkbox" defaultChecked={value} aria-label="Native default" />
            <button type="button" onClick={() => setValue(!value)}>
              Update default
            </button>
            <button type="reset">Reset</button>
          </form>
        );
      };
      mount(<Defaults />);
      cy.contains('button', 'Update default').click();
      cy.get(input).should('have.prop', 'checked', defaultChecked).and('have.prop', 'defaultChecked', !defaultChecked);
      cy.get('[aria-label="Native default"]')
        .should('have.prop', 'checked', defaultChecked)
        .and('have.prop', 'defaultChecked', !defaultChecked);
      cy.contains('button', 'Reset').click();
      cy.get(input).should('have.prop', 'checked', !defaultChecked);
      cy.get('[aria-label="Native default"]').should('have.prop', 'checked', !defaultChecked);
    });
  }

  it('prioritizes explicit input slot attributes over inherited top-level native props', () => {
    mount(
      <Switch
        id="top-id"
        name="top-name"
        value="top-value"
        aria-label="Top name"
        checked={false}
        input={{
          id: 'slot-id',
          name: 'slot-name',
          value: 'slot-value',
          'aria-label': 'Slot name',
          checked: true,
          readOnly: true,
        }}
        label={{ htmlFor: 'slot-id', children: 'Slot label' }}
      />,
    );
    cy.get(input)
      .should('have.attr', 'id', 'slot-id')
      .and('have.attr', 'name', 'slot-name')
      .and('have.attr', 'value', 'slot-value')
      .and('have.attr', 'aria-label', 'Slot name')
      .and('be.checked');
    cy.get(label).should('have.attr', 'for', 'slot-id').click();
    cy.get(input).should('be.checked');
  });

  it('composes click and keyboard handlers and transitions disabledFocusable to native disabled', () => {
    const changes = cy.stub().as('changes');
    const clicks = cy.stub().as('clicks');
    const keys = cy.stub().as('keys');
    const Dynamic = () => {
      const [blocked, setBlocked] = React.useState(true);
      return (
        <>
          <button onClick={() => setBlocked(false)}>Enable</button>
          <Switch
            disabled
            disabledFocusable={blocked}
            label="Blocked"
            onChange={changes}
            input={{
              onClick: event => clicks(event.defaultPrevented),
              onKeyDown: event => keys(event.key, event.defaultPrevented),
            }}
          />
          <Switch label="Positive control" onChange={changes} />
        </>
      );
    };
    mount(<Dynamic />);
    cy.get(input).eq(0).click().focus();
    cy.realPress('Space');
    cy.realPress('Enter');
    cy.get(input).eq(0).should('not.be.checked');
    cy.get('@changes').should('not.have.been.called');
    cy.get('@clicks').should('have.been.called');
    cy.then(() =>
      expect(keys.args).to.deep.equal([
        [' ', false],
        ['Enter', false],
      ]),
    );
    cy.contains('button', 'Enable').click();
    cy.get(input).eq(0).should('be.disabled').and('not.have.attr', 'aria-disabled');
    cy.get(input).eq(1).click().should('be.checked');
    cy.get('@changes').should('have.been.calledOnce');
  });

  it('updates disabled and disabledFocusable without resetting uncontrolled state or losing latest callbacks', () => {
    const changes = cy.stub().as('changes');
    const Dynamic = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button onClick={() => setPhase(phase + 1)}>Advance</button>
          <Switch
            defaultChecked
            disabled={phase === 1}
            disabledFocusable={phase === 2}
            label="Dynamic"
            input={{ onChange: () => changes('input', phase) }}
            onChange={(_, data) => changes('component', phase, data)}
          />
        </>
      );
    };
    mount(<Dynamic />);
    cy.get(input).click().should('not.be.checked');
    cy.contains('button', 'Advance').click();
    cy.get(input).should('be.disabled').and('not.be.checked');
    cy.contains('button', 'Advance').click();
    cy.get(input).should('not.be.disabled').and('have.attr', 'aria-disabled', 'true').click().should('not.be.checked');
    cy.contains('button', 'Advance').click();
    cy.get(input).should('not.have.attr', 'aria-disabled');
    cy.get(input).click().should('be.checked');
    cy.then(() =>
      expect(changes.args).to.deep.equal([
        ['input', 0],
        ['component', 0, { checked: false }],
        ['input', 3],
        ['component', 3, { checked: true }],
      ]),
    );
  });

  it('updates Field context relationships without replacing the input or firing change', () => {
    const changes = cy.stub().as('changes');
    const DynamicField = () => {
      const [error, setError] = React.useState(true);
      return (
        <>
          <button onClick={() => setError(false)}>Clear validation</button>
          <Field
            label="Context name"
            hint="Persistent hint"
            required={error}
            validationState={error ? 'error' : 'success'}
            validationMessage={error ? 'Error text' : 'Success text'}
          >
            <Switch onChange={changes} />
          </Field>
        </>
      );
    };
    mount(<DynamicField />);
    cy.get(input).then($input => {
      const original = $input[0];
      const id = original.id;
      cy.contains('button', 'Clear validation').click();
      cy.get(input)
        .should('have.attr', 'id', id)
        .and('have.prop', 'required', false)
        .and('not.have.attr', 'aria-invalid');
      cy.get(input).should($updated => {
        expect($updated[0]).to.equal(original);
        expect(
          $updated
            .attr('aria-describedby')!
            .split(' ')
            .map(describedId => original.ownerDocument.getElementById(describedId)?.textContent),
        )
          .to.include('Persistent hint')
          .and.include('Success text');
      });
    });
    cy.get('@changes').should('not.have.been.called');
  });

  it('updates size, placement, label, direction and theme in place without losing native state', () => {
    const Dynamic = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <FluentProvider dir={updated ? 'rtl' : 'ltr'} theme={updated ? teamsDarkTheme : teamsLightTheme}>
          <button onClick={() => setUpdated(true)}>Update layout</button>
          <Switch
            size={updated ? 'small' : 'medium'}
            labelPosition={updated ? 'above' : 'before'}
            label={updated ? 'Updated label' : 'Original label'}
            defaultChecked
          />
        </FluentProvider>
      );
    };
    mountBase(<Dynamic />);
    cy.get(input).then($input => {
      const original = $input[0];
      cy.contains('button', 'Update layout').click();
      cy.get(input)
        .should('be.checked')
        .should($updated => expect($updated[0]).to.equal(original));
    });
    cy.get(label).should('have.text', 'Updated label');
    cy.get(indicator).should('have.css', 'width', '32px');
    cy.get(root).should('have.css', 'flex-direction', 'column').and('have.css', 'direction', 'rtl');
    cy.get(indicator).find('svg').should('have.css', 'transform', 'matrix(1, 0, 0, 1, -16, 0)');
    cy.get(root).should($root =>
      expect(getComputedStyle($root[0]).getPropertyValue('--colorNeutralForeground1').trim()).to.equal(
        teamsDarkTheme.colorNeutralForeground1,
      ),
    );
    cy.get(input).click().should('not.be.checked');
  });

  it('adds and removes an optional label while retaining a stable native ID and checked state', () => {
    const Dynamic = () => {
      const [show, setShow] = React.useState(false);
      return (
        <>
          <button onClick={() => setShow(!show)}>Toggle label</button>
          <Switch label={show ? 'Added label' : undefined} aria-label="Stable name" />
        </>
      );
    };
    mount(<Dynamic />);
    cy.get(label).should('not.exist');
    cy.get(input)
      .click()
      .then($input => {
        const id = $input[0].id;
        cy.contains('button', 'Toggle label').click();
        cy.get(label).should('have.attr', 'for', id).and('have.text', 'Added label');
        cy.get(input).should('have.attr', 'id', id).and('be.checked');
        cy.contains('button', 'Toggle label').click();
        cy.get(label).should('not.exist');
        cy.get(input).should('have.attr', 'id', id).and('be.checked');
      });
  });

  it('remounts with a fresh native default and clears forwarded refs when removed', () => {
    const ref = React.createRef<HTMLInputElement>();
    const Lifecycle = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <button onClick={() => setShow(!show)}>Toggle mounting</button>
          {show && <Switch ref={ref} defaultChecked label="Remount" />}
        </>
      );
    };
    mount(
      <React.StrictMode>
        <Lifecycle />
      </React.StrictMode>,
    );
    cy.get(input).click().should('not.be.checked');
    cy.contains('button', 'Toggle mounting').click();
    cy.get(input).should('not.exist');
    cy.then(() => expect(ref.current).to.equal(null));
    cy.contains('button', 'Toggle mounting').click();
    cy.get(input)
      .should('be.checked')
      .then($input => expect(ref.current).to.equal($input[0]));
  });

  it('shows an actual keyboard focus ring on the root and removes it on blur', () => {
    mount(
      <>
        <button>Before</button>
        <Switch label="Focus ring" />
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').focus();
    cy.realPress('Tab');
    cy.get(input).should('be.focused');
    cy.get(root).should($root => {
      const outline = getComputedStyle($root[0], '::after');
      expect(outline.content).to.equal('""');
      expect(outline.borderTopStyle).to.equal('solid');
      expect(outline.borderTopWidth).to.equal('2px');
    });
    cy.realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
    cy.get(root).should($root => expect(getComputedStyle($root[0], '::after').content).to.equal('none'));
  });

  it('applies actual forced-colors enabled and disabled indicator styling', () => {
    emulateMedia([{ name: 'forced-colors', value: 'active' }]);
    mount(
      <>
        <Switch defaultChecked label="Enabled" />
        <Switch disabled defaultChecked label="Disabled" />
      </>,
    );
    cy.window().should(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true));
    cy.get(root)
      .eq(0)
      .should($root => {
        const probe = $root[0].ownerDocument.createElement('span');
        probe.style.color = 'Highlight';
        $root[0].appendChild(probe);
        const highlight = getComputedStyle(probe).color;
        probe.remove();
        expect(getComputedStyle($root.find(indicator)[0]).backgroundColor).to.equal(highlight);
      });
    cy.get(root)
      .eq(1)
      .should($root => {
        const probe = $root[0].ownerDocument.createElement('span');
        probe.style.color = 'GrayText';
        $root[0].appendChild(probe);
        const grayText = getComputedStyle(probe).color;
        probe.remove();
        expect(getComputedStyle($root.find(indicator)[0]).color).to.equal(grayText);
        expect(getComputedStyle($root.find(indicator)[0]).borderTopColor).to.equal(grayText);
      });
    cy.get(input).eq(0).click().should('not.be.checked');
  });

  it('honors reduced motion for track and thumb transitions', () => {
    emulateMedia([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    mount(<Switch label="Reduced motion" />);
    cy.window().should(win => expect(win.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(true));
    cy.get(indicator).should('have.css', 'transition-duration', '1e-05s');
    cy.get(indicator).find('svg').should('have.css', 'transition-duration', '1e-05s');
    cy.get(input).click().should('be.checked');
  });
});

describe('Switch documented behavior', () => {
  it('renders a native unchecked switch with an associated label and hidden indicator', () => {
    mount(<Switch label="WiFi" />);
    cy.get(input).should('have.prop', 'tagName', 'INPUT').and('have.attr', 'type', 'checkbox').and('not.be.checked');
    cy.get(input).then($input => cy.get(label).should('have.attr', 'for', $input[0].id));
    cy.get(indicator).should('have.attr', 'aria-hidden', 'true').find('svg').should('exist');
    cy.get(label).click();
    cy.get(input).should('be.checked');
  });

  describe('Switch native edges and accessibility', () => {
    it('uses real Space activation, ignores Enter outside a form, and follows native tab order', () => {
      const changes = cy.stub().as('changes');
      mount(
        <>
          <button>Before</button>
          <Switch label="Enabled" onChange={changes} />
          <Switch disabled label="Disabled" />
          <Switch disabledFocusable label="Focusable disabled" onChange={changes} />
          <button>After</button>
        </>,
      );
      cy.contains('button', 'Before').focus();
      cy.realPress('Tab');
      cy.get(input).eq(0).should('be.focused').and('not.be.checked');
      cy.realPress('Space');
      cy.get(input).eq(0).should('be.checked');
      cy.realPress('Enter');
      cy.get(input).eq(0).should('be.checked');
      cy.get('@changes').should('have.been.calledOnce');
      cy.realPress('Tab');
      cy.get(input).eq(2).should('be.focused');
      cy.realPress('Space');
      cy.realPress('Enter');
      cy.get(input).eq(2).should('not.be.checked');
      cy.get('@changes').should('have.been.calledOnce');
      cy.realPress('Tab');
      cy.contains('button', 'After').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get(input).eq(2).should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get(input).eq(0).should('be.focused');
    });

    it('allows pointer and Space changes on a native readOnly checkbox rather than inventing a lock', () => {
      const changes = cy.stub().as('changes');
      mount(<Switch readOnly label="Native readOnly" onChange={changes} />);
      cy.get(input).should('have.prop', 'readOnly', true).click().should('be.checked');
      cy.get(input).focus();
      cy.realPress('Space');
      cy.get(input).should('not.be.checked');
      cy.get('@changes').should('have.been.calledTwice');
    });

    it('integrates Field name, hint, required, validation and explicit overrides', () => {
      mount(
        <>
          <Field label="Notifications" hint="Delivery preference" validationMessage="Choose a value" required>
            <Switch />
          </Field>
          <Field label="Inherited" required validationMessage="Inherited error">
            <Switch
              id="explicit"
              aria-label="Explicit name"
              aria-describedby="custom-description"
              aria-invalid={false}
              required={false}
            />
          </Field>
          <p id="custom-description">Custom description</p>
        </>,
      );
      cy.get(input).eq(0).should('have.prop', 'required', true).and('have.attr', 'aria-invalid', 'true');
      cy.contains('label', 'Notifications').then($label =>
        cy.get(input).eq(0).should('have.attr', 'id', $label.attr('for')),
      );
      cy.get(input)
        .eq(0)
        .should($input => {
          const ids = $input.attr('aria-describedby')!.split(' ');
          const texts = ids.map(id => $input[0].ownerDocument.getElementById(id)?.textContent);
          expect(texts).to.include('Delivery preference').and.include('Choose a value');
        });
      cy.get('#explicit')
        .should('have.attr', 'aria-label', 'Explicit name')
        .and('have.prop', 'required', false)
        .and('have.attr', 'aria-invalid', 'false')
        .should($input => {
          const ids = $input.attr('aria-describedby')!.split(' ');
          expect(ids).to.include('custom-description');
          expect(ids.map(id => $input[0].ownerDocument.getElementById(id)?.textContent)).to.include('Inherited error');
        });
      cy.contains('label', 'Notifications').click();
      cy.get(input).eq(0).should('be.checked');
    });

    it('supports explicit names, external labels, descriptions and distinct generated IDs', () => {
      mount(
        <>
          <Switch aria-label="Silent mode" />
          <Switch aria-labelledby="external-label" aria-describedby="external-hint" />
          <span id="external-label">External name</span>
          <span id="external-hint">External hint</span>
          <Switch id="named-switch" label="Internal name" />
        </>,
      );
      cy.get(input).eq(0).should('have.attr', 'aria-label', 'Silent mode');
      cy.get(input)
        .eq(1)
        .should('have.attr', 'aria-labelledby', 'external-label')
        .and('have.attr', 'aria-describedby', 'external-hint');
      cy.get(input).then($inputs => expect(new Set(Array.from($inputs, element => element.id)).size).to.equal(3));
      cy.get('#named-switch').should('have.attr', 'id', 'named-switch');
      cy.get(label).should('have.attr', 'for', 'named-switch').click();
      cy.get('#named-switch').should('be.checked');
    });

    it('routes refs, root presentation and native attributes to the correct slots', () => {
      const inputRef = React.createRef<HTMLInputElement>();
      const rootRef = React.createRef<HTMLDivElement>();
      const indicatorRef = React.createRef<HTMLDivElement>();
      const labelRef = React.createRef<HTMLLabelElement>();
      mount(
        <Switch
          ref={inputRef}
          root={{ ref: rootRef, ...{ 'data-testid': 'root' } }}
          indicator={{ ref: indicatorRef, className: 'custom-indicator' }}
          label={{ ref: labelRef, children: 'Refs', className: 'custom-label' }}
          input={{ className: 'custom-input' }}
          id="ref-switch"
          title="Native title"
          name="preference"
          value="enabled"
          tabIndex={0}
          className="custom-root"
          style={{ marginTop: tokens.spacingVerticalL }}
          data-native="input"
        />,
      );
      cy.get(input)
        .should('have.attr', 'name', 'preference')
        .and('have.attr', 'value', 'enabled')
        .and('have.attr', 'title', 'Native title')
        .and('have.attr', 'data-native', 'input')
        .and('have.class', 'custom-input')
        .and('have.attr', 'tabindex', '0');
      cy.get(root)
        .should('have.class', 'custom-root')
        .and('have.attr', 'data-testid', 'root')
        .and('not.have.attr', 'name');
      cy.get(indicator).should('have.class', 'custom-indicator');
      cy.get(label).should('have.class', 'custom-label');
      cy.then(() => {
        expect(inputRef.current?.id).to.equal('ref-switch');
        expect(rootRef.current?.classList.contains(switchClassNames.root)).to.equal(true);
        expect(indicatorRef.current?.getAttribute('aria-hidden')).to.equal('true');
        expect(labelRef.current?.htmlFor).to.equal('ref-switch');
        inputRef.current?.focus();
      });
      cy.get(input).should('be.focused');
    });

    it('supports render-function slots without losing native input or label behavior', () => {
      const renderRoot: SlotRenderFunction<React.ComponentProps<'div'>> = (Component, props) => (
        <Component {...props} data-render="root" />
      );
      const renderIndicator: SlotRenderFunction<React.ComponentProps<'div'>> = (Component, props) => (
        <Component {...props}>
          <span data-render="thumb">Thumb</span>
        </Component>
      );
      const renderLabel: SlotRenderFunction<LabelProps> = (Component, props) => (
        <Component {...props}>
          <strong>Rendered label</strong>
        </Component>
      );
      mount(
        <Switch
          root={{ children: renderRoot }}
          indicator={{ children: renderIndicator }}
          label={{ children: renderLabel }}
        />,
      );
      cy.get(root).should('have.attr', 'data-render', 'root');
      cy.get(input).should('have.attr', 'type', 'checkbox');
      cy.get(indicator)
        .should('have.attr', 'aria-hidden', 'true')
        .find('[data-render="thumb"]')
        .should('have.text', 'Thumb');
      cy.get(label).find('strong').should('have.text', 'Rendered label').click();
      cy.get(input).should('be.checked');
    });

    for (const defaultChecked of [false, true]) {
      it(`submits and resets defaultChecked=${defaultChecked}, exposing the native React post-reset callback boundary`, () => {
        const changes = cy.stub().as('changes');
        const nativeChanges = cy.stub().as('nativeChanges');
        const submissions = cy.stub().as('submissions');
        mount(
          <form
            onSubmit={event => {
              event.preventDefault();
              submissions(formEntries(event.currentTarget));
            }}
          >
            <Switch name="switch" value="yes" defaultChecked={defaultChecked} label="Switch" onChange={changes} />
            <input
              type="checkbox"
              name="native"
              value="yes"
              defaultChecked={defaultChecked}
              aria-label="Native sibling"
              onChange={nativeChanges}
            />
            <button type="submit">Submit</button>
            <button type="reset">Reset</button>
          </form>,
        );
        cy.contains('button', 'Submit').click();
        cy.get('@submissions').should(
          'have.been.calledOnceWithExactly',
          defaultChecked
            ? [
                ['switch', 'yes'],
                ['native', 'yes'],
              ]
            : [],
        );
        cy.get(input).click();
        cy.get('[name="native"]').click();
        cy.contains('button', 'Submit').click();
        cy.then(() =>
          expect(submissions.secondCall.args[0]).to.deep.equal(
            defaultChecked
              ? []
              : [
                  ['switch', 'yes'],
                  ['native', 'yes'],
                ],
          ),
        );
        cy.contains('button', 'Reset').click();
        cy.get(input).should('have.prop', 'checked', defaultChecked).and('have.prop', 'defaultChecked', defaultChecked);
        cy.get('[name="native"]').should('have.prop', 'checked', defaultChecked);
        cy.get('@changes').should('have.been.calledOnce');
        cy.get('@nativeChanges').should('have.been.calledOnce');
        cy.contains('button', 'Submit').click();
        cy.then(() => expect(submissions.thirdCall.args[0]).to.deep.equal(submissions.firstCall.args[0]));
        cy.get(input).click().should('have.prop', 'checked', !defaultChecked);
        cy.get('[name="native"]').click().should('have.prop', 'checked', !defaultChecked);
        // React's native checkbox tracker is not synchronized by form.reset().
        cy.get('@changes').should('have.been.calledOnce');
        cy.get('@nativeChanges').should('have.been.calledOnce');
        cy.get(input).click().should('have.prop', 'checked', defaultChecked);
        cy.get('[name="native"]').click().should('have.prop', 'checked', defaultChecked);
        cy.get('@changes').should('have.been.calledTwice');
        cy.get('@nativeChanges').should('have.been.calledTwice');
      });
    }

    it('honors required submission and excludes disabled controls while using native default value on', () => {
      const submissions = cy.stub().as('submissions');
      mount(
        <form
          onSubmit={event => {
            event.preventDefault();
            submissions(formEntries(event.currentTarget));
          }}
        >
          <Switch required name="required" label="Required" />
          <Switch disabled defaultChecked name="disabled" label="Disabled" />
          <Switch disabledFocusable defaultChecked name="focusable" label="Disabled focusable" />
          <button type="submit">Submit</button>
        </form>,
      );
      cy.contains('button', 'Submit').click();
      cy.get('@submissions').should('not.have.been.called');
      cy.get(input).eq(0).click();
      cy.contains('button', 'Submit').click();
      cy.get('@submissions').should('have.been.calledOnceWithExactly', [
        ['required', 'on'],
        ['focusable', 'on'],
      ]);
    });

    it('associates an input with an external form and honors canceled native reset', () => {
      const resets = cy.stub().as('resets');
      mount(
        <>
          <form
            id="external"
            onReset={event => {
              event.preventDefault();
              resets();
            }}
          >
            <button type="reset">Reset</button>
          </form>
          <Switch form="external" name="outside" defaultChecked label="Outside" />
        </>,
      );
      cy.get(input).then($input => expect(($input[0] as HTMLInputElement).form?.id).to.equal('external'));
      cy.get(input).click().should('not.be.checked');
      cy.contains('button', 'Reset').click();
      cy.get('@resets').should('have.been.calledOnce');
      cy.get(input).should('not.be.checked');
    });

    it('lets Enter submit a form without changing the focused Switch', () => {
      const submit = cy.stub().as('submit');
      const change = cy.stub().as('change');
      mount(
        <form
          onSubmit={event => {
            event.preventDefault();
            submit();
          }}
        >
          <Switch label="Enter" onChange={change} />
          <button type="submit">Submit</button>
        </form>,
      );
      cy.get(input).focus();
      cy.realPress('Enter');
      cy.get(input).should('not.be.checked');
      cy.get('@change').should('not.have.been.called');
      cy.get('@submit').should('have.been.calledOnce');
    });

    for (const dir of ['ltr', 'rtl'] as const) {
      for (const labelPosition of ['before', 'after', 'above'] as const) {
        it(`lays out and activates ${labelPosition} in ${dir}`, () => {
          mountBase(
            <FluentProvider theme={teamsLightTheme} dir={dir}>
              <Switch label="Direction" labelPosition={labelPosition} />
            </FluentProvider>,
          );
          cy.get(root).should($root => {
            const track = $root.find(indicator)[0].getBoundingClientRect();
            const text = $root.find(label)[0].getBoundingClientRect();
            if (labelPosition === 'above') {
              expect(text.bottom).to.be.at.most(track.top);
            } else {
              expect(text.left < track.left).to.equal((labelPosition === 'before') === (dir === 'ltr'));
            }
          });
          cy.get(input).click().should('be.checked');
          cy.get(indicator)
            .find('svg')
            .should('have.css', 'transform', `matrix(1, 0, 0, 1, ${dir === 'ltr' ? 20 : -20}, 0)`);
        });
      }
    }
  });

  for (const labelPosition of ['before', 'after', 'above'] as const) {
    it(`positions and activates the ${labelPosition} label`, () => {
      mount(<Switch label="WiFi" labelPosition={labelPosition} />);
      cy.get(root).should($root => {
        const track = $root.find(indicator)[0].getBoundingClientRect();
        const text = $root.find(label)[0].getBoundingClientRect();
        if (labelPosition === 'above') {
          expect(text.bottom).to.be.at.most(track.top);
        } else if (labelPosition === 'before') {
          expect(text.right).to.be.at.most(track.left);
        } else {
          expect(text.left).to.be.at.least(track.right);
        }
        const children = Array.from($root[0].children);
        expect(children.indexOf($root.find(label)[0]) < children.indexOf($root.find(indicator)[0])).to.equal(
          labelPosition !== 'after',
        );
      });
      cy.get(label).click();
      cy.get(input).should('be.checked');
      cy.get(input).click().should('not.be.checked');
    });
  }

  for (const size of ['small', 'medium'] as const) {
    it(`renders the ${size} track dimensions and checked thumb travel`, () => {
      mount(<Switch size={size} label="Size" />);
      cy.get(indicator).should('have.css', 'width', size === 'small' ? '32px' : '40px');
      cy.get(indicator).should('have.css', 'height', size === 'small' ? '16px' : '20px');
      cy.get(indicator).find('svg').should('have.css', 'transform', 'none');
      cy.get(input).click().should('be.checked');
      cy.get(indicator)
        .find('svg')
        .should('have.css', 'transform', `matrix(1, 0, 0, 1, ${size === 'small' ? 16 : 20}, 0)`);
    });
  }

  it('wraps a long label while keeping the track aligned with the first line', () => {
    mount(
      <Switch
        style={{ maxWidth: '200px' }}
        label="Here is an example of a Switch with a long label that wraps over several lines."
      />,
    );
    cy.get(root).should($root => {
      const text = $root.find(label)[0];
      const textRect = text.getBoundingClientRect();
      const track = $root.find(indicator)[0].getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
      expect(textRect.height).to.be.greaterThan(lineHeight * 2);
      expect(Math.abs(track.top - textRect.top)).to.be.lessThan(lineHeight);
      expect(track.bottom).to.be.lessThan(textRect.bottom);
      expect($root[0].getBoundingClientRect().width).to.be.at.most(200);
    });
    cy.get(label).click();
    cy.get(input).should('be.checked');
  });

  for (const defaultChecked of [false, true]) {
    it(`toggles uncontrolled defaultChecked=${defaultChecked} with exact native change data`, () => {
      const changes = cy.stub().as('changes');
      mount(
        <Switch
          defaultChecked={defaultChecked}
          label="Toggle"
          onChange={(event, data) => changes(event.type, event.nativeEvent.type, event.currentTarget.checked, data)}
        />,
      );
      cy.get(input).should('have.prop', 'checked', defaultChecked).click();
      cy.get(input).should('have.prop', 'checked', !defaultChecked).click();
      cy.get(input).should('have.prop', 'checked', defaultChecked);
      cy.get('@changes').should('have.been.calledTwice');
      cy.then(() => {
        expect(changes.firstCall.args).to.deep.equal([
          'change',
          'click',
          !defaultChecked,
          { checked: !defaultChecked },
        ]);
        expect(changes.secondCall.args).to.deep.equal(['change', 'click', defaultChecked, { checked: defaultChecked }]);
      });
    });
  }

  for (const checked of [false, true]) {
    it(`does not mutate rejected controlled checked=${checked}`, () => {
      const changes = cy.stub().as('changes');
      mount(<Switch checked={checked} onChange={(_, data) => changes(data)} label="Controlled" />);
      cy.get(input).click().should('have.prop', 'checked', checked);
      cy.get('@changes').should('have.been.calledOnceWithExactly', { checked: !checked });
    });
  }

  it('accepts controlled changes and immediately updates the label', () => {
    const Controlled = () => {
      const [checked, setChecked] = React.useState(true);
      return (
        <Switch checked={checked} onChange={(_, data) => setChecked(data.checked)} label={checked ? 'On' : 'Off'} />
      );
    };
    mount(<Controlled />);
    cy.get(input).should('be.checked').click().should('not.be.checked');
    cy.get(label).should('have.text', 'Off').click();
    cy.get(input).should('be.checked');
    cy.get(label).should('have.text', 'On');
  });

  for (const defaultChecked of [false, true]) {
    for (const disabledFocusable of [false, true]) {
      it(`blocks pointer activation for checked=${defaultChecked}, disabledFocusable=${disabledFocusable}`, () => {
        const changes = cy.stub().as('changes');
        mount(
          <Switch
            disabled={!disabledFocusable}
            disabledFocusable={disabledFocusable}
            defaultChecked={defaultChecked}
            label="Disabled"
            onChange={changes}
          />,
        );
        cy.get(input).should('have.prop', 'disabled', !disabledFocusable);
        if (disabledFocusable) {
          cy.get(input).should('have.attr', 'aria-disabled', 'true').click();
        }
        cy.get(label).click();
        cy.get(input).should('have.prop', 'checked', defaultChecked);
        cy.get('@changes').should('not.have.been.called');
      });
    }
  }

  it('marks required inputs and labels and observes native validity', () => {
    mount(<Switch required label="Required" />);
    cy.get(input)
      .should('have.prop', 'required', true)
      .then($input => expect(($input[0] as HTMLInputElement).validity.valueMissing).to.equal(true));
    cy.get(label).find('.fui-Label__required').should('have.text', '*');
    cy.get(input)
      .click()
      .then($input => expect(($input[0] as HTMLInputElement).checkValidity()).to.equal(true));
  });
});
