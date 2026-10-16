import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Toolbar, ToolbarDivider } from '@fluentui/react-toolbar';
import type { ToolbarProps } from '@fluentui/react-toolbar';
import { TextBoldRegular, TextItalicRegular, TextUnderlineRegular } from '@fluentui/react-icons';
import { Tooltip } from '@fluentui/react-tooltip';
import { ToolbarToggleButton } from './ToolbarToggleButton';
import type { ToolbarToggleButtonProps } from './ToolbarToggleButton.types';
import { ToolbarContext } from '../Toolbar/ToolbarContext';
import { useToolbarToggleButtonBase_unstable } from './useToolbarToggleButton';
import { renderToggleButton_unstable } from '@fluentui/react-button';

const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const button = () => cy.get('#bold');
const Fixture = ({
  buttonProps,
  ...props
}: Partial<ToolbarProps> & {
  buttonProps?: Partial<Extract<ToolbarToggleButtonProps, { as?: 'button' }>> & { ref?: React.Ref<HTMLButtonElement> };
}) => (
  <Toolbar aria-label="Formatting" {...props}>
    <ToolbarToggleButton
      id="bold"
      name="text"
      value="bold"
      aria-label="Bold"
      icon={<TextBoldRegular />}
      {...buttonProps}
    />
    <ToolbarToggleButton id="italic" name="text" value="italic" aria-label="Italic" icon={<TextItalicRegular />} />
    <ToolbarDivider />
    <ToolbarToggleButton
      id="view-bold"
      name="view"
      value="bold"
      aria-label="View bold"
      icon={<TextUnderlineRegular />}
    />
  </Toolbar>
);

describe('ToolbarToggleButton adversarial improvements (final)', () => {
  it('live name/value/size/appearance/disabled updates preserve actual button identity and authoritative state', () => {
    let initial: HTMLElement;
    const Example = () => {
      const [stage, setStage] = React.useState(0);
      return (
        <>
          <button onClick={() => setStage(value => value + 1)}>Next</button>
          <Fixture
            size={stage ? 'large' : 'small'}
            checkedValues={stage === 0 ? { text: ['bold'] } : { view: stage === 1 ? ['italic'] : [] }}
            buttonProps={{
              name: stage ? 'view' : 'text',
              value: stage ? 'italic' : 'bold',
              appearance: stage ? 'primary' : 'subtle',
              disabled: stage === 2,
            }}
          />
        </>
      );
    };
    mount(<Example />);
    button().then($button => {
      initial = $button[0];
    });
    button().should('have.attr', 'aria-pressed', 'true').and('have.css', 'width', '24px');
    cy.contains('button', 'Next').realClick();
    button()
      .should('have.attr', 'aria-pressed', 'true')
      .and('have.css', 'width', '40px')
      .should($button => expect($button[0]).to.equal(initial));
    cy.contains('button', 'Next').realClick();
    button().should('be.disabled').and('have.attr', 'aria-pressed', 'false');
  });

  it('defaultCheckedValues updates are initialization-only rather than uncontrolled state resets', () => {
    const Example = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(true)}>Change defaults</button>
          <Fixture defaultCheckedValues={{ text: changed ? ['italic'] : ['bold'] }} />
        </>
      );
    };
    mount(<Example />);
    cy.contains('button', 'Change defaults').realClick();
    button().should('have.attr', 'aria-pressed', 'true');
    cy.get('#italic').should('have.attr', 'aria-pressed', 'false');
  });

  it('equal name/value buttons in sibling toolbars do not share context selection', () => {
    mount(
      <>
        <div id="first">
          <Fixture defaultCheckedValues={{ text: ['bold'] }} />
        </div>
        <div id="second">
          <Fixture defaultCheckedValues={{ text: ['bold'] }} />
        </div>
      </>,
    );
    cy.get('#first #bold').realClick();
    cy.get('#first #bold').should('have.attr', 'aria-pressed', 'false');
    cy.get('#second #bold').should('have.attr', 'aria-pressed', 'true');
  });

  (['subtle', 'transparent'] as const).forEach(appearance => {
    it(`${appearance}: selected background/icon paint changes when externally controlled state is cleared`, () => {
      const Example = () => {
        const [checked, setChecked] = React.useState(true);
        return (
          <>
            <button id="outside" onClick={() => setChecked(false)}>
              Clear
            </button>
            <Fixture checkedValues={{ text: checked ? ['bold'] : [] }} buttonProps={{ appearance }} />
          </>
        );
      };
      mount(<Example />);
      cy.get('#outside').realHover();
      button()
        .should('have.attr', 'aria-pressed', 'true')
        .invoke('css', 'background-color')
        .then(background => {
          button()
            .find('.fui-ToggleButton__icon')
            .invoke('css', 'color')
            .then(color => {
              cy.get('#outside').realClick();
              button().should('have.attr', 'aria-pressed', 'false');
              button().invoke('css', 'background-color').should('not.equal', background);
              button().find('.fui-ToggleButton__icon').invoke('css', 'color').should('not.equal', color);
            });
        });
    });
  });

  it('null icon removes its ref without disabling native toggle; final removal detaches the root ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const iconRef = React.createRef<HTMLSpanElement>();
    const Example = () => {
      const [stage, setStage] = React.useState(0);
      return (
        <>
          <button onClick={() => setStage(value => value + 1)}>Next</button>
          {stage < 2 && (
            <Fixture buttonProps={{ ref, icon: stage ? null : { ref: iconRef, id: 'icon', children: 'B' } }} />
          )}
        </>
      );
    };
    mount(<Example />);
    cy.get('#icon').should($icon => expect(iconRef.current).to.equal($icon[0]));
    cy.contains('button', 'Next').realClick();
    cy.get('#icon')
      .should('not.exist')
      .then(() => expect(iconRef.current).to.equal(null));
    button().focus().realPress('Space');
    button().should('have.attr', 'aria-pressed', 'true');
    cy.contains('button', 'Next').realClick();
    button()
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });
});

