import { drag } from 'd3-drag';
import onDragEnd from './onDragEnd';
import onDrag from './onDrag';
import onDragStart from './onDragStart';
import removeStrum from './removeStrum';
import brushReset from './brushReset';
import w from '../../util/width';
import h from '../../util/height';
import consecutive from '../consecutive';

const install = (brushGroup, state, config, pc, events, xscale) => () => {
  if (pc.g() === undefined || pc.g() === null) {
    pc.createAxes();
  }

  const _drag = drag();

  // Map of current strums. Strums are stored per segment of the PC. A segment,
  // being the area between two axes. The left most area is indexed at 0.
  state.strums.active = undefined;
  // Returns the width of the PC segment where currently a strum is being
  // placed. NOTE: even though they are evenly spaced in our current
  // implementation, we keep for when non-even spaced segments are supported as
  // well.
  state.strums.width = id =>
    state.strums[id] === undefined
      ? undefined
      : state.strums[id].maxX - state.strums[id].minX;

  pc.on('axesreorder.strums', () => {
    const ids = Object.getOwnPropertyNames(state.strums).filter(d => !isNaN(d));

    if (ids.length > 0) {
      // We have some strums, which might need to be removed.
      ids.forEach(d => {
        const dims = state.strums[d].dims;
        state.strums.active = d;
        // If the two dimensions of the current strum are not next to each other
        // any more, than we'll need to remove the strum. Otherwise we keep it.
        if (!consecutive(config.dimensions)(dims.left, dims.right)) {
          removeStrum(state, pc);
        }
      });
      onDragEnd(brushGroup, state, config, pc, events)();
    }
  });

  // Add a new svg group in which we draw the strums.
  pc.selection
    .select('svg')
    .append('g')
    .attr('id', 'strums')
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
    .insert('rect', 'g#strums')
    .attr('id', 'strum-events')
    .attr('x', config.margin.left)
    .attr('y', config.margin.top)
    .attr('width', w(config))
    .attr('height', h(config) + 2)
    .style('opacity', 0)
    .call(_drag);
};

export default install;
