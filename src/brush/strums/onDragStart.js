import { mouse } from 'd3-selection';
import h from '../../util/height';
import dimensionsForPoint from '../dimensionsForPoint';

// First we need to determine between which two axes the sturm was started.
// This will determine the freedom of movement, because a strum can
// logically only happen between two axes, so no movement outside these axes
// should be allowed.
const onDragStart = (state, config, pc, xscale) => () => {
  let p = mouse(state.strumRect.node());

  p[0] = p[0] - config.margin.left;
  p[1] = p[1] - config.margin.top;

  const dims = dimensionsForPoint(config, pc, xscale, p);
  const strum = {
    p1: p,
    dims: dims,
    minX: xscale(dims.left),
    maxX: xscale(dims.right),
    minY: 0,
    maxY: h(config),
  };

  // Make sure that the point is within the bounds
  strum.p1[0] = Math.min(Math.max(strum.minX, p[0]), strum.maxX);
  strum.p2 = strum.p1.slice();

  state.strums[dims.i] = strum;
  state.strums.active = dims.i;
};

export default onDragStart;