describe('ToolbarToggleButton unit-derived contracts (round 3)', () => {
  it('standalone defaults to an unpressed subtle native button and does not create local selection', () => {
    const click = cy.stub().as('click');
    mount(
      <ToolbarToggleButton id="bold" name="text" value="bold" onClick={click}>
        Bold
      </ToolbarToggleButton>,
    );
    button()
      .should('have.prop', 'tagName', 'BUTTON')
      .and('have.attr', 'type', 'button')
      .and('have.attr', 'aria-pressed', 'false')
      .and('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
    button().realClick();
    button().should('have.attr', 'aria-pressed', 'false');
    cy.get('@click').should('have.been.calledOnce');
  });

  ([false, true] as const).forEach(checked => {
    it(`${checked}: raw toolbar handler gets the exact event/name/value/previous checked state`, () => {
      const toggle = cy.stub().as('toggle');
      const click = cy.stub();
      mount(
        <ToolbarContext.Provider
          value={{
            size: 'medium',
            vertical: false,
            checkedValues: { text: checked ? ['bold'] : [] },
            handleToggleButton: toggle,
          }}
        >
          <ToolbarToggleButton id="bold" name="text" value="bold" onClick={click}>
            Bold
          </ToolbarToggleButton>
        </ToolbarContext.Provider>,
      );
      button().realClick();
      cy.get('@toggle')
        .should('have.been.calledOnce')
        .then(() => {
          expect(toggle.firstCall.args).to.deep.equal([click.firstCall.args[0], 'text', 'bold', checked]);
        });
      button().should('have.attr', 'aria-pressed', String(checked));
    });
  });

  it('base hook retains toggle behavior/slots but does not provide shape/size/appearance defaults', () => {
    let state: ReturnType<typeof useToolbarToggleButtonBase_unstable>;
    const Base = (props: ToolbarToggleButtonProps) => {
      state = useToolbarToggleButtonBase_unstable(props, null);
      return renderToggleButton_unstable(state);
    };
    mount(
      <Toolbar>
        <Base id="bold" name="text" value="bold" icon={<TextBoldRegular />}>
          Bold
        </Base>
      </Toolbar>,
    );
    button().should('not.have.class', 'fui-ToggleButton').and('have.attr', 'aria-pressed', 'false');
    button().realClick();
    button()
      .should('have.attr', 'aria-pressed', 'true')
      .then(() => {
        expect(state).not.to.have.property('appearance');
        expect(state).not.to.have.property('size');
        expect(state).not.to.have.property('shape');
      });
  });

  (['name', 'value'] as const).forEach(empty => {
    it(`empty ${empty} does not request parent selection but still forwards consumer click`, () => {
      const change = cy.stub().as('change');
      const click = cy.stub().as('click');
      mount(<Fixture onCheckedValueChange={change} buttonProps={{ [empty]: '', onClick: click }} />);
      button().realClick();
      cy.get('@change').should('not.have.been.called');
      cy.get('@click').should('have.been.calledOnce');
      button().should('have.attr', 'aria-pressed', 'false');
    });
  });

  it('explicit checkbox role switches the native state attribute; context remains authoritative over aria override', () => {
    mount(<Fixture checkedValues={{ text: ['bold'] }} buttonProps={{ role: 'checkbox', 'aria-checked': false }} />);
    button()
      .should('have.attr', 'role', 'checkbox')
      .and('have.attr', 'aria-checked', 'true')
      .and('not.have.attr', 'aria-pressed');
  });

  it('supported anchor root forwards href/ref and native Space uses component-owned ARIA-button click emulation', () => {
    const ref = React.createRef<HTMLAnchorElement>();
    const change = cy.stub().as('change');
    const keydown = cy.stub();
    mount(
      <Toolbar onCheckedValueChange={change}>
        <ToolbarToggleButton
          as="a"
          id="bold"
          ref={ref}
          href="#local"
          role="button"
          name="text"
          value="bold"
          onKeyDown={keydown}
          onClick={event => event.preventDefault()}
        >
          Bold
        </ToolbarToggleButton>
      </Toolbar>,
    );
    button()
      .should('have.prop', 'tagName', 'A')
      .and('have.attr', 'href', '#local')
      .should($button => expect(ref.current).to.equal($button[0]));
    button().focus().realPress('Space');
    button().should('have.attr', 'aria-pressed', 'true');
    cy.get('@change')
      .should('have.been.calledOnce')
      .then(() => {
        expect(keydown.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
        expect(change.firstCall.args[0].nativeEvent.isTrusted).to.equal(false);
        expect(change.firstCall.args[1]).to.deep.equal({ name: 'text', checkedItems: ['bold'] });
      });
  });
});

describe('ToolbarToggleButton edges and accessibility (round 2)', () => {
  it('native disabled button blocks pointer callbacks and is skipped on entering toolbar with Tab', () => {
    const change = cy.stub().as('change');
    const click = cy.stub().as('click');
    mount(
      <>
        <button id="before">Before</button>
        <Fixture onCheckedValueChange={change} buttonProps={{ disabled: true, onClick: click }} />
      </>,
    );
    button().should('be.disabled').realClick();
    cy.get('@change').should('not.have.been.called');
    cy.get('@click').should('not.have.been.called');
    cy.get('#before').focus().realPress('Tab');
    cy.get('#italic').should('have.focus');
  });

  (['click', 'Enter', 'Space'] as const).forEach(key => {
    it(`disabledFocusable retains native focus but blocks ${key} and stops callbacks`, () => {
      const change = cy.stub().as('change');
      const click = cy.stub().as('click');
      mount(<Fixture onCheckedValueChange={change} buttonProps={{ disabledFocusable: true, onClick: click }} />);
      button().should('not.be.disabled').and('have.attr', 'aria-disabled', 'true').focus().should('have.focus');
      if (key === 'click') {
        button().realClick();
      } else {
        button().realPress(key);
      }
      button().should('have.attr', 'aria-pressed', 'false');
      cy.get('@change').should('not.have.been.called');
      cy.get('@click').should('not.have.been.called');
    });
  });

  ([false, true] as const).forEach(disabledFocusable => {
    it(`selected ${
      disabledFocusable ? 'focusable' : 'native'
    } disabled button retains disabled foreground rather than selected foreground`, () => {
      mount(<Fixture checkedValues={{ text: ['bold'] }} buttonProps={{ disabled: true, disabledFocusable }} />);
      button().should('have.attr', 'aria-pressed', 'true').and('have.css', 'color', 'rgb(189, 189, 189)');
      button().find('.fui-ToggleButton__icon').should('have.css', 'color', 'rgb(189, 189, 189)');
    });
  });

  ([false, true] as const).forEach(vertical => {
    (['ltr', 'rtl'] as const).forEach(dir => {
      it(`${
        vertical ? 'vertical' : 'horizontal'
      }/${dir}: native arrow focus cycles across buttons without toggling`, () => {
        const change = cy.stub().as('change');
        mount(
          <FluentProvider theme={webLightTheme} dir={dir}>
            <button id="before">Before</button>
            <Fixture vertical={vertical} onCheckedValueChange={change} />
            <button id="after">After</button>
          </FluentProvider>,
        );
        cy.get('#before').focus().realPress('Tab');
        button()
          .should('have.focus')
          .realPress(vertical ? 'ArrowDown' : dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
        cy.get('#italic')
          .should('have.focus')
          .realPress(vertical ? 'ArrowDown' : dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
        cy.get('#view-bold')
          .should('have.focus')
          .realPress(vertical ? 'ArrowDown' : dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
        button().should('have.focus').realPress('Tab');
        cy.get('#after').should('have.focus');
        cy.get('@change').should('not.have.been.called');
      });
    });
  });

  (['Enter', 'Space'] as const).forEach(key => {
    it(`consumer-cancelled native ${key} keydown prevents native activation`, () => {
      const change = cy.stub().as('change');
      mount(<Fixture onCheckedValueChange={change} buttonProps={{ onKeyDown: event => event.preventDefault() }} />);
      button().focus().realPress(key);
      button().should('have.attr', 'aria-pressed', 'false');
      cy.get('@change').should('not.have.been.called');
    });
  });

  it('root/icon native attrs, refs, custom children/style/class preserve identity through toggle', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const iconRef = React.createRef<HTMLSpanElement>();
    mount(
      <Fixture
        buttonProps={{
          ref,
          title: 'Bold action',
          className: 'custom-button',
          style: { minWidth: 100 },
          icon: { id: 'custom-icon', ref: iconRef, className: 'custom-icon', children: 'B' },
        }}
      />,
    );
    button()
      .should('have.attr', 'title', 'Bold action')
      .and('have.class', 'custom-button')
      .and('have.css', 'min-width', '100px')
      .should($button => expect(ref.current).to.equal($button[0]));
    cy.get('#custom-icon')
      .should('have.text', 'B')
      .and('have.class', 'custom-icon')
      .should($icon => expect(iconRef.current).to.equal($icon[0]));
    button().realClick();
    button()
      .should('have.attr', 'aria-pressed', 'true')
      .should($button => expect(ref.current).to.equal($button[0]));
  });

  it('default native button does not submit a surrounding form for pointer/Enter/Space', () => {
    const submit = cy.stub().as('submit');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <Fixture />
      </form>,
    );
    button().realClick().focus().realPress('Enter').realPress('Space');
    cy.get('@submit').should('not.have.been.called');
  });

  it('selection runs before consumer click prevention and both receive identical event', () => {
    const order: string[] = [];
    const change = cy.stub().callsFake(() => order.push('selection'));
    const click = cy
      .stub()
      .callsFake((event: React.MouseEvent) => {
        order.push('click');
        event.preventDefault();
      })
      .as('click');
    mount(<Fixture onCheckedValueChange={change} buttonProps={{ onClick: click }} />);
    button().realClick();
    button().should('have.attr', 'aria-pressed', 'true');
    cy.get('@click')
      .should('have.been.calledOnce')
      .then(() => {
        expect(order).to.deep.equal(['selection', 'click']);
        expect(change.firstCall.args[0]).to.equal(click.firstCall.args[0]);
        expect(click.firstCall.args[0].defaultPrevented).to.equal(true);
      });
  });
});

describe('ToolbarToggleButton documented contracts (round 1)', () => {
  (['click', 'Enter', 'Space'] as const).forEach(key => {
    ([false, true] as const).forEach(checked => {
      it(`${key}/${
        checked ? 'checked' : 'unchecked'
      }: native toggle reports exact event identity and named checked-items payload`, () => {
        const change = cy.stub().as('change');
        const click = cy.stub();
        mount(
          <Fixture
            defaultCheckedValues={{ text: checked ? ['bold'] : [] }}
            onCheckedValueChange={change}
            buttonProps={{ onClick: click }}
          />,
        );
        button().should('have.attr', 'aria-pressed', String(checked)).and('have.attr', 'type', 'button');
        if (key === 'click') {
          button().realClick();
        } else {
          button().focus().realPress(key);
        }
        button().should('have.attr', 'aria-pressed', String(!checked));
        cy.get('@change')
          .should('have.been.calledOnce')
          .then(() => {
            const [event, data] = change.firstCall.args;
            expect(event).to.equal(click.firstCall.args[0]);
            expect(event.type).to.equal('click');
            expect(event.nativeEvent.isTrusted).to.equal(true);
            expect(event.target.closest('button').id).to.equal('bold');
            expect(data).to.deep.equal({ name: 'text', checkedItems: checked ? [] : ['bold'] });
          });
      });
    });
  });

  (['small', 'medium', 'large'] as const).forEach((size, index) => {
    (['primary', 'subtle', 'transparent'] as const).forEach(appearance => {
      it(`${size}/${appearance}: inherited icon-only target geometry and checked semantics`, () => {
        mount(<Fixture size={size} buttonProps={{ appearance }} />);
        button().should($button => {
          const rect = $button[0].getBoundingClientRect();
          expect(rect.width).to.equal(24 + index * 8);
          expect(rect.height).to.equal(24 + index * 8);
        });
        button().realClick();
        button().should('have.attr', 'aria-pressed', 'true');
      });
    });
  });

  it('frozen controlled checked values report requested changes without changing state', () => {
    const change = cy.stub().as('change');
    mount(<Fixture checkedValues={{ text: ['italic'] }} onCheckedValueChange={change} />);
    button().realClick();
    button().should('have.attr', 'aria-pressed', 'false');
    cy.get('#italic').should('have.attr', 'aria-pressed', 'true');
    cy.get('@change')
      .should('have.been.calledOnce')
      .then(() => expect(change.firstCall.args[1]).to.deep.equal({ name: 'text', checkedItems: ['italic', 'bold'] }));
  });

  it('controlled owner accepts multiple toggles while independently named group remains selected', () => {
    const Owner = () => {
      const [checked, setChecked] = React.useState<Record<string, string[]>>({ text: ['italic'], view: ['bold'] });
      return (
        <Fixture
          checkedValues={checked}
          onCheckedValueChange={(_, data) => setChecked(values => ({ ...values, [data.name]: data.checkedItems }))}
        />
      );
    };
    mount(<Owner />);
    button().realClick();
    button().should('have.attr', 'aria-pressed', 'true');
    cy.get('#italic').realClick();
    cy.get('#italic').should('have.attr', 'aria-pressed', 'false');
    cy.get('#view-bold').should('have.attr', 'aria-pressed', 'true');
  });

  it('explicit child size overrides larger toolbar size', () => {
    mount(<Fixture size="large" buttonProps={{ size: 'small' }} />);
    button().should('have.css', 'width', '24px');
    cy.get('#italic').should('have.css', 'width', '40px');
  });

  it('descriptive tooltip preserves button name and resolves aria-describedby on native focus', () => {
    mount(
      <Toolbar>
        <Tooltip content="Makes selected text bold" relationship="description">
          <ToolbarToggleButton id="bold" name="text" value="bold" aria-label="Bold" icon={<TextBoldRegular />} />
        </Tooltip>
      </Toolbar>,
    );
    button().focus();
    cy.get('[role="tooltip"]').should('be.visible');
    button()
      .should('have.attr', 'aria-label', 'Bold')
      .invoke('attr', 'aria-describedby')
      .then(id => cy.get(`[id="${id}"]`).should('have.text', 'Makes selected text bold'));
  });
});
