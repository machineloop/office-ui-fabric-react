import * as React from 'react';
import * as axe from 'axe-core';
import { computeAccessibleName } from 'dom-accessibility-api';
import { tinycolor } from '@ctrl/tinycolor';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import type { JSXElement, FluentProviderCustomStyleHooks } from '@fluentui/react-components';
import { ColorPicker } from '../ColorPicker';
import type { ColorPickerProps, ColorPickerState } from '../ColorPicker.types';
import { useColorPicker_unstable, useColorPickerBase_unstable } from '../useColorPicker';
import { useColorPickerContextValues, useColorPickerBaseContextValues_unstable } from '../useColorPickerContextValues';
import { useColorPickerStyles_unstable, colorPickerClassNames } from '../useColorPickerStyles.styles';
import { renderColorPicker_unstable } from '../renderColorPicker';
import { ColorPickerProvider, useColorPickerContextValue_unstable } from '../../../contexts/colorPicker';
import type { ColorPickerContextValue } from '../../../contexts/colorPicker';
import { ColorArea } from '../../ColorArea/ColorArea';
import { ColorSlider } from '../../ColorSlider/ColorSlider';
import { AlphaSlider } from '../../AlphaSlider/AlphaSlider';
import type { HsvColor } from '../../../types/color';
import { Default } from '../../../../../stories/src/ColorPicker/ColorPickerDefault.stories';
import { ColorPickerShape } from '../../../../../stories/src/ColorPicker/ColorPickerShape.stories';
import { ColorPickerPopup } from '../../../../../stories/src/ColorPicker/ColorPickerPopup.stories';
import { ColorAndSwatchPicker } from '../../../../../stories/src/ColorPicker/ColorAndSwatchPicker.stories';
import { ColorAreaDefault } from '../../../../../stories/src/ColorPicker/ColorAreaDefault.stories';
import { ColorSliderDefault } from '../../../../../stories/src/ColorPicker/ColorSliderDefault.stories';
import { ColorSliderChannels } from '../../../../../stories/src/ColorPicker/ColorSliderChannels.stories';
import { AlphaSliderDefault } from '../../../../../stories/src/ColorPicker/AlphaSliderDefault.stories';

const requestedRound: unknown = Cypress.env('coverageRound');
if (requestedRound !== undefined && ![1, 2, 3, 4, '1', '2', '3', '4'].some(value => requestedRound === value)) {
  throw new Error('coverageRound must be 1, 2, 3, or 4');
}
const round = requestedRound === undefined ? 4 : Number(requestedRound);
const evidenceRoot = `src/components/ColorPicker/.temp/audits-${Date.now()}-${Cypress._.random(0, 1000000000)}`;
let evidenceIndex = 0;
const evidence = (report: Record<string, unknown>) =>
  cy.writeFile(
    `${evidenceRoot}/evidence-${++evidenceIndex}.json`,
    { ...report, retries: Cypress.currentRetry },
    { log: false },
  );

