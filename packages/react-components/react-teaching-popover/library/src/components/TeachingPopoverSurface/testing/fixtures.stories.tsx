import * as React from 'react';
import {
  TeachingPopover,
  TeachingPopoverTrigger,
  TeachingPopoverSurface,
  TeachingPopoverBody,
  TeachingPopoverTitle,
  useTeachingPopoverSurface_unstable,
  useTeachingPopoverSurfaceStyles_unstable,
  renderTeachingPopoverSurface_unstable,
  useTeachingPopover_unstable,
  useTeachingPopoverContextValues_unstable,
  renderTeachingPopover_unstable,
} from '../../../index';
import type {
  TeachingPopoverProps,
  TeachingPopoverSurfaceProps,
  TeachingPopoverSurfaceState,
  TeachingPopoverState,
} from '../../../index';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Observe the inherited owner refs, not a copied context.
import { usePopoverContext_unstable } from '@fluentui/react-popover';
// nx-ignore-next-line
import type { JSXElement } from '@fluentui/react-components';

export type OwnerProps = Omit<TeachingPopoverProps, 'children'>;
export type OpenEvent = Parameters<NonNullable<OwnerProps['onOpenChange']>>[0];
export type EventRecord = { type: string; open: boolean; trusted: boolean; prevented: boolean; version: number };
export type HarnessProps = {
  owner?: OwnerProps;
  surface?: TeachingPopoverSurfaceProps;
  surfaceRef?: React.Ref<HTMLDivElement>;
  composed?: boolean;
  onState?: (state: TeachingPopoverSurfaceState) => void;
  onOwnerState?: (state: TeachingPopoverState) => void;
  onRecord?: (record: EventRecord, event: OpenEvent) => void;
  control?: 'accept' | 'refuse';
  initial?: boolean;
  children?: React.ReactNode;
};

export const ComposedSurface = React.forwardRef<
  HTMLDivElement,
  TeachingPopoverSurfaceProps & {
    onState?: HarnessProps['onState'];
    prepareState?: (state: TeachingPopoverSurfaceState) => void;
  }
>((props, ref) => {
  const { onState, prepareState, ...surfaceProps } = props;
  const state = useTeachingPopoverSurface_unstable(surfaceProps, ref);
  prepareState?.(state);
  const styled = useTeachingPopoverSurfaceStyles_unstable(state);
  React.useEffect(() => onState?.(styled));
  return renderTeachingPopoverSurface_unstable(styled);
});
ComposedSurface.displayName = 'ComposedSurface';
export const ComposedOwner = (props: TeachingPopoverProps & { onState?: HarnessProps['onOwnerState'] }): JSXElement => {
  const { onState, ...ownerProps } = props;
  const state = useTeachingPopover_unstable(ownerProps);
  React.useEffect(() => onState?.(state));
  return renderTeachingPopover_unstable(state, useTeachingPopoverContextValues_unstable(state));
};
export const ContextConsumer = (props: { children?: React.ReactNode }): JSXElement => {
  const value = usePopoverContext_unstable(context => ({
    size: context.size,
    appearance: context.appearance,
    withArrow: context.withArrow,
    inline: context.inline,
  }));
  return <div data-context={JSON.stringify(value)}>{props.children}</div>;
};
export const Harness = (props: HarnessProps): JSXElement => {
  const [open, setOpen] = React.useState(props.initial ?? false);
  const [version, setVersion] = React.useState(0);
  const [text, setText] = React.useState('First lesson');
  const [mounted, setMounted] = React.useState(true);
  const Surface = props.composed ? ComposedSurface : TeachingPopoverSurface;
  const Owner = props.onOwnerState ? ComposedOwner : TeachingPopover;
  return (
    <>
      <div style={{ position: 'fixed', right: 20, top: 20 }}>
        <button id="outside">Outside</button>
        <button id="replace" onClick={() => setVersion(value => value + 1)}>
          Replace callback and owner options
        </button>
        <button id="external-close" onClick={() => setOpen(false)}>
          Close controlled owner
        </button>
        <button id="unmount" onClick={() => setMounted(false)}>
          Unmount owner
        </button>
      </div>
      {mounted && (
        <Owner
          {...props.owner}
          {...(props.control ? { open } : {})}
          {...(version ? { size: 'large' as const, withArrow: false } : {})}
          {...(props.onOwnerState ? { onState: props.onOwnerState } : {})}
          onOpenChange={(event, data) => {
            props.onRecord?.(
              {
                type: event.type,
                open: data.open,
                version,
                trusted: 'nativeEvent' in event ? event.nativeEvent.isTrusted : event.isTrusted,
                prevented: event.defaultPrevented,
              },
              event,
            );
            props.owner?.onOpenChange?.(event, data);
            if (props.control === 'accept') {
              setOpen(data.open);
            }
          }}
        >
          <TeachingPopoverTrigger disableButtonEnhancement>
            <button id="surface-trigger" style={{ position: 'fixed', left: 500, top: 360 }}>
              Show surface
            </button>
          </TeachingPopoverTrigger>
          <Surface
            id="surface"
            aria-labelledby="surface-title"
            aria-describedby="surface-description"
            ref={props.surfaceRef}
            {...(props.composed ? { onState: props.onState } : {})}
            {...props.surface}
          >
            <TeachingPopoverBody>
              <TeachingPopoverTitle id="surface-title">Surface lesson</TeachingPopoverTitle>
              <p id="surface-description">{text}</p>
              {props.children ?? (
                <>
                  <button id="surface-first" onClick={() => setText('Updated lesson')}>
                    Update lesson
                  </button>
                  <button id="surface-last">Last action</button>
                </>
              )}
            </TeachingPopoverBody>
          </Surface>
        </Owner>
      )}
      <p>Exposed test stage content</p>
    </>
  );
};
