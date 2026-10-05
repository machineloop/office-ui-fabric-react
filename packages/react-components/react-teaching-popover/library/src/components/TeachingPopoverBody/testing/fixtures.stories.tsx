import * as React from 'react';
import {
  TeachingPopoverBody,
  useTeachingPopoverBody_unstable,
  useTeachingPopoverBodyStyles_unstable,
  renderTeachingPopoverBody_unstable,
} from '../../../index';
import type { TeachingPopoverBodyProps, TeachingPopoverBodyState } from '../../../index';
import { useMediaStyles } from '../index';
// nx-ignore-next-line
import type { JSXElement } from '@fluentui/react-components';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Custom styles are an explicit public composition extension.
import { useCustomStyleHook_unstable } from '@fluentui/react-shared-contexts';

export const ComposedBody = React.forwardRef<
  HTMLDivElement,
  TeachingPopoverBodyProps & { onState?: (state: TeachingPopoverBodyState) => void }
>((props, ref) => {
  const { onState, ...bodyProps } = props;
  const state = useTeachingPopoverBody_unstable(bodyProps, ref);
  const classes = useMediaStyles();
  useTeachingPopoverBodyStyles_unstable(state);
  useCustomStyleHook_unstable('useTeachingPopoverBodyStyles_unstable')(state);
  React.useEffect(() => onState?.(state));
  return (
    <>
      {renderTeachingPopoverBody_unstable(state)}
      <output data-media-classes>{Object.keys(classes).sort().join(',')}</output>
    </>
  );
});

export const RawBody = React.forwardRef<HTMLDivElement, TeachingPopoverBodyProps>((props, ref) => {
  const state = useTeachingPopoverBody_unstable(props, ref);
  return renderTeachingPopoverBody_unstable(state);
});

export const StatefulChild = (): JSXElement => {
  const [value, setValue] = React.useState(0);
  return (
    <button id="state-child" onClick={() => setValue(previous => previous + 1)}>
      Count {value}
    </button>
  );
};

export const UpdatingBody = (props: {
  bodyRef?: React.Ref<HTMLDivElement>;
  mediaRef?: React.Ref<HTMLSpanElement>;
  childRef?: React.Ref<HTMLButtonElement>;
}): JSXElement => {
  const [version, setVersion] = React.useState(0);
  const [shown, setShown] = React.useState(true);
  const [media, setMedia] = React.useState(true);
  return (
    <>
      <button id="update" onClick={() => setVersion(value => value + 1)}>
        Update body
      </button>
      <button id="toggle-media" onClick={() => setMedia(value => !value)}>
        Toggle media
      </button>
      <button id="unmount-body" onClick={() => setShown(false)}>
        Unmount body
      </button>
      {shown && (
        <TeachingPopoverBody
          id="body"
          ref={props.bodyRef}
          data-version={version}
          mediaLength={version ? 'tall' : 'short'}
          media={media ? { id: 'media', ref: props.mediaRef, children: `Media ${version}` } : null}
        >
          <p id="content">Content {version}</p>
          <StatefulChild key="preserved" />
          <button id="descendant" ref={props.childRef}>
            Descendant
          </button>
        </TeachingPopoverBody>
      )}
    </>
  );
};
