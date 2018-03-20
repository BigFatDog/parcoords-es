import { drag } from 'd3-drag';
import onDragEnd from './onDragEnd';
import onDrag from './onDrag';
import onDragStart from './onDragStart';
import removeStrum from './removeStrum';
import brushReset from './brushReset';
import w from '../../util/width';
import h from '../../util/height';

import hypothenuse from './util/hypothenuse';
import consecutive from '../consecutive';

// returns angles in [-PI/2, PI/2]
const angle = (p1, p2) => {
  const a = p1[0] - p2[0],
    b = p1[1] - p2[1],
    c = hypothenuse(a, b);

  return Math.asin(b / c);
};

const endAngle = state => id => {
  const arc = state.arcs[id];
  if (arc === undefined) {
    return undefined;
  }
  let sAngle = angle(arc.p1, arc.p2),
    uAngle = -sAngle + Math.PI / 2;

  if (arc.p1[0] > arc.p2[0]) {
    uAngle = 2 * Math.PI - uAngle;
  }

  return uAngle;
};

const startAngle = state => id => {
  const arc = state.arcs[id];
  if (arc === undefined) {
    return undefined;
  }

  let sAngle = angle(arc.p1, arc.p3),
    uAngle = -sAngle + Math.PI / 2;

  if (arc.p1[0] > arc.p3[0]) {
    uAngle = 2 * Math.PI - uAngle;
  }

  return uAngle;
};

const length = state => id => {
  const arc = state.arcs[id];

  if (arc === undefined) {
    return undefined;
  }

  const a = arc.p1[0] - arc.p2[0],
    b = arc.p1[1] - arc.p2[1];

  return hypothenuse(a, b);
};

const install = (brushGroup, state, config, pc, events, xscale) => () => {
  if (!pc.g()) {
    pc.createAxes();
  }

  const _drag = drag();

  // Map of current arcs. arcs are stored per segment of the PC. A segment,
  // being the area between two axes. The left most area is indexed at 0.
  state.arcs.active = undefined;
  // Returns the width of the PC segment where currently a arc is being
  // placed. NOTE: even though they are evenly spaced in our current
  // implementation, we keep for when non-even spaced segments are supported as
  // well.
  state.arcs.width = id => {
    const arc = state.arcs[id];
    return arc === undefined ? undefined : arc.maxX - arc.minX;
  };

  // returns angles in [0, 2 * PI]
  state.arcs.endAngle = endAngle(state);
  state.arcs.startAngle = startAngle(state);
  state.arcs.length = length(state);

  pc.on('axesreorder.arcs', () => {
    const ids = Object.getOwnPropertyNames(arcs).filter(d => !isNaN(d));

    if (ids.length > 0) {
      // We have some arcs, which might need to be removed.
      ids.forEach(d => {
        const dims = arcs[d].dims;
        state.arcs.active = d;
        // If the two dimensions of the current arc are not next to each other
        // any more, than we'll need to remove the arc. Otherwise we keep it.
        if (!consecutive(dims)(dims.left, dims.right)) {
          removeStrum(state, pc);
        }
      });
      onDragEnd(brushGroup, state, config, pc, events)();
    }
  });

  // Add a new svg group in which we draw the arcs.
  pc.selection
    .select('svg')
    .append('g')
    .attr('id', 'arcs')
    .attr(
      'transform',
      'translate(' + config.margin.left + ',' + config.margin.top + ')'
    );

  // Install the required brushReset function
  pc.brushReset = brushReset(brushGroup, state, config, pc, events);

  _drag
    .on('start', onDragStart(state, config, pc, xscale))
    .on('drag', onDrag(brushGroup, state, config, pc, events))
    .on('end', onDragEnd(brushGroup, state, config, pc, events));

  // NOTE: The styling needs to be done here and not in the css. This is because
  //       for 1D brushing, the canvas layers should not listen to
  //       pointer-events._.
  state.strumRect = pc.selection
    .select('svg')
    .insert('rect', 'g#arcs')
    .attr('id', 'arc-events')
    .attr('x', config.margin.left)
    .attr('y', config.margin.top)
    .attr('width', w(config))
    .attr('height', h(config) + 2)
    .style('opacity', 0)
    .call(_drag);
};

export default install;
