import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, tokens } from '@fluentui/react-theme';
import { Card } from '@fluentui/react-card';
import { Button } from '@fluentui/react-button';
import { CardHeader } from './CardHeader';
const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const root = () => cy.get('.fui-CardHeader');
const slot = (name: string) => cy.get(`.fui-CardHeader__${name}`);
const image = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3C%2Fsvg%3E';

describe('CardHeader documented scenarios (round 1)', () => {
  [false, true].forEach(hasImage =>
    [false, true].forEach(hasDescription =>
      [false, true].forEach(hasAction => {
        it(`Default image=${hasImage}, description=${hasDescription}, action=${hasAction}: slot layout/content and native Tab`, () => {
          const action = cy.stub().as('action');
          mount(
            <>
              <button data-test="before">Before</button>
              <CardHeader
                style={{ width: `calc(${tokens.spacingHorizontalXXXL} * 10)` }}
                image={hasImage ? { as: 'img', src: image, alt: 'PowerPoint logo' } : undefined}
                header={
                  <span>
                    <b>App Name</b>
                  </span>
                }
                description={hasDescription ? <span>Developer</span> : undefined}
                action={
                  hasAction ? (
                    <Button aria-label="More options" onClick={action} data-test="action">
                      More
                    </Button>
                  ) : undefined
                }
              />
              <button data-test="after">After</button>
            </>,
          );
          root()
            .should('have.prop', 'tagName', 'DIV')
            .and('have.css', 'display', hasDescription ? 'grid' : 'flex');
          root().should('not.have.attr', 'role');
          slot('header').should('have.text', 'App Name');
          if (hasImage) {
            slot('image')
              .should('have.prop', 'tagName', 'IMG')
              .and('have.attr', 'alt', 'PowerPoint logo')
              .and('have.css', 'margin-right', '12px');
          } else {
            slot('image').should('not.exist');
          }
          if (hasDescription) {
            slot('description').should('have.text', 'Developer').and('have.css', 'grid-column-start', '2');
          } else {
            slot('description').should('not.exist');
          }
          cy.get('[data-test="before"]').focus().realPress('Tab');
          if (hasAction) {
            slot('action')
              .should('have.css', 'margin-left', '12px')
              .find('[data-test="action"]')
              .should('be.focused')
              .and('have.attr', 'aria-label', 'More options');
            cy.realPress('Enter');
            cy.get('@action').should('have.been.calledOnce');
            cy.realPress('Tab');
          } else {
            slot('action').should('not.exist');
            cy.get('@action').should('not.have.been.called');
          }
          cy.get('[data-test="after"]').should('be.focused');
        });
      }),
    ),
  );

  it('Card README/Default: img child is preserved inside an image wrapper and header/description remain ordered', () => {
    mount(
      <Card>
        <CardHeader
          image={<img src={image} alt="Person avatar" />}
          header={
            <span>
              <b>Elvia Atkins</b> mentioned you
            </span>
          }
          description="5h ago · About us - Overview"
        />
      </Card>,
    );
    slot('image').should('have.prop', 'tagName', 'DIV').find('img').should('have.attr', 'alt', 'Person avatar');
    root()
      .children()
      .then($children =>
        expect(Array.from($children).map(el => el.className.split(' ')[0])).to.deep.equal([
          'fui-CardHeader__image',
          'fui-CardHeader__header',
          'fui-CardHeader__description',
        ]),
      );
  });

  it('CardAction: heading/link content and action have independent native keyboard access', () => {
    const link = cy.stub().as('link');
    const action = cy.stub().as('action');
    mount(
      <Card focusMode="off">
        <CardHeader
          header={
            <h5>
              <a
                href="#app"
                data-test="link"
                onClick={event => {
                  event.preventDefault();
                  link(event.currentTarget.textContent);
                }}
              >
                App Name
              </a>
            </h5>
          }
          description="Developer"
          action={
            <Button data-test="action" aria-label="More options" onClick={action}>
              More
            </Button>
          }
        />
      </Card>,
    );
    slot('header').find('h5').should('have.text', 'App Name');
    cy.get('[data-test="link"]').focus().realPress('Enter');
    cy.get('@link').should('have.been.calledOnceWithExactly', 'App Name');
    cy.realPress('Tab');
    cy.get('[data-test="action"]').should('be.focused').realPress('Space');
    cy.get('@action').should('have.been.calledOnce');
    cy.realPress(['Shift', 'Tab']);
    cy.get('[data-test="link"]').should('be.focused');
  });

  it('CardSelectable: header supplies a resolved checkbox label and keyboard selection is functional', () => {
    const select = cy.stub().as('select');
    mount(
      <Card onSelectionChange={select}>
        <CardHeader header="iOS App Prototype" description="Created 53m ago" />
      </Card>,
    );
    slot('header')
      .invoke('attr', 'id')
      .then(id => {
        expect(id).to.be.a('string').and.not.equal('');
        cy.get('input[type="checkbox"]').should('have.attr', 'aria-labelledby', id);
      });
    cy.get('input[type="checkbox"]').focus().realPress('Space');
    cy.get('input[type="checkbox"]').should('be.checked');
    cy.get('@select').should('have.been.calledOnce');
  });
});

