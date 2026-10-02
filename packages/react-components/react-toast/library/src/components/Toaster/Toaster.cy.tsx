import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import * as axe from 'axe-core';
import { computeAccessibleName } from 'dom-accessibility-api';
import { Toaster } from './Toaster';
import type { ToasterProps } from './Toaster.types';
import { Toast } from '../Toast/Toast';
import { ToastTitle } from '../ToastTitle/ToastTitle';
import { ToastBody } from '../ToastBody/ToastBody';
import { ToastTrigger } from '../ToastTrigger/ToastTrigger';
import { useToastController } from '../../state/useToastController';
import type { DispatchToastOptions, ToastPosition } from '../../state/types';

type Controller = ReturnType<typeof useToastController>;
type Handle = Controller & {
  notify: (id: string, options?: DispatchToastOptions, text?: string) => void;
  configure: (props: Partial<ToasterProps>) => void;
  setMounted: (mounted: boolean) => void;
};
const positions: ToastPosition[] = ['top-start', 'top-end', 'bottom-start', 'bottom-end', 'top', 'bottom'];
const stack = '.fui-Toaster';
const item = (id: string) => `[data-testid="item-${id}"]`;
const action = (id: string) => `[data-testid="action-${id}"]`;
const ownedShadowHosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of ownedShadowHosts) {
    host.remove();
  }
  ownedShadowHosts.length = 0;
});
function testRoot(id: string) {
  return { 'data-testid': id } as React.HTMLAttributes<HTMLDivElement> & { 'data-testid': string };
}

const Fixture = React.forwardRef<Handle, ToasterProps & { controlsPrefix?: string }>((initial, ref) => {
  const { controlsPrefix = '', ...initialProps } = initial;
  const [props, setProps] = React.useState(initialProps);
  const [mounted, setMounted] = React.useState(true);
  const controller = useToastController(props.toasterId);
  const counter = React.useRef(0);
  const notify = (id: string, options: DispatchToastOptions = {}, text = `Notice ${id}`) => {
    controller.dispatchToast(
      <Toast>
        <ToastTitle action={<button data-testid={`action-${id}`}>Action {id}</button>}>{text}</ToastTitle>
        <ToastBody>Changes are available.</ToastBody>
      </Toast>,
      { toastId: id, root: testRoot(`item-${id}`), ...options },
    );
  };
  React.useImperativeHandle(ref, () => ({
    ...controller,
    notify,
    configure: update => setProps(current => ({ ...current, ...update })),
    setMounted,
  }));
  return (
    <>
      <output id={`${controlsPrefix}mount-status`}>{mounted ? 'mounted' : 'unmounted'}</output>
      <button id={`${controlsPrefix}outside`}>Outside</button>
      <button id={`${controlsPrefix}notify`} onClick={() => notify(`native-${++counter.current}`)}>
        Make toast
      </button>
      <div id={`${controlsPrefix}frame`} style={{ position: 'relative', width: 700, height: 500, margin: 30 }}>
        {mounted && <Toaster timeout={-1} {...props} />}
      </div>
    </>
  );
});

function setup(props: ToasterProps = {}, dir: 'ltr' | 'rtl' = 'ltr') {
  const ref = React.createRef<Handle>();
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      <Fixture {...props} ref={ref} />
    </FluentProvider>,
    {
      strict: false,
    },
  );
  cy.get('#notify').should('be.visible');
  cy.get('#outside').realHover();
  return ref;
}
function notify(ref: React.RefObject<Handle | null>, id: string, options: DispatchToastOptions = {}) {
  cy.then(() => ref.current!.notify(id, options));
  cy.get(item(id)).should('be.visible');
}
function timer(id: string) {
  return cy.get(item(id)).find('[data-timer-status]');
}
function running(id: string, state: 'running' | 'paused') {
  timer(id).should('have.attr', 'data-timer-status', state).and('have.css', 'animation-play-state', state);
}

