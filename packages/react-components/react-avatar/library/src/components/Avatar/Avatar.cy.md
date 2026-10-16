# Avatar logical-end mask coverage

The existing LTR/RTL badge cases retain their initials, real badge geometry,
bottom alignment and logical-end alignment assertions. Their mask oracle compares
the computed mask with an independent valid CSS reference for the same 64px
fixture: a circle at the requested logical edge and bottom, with a 10px offset
and the transparent/opaque antialiasing stops.

The reference is computed by the same browser CSSOM rather than requiring its
serialization to preserve authored `left`/`right` keywords. Modern `calc(100% -
10px)` positions and older keyword positions can therefore represent the same
mask without relaxing the direction, offset or cutout assertions.
An older CSSOM can also retain a redundant `calc(<absolute px>)` wrapper after
variable substitution. Only that numeric identity is normalized; percentage
expressions, directions, offsets, colors and stop values remain part of the
exact comparison.

The temporary reference node is removed before the comparison. The Avatar and
its rendered slots are not restyled or replaced, and the reference does not copy
the actual mask into its expected value. No scenario is skipped and no component
source is changed.
