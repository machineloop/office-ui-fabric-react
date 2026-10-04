import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { Field } from '@fluentui/react-field';
import { webLightTheme, webDarkTheme } from '@fluentui/react-theme';
import { createMotionComponent, motionTokens } from '@fluentui/react-motion';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { useIsomorphicLayoutEffect } from '@fluentui/react-utilities';
import { ProgressBar } from './ProgressBar';
import type { ProgressBarProps, ProgressBarSlots } from './ProgressBar.types';
import { progressBarClassNames } from './useProgressBarStyles.styles';
import { useOverrides } from './ProgressBar.cy.styles';

const root = '[data-testid="progress"]';
const bar = `.${progressBarClassNames.bar}`;
const width = 400;

function media(reducedMotion = false, forcedColors = false) {
  return cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: {
        features: [
          { name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' },
          { name: 'forced-colors', value: forcedColors ? 'active' : 'none' },
        ],
      },
    }),
  );
}

const cleanups: (() => void)[] = [];

beforeEach(() => media());
afterEach(() => {
  while (cleanups.length) {
    cleanups.pop()!();
  }
  return cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [] },
    }),
  );
});

function nextFrames(element: HTMLElement, count: number) {
  return new Cypress.Promise<void>(resolve => {
    const win = element.ownerDocument.defaultView!;
    const frame = () => {
      if (--count === 0) {
        resolve();
      } else {
        win.requestAnimationFrame(frame);
      }
    };
    win.requestAnimationFrame(frame);
  });
}

function render(props: ProgressBarProps = {}, dir: 'ltr' | 'rtl' = 'ltr') {
  return mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      <div style={{ width }}>
        <ProgressBar data-testid="progress" aria-label="Loading project files" {...props} />
      </div>
    </FluentProvider>,
  );
}

function geometry(fraction: number, dir: 'ltr' | 'rtl' = 'ltr') {
  cy.get(root).should($root => {
    const track = $root[0].getBoundingClientRect();
    const fill = $root.find(bar)[0].getBoundingClientRect();
    expect(track.width, 'positive control: track width').to.equal(width);
    expect(fill.width, 'actual filled width').to.be.closeTo(width * fraction, 0.1);
    expect(dir === 'ltr' ? fill.left : fill.right, 'fill starts at logical start').to.be.closeTo(
      dir === 'ltr' ? track.left : track.right,
      0.1,
    );
    expect(fill.height).to.equal(track.height);
  });
}

