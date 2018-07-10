import { brushY } from 'd3-brush';
import { event } from 'd3-selection';

import selected from './selected';

const brushUpdated = (config, pc, events, args) => newSelection => {
  config.brushed = newSelection;
  events.call('brush', pc, config.brushed, args);
  pc.renderBrushed();
};

const brushFor = (state, config, pc, events, brushGroup) => (
  axis,
  _selector
) => {
  const brushRangeMax =
    config.dimensions[axis].type === 'string'
      ? config.dimensions[axis].yscale.range()[
          config.dimensions[axis].yscale.range().length - 1
        ]
      : config.dimensions[axis].yscale.range()[0];

  const _brush = brushY(_selector).extent([[-15, 0], [15, brushRangeMax]]);

  _brush
    .on('start', function() {
      if (event.sourceEvent !== null) {
        events.call('brushstart', pc, config.brushed, Array.prototype.slice.call(arguments));
        if (typeof event.sourceEvent.stopPropagation === 'function') {
          event.sourceEvent.stopPropagation();
        }
      }
    })
    .on('brush', function() {
      brushUpdated(config, pc, events, Array.prototype.slice.call(arguments))(selected(state, config, brushGroup)());
    })
    .on('end', function() {
      brushUpdated(config, pc, events)(selected(state, config, brushGroup)());
      events.call('brushend', pc, config.brushed, Array.prototype.slice.call(arguments));
    });

  state.brushes[axis] = _brush;
  state.brushNodes[axis] = _selector.node();

  return _brush;
};

export default brushFor;
