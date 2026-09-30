`Dialog`'s `surfaceMotion` slot accepts `Scale` params directly, such as `duration`, `outScale`, `easing`, and `animateOpacity`. `DialogSurface`'s `backdropMotion` slot accepts `Fade` params.

Both slots also support the `children` render function, which allows replacing the default motion with a custom implementation. This story demonstrates the simpler direct prop approach:

```tsx
<Dialog surfaceMotion={{ duration, outScale, easing, animateOpacity }}>
  <DialogSurface backdropMotion={{ duration: backdropDuration }}>…</DialogSurface>
</Dialog>
```

Set `surfaceMotion={null}` or `backdropMotion={null}` to disable that slot's animation. With `unmountOnClose={false}`, the surface and backdrop remain mounted, but closed elements are hidden and cannot intercept pointer interaction, including when their motion is disabled.