describe('CardHeader a11y/undocumented edges (round 2)', () => {
  it('explicit header slot ID takes naming precedence over an identified child', () => {
    mount(
      <Card onSelectionChange={() => undefined}>
        <CardHeader header={{ id: 'header-slot-id', children: <h2 id="child-heading-id">Card title</h2> }} />
      </Card>,
    );
    cy.get('input[type="checkbox"]').should('have.attr', 'aria-labelledby', 'header-slot-id');
    slot('header')
      .should('have.attr', 'id', 'header-slot-id')
      .find('#child-heading-id')
      .should('have.text', 'Card title');
  });
  it('identified heading child supplies parent checkbox name without a competing header-wrapper ID', () => {
    mount(
      <Card onSelectionChange={() => undefined}>
        <CardHeader header={<h2 id="child-heading">Card title</h2>} />
      </Card>,
    );
    cy.get('input[type="checkbox"]').should('have.attr', 'aria-labelledby', 'child-heading');
    slot('header').should('not.have.attr', 'id');
    cy.get('#child-heading').should('have.text', 'Card title');
  });
  it('first direct identified header child wins when multiple children carry IDs', () => {
    mount(
      <Card onSelectionChange={() => undefined}>
        <CardHeader
          header={[
            <span key="prefix">Prefix</span>,
            <h2 key="first" id="first-heading">
              Title
            </h2>,
            <span key="second" id="second-heading">
              Details
            </span>,
          ]}
        />
      </Card>,
    );
    cy.get('input[type="checkbox"]').should('have.attr', 'aria-labelledby', 'first-heading');
  });
  it('multiple independently selectable cards generate unique valid header label references', () => {
    mount(
      <>
        <Card onSelectionChange={() => undefined}>
          <CardHeader header="First title" />
        </Card>
        <Card onSelectionChange={() => undefined}>
          <CardHeader header="Second title" />
        </Card>
      </>,
    );
    cy.get('input[type="checkbox"]')
      .should('have.length', 2)
      .then($inputs => {
        const ids = Array.from($inputs).map(input => input.getAttribute('aria-labelledby'));
        expect(new Set(ids).size).to.equal(2);
        ids.forEach((id, index) =>
          expect($inputs[index].ownerDocument.getElementById(id!)?.textContent).to.equal(
            index === 0 ? 'First title' : 'Second title',
          ),
        );
      });
  });
  it('null optional slots are absent while undefined header still uses its empty default wrapper', () => {
    mount(
      <>
        <CardHeader data-test="empty-default" />
        <CardHeader data-test="null-slots" image={null} header={null} description={null} action={null} />
      </>,
    );
    cy.get('[data-test="empty-default"]').find('.fui-CardHeader__header').should('exist').and('have.text', '');
    cy.get('[data-test="null-slots"]').children().should('have.length', 0);
    cy.get('[data-test="null-slots"]').should('have.css', 'display', 'flex');
  });
  it('disabled child action is skipped by native Tab and rejects pointer/callback activation', () => {
    const click = cy.stub().as('click');
    mount(
      <>
        <button data-test="before">Before</button>
        <CardHeader
          header="App Name"
          action={
            <Button disabled onClick={click} data-test="action">
              More
            </Button>
          }
        />
        <button data-test="after">After</button>
      </>,
    );
    cy.get('[data-test="before"]').focus().realPress('Tab');
    cy.get('[data-test="after"]').should('be.focused');
    cy.get('[data-test="action"]').should('be.disabled').click({ force: true });
    cy.get('@click').should('not.have.been.called');
  });
  it('child action native key cancellation produces no click, and prevents header bubbling when requested', () => {
    const child = cy.stub().as('child');
    const header = cy.stub().as('header');
    mount(
      <CardHeader
        header="App"
        onClick={header}
        action={
          <button
            data-test="action"
            onClick={event => {
              event.stopPropagation();
              child(event.currentTarget.dataset.test);
            }}
            onKeyDown={event => event.preventDefault()}
            onKeyUp={event => event.preventDefault()}
          >
            More
          </button>
        }
      />,
    );
    cy.get('[data-test="action"]').focus().realPress('Enter');
    cy.realPress('Space');
    cy.get('@child').should('not.have.been.called');
    cy.get('@header').should('not.have.been.called');
    cy.get('[data-test="action"]').click();
    cy.get('@child').should('have.been.calledOnceWithExactly', 'action');
    cy.get('@header').should('not.have.been.called');
  });
});

