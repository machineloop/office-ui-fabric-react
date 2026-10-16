import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import {
  TeachingPopover,
  TeachingPopoverTrigger,
  TeachingPopoverSurface,
  TeachingPopoverBody,
} from '@fluentui/react-teaching-popover';
import type { TeachingPopoverProps } from '@fluentui/react-teaching-popover';
import { TeachingPopoverTitle } from './TeachingPopoverTitle';
import type { TeachingPopoverTitleProps } from './TeachingPopoverTitle.types';
import { useTeachingPopoverTitleBase_unstable } from './useTeachingPopoverTitleBase';
import { renderTeachingPopoverTitle_unstable } from './renderTeachingPopoverTitle';
import { PopoverProvider } from '@fluentui/react-popover';
import type { PopoverContextValue } from '@fluentui/react-popover';

const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const title = () => cy.get('.fui-TeachingPopoverTitle');
const dismiss = () => cy.get('.fui-TeachingPopoverTitle__dismissButton');
const Fixture = ({
  titleProps,
  bodyChildren,
  ...props
}: Partial<TeachingPopoverProps> & { titleProps?: TeachingPopoverTitleProps; bodyChildren?: React.ReactNode }) => (
  <TeachingPopover {...props}>
    <TeachingPopoverTrigger disableButtonEnhancement>
      <button id="trigger">Show tip</button>
    </TeachingPopoverTrigger>
    <TeachingPopoverSurface aria-labelledby="title" id="surface">
      <TeachingPopoverBody>
        <TeachingPopoverTitle id="title" {...titleProps}>
          {titleProps?.children === undefined ? 'Teaching title' : titleProps.children}
        </TeachingPopoverTitle>
        <p>Useful details</p>
        {bodyChildren}
      </TeachingPopoverBody>
    </TeachingPopoverSurface>
  </TeachingPopover>
);
const open = () => {
  cy.get('#trigger').focus().realPress('Enter');
  cy.get('#surface').should('be.visible');
};
const BaseTitle = React.forwardRef<HTMLDivElement, TeachingPopoverTitleProps>((props, ref) =>
  renderTeachingPopoverTitle_unstable(useTeachingPopoverTitleBase_unstable(props, ref)),
);

describe('TeachingPopoverTitle adversarial improvements (final)', () => {
  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`${dir}: optional close button stays at the logical end of measured title width`, () => {
      mount(
        <FluentProvider theme={webLightTheme} dir={dir}>
          <TeachingPopoverTitle style={{ width: 240 }} dismissButton={{ 'aria-hidden': false }}>
            Name
          </TeachingPopoverTitle>
        </FluentProvider>,
      );
      title().then($title => {
        const root = $title[0].getBoundingClientRect();
        dismiss().should($button => {
          const button = $button[0].getBoundingClientRect();
          expect(dir === 'ltr' ? button.right : button.left).to.equal(dir === 'ltr' ? root.right : root.left);
        });
      });
    });
  });

  it('live content/appearance changes preserve the title node and update foreground color', () => {
    let initial: HTMLElement;
    const Example = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <Fixture
            open
            appearance={changed ? 'brand' : undefined}
            titleProps={{ children: changed ? 'New teaching title' : 'Original title' }}
            bodyChildren={<button onClick={() => setChanged(true)}>Update title</button>}
          />
        </>
      );
    };
    mount(<Example />);
    title().then($title => {
      initial = $title[0];
    });
    cy.contains('button', 'Update title').realClick();
    title()
      .should('have.text', 'New teaching title')
      .and('have.css', 'color', 'rgb(255, 255, 255)')
      .should($title => expect($title[0]).to.equal(initial));
  });

  it('optional slot removal detaches its ref; alternate heading updates forwarded ref and final removal clears it', () => {
    const ref = React.createRef<HTMLDivElement>();
    const buttonRef = React.createRef<HTMLButtonElement>();
    const Example = () => {
      const [stage, setStage] = React.useState(0);
      return (
        <>
          <button onClick={() => setStage(value => value + 1)}>Next</button>
          {stage < 2 && (
            <TeachingPopoverTitle ref={ref} as={stage ? 'div' : 'h2'} dismissButton={stage ? null : { ref: buttonRef }}>
              Name
            </TeachingPopoverTitle>
          )}
        </>
      );
    };
    mount(<Example />);
    dismiss().should($button => expect(buttonRef.current).to.equal($button[0]));
    cy.contains('button', 'Next').realClick();
    dismiss()
      .should('not.exist')
      .then(() => expect(buttonRef.current).to.equal(null));
    title()
      .should('have.prop', 'tagName', 'DIV')
      .should($title => expect(ref.current).to.equal($title[0]));
    cy.contains('button', 'Next').realClick();
    title()
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });
});