describe('ProgressBar edges and accessibility', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    it(`anchors fractional determinate fill at ${dir} logical start`, () => {
      render({ value: 0.25, max: 0.5 }, dir);
      range(0.25, 0.5, dir);
    });

    it(`characterizes current indeterminate ${dir} left-to-right motion on a real advancing timeline`, () => {
      render({}, dir);
      cy.get(root)
        .find(bar)
        .then($bar => {
          const element = $bar[0];
          const win = element.ownerDocument.defaultView!;
          expect(win.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(false);
          const animations = element.getAnimations();
          expect(animations).to.have.length(1);
          const animation = animations[0];
          expect(animation.playState).to.equal('running');
          expect(animation.effect?.getTiming()).to.include({ duration: 3000, iterations: Infinity });
          expect(animation.effect?.getTiming().easing?.replace(/\s/g, '')).to.equal(motionTokens.curveLinear);
          return animation.ready.then(() => {
            const initialTime = Number(animation.currentTime);
            const initialX = element.getBoundingClientRect().x;
            return nextFrames(element, 8).then(() => {
              expect(Number(animation.currentTime), 'native timeline advances').to.be.greaterThan(initialTime);
              const currentX = element.getBoundingClientRect().x;
              // The inherited motion does not reverse in RTL; see ProgressBar.cy.md.
              expect(currentX, 'current left-to-right travel in either direction').to.be.greaterThan(initialX);
              expect(element.getBoundingClientRect().width).to.be.closeTo(width * 0.33, 0.1);
            });
          });
        });
    });
  }

  it('computes consumer-owned accessible name and description without inventing live announcements', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <h2 id="operation">Loading project files</h2>
        <p id="details">Three files remaining</p>
        <ProgressBar data-testid="progress" value={0.5} aria-labelledby="operation" aria-describedby="details" />
        <div role="status" aria-live="polite">
          Consumer reports download progress
        </div>
      </FluentProvider>,
    );
    cy.get(root).should($root => {
      expect(computeAccessibleName($root[0])).to.equal('Loading project files');
      expect(computeAccessibleDescription($root[0])).to.equal('Three files remaining');
      expect($root).not.to.have.attr('aria-live');
      expect($root).not.to.have.attr('aria-busy');
      expect($root.find('[role="status"], [role="alert"]')).to.have.length(0);
    });
    cy.get('[role="status"]').should('have.length', 1).and('have.text', 'Consumer reports download progress');
  });

  it('preserves explicit aria-label and aria-valuetext with a fractional range', () => {
    render({ value: 0.375, 'aria-label': 'Processing uploaded records', 'aria-valuetext': 'Three of eight records' });
    range(0.375);
    cy.get(root).should($root => {
      expect(computeAccessibleName($root[0])).to.equal('Processing uploaded records');
      expect($root).to.have.attr('aria-valuetext', 'Three of eight records');
    });
  });

  it('keeps multiple Field label and description relationships instance-local', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <p id="extra">External details</p>
        <Field label="First operation" hint="First hint" validationMessage="First message" validationState="none">
          <ProgressBar data-testid="first" aria-describedby="extra" value={0.25} />
        </Field>
        <Field label="Second operation" hint="Second hint" validationState="none">
          <ProgressBar data-testid="second" />
        </Field>
        <ProgressBar data-testid="outside" aria-label="Independent operation" value={1} />
      </FluentProvider>,
    );
    cy.get('[data-testid="first"]').should($root => {
      expect(computeAccessibleName($root[0])).to.equal('First operation');
      expect(computeAccessibleDescription($root[0])).to.equal('First message First hint External details');
    });
    cy.get('[data-testid="second"]').should($root => {
      expect(computeAccessibleName($root[0])).to.equal('Second operation');
      expect(computeAccessibleDescription($root[0])).to.equal('Second hint');
    });
    cy.get('[data-testid="outside"]').should($root => {
      expect(computeAccessibleName($root[0])).to.equal('Independent operation');
      expect($root).not.to.have.attr('aria-labelledby');
      expect($root).not.to.have.attr('aria-describedby');
    });
  });

  it('lets an explicit labelledby override Field naming while retaining Field descriptions', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <span id="explicit-label">Explicit operation name</span>
        <Field label="Field name" hint="Helpful hint" validationState="none">
          <ProgressBar data-testid="progress" aria-labelledby="explicit-label" value={0.5} />
        </Field>
      </FluentProvider>,
    );
    cy.get(root).should($root => {
      expect(computeAccessibleName($root[0])).to.equal('Explicit operation name');
      expect(computeAccessibleDescription($root[0])).to.equal('Helpful hint');
    });
  });

  it('skips passive progress during real Tab navigation and pointer clicks do not change values', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <button>Before progress</button>
        <ProgressBar data-testid="progress" value={0.5} style={{ height: 20 }} />
        <button>After progress</button>
      </FluentProvider>,
    );
    cy.contains('button', 'Before progress').realClick();
    cy.realPress('Tab');
    cy.contains('button', 'After progress').should('be.focused');
    cy.get(root).realClick();
    cy.get(root).should('have.attr', 'aria-valuenow', '0.5').and('not.have.attr', 'tabindex');
  });

  it('preserves native props root and bar refs classes styles and latest bubbling handlers', () => {
    const rootRef = cy.stub().as('rootRef');
    const barRef = cy.stub().as('barRef');
    const rootClick = cy.stub().as('rootClick');
    const barClick = cy.stub().as('barClick');
    const Fixture = () => {
      const [value, setValue] = React.useState(0.25);
      return (
        <FluentProvider theme={webLightTheme}>
          <button onClick={() => setValue(0.75)}>Update value</button>
          <ProgressBar
            data-testid="progress"
            ref={rootRef}
            value={value}
            id="native-progress"
            title="Download progress"
            className="consumer-root"
            tabIndex={0}
            style={{ width, height: 20 }}
            onClick={() => rootClick(value)}
            bar={{ ref: barRef, className: 'consumer-bar', style: { height: 20 }, onClick: () => barClick(value) }}
          />
        </FluentProvider>
      );
    };
    mount(<Fixture />);
    cy.get(root).should('have.id', 'native-progress').and('have.attr', 'title', 'Download progress');
    cy.get(root).should('have.class', progressBarClassNames.root).and('have.class', 'consumer-root');
    cy.get(root).then($root => {
      expect(rootRef).to.have.been.calledWith($root[0]);
      expect(barRef).to.have.been.calledWith($root.find(bar)[0]);
    });
    cy.get(root).find(bar).realClick();
    cy.get('@barClick').should('have.been.calledOnceWith', 0.25);
    cy.get('@rootClick').should('have.been.calledOnceWith', 0.25);
    cy.contains('button', 'Update value').realClick();
    cy.get(root).should('have.attr', 'aria-valuenow', '0.75');
    cy.get(root).find(bar).realClick();
    cy.get('@barClick').should('have.been.calledWith', 0.75);
    cy.get('@rootClick').should('have.been.calledWith', 0.75);
    cy.get(root).focus().should('be.focused');
  });

  it('renders root and bar functions with resolved slot props and children', () => {
    const renderRoot: SlotRenderFunction<ExtractSlotProps<ProgressBarSlots['root']>> = (_, props) => (
      <div {...props} data-rendered-root="yes">
        {props.children}
        <span>Consumer content</span>
      </div>
    );
    const renderBar: SlotRenderFunction<ExtractSlotProps<ProgressBarSlots['bar']>> = (_, props) => (
      <div {...props} data-rendered-bar="yes">
        <span>Fill content</span>
      </div>
    );
    render({
      value: 0.5,
      children: renderRoot,
      bar: { children: renderBar },
    });
    range(0.5);
    cy.get(root).should('have.attr', 'data-rendered-root', 'yes').and('contain.text', 'Consumer content');
    cy.get(root).find(bar).should('have.attr', 'data-rendered-bar', 'yes').and('have.text', 'Fill content');
  });

  it('updates determinate to indeterminate to complete without stale ranges or motion', () => {
    const Fixture = () => {
      const [value, setValue] = React.useState<number | undefined>(0);
      return (
        <FluentProvider theme={webLightTheme}>
          <button onClick={() => setValue(0.5)}>Half complete</button>
          <button onClick={() => setValue(undefined)}>Unknown total</button>
          <button onClick={() => setValue(1)}>Complete</button>
          <div style={{ width }}>
            <ProgressBar data-testid="progress" value={value} aria-label="Loading project files" />
          </div>
        </FluentProvider>
      );
    };
    mount(<Fixture />);
    range(0);
    cy.contains('button', 'Half complete').realClick();
    range(0.5);
    cy.contains('button', 'Unknown total').realClick();
    indeterminate();
    cy.get(root)
      .find(bar)
      .should($bar => {
        expect($bar[0].style.width).to.equal('');
        expect($bar[0].getAnimations()).to.have.length(1);
      });
    cy.contains('button', 'Complete').realClick();
    range(1);
    cy.get(root)
      .find(bar)
      .should($bar => expect($bar[0].getAnimations()).to.have.length(0));
    cy.get(root).should('not.have.attr', 'aria-live');
    cy.get('[role="status"], [role="alert"]').should('not.exist');
  });

  it('changes max dynamically while preserving the actual value and percentage', () => {
    const Fixture = () => {
      const [max, setMax] = React.useState(4);
      return (
        <FluentProvider theme={webLightTheme}>
          <button onClick={() => setMax(8)}>Increase total</button>
          <div style={{ width }}>
            <ProgressBar data-testid="progress" value={2} max={max} />
          </div>
        </FluentProvider>
      );
    };
    mount(<Fixture />);
    range(2, 4);
    cy.contains('button', 'Increase total').realClick();
    range(2, 8);
  });

  it('pulses opacity at full width under real reduced-motion media without translation', () => {
    media(true);
    render();
    cy.get(root)
      .find(bar)
      .then($bar => nextFrames($bar[0], 8));
    cy.get(root)
      .find(bar)
      .then($bar => {
        const element = $bar[0];
        const win = element.ownerDocument.defaultView!;
        expect(win.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(true);
        const animation = element.getAnimations()[0];
        expect(animation).not.to.equal(undefined);
        expect(animation.playState).to.equal('running');
        expect(animation.effect?.getTiming()).to.include({ duration: 3000, iterations: Infinity });
        const frames = (animation.effect as KeyframeEffect).getKeyframes();
        expect(frames.map(frame => Number(frame.opacity))).to.deep.equal([0.2, 1, 0.2]);
        return animation.ready.then(() => {
          const initialTime = Number(animation.currentTime);
          const initialOpacity = Number(win.getComputedStyle(element).opacity);
          const initialRect = element.getBoundingClientRect();
          expect(initialRect.width).to.equal(width);
          return nextFrames(element, 8).then(() => {
            expect(Number(animation.currentTime)).to.be.greaterThan(initialTime);
            expect(Number(win.getComputedStyle(element).opacity)).not.to.equal(initialOpacity);
            expect(element.getBoundingClientRect().x).to.equal(initialRect.x);
            expect(element.getBoundingClientRect().width).to.equal(width);
          });
        });
      });
    indeterminate();
  });

  it('uses real forced-colors CanvasText and Highlight while preserving determinate geometry', () => {
    media(false, true);
    mount(
      <FluentProvider theme={webLightTheme}>
        <div style={{ width }}>
          <ProgressBar data-testid="progress" value={0.5} color="error" />
        </div>
        <span data-testid="canvas-text" style={{ backgroundColor: 'CanvasText' }} />
        <span data-testid="highlight" style={{ backgroundColor: 'Highlight' }} />
      </FluentProvider>,
    );
    cy.get(root).then($root =>
      expect($root[0].ownerDocument.defaultView!.matchMedia('(forced-colors: active)').matches).to.equal(true),
    );
    cy.get('[data-testid="canvas-text"]').then($control =>
      cy.get(root).should('have.css', 'background-color', $control.css('background-color')),
    );
    cy.get('[data-testid="highlight"]').then($control =>
      cy.get(root).find(bar).should('have.css', 'background-color', $control.css('background-color')),
    );
    range(0.5);
  });
});

