import { mouse } from 'd3-selection';
import { arc as d3Arc } from 'd3-shape';
import dimensionsForPoint from '../dimensionsForPoint';
import h from '../../util/height';

// First we need to determine between which two axes the arc was started.
// This will determine the freedom of movement, because a arc can
// logically only happen between two axes, so no movement outside these axes
// should be allowed.
const onDragStart = (state, config, pc, xscale) => () => {
  const p = mouse(state.strumRect.node());

  p[0] = p[0] - config.margin.left;
  p[1] = p[1] - config.margin.top;

  const dims = dimensionsForPoint(config, pc, xscale, p);
  const arc = {
    p1: p,
    dims: dims,
    minX: xscale(dims.left),
    maxX: xscale(dims.right),
    minY: 0,
    maxY: h(config),
    startAngle: undefined,
    endAngle: undefined,
    arc: d3Arc().innerRadius(0),
  };

  // Make sure that the point is within the bounds
  arc.p1[0] = Math.min(Math.max(arc.minX, p[0]), arc.maxX);
  arc.p2 = arc.p1.slice();
  arc.p3 = arc.p1.slice();

  state.arcs[dims.i] = arc;
  state.arcs.active = dims.i;
};

export default onDragStart;