describe('Toaster source and conformance gaps', () => {
  beforeEach(() => cy.viewport(1000, 800));

  it('pauses existing and newly dispatched positions of the same toaster while any position has focus', () => {
    const ref = setup({ timeout: 10000 });
    notify(ref, 'focused-position', { position: 'top-start' });
    notify(ref, 'other-position', { position: 'bottom-end' });
    running('focused-position', 'running');
    running('other-position', 'running');
    cy.get(action('focused-position')).focus();
    running('focused-position', 'paused');
    running('other-position', 'paused');
    notify(ref, 'new-position', { position: 'bottom' });
    running('new-position', 'paused');
    cy.get(action('other-position')).focus();
    running('focused-position', 'paused');
    running('other-position', 'paused');
    running('new-position', 'paused');
    cy.get('#outside').focus();
    running('focused-position', 'running');
    running('other-position', 'running');
    running('new-position', 'running');
  });

  it('does not pause a new notification in another named toaster when the first toaster has focus', () => {
    const one = React.createRef<Handle>();
    const two = React.createRef<Handle>();
    mount(
      <FluentProvider theme={webLightTheme}>
        <Fixture controlsPrefix="first-" toasterId="first" timeout={10000} ref={one} />
        <Fixture controlsPrefix="second-" toasterId="second" timeout={10000} ref={two} />
      </FluentProvider>,
      { strict: false },
    );
    cy.get('#first-notify').should('be.visible');
    cy.get('#second-notify').should('be.visible');
    notify(one, 'first-focused');
    cy.get(action('first-focused')).focus();
    running('first-focused', 'paused');
    notify(two, 'second-running');
    running('second-running', 'running');
    running('first-focused', 'paused');
  });

  for (const toasterId of [undefined, 'shared']) {
    it(`isolates focus between two instances sharing ${toasterId ?? 'the default'} controller routing`, () => {
      const one = React.createRef<Handle>();
      const two = React.createRef<Handle>();
      mount(
        <FluentProvider theme={webLightTheme}>
          <Fixture controlsPrefix="first-" toasterId={toasterId} inline timeout={10000} ref={one} />
          <Fixture controlsPrefix="second-" toasterId={toasterId} inline timeout={10000} ref={two} />
        </FluentProvider>,
        { strict: false },
      );
      cy.get('#first-notify').should('be.visible');
      cy.get('#second-notify').should('be.visible');
      cy.get('#first-outside').realHover();
      cy.then(() => one.current!.notify('original'));
      for (const prefix of ['first', 'second']) {
        cy.get(`#${prefix}-frame`).find(item('original')).should('be.visible');
        cy.get(`#${prefix}-frame`).find('[data-timer-status]').should('have.attr', 'data-timer-status', 'running');
      }
      cy.get('#first-frame').find(action('original')).focus();
      cy.get('#first-frame').find('[data-timer-status]').should('have.attr', 'data-timer-status', 'paused');
      cy.get('#second-frame').find('[data-timer-status]').should('have.attr', 'data-timer-status', 'running');
      cy.then(() => one.current!.notify('new'));
      cy.get('#first-frame')
        .find(item('new'))
        .find('[data-timer-status]')
        .should('have.attr', 'data-timer-status', 'paused');
      cy.get('#second-frame')
        .find(item('new'))
        .find('[data-timer-status]')
        .should('have.attr', 'data-timer-status', 'running');
      cy.get('#first-outside').focus();
      cy.get('#first-frame')
        .find('[data-timer-status]')
        .should('have.length', 2)
        .each(timer => {
          cy.wrap(timer).should('have.attr', 'data-timer-status', 'running');
        });
    });
  }

  it('retains root overrides across separate application-data updates and later root-only updates', () => {
    const ref = setup();
    notify(ref, 'separate-data', { root: { ...testRoot('item-separate-data'), className: 'original-root' } });
    cy.then(() => ref.current!.updateToast({ toastId: 'separate-data', data: { application: 'first' } }));
    cy.get(item('separate-data')).should('have.class', 'original-root');
    cy.then(() =>
      ref.current!.updateToast({
        toastId: 'separate-data',
        root: { ...testRoot('item-separate-data'), className: 'updated-root' },
      }),
    );
    cy.get(item('separate-data')).should('have.class', 'updated-root').and('not.have.class', 'original-root');
    cy.then(() => ref.current!.updateToast({ toastId: 'separate-data', data: { application: 'second' } }));
    cy.get(item('separate-data')).should('have.class', 'updated-root').and('contain.text', 'Notice separate-data');
  });

  it('keeps simultaneous application, hover and window pauses independent', () => {
    const ref = setup({ timeout: 10000, pauseOnHover: true, pauseOnWindowBlur: true });
    notify(ref, 'reasons');
    running('reasons', 'running');
    cy.get(item('reasons')).realHover();
    running('reasons', 'paused');
    cy.window().trigger('blur');
    cy.get('#outside').realHover();
    running('reasons', 'paused');
    cy.get(item('reasons')).realHover();
    cy.window().trigger('focus');
    running('reasons', 'paused');
    cy.then(() => ref.current!.pauseToast('reasons'));
    cy.get('#outside').realHover();
    running('reasons', 'paused');
    cy.then(() => ref.current!.playToast('reasons'));
    running('reasons', 'running');
  });

  it('reserves a dismissed id through exit, then accepts a fresh notification after removal', () => {
    const changed = cy.stub().as('reuseLifecycle');
    const ref = setup();
    notify(ref, 'reserved', { onStatusChange: changed });
    cy.get('@reuseLifecycle').its('lastCall.args.1.status').should('equal', 'visible');
    cy.then(() => {
      ref.current!.dismissToast('reserved');
      ref.current!.notify('reserved', { onStatusChange: changed }, 'During exit');
    });
    cy.get(item('reserved')).should('not.exist');
    cy.get('@reuseLifecycle').should(stub => {
      const calls = (stub as unknown as { args: [null, { status: string }][] }).args;
      expect(calls.map(call => call[1].status)).to.deep.equal(['queued', 'visible', 'dismissed', 'unmounted']);
    });
    cy.then(() => ref.current!.notify('reserved', { onStatusChange: changed }, 'After exit'));
    cy.get(item('reserved')).should('be.visible').and('contain.text', 'After exit');
    cy.get('@reuseLifecycle').its('lastCall.args.1.status').should('equal', 'visible');
  });

  it('removes an explicit root override with null and allows new overrides after partial updates', () => {
    const old = cy.stub().as('removedRoot');
    const next = cy.stub().as('newRoot');
    const ref = setup();
    notify(ref, 'clear-root', { root: { ...testRoot('item-clear-root'), className: 'old-root', onClick: old } });
    cy.get(item('clear-root')).realClick();
    cy.get('@removedRoot').should('have.been.calledOnce');
    cy.then(() => ref.current!.updateToast({ toastId: 'clear-root', root: null }));
    cy.get('.fui-ToastContainer').should('have.length', 1).and('not.have.class', 'old-root');
    cy.get(item('clear-root')).should('not.exist');
    cy.get('.fui-ToastContainer').realClick();
    cy.get('@removedRoot').should('have.been.calledOnce');
    cy.then(() =>
      ref.current!.updateToast({
        toastId: 'clear-root',
        root: { ...testRoot('item-clear-root'), className: 'new-root', onClick: next },
      }),
    );
    cy.get(item('clear-root')).should('have.class', 'new-root').realClick();
    cy.get('@newRoot').should('have.been.calledOnce');
    cy.get('@removedRoot').should('have.been.calledOnce');
  });

  it('isolates dispatch, update and dismiss events by toasterId', () => {
    const one = React.createRef<Handle>();
    const two = React.createRef<Handle>();
    mount(
      <FluentProvider theme={webLightTheme}>
        <Fixture controlsPrefix="first-" toasterId="first" position="top-start" ref={one} />
        <Fixture controlsPrefix="second-" toasterId="second" position="bottom-end" ref={two} />
      </FluentProvider>,
      { strict: false },
    );
    cy.get('#first-notify').should('be.visible');
    cy.get('#second-notify').should('be.visible');
    notify(one, 'first');
    cy.get(stack).should('have.length', 1).and('have.attr', 'data-toaster-position', 'top-start');
    notify(two, 'second');
    cy.then(() =>
      one.current!.updateToast({
        toastId: 'second',
        content: (
          <Toast>
            <ToastTitle>Wrong destination</ToastTitle>
          </Toast>
        ),
      }),
    );
    cy.get(item('second')).should('contain.text', 'Notice second');
    cy.then(() => one.current!.dismissToast('second'));
    cy.get(item('second')).should('be.visible');
    cy.then(() => one.current!.dismissAllToasts());
    cy.get(item('first')).should('not.exist');
    cy.get(item('second')).should('be.visible');
    cy.then(() => two.current!.dismissAllToasts());
    cy.get(stack).should('not.exist');
  });

  it('replaces the announcement callback and suppresses announcements while focus stays inside a stack', () => {
    const first = cy.stub().as('announceFirst');
    const next = cy.stub().as('announceNext');
    const ref = setup({ announce: first });
    cy.get('[aria-live]').should('not.exist');
    notify(ref, 'one', { intent: 'info' });
    cy.get('@announceFirst')
      .should('have.been.calledOnce')
      .its('firstCall.args.1')
      .should('deep.equal', { politeness: 'polite' });
    cy.get(action('one')).focus();
    notify(ref, 'suppressed', { intent: 'error' });
    cy.get('@announceFirst').should('have.been.calledOnce');
    cy.then(() => ref.current!.configure({ announce: next }));
    cy.get('@announceNext').should('not.have.been.called');
    cy.get('#outside').focus();
    notify(ref, 'outside', { politeness: 'polite', intent: 'error' });
    cy.get('@announceNext')
      .should(stub => {
        const calls = (stub as unknown as { args: [string, object][] }).args;
        expect(calls.filter(call => call[0].includes('Notice outside'))).to.have.length(1);
      })
      .its('lastCall.args.1')
      .should('deep.equal', { politeness: 'polite' });
    cy.get('@announceFirst').should('have.been.calledOnce');
    cy.get('[aria-live]').should('not.exist');
  });

  it('suppresses announcements across existing and newly mounted positions until focus leaves the same toaster', () => {
    const announce = cy.stub().as('crossPositionAnnounce');
    const ref = setup({ announce });
    notify(ref, 'focus-bottom', { position: 'bottom-end' });
    notify(ref, 'existing-top', { position: 'top-start' });
    cy.get('@crossPositionAnnounce').should('have.been.calledTwice');
    cy.get(action('focus-bottom')).focus();
    notify(ref, 'suppressed-existing', { position: 'top-start', intent: 'error' });
    notify(ref, 'suppressed-new', { position: 'top', intent: 'error' });
    cy.get('@crossPositionAnnounce').should('have.been.calledTwice');
    cy.get(action('existing-top')).focus();
    notify(ref, 'suppressed-transfer', { position: 'bottom-end', intent: 'error' });
    cy.get('@crossPositionAnnounce').should('have.been.calledTwice');
    cy.get('#outside').focus();
    notify(ref, 'restored-cross-position', { position: 'top', intent: 'error' });
    cy.get('@crossPositionAnnounce').should('have.been.calledThrice');
    cy.get(item('restored-cross-position')).then($toast => {
      cy.get('@crossPositionAnnounce')
        .its('lastCall.args')
        .should('deep.equal', [$toast[0].textContent, { politeness: 'assertive' }]);
    });
  });

  it('does not suppress a separate toaster instance announcer even with shared controller routing', () => {
    const first = cy.stub().as('firstInstanceAnnounce');
    const second = cy.stub().as('secondInstanceAnnounce');
    const one = React.createRef<Handle>();
    const two = React.createRef<Handle>();
    mount(
      <FluentProvider theme={webLightTheme}>
        <Fixture controlsPrefix="first-" toasterId="shared-announce" inline announce={first} ref={one} />
        <Fixture controlsPrefix="second-" toasterId="shared-announce" inline announce={second} ref={two} />
      </FluentProvider>,
      { strict: false },
    );
    cy.get('#first-notify').should('be.visible');
    cy.get('#second-notify').should('be.visible');
    cy.get('#first-outside').realHover();
    cy.then(() => one.current!.notify('shared-focused'));
    cy.get('#first-frame').find(action('shared-focused')).should('be.visible').focus();
    cy.get('@firstInstanceAnnounce').should('have.been.calledOnce');
    cy.get('@secondInstanceAnnounce').should('have.been.calledOnce');
    cy.then(() => two.current!.notify('shared-announced', { position: 'top-start', intent: 'error' }));
    cy.get('#second-frame').find(item('shared-announced')).should('be.visible');
    cy.get('@firstInstanceAnnounce').should('have.been.calledOnce');
    cy.get('@secondInstanceAnnounce').should('have.been.calledTwice');
    cy.get('@secondInstanceAnnounce').its('lastCall.args.0').should('contain', 'Notice shared-announced');
  });

  it('retains announcement suppression for a custom mount node inside a shadow tree', () => {
    cy.document().then(doc => {
      const host = doc.createElement('div');
      host.id = 'announcer-shadow-host';
      const shadow = host.attachShadow({ mode: 'open' });
      const mountNode = doc.createElement('div');
      shadow.appendChild(mountNode);
      doc.body.appendChild(host);
      ownedShadowHosts.push(host);
      const announce = cy.stub().as('shadowAnnounce');
      const ref = setup({ announce, mountNode });
      cy.then(() => ref.current!.notify('shadow-focused', { position: 'bottom-end' }));
      cy.get('#announcer-shadow-host').shadow().find(action('shadow-focused')).should('be.visible').focus();
      cy.get('#announcer-shadow-host')
        .shadow()
        .find(action('shadow-focused'))
        .should($node => {
          expect(shadow.activeElement).to.equal($node[0]);
          expect(doc.activeElement).to.equal(host);
        });
      cy.get('@shadowAnnounce').should('have.been.calledOnce');
      cy.then(() => ref.current!.notify('shadow-same-position', { position: 'bottom-end', intent: 'error' }));
      cy.get('#announcer-shadow-host').shadow().find(item('shadow-same-position')).should('be.visible');
      cy.then(() => ref.current!.notify('shadow-new-position', { position: 'top-start', intent: 'error' }));
      cy.get('#announcer-shadow-host').shadow().find(item('shadow-new-position')).should('be.visible');
      cy.get('@shadowAnnounce').should('have.been.calledOnce');
      cy.get('#outside').focus();
      cy.then(() => ref.current!.notify('shadow-restored', { position: 'top-start', intent: 'error' }));
      cy.get('#announcer-shadow-host').shadow().find(item('shadow-restored')).should('be.visible');
      cy.get('@shadowAnnounce')
        .should('have.been.calledTwice')
        .its('lastCall.args.0')
        .should('contain', 'Notice shadow-restored');
    });
  });

  for (const intent of ['info', 'success', 'warning', 'error'] as const) {
    it(`forwards ${intent} default politeness to the custom announcer`, () => {
      const announce = cy.stub().as('announce');
      const ref = setup({ announce });
      notify(ref, intent, { intent });
      cy.get('@announce').should('have.been.calledOnce').its('firstCall.args.0').should('contain', `Notice ${intent}`);
      cy.get('@announce')
        .its('firstCall.args.1')
        .should('deep.equal', { politeness: intent === 'info' ? 'polite' : 'assertive' });
    });
  }

  it('maps native class/style/ARIA overrides to each rendered position rather than an extra wrapper', () => {
    const ref = setup({ className: 'custom-toaster', 'aria-label': 'Application notices', style: { width: 333 } });
    notify(ref, 'top', { position: 'top-start' });
    notify(ref, 'bottom', { position: 'bottom-end' });
    cy.get(stack)
      .should('have.length', 2)
      .each(element => {
        cy.wrap(element)
          .should('have.class', 'custom-toaster')
          .and('have.attr', 'aria-label', 'Application notices')
          .and('have.css', 'width', '333px')
          .and('have.attr', 'role', 'list');
      });
    cy.get('[data-toaster-position="top-start"]').should(element => {
      const bounds = element[0].getBoundingClientRect();
      expect(bounds.top).to.be.closeTo(16, 1);
      expect(bounds.left).to.be.closeTo(20, 1);
    });
    cy.get('[data-toaster-position="bottom-end"]').should(element => {
      const bounds = element[0].getBoundingClientRect();
      expect(800 - bounds.bottom).to.be.closeTo(16, 1);
      expect(1000 - bounds.right).to.be.closeTo(20, 1);
    });
  });

  it('updates per-position offsets and latest keyboard handler while existing toasts remain mounted', () => {
    const first = cy.stub().as('keyboardFirst');
    const next = cy.stub().as('keyboardNext');
    const ref = setup({ onKeyDown: first, offset: { 'top-start': { horizontal: 40, vertical: 60 } } });
    notify(ref, 'live', { position: 'top-start' });
    cy.get(stack).should('have.css', 'top', '60px').and('have.css', 'left', '40px');
    cy.get(item('live')).focus().realPress('x');
    cy.get('@keyboardFirst').should('have.been.calledOnce');
    cy.then(() =>
      ref.current!.configure({
        onKeyDown: next,
        offset: { 'top-start': { horizontal: 0, vertical: 0 } },
        shortcuts: { focus: event => event.altKey && event.key === 'n' },
      }),
    );
    cy.get(stack).should('have.css', 'top', '0px').and('have.css', 'left', '0px');
    cy.get('#outside').focus().realPress(['Alt', 'n']);
    cy.get(item('live')).should('be.focused').realPress('x');
    cy.get('@keyboardNext').should('have.been.calledOnce');
    cy.get('@keyboardFirst').should('have.been.calledOnce');
    cy.realPress('Escape');
    cy.get(stack).should('not.exist');
    cy.get('@keyboardNext').should('have.been.calledTwice');
    cy.get('#outside').should('be.focused');
  });

  it('renders into a custom mountNode, keeping live regions in their original DOM location', () => {
    const ref = setup();
    cy.get('#frame').then(frame => ref.current!.configure({ mountNode: frame[0] }));
    notify(ref, 'portal');
    cy.get('#frame').find(stack).should('have.css', 'position', 'fixed');
    cy.get('#frame').find('[aria-live]').should('have.length', 2);
    cy.then(() => ref.current!.dismissToast('portal'));
    cy.get('#frame').find(stack).should('not.exist');
    cy.get('#frame').find('[aria-live]').should('have.length', 2);
  });

  it('unmounts position roots and removes controller listeners, then accepts a fresh mount', () => {
    const announce = cy.stub().as('cleanupAnnounce');
    const ref = setup({ announce });
    notify(ref, 'before');
    cy.get('@cleanupAnnounce').should('have.been.calledOnce');
    cy.then(() => ref.current!.setMounted(false));
    cy.get(stack).should('not.exist');
    cy.then(() => ref.current!.notify('unmounted'));
    cy.get(stack).should('not.exist');
    cy.get('@cleanupAnnounce').should('have.been.calledOnce');
    cy.then(() => ref.current!.setMounted(true));
    cy.get('#mount-status').should('have.text', 'mounted');
    notify(ref, 'after');
    cy.get('@cleanupAnnounce').should('have.been.calledTwice');
    cy.get(item('before')).should('not.exist');
    cy.get(item('unmounted')).should('not.exist');
  });

  it('reports actual queued, visible and unmounted lifecycle states with the public toast identity', () => {
    const changed = cy.stub().as('lifecycle');
    const ref = setup();
    notify(ref, 'lifecycle', { onStatusChange: changed });
    cy.get('@lifecycle').should(stub => {
      const calls = (stub as unknown as { args: [null, { status: string; toastId: string }][] }).args;
      expect(calls.map(call => call[1].status)).to.deep.equal(['queued', 'visible']);
      expect(calls.map(call => call[0])).to.deep.equal([null, null]);
      expect(calls.map(call => call[1].toastId)).to.deep.equal(['lifecycle', 'lifecycle']);
    });
    cy.then(() => ref.current!.dismissToast('lifecycle'));
    cy.get(item('lifecycle')).should('not.exist');
    cy.get('@lifecycle').its('lastCall.args.1.status').should('equal', 'unmounted');
    cy.get('@lifecycle').its('lastCall.args.1.toastId').should('equal', 'lifecycle');
    cy.get('@lifecycle').should(stub => {
      const calls = (stub as unknown as { args: [null, { status: string }][] }).args;
      expect(calls.map(call => call[1].status)).to.deep.equal(['queued', 'visible', 'dismissed', 'unmounted']);
    });
  });

  it('retains application pause while ordinary focused-stack pauses resume on focus leaving', () => {
    const ref = setup({ timeout: 10000 });
    notify(ref, 'application-paused');
    notify(ref, 'focus-paused');
    running('application-paused', 'running');
    running('focus-paused', 'running');
    cy.then(() => ref.current!.pauseToast('application-paused'));
    running('application-paused', 'paused');
    cy.get(action('focus-paused')).focus();
    running('focus-paused', 'paused');
    cy.get('#outside').focus();
    running('focus-paused', 'running');
    running('application-paused', 'paused');
    cy.then(() => ref.current!.playToast('application-paused'));
    running('application-paused', 'running');
  });

  it('pauses a newly dispatched timer while focus remains in another toast in the same stack', () => {
    const changed = cy.stub().as('newLifecycle');
    const ref = setup({ timeout: 10000 });
    notify(ref, 'focused');
    cy.get(action('focused')).focus();
    running('focused', 'paused');
    notify(ref, 'new', { onStatusChange: changed });
    cy.get('@newLifecycle').its('lastCall.args.1.status').should('equal', 'visible');
    cy.get(action('focused')).should('be.focused');
    running('focused', 'paused');
    running('new', 'paused');
    cy.get('#outside').focus();
    running('focused', 'running');
    running('new', 'running');
  });

  it('forwards distinct root mouse enter and leave callbacks once each with real pointer transitions', () => {
    const enter = cy.stub().as('enter');
    const leave = cy.stub().as('leave');
    const ref = setup({ pauseOnHover: true, timeout: 10000 });
    notify(ref, 'handlers', { root: { ...testRoot('item-handlers'), onMouseEnter: enter, onMouseLeave: leave } });
    running('handlers', 'running');
    cy.get(item('handlers')).realHover();
    running('handlers', 'paused');
    cy.get('@enter').should('have.been.calledOnce').its('firstCall.args.0.type').should('equal', 'mouseenter');
    cy.get('#outside').realHover();
    running('handlers', 'running');
    cy.get('@leave').should('have.been.calledOnce').its('firstCall.args.0.type').should('equal', 'mouseleave');
    cy.get('@enter').should('have.been.calledOnce');
  });

  it('retains root attributes and handlers when a partial content update omits root', () => {
    const key = cy.stub().as('rootKey');
    const ref = setup();
    notify(ref, 'partial', {
      root: {
        ...testRoot('item-partial'),
        className: 'persistent-root',
        'aria-label': 'Persistent label',
        onKeyDown: key,
      },
    });
    cy.then(() =>
      ref.current!.updateToast({
        toastId: 'partial',
        content: (
          <Toast>
            <ToastTitle>Partial content update</ToastTitle>
            <ToastBody>New content</ToastBody>
          </Toast>
        ),
      }),
    );
    cy.get(stack)
      .find('[role="listitem"]')
      .should('have.length', 1)
      .and('contain.text', 'Partial content update')
      .and('have.class', 'persistent-root')
      .and('have.attr', 'aria-label', 'Persistent label')
      .and('have.attr', 'data-testid', 'item-partial')
      .focus()
      .realPress('x');
    cy.get('@rootKey').should('have.been.calledOnce').its('firstCall.args.0.key').should('equal', 'x');
  });

  it('never promotes an individually dismissed queued notification after the visible toast leaves', () => {
    const ref = setup({ limit: 1 });
    notify(ref, 'visible-before');
    cy.then(() => ref.current!.notify('cancelled-queued'));
    cy.get(item('cancelled-queued')).should('not.exist');
    cy.then(() => ref.current!.dismissToast('cancelled-queued'));
    cy.then(() => ref.current!.dismissToast('visible-before'));
    cy.get(item('visible-before')).should('not.exist');
    cy.get(item('cancelled-queued')).should('not.exist');
    notify(ref, 'fresh-after');
    cy.get(stack).find('[role="listitem"]').should('have.length', 1);
    cy.get(item('cancelled-queued')).should('not.exist');
  });

  it('preserves real CSS animation progress across an imperative pause and play', () => {
    const ref = setup({ timeout: 10000 });
    notify(ref, 'progress');
    running('progress', 'running');
    timer('progress').then(element => {
      const animation = element[0].getAnimations()[0];
      expect(animation, 'running CSS animation exists').not.to.equal(undefined);
      const beforePause = Number(animation.currentTime);
      cy.then(() => ref.current!.pauseToast('progress'));
      running('progress', 'paused');
      cy.then(() => {
        const paused = Number(animation.currentTime);
        expect(paused).to.be.at.least(beforePause);
        return new Promise<number>(resolve => {
          const window = element[0].ownerDocument.defaultView!;
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve(paused)));
        });
      }).then(paused => {
        expect(Number(animation.currentTime)).to.be.closeTo(paused, 1);
        cy.then(() => ref.current!.playToast('progress'));
        running('progress', 'running');
        cy.then(
          () =>
            new Promise<void>(resolve => {
              const window = element[0].ownerDocument.defaultView!;
              window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
            }),
        ).then(() => expect(Number(animation.currentTime)).to.be.greaterThan(paused));
      });
    });
  });

  it('updates a negative-timeout notification to a finite real animation timeout', () => {
    const ref = setup();
    notify(ref, 'update-timeout');
    timer('update-timeout').should('not.exist');
    cy.then(() =>
      ref.current!.updateToast({
        toastId: 'update-timeout',
        timeout: 1000,
        root: testRoot('item-update-timeout'),
        content: (
          <Toast>
            <ToastTitle>This notification will close</ToastTitle>
            <ToastBody>Updated</ToastBody>
          </Toast>
        ),
      }),
    );
    cy.get(item('update-timeout')).should('contain.text', 'This notification will close');
    running('update-timeout', 'running');
    cy.get(item('update-timeout')).should('not.exist');
    cy.get(stack).should('not.exist');
  });

  it('dismisses through a native ToastTrigger action and reports each lifecycle stage exactly once', () => {
    const changed = cy.stub().as('actionLifecycle');
    const clicked = cy.stub().as('actionClick');
    const ref = setup({ shortcuts: { focus: event => event.ctrlKey && event.key === 'm' } });
    cy.then(() =>
      ref.current!.dispatchToast(
        <Toast>
          <ToastTitle
            action={
              <ToastTrigger>
                <button id="dismiss-action" onClick={clicked}>
                  Dismiss notice
                </button>
              </ToastTrigger>
            }
          >
            Action notice
          </ToastTitle>
          <ToastBody>Action body</ToastBody>
        </Toast>,
        { toastId: 'action', timeout: -1, onStatusChange: changed, root: testRoot('item-action') },
      ),
    );
    cy.get(item('action')).should('be.visible');
    cy.get('@actionLifecycle').its('lastCall.args.1.status').should('equal', 'visible');
    cy.get('#outside').focus().realPress(['Control', 'm']);
    cy.get(item('action')).should('be.focused');
    cy.realPress('Tab');
    cy.get('#dismiss-action').should('be.focused').realPress('Enter');
    cy.get(item('action')).should('not.exist');
    cy.get('@actionClick').should('have.been.calledOnce');
    cy.get('@actionLifecycle').should(stub => {
      const calls = (stub as unknown as { args: [null, { status: string }][] }).args;
      expect(calls.map(call => call[1].status)).to.deep.equal(['queued', 'visible', 'dismissed', 'unmounted']);
    });
    cy.get('#outside').should('be.focused');
  });
});