function range(value: number, max = 1, dir: 'ltr' | 'rtl' = 'ltr') {
  cy.get(root)
    .should('have.attr', 'role', 'progressbar')
    .and('have.attr', 'aria-valuenow', String(value))
    .and('have.attr', 'aria-valuemin', '0')
    .and('have.attr', 'aria-valuemax', String(max));
  geometry(value / max, dir);
}

function indeterminate() {
  cy.get(root).should($root => {
    expect($root).to.have.attr('role', 'progressbar');
    for (const attribute of ['aria-valuenow', 'aria-valuemin', 'aria-valuemax']) {
      expect($root).not.to.have.attr(attribute);
    }
  });
}

describe('ProgressBar unit and source regressions', () => {
  const boundaries = [
    {
      name: 'negative max',
      value: 0.5,
      max: -1,
      current: 0.5,
      effectiveMax: 1,
      error: "The prop 'max' must be greater than 0. Received max: -1",
    },
    {
      name: 'zero max is invalid and falls back to one',
      value: 0.5,
      max: 0,
      current: 0.5,
      effectiveMax: 1,
      error: "The prop 'max' must be greater than 0. Received max: 0",
    },
    {
      name: 'negative value',
      value: -5,
      max: 3,
      current: 0,
      effectiveMax: 3,
      error: "The prop 'value' must be greater than or equal to zero. Received value: -5",
    },
    {
      name: 'value above max',
      value: 23,
      max: 10,
      current: 10,
      effectiveMax: 10,
      error: "The prop 'value' must be less than or equal to 'max'. Received value: 23, max: 10",
    },
  ];
  for (const boundary of boundaries) {
    it(`clamps ${boundary.name} and exposes the development diagnostic`, () => {
      cy.window().then(win => cy.spy(win.console, 'error').as('diagnostic'));
      render({ value: boundary.value, max: boundary.max });
      range(boundary.current, boundary.effectiveMax);
      cy.get('@diagnostic').should('have.been.calledWith', boundary.error);
    });
  }

  it('does not diagnose supported zero fractional and complete values', () => {
    cy.window().then(win => cy.spy(win.console, 'error').as('diagnostic'));
    mount(
      <FluentProvider theme={webLightTheme}>
        {[0, 0.001, 0.5, 1].map(value => (
          <ProgressBar key={value} value={value} />
        ))}
      </FluentProvider>,
    );
    cy.get('[role="progressbar"]').should('have.length', 4);
    cy.get('@diagnostic').should('not.have.been.called');
  });

  for (const value of [0, 0.009, 0.01, 0.011]) {
    it(`uses the absolute value transition threshold at ${value} with custom max`, () => {
      render({ value, max: 42 });
      range(value, 42);
      cy.get(root)
        .find(bar)
        .should('have.css', 'transition-duration', value > 0.01 ? '0.3s' : '0s');
      if (value > 0.01) {
        cy.get(root).find(bar).should('have.css', 'transition-property', 'width');
      }
    });
  }

  const fieldColors = {
    none: webLightTheme.colorCompoundBrandBackground,
    error: webLightTheme.colorPaletteRedBackground3,
    warning: webLightTheme.colorPaletteDarkOrangeBackground3,
    success: webLightTheme.colorPaletteGreenBackground3,
  };
  for (const validationState of ['none', 'error', 'warning', 'success'] as const) {
    it(`inherits the existing Field ${validationState} color and respects explicit brand override`, () => {
      mount(
        <FluentProvider theme={webLightTheme}>
          <Field label="Inherited progress" validationState={validationState}>
            <ProgressBar data-testid="inherited" value={0.5} />
          </Field>
          <Field label="Explicit progress" validationState={validationState}>
            <ProgressBar data-testid="explicit" value={0.5} color="brand" />
          </Field>
          <span data-testid="inherited-token" style={{ backgroundColor: fieldColors[validationState] }} />
          <span data-testid="brand-token" style={{ backgroundColor: webLightTheme.colorCompoundBrandBackground }} />
        </FluentProvider>,
      );
      cy.get('[data-testid="inherited-token"]').then($control =>
        cy
          .get(`[data-testid="inherited"] ${bar}`)
          .should('have.css', 'background-color', $control.css('background-color')),
      );
      cy.get('[data-testid="brand-token"]').then($control =>
        cy
          .get(`[data-testid="explicit"] ${bar}`)
          .should('have.css', 'background-color', $control.css('background-color')),
      );
    });
  }

  for (const color of ['error', 'warning', 'success'] as const) {
    it(`keeps indeterminate ${color} brand-colored instead of implying a determinate status`, () => {
      mount(
        <FluentProvider theme={webLightTheme}>
          <ProgressBar data-testid="progress" color={color} />
          <span data-testid="brand-token" style={{ backgroundColor: webLightTheme.colorCompoundBrandBackground }} />
        </FluentProvider>,
      );
      indeterminate();
      cy.get('[data-testid="brand-token"]').then($control =>
        cy.get(root).find(bar).should('have.css', 'background-color', $control.css('background-color')),
      );
    });
  }

  it('keeps completion brand-colored and creates no completion announcements by default', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <div style={{ width }}>
          <ProgressBar data-testid="progress" value={1} />
        </div>
        <span data-testid="brand-token" style={{ backgroundColor: webLightTheme.colorCompoundBrandBackground }} />
      </FluentProvider>,
    );
    range(1);
    cy.get(root).should('not.have.attr', 'aria-live');
    cy.get('[role="status"], [role="alert"]').should('not.exist');
    cy.get('[data-testid="brand-token"]').then($control =>
      cy.get(root).find(bar).should('have.css', 'background-color', $control.css('background-color')),
    );
  });

  it('lets consumer classes and bar inline width override defaults without rewriting semantic values', () => {
    const Overrides = () => {
      const styles = useOverrides();
      return (
        <FluentProvider theme={webLightTheme}>
          <div style={{ width }}>
            <ProgressBar
              data-testid="progress"
              value={0.25}
              className={styles.root}
              bar={{ className: styles.bar, style: { width: '75%' } }}
            />
          </div>
          <span data-testid="root-token" style={{ backgroundColor: webLightTheme.colorNeutralBackground1 }} />
          <span data-testid="bar-token" style={{ backgroundColor: webLightTheme.colorPalettePurpleBackground2 }} />
          <ProgressBar data-testid="control" value={0.25} />
        </FluentProvider>
      );
    };
    mount(<Overrides />);
    cy.get(root).should('have.attr', 'aria-valuenow', '0.25').and('have.css', 'height', webLightTheme.spacingVerticalL);
    geometry(0.75);
    cy.get('[data-testid="root-token"]').then($control =>
      cy.get(root).should('have.css', 'background-color', $control.css('background-color')),
    );
    cy.get('[data-testid="bar-token"]').then($control =>
      cy.get(root).find(bar).should('have.css', 'background-color', $control.css('background-color')),
    );
    cy.get('[data-testid="control"]').should('have.css', 'height', '2px');
  });

  it('preserves explicit native role range attributes and value text as consumer overrides', () => {
    render({
      value: 0.5,
      role: 'meter',
      'aria-valuenow': 25,
      'aria-valuemin': 10,
      'aria-valuemax': 50,
      'aria-valuetext': 'Consumer scale',
    });
    cy.get(root).should('have.attr', 'role', 'meter').and('have.attr', 'aria-valuenow', '25');
    cy.get(root).should('have.attr', 'aria-valuemin', '10').and('have.attr', 'aria-valuemax', '50');
    cy.get(root).should('have.attr', 'aria-valuetext', 'Consumer scale');
    geometry(0.5);
  });

  it('observes a real intermediate width transition and natural completion before an immediate reset', () => {
    let animations: Animation[] = [];
    let duration: ReturnType<AnimationEffect['getTiming']>['duration'];
    let transitionRun: Promise<TransitionEvent>;
    let element: HTMLDivElement;
    const Fixture = () => {
      const [value, setValue] = React.useState(0.25);
      const barRef = React.useRef<HTMLDivElement>(null);
      useIsomorphicLayoutEffect(() => {
        if (value === 0.75) {
          // Capture at the real React commit, before a delayed event/frame can reach the endpoint.
          animations = barRef.current!.getAnimations();
          animations.forEach(animation => animation.pause());
          const measuredDuration = animations[0]?.effect?.getTiming().duration;
          duration = measuredDuration;
          if (typeof measuredDuration === 'number' && Number.isFinite(measuredDuration) && measuredDuration > 0) {
            animations.forEach(animation => {
              animation.currentTime = measuredDuration / 2;
            });
          }
        }
      }, [value]);
      return (
        <FluentProvider theme={webLightTheme}>
          <button onClick={() => setValue(0.75)}>Advance</button>
          <button onClick={() => setValue(0)}>Reset</button>
          <div style={{ width }}>
            <ProgressBar data-testid="progress" value={value} bar={{ ref: barRef }} />
          </div>
        </FluentProvider>
      );
    };
    mount(<Fixture />);
    range(0.25);
    cy.get(root)
      .find(bar)
      .then($bar => {
        element = $bar[0] as HTMLDivElement;
        expect(element.getAnimations(), 'no transition before the state update').to.have.length(0);
        transitionRun = new Promise(resolve => {
          const onRun = (event: TransitionEvent) => {
            if (event.target === element && event.propertyName === 'width') {
              resolve(event);
            }
          };
          element.addEventListener('transitionrun', onRun);
          cleanups.push(() => {
            element.removeEventListener('transitionrun', onRun);
            animations.forEach(animation => animation.cancel());
          });
        });
      });
    cy.contains('button', 'Advance').realClick();
    cy.then(() => transitionRun).then(event => {
      expect(event.elapsedTime, 'native width transition started').to.equal(0);
      expect(animations, 'all native animations on the bar').to.have.length(1);
      expect((animations[0] as CSSTransition).transitionProperty).to.equal('width');
      expect((animations[0].effect as KeyframeEffect).target, 'owned transition effect').to.equal(element);
      expect(duration, 'independent production duration contract').to.equal(300);
      return Promise.all(animations.map(animation => animation.ready));
    });
    cy.then(() => {
      expect(animations[0].playState).to.equal('paused');
      expect(animations[0].currentTime, 'measured interior timestamp').to.equal(Number(duration) / 2);
      const intermediate = element.getBoundingClientRect().width;
      expect(intermediate, 'actual visible intermediate fill').to.be.greaterThan(width * 0.25);
      expect(intermediate).to.be.lessThan(width * 0.75);
      animations.forEach(animation => animation.play());
      return Promise.all(animations.map(animation => animation.finished));
    });
    cy.then(() => {
      expect(animations.every(animation => animation.playState === 'finished')).to.equal(true);
      expect(element.getBoundingClientRect().width, 'naturally completed endpoint').to.equal(width * 0.75);
    });
    range(0.75);
    cy.contains('button', 'Reset').realClick();
    cy.get(root)
      .find(bar)
      .then($bar => {
        expect($bar[0].getBoundingClientRect().width).to.equal(0);
        expect($bar[0].getAnimations()).to.have.length(0);
      });
    range(0);
  });

  it('cancels motion and detaches both refs on removal then starts fresh on remount', () => {
    const rootRef = cy.stub().as('rootRef');
    const barRef = cy.stub().as('barRef');
    const Fixture = () => {
      const [shown, setShown] = React.useState(true);
      return (
        <FluentProvider theme={webLightTheme}>
          <button onClick={() => setShown(value => !value)}>Toggle progress</button>
          {shown && <ProgressBar data-testid="progress" ref={rootRef} bar={{ ref: barRef }} />}
        </FluentProvider>
      );
    };
    mount(<Fixture />);
    let oldAnimation: Animation;
    let oldRoot: HTMLElement;
    cy.get(root).then($root => {
      oldRoot = $root[0];
      oldAnimation = $root.find(bar)[0].getAnimations()[0];
      expect(oldAnimation).not.to.equal(undefined);
    });
    cy.contains('button', 'Toggle progress').realClick();
    cy.get(root).should('not.exist');
    cy.then(() => {
      expect(oldRoot.isConnected).to.equal(false);
      expect(oldAnimation.playState).to.equal('idle');
      expect(rootRef).to.have.been.calledWith(null);
      expect(barRef).to.have.been.calledWith(null);
    });
    cy.contains('button', 'Toggle progress').realClick();
    indeterminate();
    cy.get(root).then($root => {
      expect($root[0]).not.to.equal(oldRoot);
      const animations = $root.find(bar)[0].getAnimations();
      expect(animations).to.have.length(1);
      expect(animations[0]).not.to.equal(oldAnimation);
      expect(rootRef).to.have.been.calledWith($root[0]);
      expect(barRef).to.have.been.calledWith($root.find(bar)[0]);
    });
  });
});

