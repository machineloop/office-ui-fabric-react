import * as React from 'react';
// nx-ignore-next-line
import type { JSXElement } from '@fluentui/react-components';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Initialize the real public Tabster focus observer for standalone native controls.
import { useFocusFinders } from '@fluentui/react-tabster';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Explicit source-only slot replacement, not a supported Button as="span" API.
import { useARIAButtonProps } from '@fluentui/react-aria';
import {
  TeachingPopover,
  TeachingPopoverBody,
  TeachingPopoverFooter,
  TeachingPopoverSurface,
  TeachingPopoverTitle,
  TeachingPopoverTrigger,
  renderTeachingPopoverFooter_unstable,
  useTeachingPopoverFooter_unstable,
  useTeachingPopoverFooterBase_unstable,
} from '../../../index';
import { useTeachingPopoverFooterStyles_unstable } from '../../../TeachingPopoverFooter';
import type {
  TeachingPopoverProps,
  TeachingPopoverFooterProps,
  TeachingPopoverFooterState,
  TeachingPopoverFooterBaseState,
} from '../../../index';
// nx-ignore-next-line
import { Button } from '@fluentui/react-components';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Actual inherited owner context, not a Footer API.
import { PopoverProvider } from '@fluentui/react-popover';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Actual inherited owner context.
import type { PopoverContextValue } from '@fluentui/react-popover';

export { TeachingPopoverFooter };
export const FocusObserver = (): null => {
  useFocusFinders();
  return null;
};
export const SpanAction = (props: { onClick?: React.MouseEventHandler<HTMLElement> }): JSXElement => {
  const enhanced = useARIAButtonProps('div', { id: 'span-action', onClick: props.onClick });
  return <span {...enhanced}>Source-only span action</span>;
};
export type FooterProps = TeachingPopoverFooterProps;
export type FooterEvent = Parameters<NonNullable<React.ComponentProps<typeof Button>['onClick']>>[0];
export type OwnerEvent = Parameters<NonNullable<TeachingPopoverProps['onOpenChange']>>[0];
export type Trace = {
  callback: string;
  type: string;
  trusted: boolean;
  prevented: boolean;
  open?: boolean;
  keys?: string[];
  target: string;
};
export function trace(callback: string, event: FooterEvent | OwnerEvent, open?: boolean): Trace {
  const native = 'nativeEvent' in event ? event.nativeEvent : event;
  return {
    callback,
    type: event.type,
    trusted: native.isTrusted,
    prevented: event.defaultPrevented,
    open,
    target: event.target instanceof Element ? event.target.id : '',
    keys: open === undefined ? undefined : ['open'],
  };
}
export const ComposedFooter = React.forwardRef<
  HTMLDivElement,
  FooterProps & { onState?: (state: TeachingPopoverFooterState) => void }