describe('TeachingPopoverTitle unit-derived contracts (round 3)', () => {
  it('full design injects default dismiss glyph but explicit null children retain an empty button', () => {
    mount(<TeachingPopoverTitle dismissButton={{}}>Name</TeachingPopoverTitle>);
    dismiss().find('svg').should('have.length', 2);
    mount(<TeachingPopoverTitle dismissButton={{ children: null }}>Name</TeachingPopoverTitle>);
    dismiss().should('be.empty');
  });

  it('null optional slot does not render a dismiss button', () => {
    mount(<TeachingPopoverTitle dismissButton={null}>Name</TeachingPopoverTitle>);
    dismiss().should('not.exist');
  });

  it('base hook has structural behavior but no bundled glyph or design class', () => {
    mount(<BaseTitle dismissButton={{}}>Name</BaseTitle>);
    cy.get('h2').should('have.text', 'Name').and('not.have.class', 'fui-TeachingPopoverTitle');
    cy.get('h2 button').should('be.empty').and('have.attr', 'type', 'button').and('have.attr', 'aria-hidden', 'true');
  });

  it('default dismiss passes exact native event/false to context and focuses its real trigger', () => {
    const setOpen = cy.stub().as('setOpen');
    const triggerRef = React.createRef<HTMLButtonElement>();
    const context: PopoverContextValue = {
      open: true,
      setOpen,
      toggleOpen: () => undefined,
      triggerRef,
      contentRef: React.createRef<HTMLElement>(),
      arrowRef: React.createRef<HTMLDivElement>(),
      openOnContext: false,
      openOnHover: false,
      size: 'medium',
      inline: false,
    };
    mount(
      <PopoverProvider value={context}>
        <button id="context-trigger" ref={triggerRef}>
          Trigger
        </button>
        <TeachingPopoverTitle dismissButton={{}}>Name</TeachingPopoverTitle>
      </PopoverProvider>,
    );
    dismiss().realClick();
    cy.get('#context-trigger').should('have.focus');
    cy.get('@setOpen')
      .should('have.been.calledOnce')
      .then(() => {
        expect(setOpen.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
        expect(setOpen.firstCall.args[1]).to.equal(false);
      });
  });

  it('custom dismiss children/ARIA/type override defaults without being replaced by icon injection', () => {
    mount(
      <TeachingPopoverTitle
        dismissButton={{ children: 'Close', 'aria-label': 'Close tour', 'aria-hidden': false, type: 'reset' }}
      >
        Name
      </TeachingPopoverTitle>,
    );
    dismiss()
      .should('have.text', 'Close')
      .and('have.attr', 'aria-label', 'Close tour')
      .and('have.attr', 'aria-hidden', 'false')
      .and('have.attr', 'type', 'reset');
    dismiss().find('svg').should('not.exist');
  });
});

describe('TeachingPopoverTitle edges and accessibility (round 2)', () => {
  it('default dismissal button does not submit a surrounding form on native pointer/Enter/Space', () => {
    const submit = cy.stub().as('submit');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <TeachingPopoverTitle dismissButton={{}}>Title</TeachingPopoverTitle>
      </form>,
    );
    dismiss().realClick();
    dismiss().focus().realPress('Enter').realPress('Space');
    cy.get('@submit').should('not.have.been.called');
  });

  it('root and dismiss slot refs/native attrs/class/style are preserved on actual elements', () => {
    const ref = React.createRef<HTMLHeadingElement>();
    const buttonRef = React.createRef<HTMLButtonElement>();
    mount(
      <TeachingPopoverTitle
        ref={ref}
        id="native-title"
        title="Title"
        className="custom-title"
        style={{ paddingBottom: 11 }}
        dismissButton={{
          ref: buttonRef,
          id: 'close',
          title: 'Close tip',
          className: 'custom-dismiss',
          'aria-hidden': false,
        }}
      >
        Name
      </TeachingPopoverTitle>,
    );
    title()
      .should('have.id', 'native-title')
      .and('have.class', 'custom-title')
      .and('have.css', 'padding-bottom', '11px')
      .should($title => expect(ref.current).to.equal($title[0]));
    dismiss()
      .should('have.id', 'close')
      .and('have.class', 'custom-dismiss')
      .and('have.attr', 'title', 'Close tip')
      .and('have.attr', 'aria-hidden', 'false')
      .should($button => expect(buttonRef.current).to.equal($button[0]));
  });

  it('capture-cancelled built-in dismiss skips close but still restores trigger focus, matching unit contract', () => {
    const change = cy.stub().as('change');
    mount(
      <Fixture
        open
        titleProps={{ dismissButton: {}, onClickCapture: event => event.preventDefault() }}
        onOpenChange={change}
      />,
    );
    cy.get('#surface').should('be.visible');
    dismiss().realClick();
    cy.get('#surface').should('be.visible');
    cy.get('#trigger').should('have.focus');
    cy.get('@change').should('not.have.been.called');
  });

  it('custom slot onClick replaces built-in close behavior and receives the exact trusted native click', () => {
    const click = cy.stub().as('click');
    mount(<Fixture open titleProps={{ dismissButton: { onClick: click, children: 'Custom close' } }} />);
    dismiss().realClick();
    cy.get('#surface').should('be.visible');
    cy.get('@click')
      .should('have.been.calledOnce')
      .then(() => {
        expect(click.firstCall.args[0].type).to.equal('click');
        expect(click.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
      });
  });

  it('frozen controlled popup emits exact close request while remaining visible and restoring trigger focus', () => {
    const change = cy.stub().as('change');
    mount(<Fixture open onOpenChange={change} titleProps={{ dismissButton: {} }} />);
    dismiss().focus().realPress('Enter');
    cy.get('#surface').should('be.visible');
    cy.get('#trigger').should('have.focus');
    cy.get('@change')
      .should('have.been.calledOnce')
      .then(() => expect(change.firstCall.args[1].open).to.equal(false));
  });

  it('disabled dismiss button is a native disabled control, not a custom keyboard activation', () => {
    const change = cy.stub().as('change');
    mount(<Fixture open onOpenChange={change} titleProps={{ dismissButton: { disabled: true } }} />);
    dismiss().should('be.disabled').realClick();
    cy.get('@change').should('not.have.been.called');
    cy.get('#surface').should('be.visible');
  });
});

describe('TeachingPopoverTitle documented contracts (round 1)', () => {
  it('default h2 renders title only with real typography and no optional dismissal', () => {
    mount(<TeachingPopoverTitle>Teaching title</TeachingPopoverTitle>);
    title()
      .should('have.prop', 'tagName', 'H2')
      .and('have.text', 'Teaching title')
      .and('have.css', 'font-size', '16px')
      .and('have.css', 'line-height', '22px')
      .and('have.css', 'padding-bottom', '8px')
      .and('have.css', 'margin-top', '0px')
      .and('have.css', 'margin-bottom', '0px');
    dismiss().should('not.exist');
  });

  (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div'] as const).forEach(as => {
    it(`${as}: supported root preserves contents and native tag while retaining title design`, () => {
      mount(
        <TeachingPopoverTitle as={as} title="Tip title">
          Teaching title
        </TeachingPopoverTitle>,
      );
      title()
        .should('have.prop', 'tagName', as.toUpperCase())
        .and('have.text', 'Teaching title')
        .and('have.attr', 'title', 'Tip title')
        .and('have.css', 'font-size', '16px');
    });
  });

  (['brand', undefined] as const).forEach(appearance => {
    it(`${appearance ?? 'default'}: title inherits real teaching popup appearance and names the surface`, () => {
      mount(<Fixture appearance={appearance} />);
      open();
      cy.get('#surface').should('have.attr', 'aria-labelledby', 'title');
      title().should('have.css', 'color', appearance === 'brand' ? 'rgb(255, 255, 255)' : 'rgb(36, 36, 36)');
    });
  });

  (['click', 'Enter', 'Space'] as const).forEach(key => {
    it(`optional native ${key} dismisses the popup and restores trigger focus`, () => {
      mount(<Fixture titleProps={{ dismissButton: {} }} />);
      open();
      dismiss().should('have.attr', 'aria-label', 'dismiss').and('have.attr', 'aria-hidden', 'true');
      if (key === 'click') {
        dismiss().realClick();
      } else {
        dismiss().focus().realPress(key);
      }
      cy.get('#surface').should('not.exist');
      cy.get('#trigger').should('have.focus');
    });
  });
});