describe('ProgressBar documentation', () => {
  it('defaults to an indeterminate named noninteractive progressbar with rounded medium track', () => {
    render();
    indeterminate();
    cy.get(root).should('have.attr', 'aria-label', 'Loading project files').and('not.have.attr', 'tabindex');
    cy.get(root).should('have.css', 'height', '2px').and('have.css', 'border-radius', webLightTheme.borderRadiusMedium);
    cy.get(root).find(bar).should('have.length', 1).and('not.have.attr', 'role');
  });

  for (const value of [0, 0.5, 1]) {
    it(`renders documented determinate value ${value} with default max and actual geometry`, () => {
      render({ value });
      range(value);
    });
  }

  for (const value of [0, 13, 42]) {
    it(`renders custom max 42 at value ${value}`, () => {
      render({ value, max: 42 });
      range(value, 42);
    });
  }

  for (const thickness of ['medium', 'large'] as const) {
    for (const shape of ['rounded', 'square'] as const) {
      it(`renders ${thickness} thickness and ${shape} shape on both track and fill`, () => {
        render({ value: 0.5, thickness, shape });
        const radius = shape === 'square' ? '0px' : webLightTheme.borderRadiusMedium;
        cy.get(root).should('have.css', 'height', thickness === 'medium' ? '2px' : '4px');
        cy.get(root).should('have.css', 'border-radius', radius);
        cy.get(root).find(bar).should('have.css', 'border-radius', radius);
        range(0.5);
      });
    }
  }

  const colors = {
    brand: 'colorCompoundBrandBackground',
    error: 'colorPaletteRedBackground3',
    warning: 'colorPaletteDarkOrangeBackground3',
    success: 'colorPaletteGreenBackground3',
  } as const;
  for (const color of ['brand', 'error', 'warning', 'success'] as const) {
    it(`uses ${color} token in light and dark themes without changing the range`, () => {
      mount(
        <>
          {[webLightTheme, webDarkTheme].map((theme, index) => (
            <FluentProvider theme={theme} key={index}>
              <ProgressBar data-testid={`theme-${index}`} value={0.5} color={color} />
              <span data-testid={`token-${index}`} style={{ backgroundColor: theme[colors[color]] }} />
            </FluentProvider>
          ))}
        </>,
      );
      for (const index of [0, 1]) {
        cy.get(`[data-testid="token-${index}"]`).then($token => {
          const expected = $token.css('background-color');
          cy.get(`[data-testid="theme-${index}"] ${bar}`).should('have.css', 'background-color', expected);
        });
        cy.get(`[data-testid="theme-${index}"]`).should('have.attr', 'aria-valuenow', '0.5');
      }
    });
  }

  it('disables indeterminate motion explicitly without turning it into determinate progress', () => {
    render({ indeterminateMotion: null });
    indeterminate();
    cy.get(root)
      .find(bar)
      .should($bar => {
        expect($bar[0].getAnimations()).to.have.length(0);
        expect($bar[0].getBoundingClientRect().width).to.be.closeTo(width * 0.33, 0.1);
      });
  });

  it('runs the custom motion slot render function on the actual bar', () => {
    const Swing = createMotionComponent({
      keyframes: [{ translate: '-100%' }, { translate: '300%' }],
      duration: 2000,
      iterations: Infinity,
      direction: 'alternate',
      easing: 'ease-in-out',
    });
    render({ indeterminateMotion: { children: (_, props) => <Swing {...props} /> } });
    cy.get(root)
      .find(bar)
      .should($bar => {
        const animations = $bar[0].getAnimations();
        expect(animations).to.have.length(1);
        expect(animations[0].effect?.getTiming()).to.include({
          duration: 2000,
          direction: 'alternate',
          iterations: Infinity,
        });
      });
  });

  it('connects Field label hint and validation message to the progressbar', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <Field
          label="Loading project files"
          hint="Keep this window open"
          validationMessage="Downloading"
          validationState="none"
        >
          <ProgressBar data-testid="progress" />
        </Field>
      </FluentProvider>,
    );
    indeterminate();
    cy.get(root).should($root => {
      const doc = $root[0].ownerDocument;
      const labelId = $root.attr('aria-labelledby');
      expect(labelId).to.be.a('string');
      expect(doc.getElementById(labelId!)?.textContent).to.equal('Loading project files');
      const ids = $root.attr('aria-describedby')!.split(' ');
      expect(ids.map(id => doc.getElementById(id)?.textContent)).to.deep.equal([
        'Downloading',
        'Keep this window open',
      ]);
    });
  });
});