describe('Toaster accessibility, input and native boundaries', () => {
  beforeEach(() => cy.viewport(1000, 800));

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`uses native Tab to enter actions and Delete to dismiss only the focused toast in ${dir}`, () => {
      const ref = setup({ shortcuts: { focus: event => event.ctrlKey && event.key === 'm' } }, dir);
      notify(ref, 'kept');
      notify(ref, 'deleted');
      cy.get('#outside').focus().realPress(['Control', 'm']);
      cy.get(item('deleted')).should('be.focused');
      cy.realPress('Tab');
      cy.get(action('deleted')).should('be.focused');
      cy.realPress('Delete');
      cy.get(item('deleted')).should('not.exist');
      cy.get(item('kept')).should('be.visible').and('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get(action('kept')).should('be.focused');
      cy.realPress('Escape');
      cy.get(stack).should('not.exist');
      cy.get('#outside').should('be.focused');
    });
  }

  it('uses ordinary axe rules on named list/listitem compositions without disabling rules', () => {
    const ref = setup({ inline: true });
    notify(ref, 'accessible');
    cy.get('#frame')
      .then(frame => {
        return axe.run(frame[0]).then(result => {
          expect(result.violations.map(violation => violation.id)).to.deep.equal(['aria-hidden-focus']);
          expect(result.violations[0].nodes).to.have.length(4);
          for (const node of result.violations[0].nodes) {
            const sentinel = frame[0].ownerDocument.querySelector(node.target[0] as string);
            expect(sentinel?.matches('i[data-tabster-dummy][aria-hidden="true"][tabindex="0"]')).to.equal(true);
          }
          return axe.run({
            include: [frame[0]],
            exclude: ['i[data-tabster-dummy][aria-hidden="true"][tabindex="0"]'],
          });
        });
      })
      .then((result: axe.AxeResults) => {
        expect(result.violations.map(violation => violation.id)).to.deep.equal([]);
      });
  });

  it('removes finite-timeout notifications while retaining negative-timeout notifications', () => {
    const ref = setup();
    notify(ref, 'persistent');
    timer('persistent').should('not.exist');
    notify(ref, 'finite', { timeout: 1000 });
    running('finite', 'running');
    cy.get(item('finite')).should('not.exist');
    cy.get(item('persistent')).should('be.visible');
    cy.then(() => ref.current!.dismissAllToasts());
    cy.get(stack).should('not.exist');
  });

  it('pauses all visible timers while focus is in the toaster and resumes after focus leaves', () => {
    const ref = setup({ timeout: 10000, shortcuts: { focus: event => event.ctrlKey && event.key === 'm' } });
    notify(ref, 'one');
    notify(ref, 'two');
    running('one', 'running');
    running('two', 'running');
    cy.get('#outside').focus().realPress(['Control', 'm']);
    cy.get(item('two')).should('be.focused');
    running('one', 'paused');
    running('two', 'paused');
    cy.realPress('ArrowUp');
    cy.get(item('one')).should('be.focused');
    running('one', 'paused');
    running('two', 'paused');
    cy.get('#outside').focus();
    running('one', 'running');
    running('two', 'running');
  });

  for (const pauseOnHover of [false, true]) {
    it(`honors pauseOnHover=${pauseOnHover} using real mouse movement`, () => {
      const ref = setup({ pauseOnHover, timeout: 10000 });
      notify(ref, 'hover');
      running('hover', 'running');
      cy.get(item('hover')).realHover();
      running('hover', pauseOnHover ? 'paused' : 'running');
      cy.get('#outside').realHover();
      running('hover', 'running');
    });
  }

  for (const pauseOnWindowBlur of [false, true]) {
    it(`honors pauseOnWindowBlur=${pauseOnWindowBlur} at the window-event integration boundary`, () => {
      const ref = setup({ pauseOnWindowBlur, timeout: 10000 });
      notify(ref, 'blur');
      running('blur', 'running');
      cy.window().trigger('blur');
      running('blur', pauseOnWindowBlur ? 'paused' : 'running');
      cy.window().trigger('focus');
      running('blur', 'running');
    });
  }

  it('supports imperative pause and play without resetting timeout duration', () => {
    const ref = setup({ timeout: 10000 });
    notify(ref, 'pause');
    running('pause', 'running');
    cy.then(() => ref.current!.pauseToast('pause'));
    running('pause', 'paused');
    cy.get(item('pause')).realHover();
    cy.get('#outside').realHover();
    running('pause', 'paused');
    cy.then(() => ref.current!.playToast('pause'));
    running('pause', 'running');
    timer('pause').should('have.css', 'animation-duration', '10s');
  });

  it('dismissAll clears queued notifications as well as visible notifications, and accepts a fresh dispatch', () => {
    const ref = setup({ limit: 1 });
    notify(ref, 'visible');
    cy.then(() => ref.current!.notify('queued'));
    cy.get(item('queued')).should('not.exist');
    cy.then(() => ref.current!.dismissAllToasts());
    cy.get(stack).should('not.exist');
    cy.get(item('queued')).should('not.exist');
    notify(ref, 'fresh');
    cy.get(stack).find('[role="listitem"]').should('have.length', 1);
    cy.get(item('queued')).should('not.exist');
  });

  it('makes nonexistent toast update, pause, play, and dismissal harmless while preserving a visible positive control', () => {
    const ref = setup();
    notify(ref, 'present');
    cy.then(() => {
      ref.current!.updateToast({
        toastId: 'missing',
        content: (
          <Toast>
            <ToastTitle>Missing</ToastTitle>
          </Toast>
        ),
      });
      ref.current!.pauseToast('missing');
      ref.current!.playToast('missing');
      ref.current!.dismissToast('missing');
    });
    cy.get(item('present')).should('be.visible');
    cy.get(stack).find('[role="listitem"]').should('have.length', 1);
    cy.then(() => ref.current!.dismissToast('present'));
    cy.get(stack).should('not.exist');
  });

  it('keeps top stacks newest-first and bottom stacks oldest-first', () => {
    const ref = setup();
    for (const position of ['top-start', 'bottom-end'] as const) {
      notify(ref, `${position}-older`, { position });
      notify(ref, `${position}-newer`, { position });
      cy.get(`[data-toaster-position="${position}"]`)
        .find('[role="listitem"]')
        .should(items => {
          expect(items.toArray().map(element => element.getAttribute('data-testid'))).to.deep.equal(
            position === 'top-start'
              ? ['item-top-start-newer', 'item-top-start-older']
              : ['item-bottom-end-older', 'item-bottom-end-newer'],
          );
        });
    }
  });
});

