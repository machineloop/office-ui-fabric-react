import * as React from 'react';
import {
  TeachingPopover,
  TeachingPopoverTrigger,
  TeachingPopoverSurface,
  TeachingPopoverHeader,
  TeachingPopoverBody,
  TeachingPopoverTitle,
  TeachingPopoverFooter,
  TeachingPopoverCarousel,
  TeachingPopoverCarouselCard,
  TeachingPopoverCarouselFooter,
  TeachingPopoverCarouselNav,
  TeachingPopoverCarouselNavButton,
  TeachingPopoverCarouselPageCount,
  useTeachingPopover_unstable,
  useTeachingPopoverContextValues_unstable,
  renderTeachingPopover_unstable,
} from '../../../index';
import type { TeachingPopoverProps, TeachingPopoverSurfaceProps, TeachingPopoverState } from '../../../index';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Owner context is inherited from Popover, not exported by the aggregate.
import { usePopoverContext_unstable } from '@fluentui/react-popover';
// nx-ignore-next-line
import { Button as FluentButton } from '@fluentui/react-components';
// nx-ignore-next-line
import type { JSXElement } from '@fluentui/react-components';

export type OwnerProps = Omit<TeachingPopoverProps, 'children'>;
export type OpenEvent = Parameters<NonNullable<OwnerProps['onOpenChange']>>[0];
export type RecordEvent = { type: string; open: boolean; trusted: boolean; callback: string };
export type HarnessProps = {
  owner?: OwnerProps;
  surface?: TeachingPopoverSurfaceProps;
  trigger?: React.ComponentProps<typeof FluentButton>;
  control?: 'accept' | 'reject';
  initial?: boolean;
  composed?: boolean;
  noTrigger?: boolean;
  enhanced?: boolean;
  content?: React.ReactNode;
  header?: boolean;
  onRecord?: (event: RecordEvent) => void;
  onOriginal?: (event: OpenEvent) => void;
  onTrigger?: (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  onState?: (state: TeachingPopoverState) => void;
  triggerRef?: React.Ref<HTMLButtonElement>;
  surfaceRef?: React.Ref<HTMLDivElement>;
};

export const ContextProbe = (): JSXElement => {
  const value = usePopoverContext_unstable(context => ({
    open: context.open,
    trapFocus: context.trapFocus,
    withArrow: context.withArrow,
    inline: context.inline,
    size: context.size,
    appearance: context.appearance,
    inertTrapFocus: context.inertTrapFocus,
  }));
  return (
    <output data-context style={{ display: 'block', maxWidth: 260, overflowWrap: 'anywhere' }}>
      {JSON.stringify(value)}
    </output>
  );
};
export const ComposedOwner = (props: TeachingPopoverProps & { onState?: HarnessProps['onState'] }): JSXElement => {
  const state = useTeachingPopover_unstable(props);
  React.useEffect(() => props.onState?.(state));
  return renderTeachingPopover_unstable(state, useTeachingPopoverContextValues_unstable(state));
};
export const Harness = (props: HarnessProps): JSXElement => {
  const [open, setOpen] = React.useState(props.initial ?? false);
  const [latest, setLatest] = React.useState(false);
  const [text, setText] = React.useState('First teaching panel');
  const [mounted, setMounted] = React.useState(true);
  const [version, setVersion] = React.useState(0);
  const [changed, setChanged] = React.useState(false);
  const Owner = props.composed ? ComposedOwner : TeachingPopover;
  const onOpenChange: OwnerProps['onOpenChange'] = (event, data) => {
    props.onOriginal?.(event);
    props.onRecord?.({
      type: event.type,
      open: data.open,
      trusted: 'nativeEvent' in event ? event.nativeEvent.isTrusted : event.isTrusted,
      callback: latest ? 'latest' : 'initial',
    });
    props.owner?.onOpenChange?.(event, data);
    if (props.control === 'accept') {
      setOpen(data.open);
    }
  };
  const child = (
    <FluentButton
      id="teaching-trigger"
      ref={props.triggerRef}
      style={{ position: 'fixed', left: 450, top: 350 }}
      onClick={props.onTrigger}
      {...props.trigger}
    >
      Show lesson
    </FluentButton>
  );
  const surface = (
    <TeachingPopoverSurface
      id="teaching-surface"
      aria-labelledby="lesson-title"
      aria-describedby="lesson-description"
      ref={props.surfaceRef}
      {...props.surface}
    >
      {props.header && <TeachingPopoverHeader>Tips</TeachingPopoverHeader>}
      <TeachingPopoverBody>
        <TeachingPopoverTitle id="lesson-title">Learn the feature</TeachingPopoverTitle>
        <p id="lesson-description">{text}</p>
        {props.content ?? (
          <>
            <button id="lesson-one" onClick={() => setText('Second teaching panel')}>
              Update lesson
            </button>
            <button id="lesson-two">Second action</button>
          </>
        )}
      </TeachingPopoverBody>
      <ContextProbe />
    </TeachingPopoverSurface>
  );
  return (
    <>
      <div style={{ position: 'fixed', right: 16, top: 16, display: 'flex', flexDirection: 'column' }}>
        <button id="before">Before lesson</button>
        <button id="external-open" onClick={() => setOpen(true)}>
          Open externally
        </button>
        <button id="external-close" onClick={() => setOpen(false)}>
          Close externally
        </button>
        <button
          id="replace"
          onClick={() => {
            setLatest(true);
            setChanged(true);
          }}
        >
          Replace callback and props
        </button>
        <button id="unmount" onClick={() => setMounted(false)}>
          Unmount owner
        </button>
        <button
          id="remount"
          onClick={() => {
            setMounted(true);
            setVersion(value => value + 1);
          }}
        >
          Remount owner
        </button>
      </div>
      {mounted && (
        <Owner
          key={version}
          {...props.owner}
          {...(props.control ? { open } : {})}
          {...(changed ? { withArrow: false, size: 'large' as const } : {})}
          onOpenChange={onOpenChange}
          {...(props.composed ? { onState: props.onState } : {})}
        >
          {props.noTrigger
            ? surface
            : [
                <TeachingPopoverTrigger key="trigger" disableButtonEnhancement={props.enhanced === false}>
                  {child}
                </TeachingPopoverTrigger>,
                React.cloneElement(surface, { key: 'surface' }),
              ]}
        </Owner>
      )}
      <button id="after" style={{ position: 'fixed', right: 16, bottom: 16 }}>
        After lesson
      </button>
      <output
        data-owner-open
        style={{
          position: 'fixed',
          left: 16,
          bottom: 16,
          backgroundColor: 'var(--colorNeutralBackground1)',
          color: 'var(--colorNeutralForeground1)',
        }}
      >
        {String(open)}
      </output>
    </>
  );
};

export const CarouselFixture = (props: {
  owner?: OwnerProps;
  text?: boolean;
  onRecord?: (kind: string, event: unknown, data: unknown) => void;
  controlled?: boolean;
}): JSXElement => {
  const [value, setValue] = React.useState('one');
  return (
    <TeachingPopover {...props.owner}>
      <TeachingPopoverTrigger>
        <FluentButton id="teaching-trigger">Show lesson</FluentButton>
      </TeachingPopoverTrigger>
      <TeachingPopoverSurface id="teaching-surface" aria-label="Feature tutorial">
        <TeachingPopoverHeader>Tips</TeachingPopoverHeader>
        <TeachingPopoverCarousel
          defaultValue="one"
          {...(props.controlled ? { value } : {})}
          announcement={page => `Lesson ${page}`}
          onValueChange={(event, data) => {
            props.onRecord?.('value', event, data);
            if (props.controlled) {
              if (data.value === undefined) {
                throw new Error('Carousel value request must identify a page');
              }
              setValue(data.value);
            }
          }}
          onFinish={(event, data) => props.onRecord?.('finish', event, data)}
        >
          {['one', 'two', 'three'].map((page, index) => (
            <TeachingPopoverCarouselCard key={page} value={page}>
              <TeachingPopoverBody>
                <TeachingPopoverTitle>Lesson {index + 1}</TeachingPopoverTitle>
                <p style={{ minHeight: 40 + index * 40 }}>Feature page {page}</p>
              </TeachingPopoverBody>
            </TeachingPopoverCarouselCard>
          ))}
          <TeachingPopoverCarouselFooter next="Next" previous="Previous" initialStepText="Close" finalStepText="Finish">
            {props.text ? (
              <TeachingPopoverCarouselPageCount>
                {(index, count) => `${index} of ${count}`}
              </TeachingPopoverCarouselPageCount>
            ) : (
              <TeachingPopoverCarouselNav>
                {index => <TeachingPopoverCarouselNavButton aria-label={`Tip ${index}`} />}
              </TeachingPopoverCarouselNav>
            )}
          </TeachingPopoverCarouselFooter>
        </TeachingPopoverCarousel>
      </TeachingPopoverSurface>
    </TeachingPopover>
  );
};
export { TeachingPopoverFooter };