describe('row133 ColorPicker browser coverage', { retries: 0, viewportWidth: 1100, viewportHeight: 1100 }, () => {
  const initial: HsvColor = { h: 210, s: 0.5, v: 0.8, a: 0.4 };
  const replacement: HsvColor = { h: 120, s: 0.25, v: 0.6, a: 0.8 };
  const labels = { inputX: { 'aria-label': 'Saturation area' }, inputY: { 'aria-label': 'Brightness area' } };
  const x = () => cy.get<HTMLInputElement>('#area .fui-ColorArea__inputX');
  const y = () => cy.get<HTMLInputElement>('#area .fui-ColorArea__inputY');
  let registered = 0;
  const registeredTitles: string[] = [];
  const auditedTitles: string[] = [];
  const auditedCheckpoints: string[] = [];
  const checkpointTitles = (level: number) =>
    registeredTitles.flatMap(title => {
      const count = title.startsWith('R3.07 ')
        ? 2
        : /^R3\.0[89] /.test(title)
        ? 1
        : level === 4 && /^(R4\.12|R4\.16) /.test(title)
        ? 1
        : 0;
      return Array.from({ length: count }, () => title);
    });
  function scenario(level: number, name: string, test: () => void) {
    if (round >= level) {
      registered++;
      registeredTitles.push(name);
      it(name, test);
    }
  }
  const render = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
    mount(
      <FluentProvider dir={dir} theme={dark ? webDarkTheme : webLightTheme}>
        <main id="fixture" style={{ padding: 40, width: 600 }}>
          {element}
        </main>
      </FluentProvider>,
    ).then(() =>
      cy
        .get('#fixture')
        .should($fixture =>
          expect($fixture[0].closest('[aria-hidden="true"]'), 'fixture is included in accessibility tree').to.equal(
            null,
          ),
        ),
    );
  const Controls = ({ vertical = false }: { vertical?: boolean }) => (
    <>
      <ColorArea id="area" {...labels} />
      <ColorSlider id="hue" aria-label="Hue" vertical={vertical} />
      <ColorSlider id="saturation" channel="saturation" aria-label="Saturation" />
      <ColorSlider id="value" channel="value" aria-label="Brightness" />
      <AlphaSlider id="alpha" aria-label="Opacity" />
      <AlphaSlider id="transparency" aria-label="Transparency" transparency />
    </>
  );
  const Picker = ({
    frozen = false,
    start = initial,
    onChange,
    shape,
    vertical = false,
  }: {
    frozen?: boolean;
    start?: HsvColor;
    onChange?: ColorPickerProps['onColorChange'];
    shape?: ColorPickerProps['shape'];
    vertical?: boolean;
  }) => {
    const [color, setColor] = React.useState(start);
    return (
      <>
        <button id="before">Before</button>
        <ColorPicker
          id="picker"
          role="group"
          aria-label="Color editor"
          shape={shape}
          color={color}
          onColorChange={(event, data) => {
            onChange?.(event, data);
            if (!frozen) {
              setColor(data.color);
            }
          }}
        >
          <Controls vertical={vertical} />
        </ColorPicker>
        <output id="selected">{JSON.stringify(color)}</output>
        <div id="preview" style={{ width: 40, height: 40, backgroundColor: tinycolor(color).toRgbString() }} />
        <button id="reset" onClick={() => setColor(start)}>
          Reset
        </button>
        <button id="replace" onClick={() => setColor(replacement)}>
          Replace
        </button>
        <button id="after">After</button>
      </>
    );
  };
  const selected = (color: HsvColor) =>
    cy.get('#selected').should($output => expect(JSON.parse($output.text())).to.deep.equal(color));
  const channels = (color: HsvColor) => {
    x().should('have.value', String(Math.round(color.s * 100)));
    y().should('have.value', String(Math.round(color.v * 100)));
    cy.get('#hue').should('have.attr', 'value', String(color.h));
    cy.get('#saturation').should('have.attr', 'value', String(color.s * 100));
    cy.get('#value').should('have.attr', 'value', String(color.v * 100));
    cy.get('#alpha').should('have.attr', 'value', String((color.a ?? 1) * 100));
    cy.get('#transparency').should($input =>
      expect(Number($input.attr('value'))).to.be.closeTo(100 - (color.a ?? 1) * 100, 1e-10),
    );
  };
  const lastChange = (alias: string, color: HsvColor, count: number, eventType: string) =>
    cy.get<sinon.SinonStub>(alias).should(stub => {
      expect(stub.callCount).to.equal(count);
      const [event, data] = stub.lastCall.args;
      expect(Object.keys(data).sort()).to.deep.equal(['color', 'event', 'type']);
      expect(data.color).to.deep.equal(color);
      expect(data.type).to.equal('change');
      expect(data.event).to.equal(event);
      expect(event.type).to.equal(eventType);
      expect(event.nativeEvent ? event.nativeEvent.isTrusted : event.isTrusted, 'real browser input').to.equal(true);
    });
  type SupportedKey = 'ArrowRight' | 'ArrowLeft' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End' | 'PageUp' | 'PageDown';
  const key = (selector: string, name: SupportedKey) => {
    cy.get(selector).focus();
    cy.realPress(name);
  };

  type AuditClassification = 'clean' | 'shape' | 'channels' | 'popup' | 'swatch';
  let classification: AuditClassification = 'clean';
  beforeEach(() => {
    classification = 'clean';
  });
  before(() => {
    expect(registered, 'exact cumulative registration').to.equal([21, 45, 60, 112][round - 1]);
    expect(Cypress.config('retries'), 'no retry acceptance').to.equal(0);
    evidence({
      kind: 'manifest',
      round,
      tests: registered,
      titles: registeredTitles,
      checkpoints: checkpointTitles(round),
      gradients: registeredTitles.flatMap(title =>
        Array.from(
          { length: title.startsWith('R4.12 ') ? 2 : /^(R4\.01|R4\.04|R4\.14) /.test(title) ? 1 : 0 },
          () => title,
        ),
      ),
    });
  });
  after(() => {
    expect([...auditedTitles].sort(), 'every registered case audited; no filtering/pending').to.deep.equal(
      [...registeredTitles].sort(),
    );
    expect([...auditedCheckpoints].sort(), 'exact checkpoint identities').to.deep.equal(checkpointTitles(round).sort());
  });
  const audit = (kind: 'axe' | 'axe-checkpoint' = 'axe') => {
    cy.get('#fixture').then($fixture =>
      cy
        .then(() =>
          axe.run([$fixture[0], ...Array.from($fixture[0].ownerDocument.querySelectorAll('.fui-PopoverSurface'))], {
            elementRef: true,
          }),
        )
        .then(result => {
          const report = {
            kind,
            scenario: Cypress.currentTest.title,
            classification:
              classification === 'popup' || classification === 'swatch'
                ? `${classification}-${
                    result.violations.some(({ id }) => id === 'aria-hidden-focus')
                      ? 'sentinels-focusable'
                      : 'sentinels-focus-redirected'
                  }`
                : classification,
            incompleteClassification: result.incomplete.length
              ? classification === 'popup'
                ? 'exact-tabster-focusable-modal-open-review'
                : 'unknown'
              : 'none',
            passes: result.passes.map(({ id }) => id),
            violations: result.violations.map(({ id, nodes }) => ({
              id,
              nodes: nodes.map(({ target, html, failureSummary }) => ({ target, html, failureSummary })),
            })),
            incomplete: result.incomplete.map(({ id, nodes }) => ({
              id,
              nodes: nodes.map(({ target, html, any: anyChecks, all, none }) => ({
                target,
                html,
                anyChecks,
                all,
                none,
              })),
            })),
          };
          evidence(report).then(() => {
            (kind === 'axe' ? auditedTitles : auditedCheckpoints).push(Cypress.currentTest.title);
            expect(report.passes.length, 'evaluated axe rules').to.be.greaterThan(0);
            const document = $fixture[0].ownerDocument;
            if (classification === 'clean') {
              expect($fixture[0].closest('[aria-hidden="true"]'), 'audited fixture is not hidden').to.equal(null);
              if ($fixture[0].querySelector('input[type="range"]')) {
                expect(report.passes, 'range labeling was actually evaluated').to.include('label');
              }
            }
            const expectedRuleProfiles: Record<AuditClassification, readonly (readonly string[])[]> = {
              clean: [[]],
              shape: [['label']],
              channels: [['label']],
              popup: [['aria-dialog-name'], ['aria-dialog-name', 'aria-hidden-focus']],
              swatch: [[], ['aria-hidden-focus']],
            };
            const assertRuleProfile = (ids: readonly string[]) =>
              expect(expectedRuleProfiles[classification], 'exact classified rules').to.deep.include([...ids].sort());
            const violationIds = result.violations.map(({ id }) => id);
            assertRuleProfile(violationIds);
            expect(() => assertRuleProfile([...violationIds, 'unregistered-widget-rule'])).to.throw();
            if (violationIds.length) {
              expect(() => assertRuleProfile([...violationIds, violationIds[0]])).to.throw();
            }
            if (classification === 'popup') {
              expect(() => assertRuleProfile(['aria-hidden-focus'])).to.throw();
            }
            if (classification === 'shape' || classification === 'channels') {
              expect(Cypress.currentTest.title.startsWith(classification === 'shape' ? 'R3.06 ' : 'R3.12 ')).to.equal(
                true,
              );
              const inputs =
                classification === 'shape'
                  ? $fixture[0].querySelectorAll('.fui-ColorPicker')[1].querySelectorAll<HTMLInputElement>('input')
                  : $fixture[0].querySelectorAll<HTMLInputElement>('.fui-ColorSlider__input');
              expect(inputs.length).to.equal(classification === 'shape' ? 4 : 3);
              expect(result.violations[0].nodes.length).to.equal(inputs.length);
              result.violations[0].nodes.forEach((node, index) => {
                expect(node.target.length).to.equal(1);
                expect(document.querySelector(String(node.target[0]))).to.equal(inputs[index]);
                expect(inputs[index].type).to.equal('range');
                expect(computeAccessibleName(inputs[index])).to.equal('');
                expect(node.failureSummary).to.equal(
                  'Fix any of the following:\n  Element does not have an implicit (wrapped) <label>\n  Element does not have an explicit <label>\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute\n  Element has no placeholder attribute\n  Element\'s default semantics were not overridden with role="none" or role="presentation"',
                );
              });
            }
            if (classification === 'popup') {
              expect(
                Cypress.currentTest.title.startsWith('R3.07 ') ||
                  Cypress.currentTest.title.startsWith('R3.08 ') ||
                  Cypress.currentTest.title.startsWith('R3.09 ') ||
                  Cypress.currentTest.title.startsWith('R4.16 '),
              ).to.equal(true);
              const surface = document.querySelector('.fui-PopoverSurface')!;
              expect(surface.getAttribute('role')).to.equal('dialog');
              expect(surface.getAttribute('aria-modal')).to.equal('true');
              expect(computeAccessibleName(surface)).to.equal('');
              const dialogFinding = result.violations.find(({ id }) => id === 'aria-dialog-name')!;
              expect(dialogFinding.nodes).to.have.length(1);
              expect(dialogFinding.nodes[0].element).to.equal(surface);
              expect(dialogFinding.nodes[0].failureSummary).to.equal(
                'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
              );
            }
            if (classification === 'popup' || classification === 'swatch') {
              if (classification === 'swatch') {
                expect(Cypress.currentTest.title.startsWith('R3.10 ')).to.equal(true);
              }
              const container = document.querySelector(
                classification === 'popup' ? '.fui-PopoverSurface' : '.fui-SwatchPicker',
              )!;
              const sentinels = container.querySelectorAll('i[data-tabster-dummy]');
              expect(sentinels).to.have.length(2);
              const nodes = result.violations.find(({ id }) => id === 'aria-hidden-focus')?.nodes || [];
              expect(nodes).to.have.length(report.classification.endsWith('sentinels-focusable') ? 2 : 0);
              sentinels.forEach((sentinel, index) => {
                expect(sentinel.tagName).to.equal('I');
                expect(sentinel.getAttribute('aria-hidden')).to.equal('true');
                expect(sentinel.getAttribute('role')).to.equal('none');
                expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(
                  `isFirst=${index === 0}, isOutside=false, (${
                    classification === 'popup' ? 'Modalizer' : 'Mover'
                  }, tabbable=true)`,
                );
              });
              nodes.forEach((node, index) => {
                expect(node.target.length).to.equal(1);
                expect(node.element).to.equal(sentinels[index]);
                expect(sentinels[index].getAttribute('tabindex')).to.equal('0');
                expect(sentinels[index].getAttribute('aria-hidden')).to.equal('true');
                expect(sentinels[index].getAttribute('role')).to.equal('none');
                expect(sentinels[index].getAttribute('data-tabster-dummy')).to.equal(
                  `isFirst=${index === 0}, isOutside=false, (${
                    classification === 'popup' ? 'Modalizer' : 'Mover'
                  }, tabbable=true)`,
                );
                expect(node.failureSummary).to.equal(
                  'Fix all of the following:\n  Focusable content should have tabindex="-1" or be removed from the DOM',
                );
              });
            }
            if (classification === 'popup' && result.incomplete.length) {
              expect(
                result.incomplete.map(({ id }) => id),
                'only known modal-focus incomplete',
              ).to.deep.equal(['aria-hidden-focus']);
              const sentinels = document.querySelectorAll('.fui-PopoverSurface i[data-tabster-dummy]');
              expect(result.incomplete[0].nodes).to.have.length(2);
              result.incomplete[0].nodes.forEach((node, index) => {
                expect(node.target).to.have.length(1);
                expect(node.element).to.equal(sentinels[index]);
                expect(node.any).to.deep.equal([]);
                expect(node.none).to.deep.equal([]);
                expect(node.all).to.have.length(1);
                const check = node.all[0];
                expect(check.id).to.equal('focusable-modal-open');
                expect(check.impact).to.equal('serious');
                expect(check.data).to.equal(null);
                expect(check.message).to.equal('Check that focusable elements are not tabbable in the current state');
                expect(check.relatedNodes).to.have.length(1);
                expect(check.relatedNodes![0].target).to.deep.equal(node.target);
                expect(check.relatedNodes![0].element).to.equal(sentinels[index]);
                expect(sentinels[index].getAttribute('tabindex')).to.equal('0');
                expect(getComputedStyle(sentinels[index]).contentVisibility).to.equal('hidden');
              });
            } else {
              expect(report.incomplete, 'unclassified incompletes').to.deep.equal([]);
            }
          });
        }),
    );
  };
  afterEach(() => {
    audit();
    cy.get('#fixture').realMouseUp();
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
  });

  scenario(1, 'R1.01 empty picker forwards root semantics without inventing controls or callbacks', () => {
    const change = cy.stub().as('change');
    render(<ColorPicker id="picker" role="group" aria-label="Empty editor" color={initial} onColorChange={change} />);
    cy.get('#picker').should('have.class', 'fui-ColorPicker').and('be.empty');
    cy.get('#picker')
      .should('have.css', 'display', 'flex')
      .and('have.css', 'flex-direction', 'column')
      .and('have.css', 'gap', '4px');
    cy.get('#picker').should($root => expect(computeAccessibleName($root[0])).to.equal('Empty editor'));
    cy.get('@change').should('not.have.been.called');
  });
  scenario(1, 'R1.02 omitted parent color initializes children to white without picker-owned state', () => {
    render(
      <ColorPicker id="picker">
        <Controls />
      </ColorPicker>,
    );
    channels({ h: 0, s: 0, v: 1, a: 1 });
    key('#hue', 'ArrowRight');
    cy.get('#hue').should('have.value', '1');
    x().should('have.value', '0');
    cy.get('#area').should($root =>
      expect($root[0].style.getPropertyValue('--fui-Area--main-color')).to.equal('hsl(0, 100%, 50%)'),
    );
  });
  scenario(1, 'R1.03 controlled channels initialize exactly and update without onColorChange on external reset', () => {
    const change = cy.stub().as('change');
    render(<Picker onChange={change} />);
    channels(initial);
    cy.get('#replace').click();
    channels(replacement);
    selected(replacement);
    cy.get('#reset').click();
    channels(initial);
    selected(initial);
    cy.get('@change').should('not.have.been.called');
  });
  for (const [id, , startValue, next, color] of [
    ['hue', 'h', '210', '211', { ...initial, h: 211 }],
    ['saturation', 's', '50', '51', { ...initial, s: 0.51 }],
    ['value', 'v', '80', '81', { ...initial, v: 0.81 }],
    ['alpha', 'a', '40', '41', { ...initial, a: 0.41 }],
    ['transparency', 'a', '60', '61', { ...initial, a: 0.39 }],
  ] as const) {
    scenario(1, `R1.04 ${id} synchronizes every sibling and preserves other HSV channels`, () => {
      const change = cy.stub().as('change');
      render(<Picker onChange={change} />);
      cy.get(`#${id}`).should('have.value', startValue);
      key(`#${id}`, 'ArrowRight');
      cy.get(`#${id}`).should('have.value', next);
      selected(color);
      channels(color);
      lastChange('@change', color, 1, 'change');
      cy.get('#reset').click();
      channels(initial);
      lastChange('@change', color, 1, 'change');
    });
  }
  for (const [arrow, color] of [
    ['ArrowRight', { ...initial, s: 0.51 }],
    ['ArrowLeft', { ...initial, s: 0.49 }],
    ['ArrowUp', { ...initial, v: 0.81 }],
    ['ArrowDown', { ...initial, v: 0.79 }],
  ] as const) {
    scenario(1, `R1.05 area ${arrow} forwards exact keyboard event and synchronized color`, () => {
      const change = cy.stub().as('change');
      render(<Picker onChange={change} />);
      x().focus();
      cy.realPress(arrow);
      selected(color);
      channels(color);
      lastChange('@change', color, 1, 'keydown');
    });
  }
  for (const id of ['hue', 'saturation', 'value', 'alpha', 'transparency', 'area'] as const) {
    scenario(1, `R1.06 frozen owner rejects ${id} requests without local or sibling mutation`, () => {
      const change = cy.stub().as('change');
      render(<Picker frozen onChange={change} />);
      key(id === 'area' ? '#area input:first' : `#${id}`, 'ArrowRight');
      channels(initial);
      selected(initial);
      cy.get('@change').should('have.been.calledOnce');
      lastChange(
        '@change',
        {
          ...initial,
          ...(id === 'area' || id === 'saturation'
            ? { s: 0.51 }
            : id === 'hue'
            ? { h: 211 }
            : id === 'value'
            ? { v: 0.81 }
            : { a: id === 'alpha' ? 0.41 : 0.39 }),
        },
        1,
        id === 'area' ? 'keydown' : 'change',
      );
      if (id === 'area') {
        key('#area input:first', 'ArrowUp');
        channels(initial);
        selected(initial);
        lastChange('@change', { ...initial, v: 0.81 }, 2, 'keydown');
      }
    });
  }
  scenario(1, 'R1.07 context color wins over child defaults while explicit child color wins over context', () => {
    const change = cy.stub().as('change');
    render(
      <ColorPicker color={initial} onColorChange={change}>
        <ColorArea id="area" {...labels} defaultColor={replacement} />
        <ColorSlider id="hue" aria-label="Hue" defaultColor={replacement} />
        <AlphaSlider id="alpha" aria-label="Alpha" defaultColor={replacement} />
        <ColorSlider id="explicit" aria-label="Explicit hue" color={replacement} defaultColor={initial} />
        <AlphaSlider id="explicit-alpha" aria-label="Explicit alpha" color={replacement} defaultColor={initial} />
        <ColorArea id="explicit-area" {...labels} color={replacement} defaultColor={initial} />
      </ColorPicker>,
    );
    x().should('have.value', '50');
    cy.get('#hue').should('have.value', '210');
    cy.get('#alpha').should('have.value', '40');
    cy.get('#explicit').should('have.value', '120');
    cy.get('#explicit-alpha').should('have.value', '80');
    cy.get('#explicit-area input:first').should('have.value', '25');
    key('#explicit', 'ArrowRight');
    lastChange('@change', { ...replacement, h: 121 }, 1, 'change');
    key('#explicit-alpha', 'ArrowRight');
    lastChange('@change', { ...replacement, a: 0.81 }, 2, 'change');
    key('#explicit-area input:first', 'ArrowRight');
    lastChange('@change', { ...replacement, s: 0.26 }, 3, 'keydown');
    cy.get('#explicit').should('have.value', '120');
    cy.get('#explicit-alpha').should('have.value', '80');
    cy.get('#explicit-area input:first').should('have.value', '25');
    x().should('have.value', '50');
    cy.get('#hue').should('have.value', '210');
    cy.get('#alpha').should('have.value', '40');
  });
  scenario(1, 'R1.08 optional alpha defaults to opaque and area preserves its absence until slider conversion', () => {
    const change = cy.stub().as('change');
    const start = { h: 210, s: 0.5, v: 0.8 };
    render(<Picker start={start} onChange={change} />);
    cy.get('#alpha').should('have.value', '100');
    x().focus();
    cy.realPress('ArrowRight');
    selected({ ...start, s: 0.51 });
    lastChange('@change', { ...start, s: 0.51 }, 1, 'keydown');
    key('#hue', 'ArrowRight');
    selected({ ...start, h: 211, s: 0.51, a: 1 });
  });
  scenario(1, 'R1.09 black and zero saturation retain hue and alpha during area updates', () => {
    render(<Picker start={{ h: 270, s: 0, v: 0, a: 0 }} />);
    x().focus();
    cy.realPress('ArrowUp');
    selected({ h: 270, s: 0, v: 0.01, a: 0 });
    cy.realPress('ArrowRight');
    selected({ h: 270, s: 0.01, v: 0.01, a: 0 });
    cy.get('#hue').should('have.value', '270');
    cy.get('#alpha').should('have.value', '0');
  });

  const Probe = () => {
    const color = useColorPickerContextValue_unstable(ctx => ctx.color);
    const shape = useColorPickerContextValue_unstable(ctx => ctx.shape);
    return <output id="context">{JSON.stringify({ color, shape })}</output>;
  };
  const RequestDriver = ({
    request,
    onRequest,
  }: {
    request: { color: HsvColor };
    onRequest: ColorPickerContextValue['requestChange'];
  }) => {
    const requestChange = useColorPickerContextValue_unstable(ctx => ctx.requestChange);
    return (
      <input
        id="request-color"
        type="range"
        min={0}
        max={100}
        defaultValue={50}
        aria-label="Custom color request"
        onChange={(event: Parameters<ColorPickerContextValue['requestChange']>[0]) => {
          onRequest(event, request);
          requestChange(event, request);
        }}
      />
    );
  };
  const HeadlessPicker = ({
    base,
    onChange,
    request,
    onRequest,
  }: {
    base: boolean;
    onChange: ColorPickerProps['onColorChange'];
    request: { color: HsvColor };
    onRequest: ColorPickerContextValue['requestChange'];
  }) => {
    const [color, setColor] = React.useState(initial);
    const ref = React.useRef<HTMLDivElement>(null);
    const props = {
      id: 'picker',
      color,
      shape: 'square' as const,
      children: (
        <>
          <Controls />
          <Probe />
          <RequestDriver request={request} onRequest={onRequest} />
        </>
      ),
      onColorChange: (
        event: Parameters<NonNullable<ColorPickerProps['onColorChange']>>[0],
        data: Parameters<NonNullable<ColorPickerProps['onColorChange']>>[1],
      ) => {
        onChange?.(event, data);
        setColor(data.color);
      },
    };
    const usePickerState = base ? useColorPickerBase_unstable : useColorPicker_unstable;
    const usePickerContext = base ? useColorPickerBaseContextValues_unstable : useColorPickerContextValues;
    const state = usePickerState(props, ref);
    const context = usePickerContext(state);
    useColorPickerStyles_unstable(state);
    return renderColorPicker_unstable(state, context);
  };
  for (const kind of ['area', 'hue', 'alpha'] as const) {
    scenario(2, `R2.01 explicit ${kind} onChange replaces parent forwarding rather than duplicating it`, () => {
      const parent = cy.stub().as('parent');
      const child = cy.stub().as('child');
      render(
        <ColorPicker color={initial} onColorChange={parent}>
          <ColorArea id="area" {...labels} onChange={kind === 'area' ? child : undefined} />
          <ColorSlider id="hue" aria-label="Hue" onChange={kind === 'hue' ? child : undefined} />
          <AlphaSlider id="alpha" aria-label="Alpha" onChange={kind === 'alpha' ? child : undefined} />
        </ColorPicker>,
      );
      key(kind === 'area' ? '#area input:first' : `#${kind}`, 'ArrowRight');
      cy.get('@child').should('have.been.calledOnce');
      lastChange(
        '@child',
        { ...initial, ...(kind === 'area' ? { s: 0.51 } : kind === 'hue' ? { h: 211 } : { a: 0.41 }) },
        1,
        kind === 'area' ? 'keydown' : 'change',
      );
      cy.get('@parent').should('not.have.been.called');
      x().should('have.value', '50');
      cy.get('#hue').should('have.value', '210');
      cy.get('#alpha').should('have.value', '40');
    });
  }
  scenario(2, 'R2.02 nested picker wins nearest color shape and callback without touching outer provider', () => {
    const outer = cy.stub().as('outer');
    const inner = cy.stub().as('inner');
    render(
      <ColorPicker id="outer" color={initial} shape="square" onColorChange={outer}>
        <ColorSlider id="outer-hue" aria-label="Outer hue" />
        <ColorPicker id="inner" color={replacement} shape="rounded" onColorChange={inner}>
          <ColorArea id="area" {...labels} />
          <ColorSlider id="hue" aria-label="Inner hue" />
          <AlphaSlider id="alpha" aria-label="Inner alpha" />
          <Probe />
        </ColorPicker>
      </ColorPicker>,
    );
    cy.get('#context').should('have.text', JSON.stringify({ color: replacement, shape: 'rounded' }));
    cy.get('#area').should('have.css', 'border-radius', '4px');
    key('#hue', 'ArrowRight');
    lastChange('@inner', { ...replacement, h: 121 }, 1, 'change');
    cy.get('@outer').should('not.have.been.called');
    cy.get('#outer-hue').should('have.value', '210');
  });
  scenario(2, 'R2.03 nested picker without color does not inherit outer color or square shape', () => {
    const outer = cy.stub().as('outer');
    const inner = cy.stub().as('inner');
    render(
      <ColorPicker color={initial} shape="square" onColorChange={outer}>
        <ColorPicker onColorChange={inner}>
          <ColorArea id="area" {...labels} defaultColor={replacement} />
          <Probe />
        </ColorPicker>
      </ColorPicker>,
    );
    cy.get('#context').should('have.text', '{}');
    cy.get('#area').should('have.css', 'border-radius', '4px');
    x().should('have.value', '25').focus();
    cy.realPress('ArrowRight');
    x().should('have.value', '26');
    lastChange('@inner', { ...replacement, s: 0.26 }, 1, 'keydown');
    cy.get('@outer').should('not.have.been.called');
  });
  scenario(2, 'R2.04 direct internal provider selects color shape and requestChange precisely', () => {
    const request = cy.stub().as('request');
    render(
      <ColorPickerProvider value={{ color: initial, shape: 'square', requestChange: request }}>
        <ColorArea id="area" {...labels} />
        <ColorSlider id="hue" aria-label="Hue" />
        <AlphaSlider id="alpha" aria-label="Alpha" />
        <Probe />
      </ColorPickerProvider>,
    );
    cy.get('#context').should('have.text', JSON.stringify({ color: initial, shape: 'square' }));
    cy.get('#area').should('have.css', 'border-radius', '0px');
    key('#hue', 'ArrowRight');
    lastChange('@request', { ...initial, h: 211 }, 1, 'change');
    cy.get('#hue').should('have.value', '210');
  });
  scenario(2, 'R2.05 selector outside picker uses rounded undefined-color default context', () => {
    render(
      <>
        <Probe />
        <ColorArea id="area" {...labels} />
      </>,
    );
    cy.get('#context').should('have.text', '{"shape":"rounded"}');
    x().should('have.value', '0').focus();
    cy.realPress('ArrowRight');
    x().should('have.value', '1');
  });
  for (const [contextShape, childShape, radius] of [
    [undefined, undefined, '4px'],
    ['square', undefined, '0px'],
    ['rounded', undefined, '4px'],
    ['square', 'rounded', '4px'],
    ['rounded', 'square', '0px'],
  ] as const) {
    scenario(
      2,
      `R2.06 shape ${contextShape ?? 'omitted'} with child ${childShape ?? 'inherited'} matches all shape units`,
      () => {
        render(
          <ColorPicker color={initial} shape={contextShape}>
            <ColorArea id="area" {...labels} shape={childShape} />
            <ColorSlider id="hue" aria-label="Hue" shape={childShape} />
            <AlphaSlider id="alpha" aria-label="Alpha" shape={childShape} />
          </ColorPicker>,
        );
        cy.get('#area').should('have.css', 'border-radius', radius);
        cy.get('.fui-ColorSlider__rail').each($rail =>
          expect(getComputedStyle($rail[0]).borderRadius).to.equal(radius),
        );
        cy.get('.fui-ColorSlider__thumb, .fui-ColorArea__thumb').each($thumb =>
          expect(getComputedStyle($thumb[0]).borderRadius).to.equal('10000px'),
        );
      },
    );
  }
  scenario(2, 'R2.07 live shape updates retain DOM identity color and consumer root dimensions', () => {
    const LiveShape = () => {
      const [shape, setShape] = React.useState<'rounded' | 'square'>('rounded');
      return (
        <>
          <ColorPicker id="picker" shape={shape} color={initial} style={{ width: 420, gap: 12 }}>
            <Controls />
          </ColorPicker>
          <button id="shape" onClick={() => setShape('square')}>
            Square
          </button>
        </>
      );
    };
    render(<LiveShape />);
    cy.get('#picker').should('have.css', 'width', '420px').and('have.css', 'gap', '12px');
    cy.get('#area').then($area => {
      const original = $area[0];
      cy.get('#shape').click();
      cy.get('#area')
        .should($current => expect($current[0]).to.equal(original))
        .and('have.css', 'border-radius', '0px');
      channels(initial);
    });
  });
  for (const base of [false, true]) {
    scenario(
      2,
      `R2.08 ${
        base ? 'base' : 'full'
      } exported picker hooks context styles and renderer drive real synchronized changes`,
      () => {
        const change = cy.stub().as('change');
        const requested = cy.stub().as('requested');
        const requestColor: HsvColor = Object.freeze({ ...replacement });
        const request = Object.freeze({ color: requestColor });
        render(<HeadlessPicker base={base} onChange={change} request={request} onRequest={requested} />);
        cy.get('#picker').should('have.class', colorPickerClassNames.root).and('have.css', 'display', 'flex');
        cy.get('#area').should('have.css', 'border-radius', base ? '4px' : '0px');
        key('#hue', 'ArrowRight');
        channels({ ...initial, h: 211 });
        lastChange('@change', { ...initial, h: 211 }, 1, 'change');
        cy.get('#context').should(
          'have.text',
          JSON.stringify({ color: { ...initial, h: 211 }, ...(base ? {} : { shape: 'square' }) }),
        );
        cy.get('@requested').should('not.have.been.called');
        key('#request-color', 'ArrowRight');
        lastChange('@change', replacement, 2, 'change');
        cy.get<sinon.SinonStub>('@requested').should(stub => {
          expect(stub.callCount, 'one real custom-child request').to.equal(1);
          expect(stub.firstCall.args[1]).to.equal(request);
        });
        cy.get<sinon.SinonStub>('@change').should(stub => {
          expect(stub.callCount).to.equal(2);
          const [event, data] = stub.lastCall.args;
          expect(event, 'original custom-child event').to.equal(requested.firstCall.args[0]);
          expect(data, 'picker adds callback metadata without mutating the request').not.to.equal(request);
          expect(data.color, 'original requested color reference').to.equal(requestColor);
          expect(request).to.deep.equal({ color: replacement });
          expect(Object.isFrozen(requestColor)).to.equal(true);
        });
        channels(replacement);
        cy.get('#context').should(
          'have.text',
          JSON.stringify({ color: replacement, ...(base ? {} : { shape: 'square' }) }),
        );
      },
    );
  }
  scenario(2, 'R2.09 root ref native props children and bubbling handlers survive and release on unmount', () => {
    const ref = React.createRef<HTMLDivElement>();
    const down = cy.stub().as('down');
    const change = cy.stub().as('change');
    const Fixture = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          {visible && (
            <ColorPicker
              ref={ref}
              id="picker"
              title="Editor title"
              className="consumer"
              role="group"
              aria-label="Ref editor"
              onKeyDown={down}
              color={initial}
              onColorChange={change}
            >
              <ColorSlider id="hue" aria-label="Hue" />
              <span id="child">Custom child</span>
            </ColorPicker>
          )}
          <button id="unmount" onClick={() => setVisible(false)}>
            Unmount
          </button>
        </>
      );
    };
    render(<Fixture />);
    cy.get('#picker')
      .should('have.class', 'consumer')
      .and('have.attr', 'title', 'Editor title')
      .should($root => expect(ref.current).to.equal($root[0]));
    key('#hue', 'ArrowRight');
    cy.get('#child').should('have.text', 'Custom child');
    cy.get('@down').should('have.been.calledOnce');
    lastChange('@change', { ...initial, h: 211 }, 1, 'change');
    cy.get('#unmount').click();
    cy.then(() => expect(ref.current).to.equal(null));
  });
  scenario(2, 'R2.10 child input rail thumb refs and native form slots retain actual values and focus', () => {
    const hueRef = React.createRef<HTMLInputElement>();
    const railRef = React.createRef<HTMLDivElement>();
    const thumbRef = React.createRef<HTMLDivElement>();
    const slotChange = cy.stub().as('slot');
    const parent = cy.stub().as('parent');
    render(
      <form id="form">
        <ColorPicker color={initial} onColorChange={parent}>
          <ColorSlider
            ref={hueRef}
            id="hue"
            name="hue"
            aria-label="Hue"
            input={{ onChange: slotChange, title: 'Native hue' }}
            rail={{ id: 'rail', ref: railRef }}
            thumb={{ id: 'thumb', ref: thumbRef }}
          />
        </ColorPicker>
      </form>,
    );
    cy.get('#hue')
      .should($input => expect(hueRef.current).to.equal($input[0]))
      .and('have.attr', 'title', 'Native hue');
    cy.get('#rail').should($rail => expect(railRef.current).to.equal($rail[0]));
    cy.get('#thumb').should($thumb => expect(thumbRef.current).to.equal($thumb[0]));
    key('#hue', 'ArrowRight');
    cy.get('@slot').should('have.been.calledOnce');
    cy.get('@parent').should('have.been.calledOnce');
    cy.then(() => expect(slotChange.firstCall.calledBefore(parent.firstCall)).to.equal(true));
    cy.get<HTMLFormElement>('#form').should($form => expect(new FormData($form[0]).get('hue')).to.equal('210'));
  });
  scenario(2, 'R2.11 provider custom style hook changes root while preserving shared color behavior', () => {
    function isPickerState(value: unknown): value is ColorPickerState {
      return (
        typeof value === 'object' &&
        value !== null &&
        'root' in value &&
        'requestChange' in value &&
        typeof value.requestChange === 'function'
      );
    }
    const hooks: FluentProviderCustomStyleHooks = {
      ['useColorPickerStyles_unstable']: state => {
        if (!isPickerState(state)) {
          throw new Error('Expected picker state');
        }
        state.root.style = { ...state.root.style, border: '3px solid rgb(1, 2, 3)' };
        state.root.title = 'Custom style applied';
      },
    };
    render(
      <FluentProvider theme={webLightTheme} customStyleHooks_unstable={hooks}>
        <Picker />
      </FluentProvider>,
    );
    cy.get('#picker').should('have.css', 'border-top-width', '3px').and('have.attr', 'title', 'Custom style applied');
    key('#alpha', 'ArrowRight');
    channels({ ...initial, a: 0.41 });
  });
  scenario(2, 'R2.12 latest callback and external color are used without remounting descendants', () => {
    const first = cy.stub().as('first');
    const second = cy.stub().as('second');
    const Live = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <ColorPicker color={updated ? replacement : initial} onColorChange={updated ? second : first}>
            <Controls />
          </ColorPicker>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
        </>
      );
    };
    render(<Live />);
    key('#hue', 'ArrowRight');
    lastChange('@first', { ...initial, h: 211 }, 1, 'change');
    cy.get('#hue').then($old => {
      cy.get('#update').click();
      cy.get('#hue').should($new => expect($new[0]).to.equal($old[0]));
    });
    channels(replacement);
    key('#alpha', 'ArrowRight');
    lastChange('@second', { ...replacement, a: 0.81 }, 1, 'change');
    cy.get('@first').should('have.been.calledOnce');
  });
  for (const dark of [false, true]) {
    scenario(
      2,
      `R2.13 ${dark ? 'dark' : 'light'} theme HSV conversion has exact visible thumb RGBA and hue background`,
      () => {
        render(<Picker />, 'ltr', dark);
        cy.get('#area').should('have.css', 'background-color', 'rgb(0, 128, 255)');
        cy.get('.fui-ColorArea__thumb').should('have.css', 'background-color', 'rgba(102, 153, 204, 0.4)');
        cy.get('#area').should($area => {
          const style = getComputedStyle($area[0]);
          expect(style.borderTopColor).to.equal(dark ? 'rgb(102, 102, 102)' : 'rgb(209, 209, 209)');
          expect($area[0].style.getPropertyValue('--fui-Area__thumb--color')).to.equal('hsla(210, 50%, 60%, 0.4)');
        });
        cy.get('#preview').should('have.css', 'background-color', 'rgba(102, 153, 204, 0.4)');
      },
    );
  }
  for (const [name, color, thumb] of [
    ['red', { h: 0, s: 1, v: 1, a: 0.5 }, 'rgba(255, 0, 0, 0.5)'],
    ['white', { h: 120, s: 0, v: 1, a: 1 }, 'rgb(255, 255, 255)'],
    ['black', { h: 240, s: 1, v: 0, a: 1 }, 'rgb(0, 0, 0)'],
  ] as const) {
    scenario(2, `R2.14 unit-derived ${name} HSV to HSL is rendered by area and alpha thumb`, () => {
      render(<Picker start={color} />);
      cy.get('.fui-ColorArea__thumb').should('have.css', 'background-color', thumb);
      cy.get('.fui-AlphaSlider__thumb')
        .first()
        .should($thumb => expect(getComputedStyle($thumb[0], '::before').backgroundColor).to.equal(thumb));
      channels(color);
    });
  }

  const storyInput = (name: string) =>
    cy.get<HTMLInputElement>('#fixture input').filter((_, input) => computeAccessibleName(input) === name);
  const storyRange = (name: string) => storyInput(name).filter('[type="range"]');
  const storySpin = (name: string) => storyInput(name).filter('[role="spinbutton"]');
  const popupSurface = () => cy.get('.fui-PopoverSurface');
  const choose = () => {
    cy.contains('button', 'Choose color').click();
    popupSurface().should('be.visible');
    cy.then(() => {
      classification = 'popup';
    });
  };
  const popupDraft = () => popupSurface().find('.fui-ColorArea__inputX');
  const closePopup = () => {
    cy.contains('button', 'Cancel').click();
    popupSurface().should('not.exist');
    cy.get('#fixture').should($fixture => expect($fixture[0].closest('[aria-hidden="true"]')).to.equal(null));
    cy.then(() => {
      classification = 'clean';
    });
  };

  scenario(3, 'R3.01 stable Default hue produces exact HEX RGB alpha and non-color feedback', () => {
    render(<Default />);
    storyInput('Hex').should('have.value', '#2ae600');
    storyRange('Hue').focus();
    cy.realPress('ArrowRight');
    storyRange('Hue').should('have.value', '110').and('have.attr', 'aria-valuetext', '110°, ');
    storyInput('Hex').should('have.value', '#26e600');
    storySpin('Red').should('have.value', '38');
    storySpin('Green').should('have.value', '230');
    storySpin('Blue').should('have.value', '0');
    storySpin('Alpha').should('have.value', '1');
  });
  scenario(3, 'R3.02 stable Default accepts HEX and synchronizes HSV controls and RGB fields', () => {
    render(<Default />);
    storyInput('Hex').clear().type('#336699').blur();
    storyRange('Hue').should('have.value', '210');
    storyRange('Saturation').should('have.value', '67');
    storyRange('Brightness').should('have.value', '60');
    storySpin('Red').should('have.value', '51');
    storySpin('Green').should('have.value', '102');
    storySpin('Blue').should('have.value', '153');
    storySpin('Alpha').should('have.value', '1');
    storyInput('Hex').should('not.have.attr', 'aria-invalid');
  });
  scenario(3, 'R3.03 stable Default rejects invalid HEX characters flags invalid blur and recovers', () => {
    render(<Default />);
    storyInput('Hex').clear().type('#gggggg').blur();
    storyInput('Hex').should('have.value', '#').and('have.attr', 'aria-invalid', 'true');
    storyRange('Hue').should('have.value', '109');
    storyRange('Brightness').should('have.value', '90');
    storyInput('Hex').clear().type('#ff0000').blur();
    storyInput('Hex').should('not.have.attr', 'aria-invalid');
    storyRange('Hue').should('have.value', '0');
    storyRange('Saturation').should('have.value', '100');
    storySpin('Red').should('have.value', '255');
  });
  scenario(3, 'R3.04 stable Default RGB spinbutton updates exact HEX and area coordinates', () => {
    render(<Default />);
    storySpin('Blue').clear().type('230{enter}');
    storySpin('Blue').should('have.value', '230');
    storyInput('Hex').should('have.value', '2ae6e6');
    storyRange('Hue').should('have.value', '180');
    storyRange('Saturation').should('have.value', '82');
    storyRange('Brightness').should('have.value', '90');
    storySpin('Blue').clear().type('12.5{enter}');
    storyInput('Hex').should('have.value', '2ae6e6');
    storyRange('Hue').should('have.value', '180');
    storyRange('Saturation').should('have.value', '82');
    storyRange('Brightness').should('have.value', '90');
  });
  scenario(3, 'R3.05 stable Default alpha spinbutton and slider synchronize decimal opacity', () => {
    render(<Default />);
    storySpin('Alpha').clear().type('0.25{enter}');
    storyRange('Alpha').should('have.value', '25');
    storySpin('Alpha').should('have.value', '0.25');
    storyRange('Alpha').focus();
    cy.realPress('ArrowRight');
    storySpin('Alpha').should('have.value', '0.26');
    storyRange('Alpha').should('have.attr', 'aria-valuetext', '26%');
    storyRange('Hue').should('have.value', '109');
  });
  scenario(3, 'R3.06 stable Shape shares hue state while retaining exact rounded square shapes', () => {
    render(<ColorPickerShape />);
    classification = 'shape';
    cy.get('.fui-ColorArea').first().should('have.css', 'border-radius', '4px');
    cy.get('.fui-ColorArea').last().should('have.css', 'border-radius', '0px');
    storyRange('Hue').focus();
    cy.realPress('ArrowRight');
    cy.get<HTMLInputElement>('.fui-ColorSlider__input').should($inputs => {
      const hueInputs = Array.from($inputs).filter(input => !input.classList.contains('fui-AlphaSlider__input'));
      expect(hueInputs).to.have.length(2);
      hueInputs.forEach(input => expect(input.value).to.equal('110'));
    });
    cy.get<HTMLInputElement>('.fui-ColorArea__inputX').should($inputs => {
      expect($inputs).to.have.length(2);
      Array.from($inputs).forEach(input => expect(input.value).to.equal('100'));
    });
    cy.get<HTMLInputElement>('.fui-ColorArea__inputY').should($inputs => {
      expect($inputs).to.have.length(2);
      Array.from($inputs).forEach(input => expect(input.value).to.equal('91'));
    });
  });
  scenario(3, 'R3.07 stable Popup draft commit reopen and focus return preserve selected color', () => {
    render(<ColorPickerPopup />);
    choose();
    popupDraft().focus();
    cy.realPress('ArrowLeft');
    popupDraft().should('have.value', '99');
    cy.realPress('Tab');
    popupSurface().find('input[aria-label="Hue"]').should('have.focus');
    cy.realPress('Tab');
    popupSurface().find('input[aria-label="Alpha"]').should('have.focus');
    cy.realPress('Tab');
    cy.contains('button', 'Ok').should('have.focus');
    cy.realPress('Tab');
    cy.contains('button', 'Cancel').should('have.focus');
    cy.realPress('Tab');
    popupDraft().should('have.focus');
    audit('axe-checkpoint');
    cy.contains('button', 'Ok').click();
    popupSurface().should('not.exist');
    cy.contains('button', 'Choose color').should('have.focus');
    classification = 'clean';
    cy.get('#fixture > div').last().should('have.css', 'background-color', 'rgb(44, 230, 2)');
    choose();
    popupDraft().should('have.value', '99');
    audit('axe-checkpoint');
    closePopup();
  });
  scenario(3, 'R3.08 stable Popup Cancel leaves committed color unchanged but retains draft on reopen', () => {
    render(<ColorPickerPopup />);
    choose();
    popupDraft().focus();
    cy.realPress('ArrowLeft');
    cy.contains('button', 'Cancel').click();
    popupSurface().should('not.exist');
    classification = 'clean';
    cy.get('#fixture > div').last().should('have.css', 'background-color', 'rgb(42, 230, 0)');
    choose();
    popupDraft().should('have.value', '99');
    audit('axe-checkpoint');
    closePopup();
  });
  scenario(3, 'R3.09 stable Popup Escape closes returns trigger focus and reopens without commit', () => {
    render(<ColorPickerPopup />);
    choose();
    popupDraft().focus();
    cy.realPress('ArrowLeft');
    cy.realPress('Escape');
    popupSurface().should('not.exist');
    classification = 'clean';
    cy.contains('button', 'Choose color').should('have.focus');
    cy.get('#fixture > div').last().should('have.css', 'background-color', 'rgb(42, 230, 0)');
    choose();
    popupDraft().should('have.value', '99');
    audit('axe-checkpoint');
    closePopup();
  });
  scenario(3, 'R3.10 stable Swatch adds current picker RGBA enforces eight-color capacity and resets', () => {
    render(<ColorAndSwatchPicker />);
    classification = 'swatch';
    storyRange('Alpha').focus();
    cy.realPress('Home');
    cy.get('#add-new-color').click();
    cy.get('.fui-ColorSwatch').should('have.length', 1).and('have.attr', 'aria-label', 'rgba(42, 230, 0, 0)');
    cy.get('.fui-ColorSwatch').should('have.focus');
    for (let index = 1; index < 8; index++) {
      cy.get('#add-new-color').click();
    }
    cy.get('#add-new-color').should('be.disabled');
    cy.get('.fui-ColorSwatch').should('have.length', 8);
    cy.get('#reset-example').click();
    cy.get('.fui-ColorSwatch').should('not.exist');
    cy.get('.fui-EmptySwatch').should('have.length', 8);
    storyRange('Alpha').should('have.value', '100');
    cy.get('#add-new-color').should('not.be.disabled');
  });
  scenario(3, 'R3.11 stable ColorArea Default updates descriptive axes and Reset restores color', () => {
    render(<ColorAreaDefault />);
    storyRange('Saturation').focus();
    cy.realPress('ArrowRight');
    storyRange('Saturation').should('have.value', '51').and('have.attr', 'aria-roledescription', '2D slider');
    storyRange('Brightness').should('have.attr', 'aria-valuetext', 'Saturation 51, Brightness: 50, ');
    cy.contains('button', 'Reset').click();
    storyRange('Saturation').should('have.value', '50');
    storyRange('Brightness').should('have.value', '50');
  });
  scenario(3, 'R3.12 stable Channels updates zero saturation without falsy hue fallback and Reset restores', () => {
    render(<ColorSliderChannels />);
    classification = 'channels';
    cy.get('.fui-ColorSlider__input').eq(1).focus();
    cy.realPress('Home');
    cy.get('.fui-ColorSlider__input').eq(1).should('have.value', '0');
    cy.get('.fui-ColorSlider__input').eq(0).should('have.value', '109');
    cy.get('.fui-ColorSlider__input').eq(2).should('have.value', '91');
    cy.contains('button', 'Reset').click();
    cy.get('.fui-ColorSlider__input').eq(1).should('have.value', '100');
  });
  scenario(3, 'R3.13 stable ColorSlider Default horizontal vertical synchronize hue and Reset', () => {
    render(<ColorSliderDefault />);
    storyRange('Vertical Hue').focus();
    cy.realPress('ArrowUp');
    storyRange('Hue').should('have.value', '110').and('have.attr', 'aria-valuetext', '110°, ');
    storyRange('Vertical Hue').should('have.value', '110').and('have.attr', 'aria-orientation', 'vertical');
    cy.contains('button', 'Reset').click();
    storyRange('Hue').should('have.value', '109');
    storyRange('Vertical Hue').should('have.value', '109');
  });
  for (const inverse of [false, true]) {
    scenario(
      3,
      `R3.14 stable Alpha Default ${inverse ? 'transparency' : 'opacity'} changes only its shared pair and resets`,
      () => {
        render(<AlphaSliderDefault />);
        const offset = inverse ? 2 : 0;
        cy.get('.fui-AlphaSlider__input').eq(offset).focus();
        cy.realPress(inverse ? 'ArrowRight' : 'ArrowLeft');
        cy.get('.fui-AlphaSlider__input')
          .eq(offset)
          .should('have.value', inverse ? '1' : '99');
        cy.get('.fui-AlphaSlider__input')
          .eq(offset + 1)
          .should('have.value', inverse ? '1' : '99');
        cy.get('.fui-AlphaSlider__input')
          .eq(inverse ? 0 : 2)
          .should('have.value', inverse ? '100' : '0');
        cy.contains('h3', 'Transparency').should('be.visible');
        cy.get('button')
          .eq(inverse ? 1 : 0)
          .click();
        cy.get('.fui-AlphaSlider__input')
          .eq(offset)
          .should('have.value', inverse ? '0' : '100');
      },
    );
  }
  const pointer = (s: number, v: number, action: 'click' | 'down' | 'move' | 'up' = 'click') =>
    cy.get('#area').then($area => {
      const rect = $area[0].getBoundingClientRect();
      const px = Math.round(s * rect.width);
      const py = Math.round((1 - v) * rect.height);
      if (action === 'move') {
        return cy.get('#area').realMouseMove(px, py, { position: 'topLeft', scrollBehavior: false });
      }
      if (action === 'down') {
        return cy.get('#area').realMouseDown({ x: px, y: py, scrollBehavior: false });
      }
      if (action === 'up') {
        return cy.get('#area').realMouseUp({ x: px, y: py, scrollBehavior: false });
      }
      return cy.get('#area').realClick({ x: px, y: py, scrollBehavior: false });
    });
  const gradient = (dir: 'ltr' | 'rtl', color: HsvColor) =>
    cy
      .get('#area')
      .should($area => {
        const root = $area[0];
        const win = root.ownerDocument.defaultView!;
        const style = win.getComputedStyle(root);
        expect(style.backgroundImage).to.equal(
          `linear-gradient(rgba(0, 0, 0, 0), rgb(0, 0, 0)), linear-gradient(to ${
            dir === 'ltr' ? 'right' : 'left'
          }, rgb(255, 255, 255), rgba(0, 0, 0, 0)), none`,
        );
        expect(style.backgroundColor).to.equal('rgb(0, 128, 255)');
        const thumb = root.querySelector<HTMLElement>('.fui-ColorArea__thumb')!;
        const rect = root.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();
        expect(thumbRect.left + thumbRect.width / 2).to.be.closeTo(
          rect.left + root.clientLeft + root.clientWidth * (dir === 'rtl' ? 1 - color.s : color.s),
          0.1,
        );
        expect(thumbRect.top + thumbRect.height / 2).to.be.closeTo(
          rect.top + root.clientTop + root.clientHeight * (1 - color.v),
          0.1,
        );
      })
      .then($area => {
        const root = $area[0];
        const style = root.ownerDocument.defaultView!.getComputedStyle(root);
        const rect = root.getBoundingClientRect();
        const thumbRect = root.querySelector('.fui-ColorArea__thumb')!.getBoundingClientRect();
        evidence({
          kind: 'gradient',
          scenario: Cypress.currentTest.title,
          dir,
          backgroundImage: style.backgroundImage,
          backgroundColor: style.backgroundColor,
          s: color.s,
          v: color.v,
          thumbColor: getComputedStyle(root.querySelector('.fui-ColorArea__thumb')!).backgroundColor,
          thumbFractionX: (thumbRect.left + thumbRect.width / 2 - rect.left - root.clientLeft) / root.clientWidth,
          thumbFractionY: (thumbRect.top + thumbRect.height / 2 - rect.top - root.clientTop) / root.clientHeight,
        });
      });
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const arrow of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'] as const) {
      scenario(4, `R4.01 ${dir} ${arrow} integrates area physical deltas and native hue opacity direction`, () => {
        const change = cy.stub().as('change');
        render(<Picker onChange={change} />, dir);
        const areaColor = {
          ...initial,
          s: arrow === 'ArrowRight' ? 0.51 : arrow === 'ArrowLeft' ? 0.49 : initial.s,
          v: arrow === 'ArrowUp' ? 0.81 : arrow === 'ArrowDown' ? 0.79 : initial.v,
        };
        const increment =
          arrow === 'ArrowUp' || (arrow === 'ArrowRight' && dir === 'ltr') || (arrow === 'ArrowLeft' && dir === 'rtl');
        x().focus();
        cy.realPress(arrow);
        selected(areaColor);
        gradient(dir, areaColor);
        key('#hue', arrow);
        const hueColor = { ...areaColor, h: initial.h + (increment ? 1 : -1) };
        selected(hueColor);
        key('#alpha', arrow);
        const alphaColor = { ...hueColor, a: increment ? 0.41 : 0.39 };
        channels(alphaColor);
        selected(alphaColor);
        lastChange('@change', alphaColor, 3, 'change');
      });
    }
  }
  for (const [id, field, maximum] of [
    ['hue', 'h', 360],
    ['saturation', 's', 1],
    ['value', 'v', 1],
    ['alpha', 'a', 1],
    ['transparency', 'a', 0],
  ] as const) {
    for (const endpoint of ['Home', 'End'] as const) {
      scenario(4, `R4.02 ${id} ${endpoint} clamps at exact endpoint without extra callback on repetition`, () => {
        const change = cy.stub().as('change');
        render(<Picker onChange={change} />);
        const value = endpoint === 'End' ? maximum : id === 'transparency' ? 1 : 0;
        const color = { ...initial, [field]: value };
        key(`#${id}`, endpoint);
        channels(color);
        selected(color);
        lastChange('@change', color, 1, 'change');
        cy.realPress(endpoint);
        lastChange('@change', color, 1, 'change');
      });
    }
    for (const page of ['PageUp', 'PageDown'] as const) {
      scenario(4, `R4.03 ${id} ${page} native large step synchronizes exact derived channel`, () => {
        const change = cy.stub().as('change');
        render(<Picker onChange={change} />);
        const delta = (page === 'PageUp' ? 1 : -1) * (id === 'hue' ? 36 : 0.1) * (id === 'transparency' ? -1 : 1);
        const color = { ...initial, [field]: Number((initial[field]! + delta).toFixed(2)) };
        key(`#${id}`, page);
        selected(color);
        channels(color);
        lastChange('@change', color, 1, 'change');
      });
    }
  }
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const [s, v] of [
      [0.25, 0.75],
      [0.75, 0.25],
      [0.33, 0.67],
    ] as const) {
      scenario(
        4,
        `R4.04 ${dir} trusted area pointer ${s}/${v} synchronizes precise rounded channels and rendered gradient`,
        () => {
          const change = cy.stub().as('change');
          render(<Picker onChange={change} />, dir);
          pointer(s, v);
          const color = { ...initial, s, v };
          channels(color);
          selected(color);
          lastChange('@change', color, 1, 'pointerdown');
          cy.get<sinon.SinonStub>('@change').should(stub => expect(stub.lastCall.args[0].isTrusted).to.equal(true));
          gradient(dir, color);
        },
      );
    }
    for (const id of ['hue', 'alpha'] as const) {
      scenario(4, `R4.05 ${dir} trusted ${id} midpoint pointer updates all controlled children`, () => {
        const change = cy.stub().as('change');
        render(<Picker onChange={change} />, dir);
        cy.get(`#${id}`).realClick();
        const color = { ...initial, ...(id === 'hue' ? { h: 180 } : { a: 0.5 }) };
        channels(color);
        selected(color);
        lastChange('@change', color, 1, 'change');
        cy.get<sinon.SinonStub>('@change').should(stub =>
          expect(stub.lastCall.args[0].nativeEvent.isTrusted).to.equal(true),
        );
      });
    }
    scenario(4, `R4.06 ${dir} document drag clamps beyond bounds and pointerup stops forwarding`, () => {
      const change = cy.stub().as('change');
      render(
        <div style={{ width: 300 }}>
          <Picker onChange={change} />
        </div>,
        dir,
      );
      pointer(0.25, 0.75, 'down');
      lastChange('@change', { ...initial, s: 0.25, v: 0.75 }, 1, 'pointerdown');
      pointer(1.1, -0.1, 'move');
      channels({ ...initial, s: 1, v: 0 });
      lastChange('@change', { ...initial, s: 1, v: 0 }, 2, 'pointermove');
      pointer(1.1, -0.1, 'up');
      pointer(0.5, 0.5, 'move');
      lastChange('@change', { ...initial, s: 1, v: 0 }, 2, 'pointermove');
      channels({ ...initial, s: 1, v: 0 });
    });
  }
  scenario(4, 'R4.07 real forward reverse Tab preserves active-axis reentry and native sibling order', () => {
    render(<Picker />);
    cy.get('#before').focus();
    cy.realPress('Tab');
    x().should('have.focus');
    cy.realPress('ArrowUp');
    x().should('have.focus');
    y().should('have.attr', 'tabindex', '0');
    cy.realPress('Tab');
    y().should('have.focus');
    cy.realPress('Tab');
    cy.get('#hue').should('have.focus');
    cy.realPress(['Shift', 'Tab']);
    y().should('have.focus');
    cy.realPress('Tab');
    cy.realPress('Tab');
    cy.get('#saturation').should('have.focus');
  });
  scenario(4, 'R4.08 disabled native hue is skipped by Tab and emits no requests while other children work', () => {
    const change = cy.stub().as('change');
    render(
      <>
        <button id="before">Before</button>
        <ColorPicker color={initial} onColorChange={change}>
          <ColorSlider id="hue" aria-label="Hue" disabled />
          <AlphaSlider id="alpha" aria-label="Alpha" />
        </ColorPicker>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#alpha').should('have.focus');
    cy.get('#hue').should('be.disabled');
    cy.get('@change').should('not.have.been.called');
    cy.realPress('ArrowRight');
    lastChange('@change', { ...initial, a: 0.41 }, 1, 'change');
  });
  scenario(
    4,
    'R4.09 undefined-color parent supports independent child defaults and default updates do not reset',
    () => {
      const change = cy.stub().as('change');
      const Defaults = () => {
        const [updated, setUpdated] = React.useState(false);
        const color = updated ? replacement : initial;
        return (
          <>
            <ColorPicker onColorChange={change}>
              <ColorArea id="area" {...labels} defaultColor={color} />
              <ColorSlider id="hue" aria-label="Hue" defaultColor={color} />
              <AlphaSlider id="alpha" aria-label="Alpha" defaultColor={color} />
            </ColorPicker>
            <button id="defaults" onClick={() => setUpdated(true)}>
              Change defaults
            </button>
          </>
        );
      };
      render(<Defaults />);
      x().focus();
      cy.realPress('ArrowRight');
      x().should('have.value', '51');
      cy.get('#hue').should('have.value', '210');
      cy.get('#alpha').should('have.value', '40');
      cy.get('#defaults').click();
      x().should('have.value', '51');
      cy.get('#hue').should('have.value', '210');
      cy.get('#alpha').should('have.value', '40');
      lastChange('@change', { ...initial, s: 0.51 }, 1, 'keydown');
    },
  );
  scenario(4, 'R4.10 uncontrolled sliders report source-defined black fallback for absent context color', () => {
    const change = cy.stub().as('change');
    render(
      <ColorPicker onColorChange={change}>
        <ColorArea id="area" {...labels} defaultColor={initial} />
        <ColorSlider id="hue" aria-label="Hue" defaultColor={initial} />
        <AlphaSlider id="alpha" aria-label="Alpha" defaultColor={initial} />
      </ColorPicker>,
    );
    key('#hue', 'ArrowRight');
    lastChange('@change', { h: 211, s: 0, v: 0, a: 1 }, 1, 'change');
    cy.get('#hue').should('have.value', '211');
    key('#alpha', 'ArrowRight');
    lastChange('@change', { h: 0, s: 0, v: 0, a: 0.41 }, 2, 'change');
    x().should('have.value', '50');
    y().should('have.value', '80');
  });
  scenario(4, 'R4.11 native slot step min max are honored and parent receives current exact event target', () => {
    const slot = cy.stub().as('slot');
    const change = cy.stub().as('change');
    render(
      <ColorPicker color={initial} onColorChange={change}>
        <ColorSlider id="hue" aria-label="Hue" input={{ step: 5, min: 10, max: 350, onChange: slot }} />
      </ColorPicker>,
    );
    key('#hue', 'ArrowRight');
    lastChange('@change', { ...initial, h: 215 }, 1, 'change');
    cy.get<sinon.SinonStub>('@change').should(stub => expect(stub.lastCall.args[0].target.id).to.equal('hue'));
    cy.get('@slot').should('have.been.calledOnce');
    cy.then(() => expect(slot.firstCall.calledBefore(change.firstCall)).to.equal(true));
  });
  for (const dir of ['ltr', 'rtl'] as const) {
    scenario(4, `R4.12 ${dir} actual forced-colors preserves gradients thumb geometry and focus feedback`, () => {
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [{ name: 'forced-colors', value: 'active' }] },
        }),
      );
      render(<Picker />, dir);
      cy.window().should(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true));
      gradient(dir, initial);
      cy.get('#area').should('have.css', 'forced-color-adjust', 'none');
      cy.get('#before').focus();
      cy.realPress('Tab');
      x().should('have.focus');
      cy.realPress('ArrowRight');
      gradient(dir, { ...initial, s: 0.51 });
      cy.get('.fui-ColorArea__thumb').should($thumb =>
        expect(getComputedStyle($thumb[0], '::after').borderTopWidth).to.equal('2px'),
      );
      audit('axe-checkpoint');
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [] },
        }),
      );
    });
  }
  for (const vertical of [false, true]) {
    scenario(
      4,
      `R4.13 ${vertical ? 'vertical' : 'horizontal'} alpha transparency directions render exact unit-derived gradients`,
      () => {
        render(
          <ColorPicker color={initial}>
            <ColorSlider id="hue" aria-label="Hue" vertical={vertical} />
            <AlphaSlider id="alpha" aria-label="Opacity" vertical={vertical} />
            <AlphaSlider id="transparency" aria-label="Transparency" transparency vertical={vertical} />
          </ColorPicker>,
        );
        cy.get('#hue').should('have.attr', 'aria-orientation', vertical ? 'vertical' : 'horizontal');
        cy.get('#alpha')
          .parent()
          .should($root =>
            expect($root[0].style.getPropertyValue('--fui-AlphaSlider--direction')).to.equal(
              vertical ? '0deg' : '90deg',
            ),
          );
        cy.get('#transparency')
          .parent()
          .should($root =>
            expect($root[0].style.getPropertyValue('--fui-AlphaSlider--direction')).to.equal(
              vertical ? '180deg' : '-90deg',
            ),
          );
        cy.get('.fui-AlphaSlider__rail')
          .first()
          .should($rail =>
            expect(getComputedStyle($rail[0]).backgroundImage).to.contain(
              `linear-gradient(${vertical ? '0deg' : '90deg'}, rgba(0, 0, 0, 0), rgb(102, 153, 204))`,
            ),
          );
        key('#alpha', 'ArrowUp');
        cy.get('#alpha').should('have.value', '40');
      },
    );
  }
  scenario(4, 'R4.14 resize uses current geometry without remount and preserves exact pointer color', () => {
    const Resize = () => {
      const [width, setWidth] = React.useState(300);
      const [color, setColor] = React.useState(initial);
      return (
        <>
          <ColorPicker color={color} onColorChange={(_, data) => setColor(data.color)}>
            <ColorArea id="area" {...labels} style={{ width, height: 300 }} />
            <ColorSlider id="hue" aria-label="Hue" />
            <AlphaSlider id="alpha" aria-label="Alpha" />
          </ColorPicker>
          <button id="resize" onClick={() => setWidth(500)}>
            Resize
          </button>
        </>
      );
    };
    render(<Resize />);
    cy.get('#area')
      .should('have.css', 'width', '300px')
      .then($area => {
        cy.get('#resize').click();
        cy.get('#area')
          .should('have.css', 'width', '500px')
          .should($current => expect($current[0]).to.equal($area[0]));
      });
    pointer(0.25, 0.75);
    x().should('have.value', '25');
    y().should('have.value', '75');
    gradient('ltr', { ...initial, s: 0.25, v: 0.75 });
  });
  scenario(4, 'R4.15 controlled replacement during live document drag uses new hue alpha and latest callback', () => {
    const first = cy.stub().as('first');
    const second = cy.stub().as('second');
    const LiveDrag = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <ColorPicker color={updated ? replacement : initial} onColorChange={updated ? second : first}>
            <Controls />
          </ColorPicker>
          <button id="update" onClick={() => setUpdated(true)}>
            Update during drag
          </button>
        </>
      );
    };
    render(<LiveDrag />);
    pointer(0.25, 0.75, 'down');
    lastChange('@first', { ...initial, s: 0.25, v: 0.75 }, 1, 'pointerdown');
    cy.get<HTMLButtonElement>('#update').then($button => $button[0].click());
    channels(replacement);
    pointer(0.75, 0.25, 'move');
    lastChange('@second', { ...replacement, s: 0.75, v: 0.25 }, 1, 'pointermove');
    cy.get('@first').should('have.been.calledOnce');
    pointer(0.75, 0.25, 'up');
  });
  scenario(4, 'R4.16 stable Popup outside dismissal unmounts controls and retains uncommitted draft', () => {
    render(<ColorPickerPopup />);
    choose();
    popupDraft().focus();
    cy.realPress('ArrowLeft');
    audit('axe-checkpoint');
    cy.get('#fixture').realClick({ x: 500, y: 20 });
    popupSurface().should('not.exist');
    cy.get('#fixture > div').last().should('have.css', 'background-color', 'rgb(42, 230, 0)');
    choose();
    popupDraft().should('have.value', '99');
    closePopup();
  });
});