describe('CardHeader unit-derived and lifecycle contracts (round 3)', () => {
  it('root/slot native attributes/classes and object/callback refs identify nodes and clear on removal', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const headerRef = React.createRef<HTMLDivElement>();
    const imageRef = cy.stub().as('imageRef');
    const actionRef = cy.stub().as('actionRef');
    let setVisible: React.Dispatch<React.SetStateAction<boolean>>;
    const Lifecycle = () => {
      const [visible, update] = React.useState(true);
      setVisible = update;
      return visible ? (
        <CardHeader
          ref={rootRef}
          id="native-header"
          title="App details"
          aria-describedby="description"
          className="consumer-root"
          image={{ as: 'img', ref: imageRef, src: image, alt: 'App logo', className: 'consumer-image' }}
          header={{ ref: headerRef, id: 'title', className: 'consumer-title', children: 'App Name' }}
          description={{ id: 'description', className: 'consumer-description', children: 'Developer' }}
          action={{
            ref: actionRef,
            id: 'action-container',
            className: 'consumer-action',
            children: <button>More</button>,
          }}
        />
      ) : (
        <p data-test="removed">Removed</p>
      );
    };
    mount(<Lifecycle />);
    root()
      .should('have.class', 'consumer-root')
      .and('have.attr', 'title', 'App details')
      .and('have.attr', 'aria-describedby', 'description')
      .then($el => expect(rootRef.current).to.equal($el[0]));
    slot('header')
      .should('have.class', 'consumer-title')
      .and('have.attr', 'id', 'title')
      .then($el => expect(headerRef.current).to.equal($el[0]));
    slot('image')
      .should('have.class', 'consumer-image')
      .then($el => expect(imageRef.lastCall.args[0]).to.equal($el[0]));
    slot('action')
      .should('have.class', 'consumer-action')
      .then($el => expect(actionRef.lastCall.args[0]).to.equal($el[0]));
    cy.then(() => setVisible(false));
    cy.get('[data-test="removed"]').should('exist');
    cy.then(() => {
      expect(rootRef.current).to.equal(null);
      expect(headerRef.current).to.equal(null);
      expect(imageRef.lastCall.args[0]).to.equal(null);
      expect(actionRef.lastCall.args[0]).to.equal(null);
    });
  });
  it('current child callbacks bubble to the current passive header handler with actual currentTarget', () => {
    const calls = cy.stub().as('calls');
    let setVersion: React.Dispatch<React.SetStateAction<number>>;
    const Current = () => {
      const [version, update] = React.useState(0);
      setVersion = update;
      return (
        <CardHeader
          id="header-root"
          header={`App ${version}`}
          onClick={event => calls('header', version, event.currentTarget.id)}
          action={
            <button id="action-button" onClick={event => calls('action', version, event.currentTarget.id)}>
              More
            </button>
          }
        />
      );
    };
    mount(<Current />);
    slot('header').should('have.text', 'App 0');
    cy.then(() => setVersion(1));
    slot('header').should('have.text', 'App 1');
    cy.get('#action-button').focus().realPress('Enter');
    cy.get('@calls').then(() =>
      expect(calls.getCalls().map(call => call.args)).to.deep.equal([
        ['action', 1, 'action-button'],
        ['header', 1, 'header-root'],
      ]),
    );
  });
  it('dynamic identified title child then plain text keep checkbox reference resolved to current content', () => {
    let setStage: React.Dispatch<React.SetStateAction<number>>;
    const Dynamic = () => {
      const [stage, update] = React.useState(0);
      setStage = update;
      return (
        <Card onSelectionChange={() => undefined}>
          <CardHeader header={stage === 1 ? <h2 id="identified-title">Identified title</h2> : `Plain title ${stage}`} />
        </Card>
      );
    };
    mount(<Dynamic />);
    slot('header').should('have.text', 'Plain title 0');
    cy.then(() => setStage(1));
    slot('header').should('have.text', 'Identified title');
    cy.get('input[type="checkbox"]').should('have.attr', 'aria-labelledby', 'identified-title');
    slot('header').should('not.have.attr', 'id');
    cy.then(() => setStage(2));
    slot('header').should('have.text', 'Plain title 2');
    cy.get('input[type="checkbox"]').should($checkbox => {
      const id = $checkbox[0].getAttribute('aria-labelledby');
      expect($checkbox[0].ownerDocument.getElementById(id!)?.textContent).to.equal('Plain title 2');
    });
  });
  it('description/action children can be added and removed without recreating the root or losing layout', () => {
    let setDetailed: React.Dispatch<React.SetStateAction<boolean>>;
    const Dynamic = () => {
      const [detailed, update] = React.useState(false);
      setDetailed = update;
      return (
        <CardHeader
          header="App"
          description={detailed ? 'Developer' : null}
          action={detailed ? <button data-test="action">More</button> : null}
        />
      );
    };
    mount(<Dynamic />);
    root()
      .should('have.css', 'display', 'flex')
      .then($root => {
        cy.then(() => setDetailed(true));
        root()
          .should('have.css', 'display', 'grid')
          .then($next => expect($next[0]).to.equal($root[0]));
      });
    slot('description').should('have.text', 'Developer');
    cy.get('[data-test="action"]').focus().should('be.focused');
    cy.then(() => setDetailed(false));
    root().should('have.css', 'display', 'flex');
    slot('description').should('not.exist');
    slot('action').should('not.exist');
  });
  it('consumer CSS gap and root/slot inline overrides win over default styles', () => {
    mount(
      <CardHeader
        style={{ '--fui-CardHeader--gap': tokens.spacingHorizontalM, display: 'flex' } as React.CSSProperties}
        image={<span>Logo</span>}
        header={{ children: 'App', style: { fontWeight: tokens.fontWeightBold } }}
        description="Developer"
        action={<button>More</button>}
      />,
    );
    root().should('have.css', 'display', 'flex');
    slot('image').should('have.css', 'margin-right', webLightTheme.spacingHorizontalM);
    slot('action').should('have.css', 'margin-left', webLightTheme.spacingHorizontalM);
    slot('header').should('have.css', 'font-weight', webLightTheme.fontWeightBold.toString());
  });
  it('header slot render function preserves native props/ref and allows a real heading element', () => {
    mount(
      <CardHeader
        header={{
          id: 'render-title',
          children: (Component: React.ElementType, props: React.ComponentPropsWithRef<'div'>) => (
            <Component {...props}>
              <h2>Rendered heading</h2>
            </Component>
          ),
        }}
      />,
    );
    slot('header').should('have.attr', 'id', 'render-title').find('h2').should('have.text', 'Rendered heading');
  });
});