>((props, ref) => {
  const state = useTeachingPopoverFooter_unstable(props, ref);
  useTeachingPopoverFooterStyles_unstable(state);
  React.useEffect(() => {
    props.onState?.(state);
  });
  return renderTeachingPopoverFooter_unstable(state);
});
export const BaseFooter = (props: {
  onState?: (state: TeachingPopoverFooterBaseState) => void;
  veto?: boolean;
}): JSXElement => {
  const ref = React.useRef<HTMLDivElement>(null);
  const state = useTeachingPopoverFooterBase_unstable({ id: 'base-root', children: 'Base child' }, ref);
  React.useEffect(() => {
    props.onState?.(state);
  });
  const handleClick: React.MouseEventHandler<HTMLButtonElement & HTMLAnchorElement & HTMLDivElement> = event => {
    if (props.veto) {
      event.preventDefault();
    }
    state.handleButtonClick(event);
  };
  return (
    <div {...state.root}>
      <button id="base-action" onClick={handleClick}>
        Base action
      </button>
    </div>
  );
};
export const ContextFooter = (props: {
  footer: FooterProps;
  appearance?: PopoverContextValue['appearance'];
  onToggle?: (event: OwnerEvent) => void;
  onState?: (state: TeachingPopoverFooterState) => void;
  onVersionToggle?: (event: OwnerEvent, latest: boolean) => void;
  content?: React.ReactNode;
  prefix?: string;
}): JSXElement => {
  const [latest, setLatest] = React.useState(false);
  const context: PopoverContextValue = {
    open: true,
    setOpen: () => undefined,
    toggleOpen: event => {
      props.onToggle?.(event);
      props.onVersionToggle?.(event, latest);
    },
    triggerRef: { current: null },
    contentRef: { current: null },
    arrowRef: { current: null },
    openOnHover: false,
    openOnContext: false,
    inline: false,
    size: 'medium',
    appearance: latest ? 'brand' : props.appearance,
  };
  return (
    <>
      <button id={`${props.prefix ?? ''}replace-context`} onClick={() => setLatest(true)}>
        Replace context
      </button>
      <PopoverProvider value={context}>
        {props.content ?? <ComposedFooter {...props.footer} onState={props.onState} />}
      </PopoverProvider>
    </>
  );
};
export type HarnessProps = {
  footer?: FooterProps;
  control?: 'accept' | 'refuse';
  defaultOpen?: boolean;
  appearance?: TeachingPopoverProps['appearance'];
  modal?: boolean;
  composed?: boolean;
  onRecord?: (event: Trace) => void;
  onOwner?: (event: OwnerEvent, data: { open: boolean }) => void;
  onAction?: (event: FooterEvent) => void;
  preventAction?: boolean;
  captureVeto?: boolean;
  ownerVeto?: boolean;
  rootRef?: React.Ref<HTMLDivElement>;
  prefix?: string;
};
export const Harness = (props: HarnessProps): JSXElement => {
  const [open, setOpen] = React.useState(props.defaultOpen ?? false);
  const [latest, setLatest] = React.useState(false);
  const Component = props.composed ? ComposedFooter : TeachingPopoverFooter;
  const id = (name: string) => `${props.prefix ?? ''}${name}`;
  const action = (callback: string) => (event: FooterEvent) => {
    props.onAction?.(event);
    if (props.preventAction) {
      event.preventDefault();
    }
    props.onRecord?.(trace(latest ? `${callback}-latest` : callback, event));
  };
  const footer: FooterProps = props.footer ?? {
    primary: { id: id('primary'), children: 'Learn more', onClick: action('primary') },
    secondary: { id: id('secondary'), children: 'Got it', onClick: action('secondary') },
  };
  return (
    <>
      <button id={id('before')}>Before lesson</button>
      <button id={id('external-open')} onClick={() => setOpen(true)}>
        Open externally
      </button>
      <button id={id('external-close')} onClick={() => setOpen(false)}>
        Close externally
      </button>
      <TeachingPopover
        appearance={props.appearance}
        defaultOpen={props.defaultOpen}
        open={props.control ? open : undefined}
        trapFocus={props.modal ?? false}
        onOpenChange={(event, data) => {
          props.onOwner?.(event, data);
          props.onRecord?.(trace(latest ? 'owner-latest' : 'owner', event, data.open));
          if (props.ownerVeto) {
            event.preventDefault();
          }
          if (props.control === 'accept') {
            setOpen(data.open);
          }
        }}
      >
        <TeachingPopoverTrigger>
          <Button id={id('trigger')} style={{ position: 'fixed', left: props.prefix ? 750 : 450, top: 350 }}>
            Show lesson
          </Button>
        </TeachingPopoverTrigger>
        <TeachingPopoverSurface id={id('surface')} aria-labelledby={id('title')} aria-describedby={id('description')}>
          <TeachingPopoverBody>
            <TeachingPopoverTitle id={id('title')}>Learn the feature</TeachingPopoverTitle>
            <p id={id('description')}>A meaningful teaching panel.</p>
            <button id={id('replace')} onClick={() => setLatest(true)}>
              Replace callbacks
            </button>
          </TeachingPopoverBody>
          <Component
            id={id('footer')}
            ref={props.rootRef}
            onClickCapture={event => {
              if (props.captureVeto) {
                event.preventDefault();
              }
            }}
            onClick={event => props.onRecord?.(trace('root', event))}
            {...footer}
          />
        </TeachingPopoverSurface>
      </TeachingPopover>
      <button id={id('after')}>After lesson</button>
    </>
  );
};
