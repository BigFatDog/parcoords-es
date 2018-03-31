import { brushY } from 'd3-brush';
import { event } from 'd3-selection';

import selected from './selected';

const brushUpdated = (config, pc, events) => newSelection => {
  config.brushed = newSelection;
  events.call('brush', pc, config.brushed);
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

  const brush = brushY(_selector).extent([[-15, 0], [15, brushRangeMax]]);

  brush
    .on('start', function() {
      if (event.sourceEvent !== null) {
        events.call('brushstart', pc, config.brushed);
        event.sourceEvent.stopPropagation();
      }
    })
    .on('brush', function() {
      brushUpdated(config, pc, events)(selected(state, config, brushGroup)());
    })
    .on('end', function() {
      brushUpdated(config, pc, events)(selected(state, config, brushGroup)());
      events.call('brushend', pc, config.brushed);
    });

  if (state.brushes[axis]) {
      state.brushes[axis].push({id: state.brushes.length, brush});
  } else {
      state.brushes[axis] = [brush];
  }

  if (state.brushNodes[axis]) {
      state.brushNodes[axis].push({id: state.brushes.length, node: _selector.node()})
  }
  state.brushNodes[axis] = [_selector.node()];

  return brush;
};

export default brushFor;