describe('Toaster documented browser contracts', () => {
  beforeEach(() => cy.viewport(1000, 800));

  it('renders live regions without empty position containers, then dispatches a named listitem through the public controller', () => {
    setup();
    cy.get(stack).should('not.exist');
    cy.get('[aria-live="polite"]').should('have.text', '');
    cy.get('[aria-live="assertive"]').should('have.text', '');
    cy.get('#notify').click();
    cy.get(stack)
      .should('have.length', 1)
      .and('have.attr', 'role', 'list')
      .and('have.attr', 'data-toaster-position', 'bottom-end')
      .and('have.css', 'position', 'fixed')
      .and('have.css', 'width', '292px')
      .and('have.css', 'pointer-events', 'none');
    cy.get(item('native-1'))
      .should('have.attr', 'role', 'listitem')
      .and('have.attr', 'tabindex', '0')
      .and('have.css', 'pointer-events', 'all')
      .then(element => {
        expect(computeAccessibleName(element[0])).to.equal('Notice native-1');
      });
    cy.get('#notify').should('be.focused');
    cy.get('[aria-live="polite"]').should('contain.text', 'Notice native-1');
  });

  for (const position of positions) {
    for (const dir of ['ltr', 'rtl'] as const) {
      it(`positions ${position} in ${dir} using logical edges and documented default offsets`, () => {
        const ref = setup({ position }, dir);
        notify(ref, 'position');
        cy.get(stack)
          .should('have.attr', 'data-toaster-position', position)
          .should(element => {
            const bounds = element[0].getBoundingClientRect();
            expect(bounds.width).to.be.closeTo(292, 1);
            expect(position.startsWith('top') ? bounds.top : 800 - bounds.bottom).to.be.closeTo(16, 1);
            const expectedLeft: Record<ToastPosition, number> = {
              top: 354,
              bottom: 354,
              'top-start': dir === 'ltr' ? 20 : 688,
              'bottom-start': dir === 'ltr' ? 20 : 688,
              'top-end': dir === 'ltr' ? 688 : 20,
              'bottom-end': dir === 'ltr' ? 688 : 20,
            };
            expect(bounds.left).to.be.closeTo(expectedLeft[position], 1);
          });
      });
    }
  }

  it('keeps an inline stack inside the positioned consumer frame', () => {
    const ref = setup({ inline: true, position: 'bottom', offset: { horizontal: 15, vertical: 25 } });
    notify(ref, 'inline');
    cy.get('#frame').find(stack).should('have.css', 'position', 'absolute');
    cy.get('#frame').then(frame => {
      cy.get(stack).should(element => {
        const bounds = element[0].getBoundingClientRect();
        const parent = frame[0].getBoundingClientRect();
        expect(parent.bottom - bounds.bottom).to.be.closeTo(25, 1);
        expect(bounds.left + bounds.width / 2 - parent.left).to.be.closeTo(parent.width / 2 + 15, 1);
      });
    });
  });

  it('queues excess notifications and promotes lower numeric priorities first as specified by state unit tests', () => {
    const ref = setup({ limit: 1 });
    notify(ref, 'first');
    cy.then(() => {
      ref.current!.notify('low', { priority: 10 });
      ref.current!.notify('high', { priority: 1 });
    });
    cy.get(item('first')).should('be.visible');
    cy.get(item('low')).should('not.exist');
    cy.get(item('high')).should('not.exist');
    cy.then(() => ref.current!.dismissToast('first'));
    cy.get(item('first')).should('not.exist');
    cy.get(item('high')).should('be.visible');
    cy.get(item('low')).should('not.exist');
    cy.then(() => ref.current!.dismissToast('high'));
    cy.get(item('high')).should('not.exist');
    cy.get(item('low')).should('be.visible');
  });

  it('lets per-dispatch position and timeout override toaster defaults', () => {
    const ref = setup({ position: 'top-end', timeout: 10000 });
    notify(ref, 'override', { position: 'bottom-start', timeout: -1 });
    cy.get(stack).should('have.attr', 'data-toaster-position', 'bottom-start');
    timer('override').should('not.exist');
    notify(ref, 'default');
    cy.get('[data-toaster-position="top-end"]').find(item('default')).should('be.visible');
    timer('default').should('have.css', 'animation-duration', '10s');
  });

  it('focuses the most recent visible notification by a native shortcut, navigates with arrows, and dismisses with Escape', () => {
    const ref = setup({ shortcuts: { focus: event => event.ctrlKey && event.key === 'm' } });
    notify(ref, 'older');
    notify(ref, 'newer');
    cy.get('#outside').focus().realPress(['Control', 'm']);
    cy.get(item('newer')).should('be.focused');
    cy.realPress('ArrowUp');
    cy.get(item('older')).should('be.focused');
    cy.realPress('ArrowUp');
    cy.get(item('newer')).should('be.focused');
    cy.realPress('ArrowDown');
    cy.get(item('older')).should('be.focused');
    cy.realPress('Escape');
    cy.get(stack).should('not.exist');
    cy.get('#outside').should('be.focused');
  });

  it('updates content through the public API without duplicating an existing toast id', () => {
    const ref = setup();
    notify(ref, 'update');
    cy.then(() =>
      ref.current!.updateToast({
        toastId: 'update',
        content: (
          <Toast>
            <ToastTitle>Updated notice</ToastTitle>
            <ToastBody>Updated body</ToastBody>
          </Toast>
        ),
        intent: 'success',
        root: testRoot('item-update'),
      }),
    );
    cy.get(item('update'))
      .should('have.length', 1)
      .and('contain.text', 'Updated notice')
      .and('contain.text', 'Updated body');
    cy.get('[aria-live="assertive"]').should('contain.text', 'Updated notice');
    cy.then(() => ref.current!.notify('update', {}, 'Duplicate must not replace'));
    cy.get(item('update'))
      .should('have.length', 1)
      .and('contain.text', 'Updated notice')
      .and('not.contain.text', 'Duplicate must not replace');
  });
});
