import { brushY, brushSelection } from 'd3-brush';
import { event } from 'd3-selection';
import invertByScale from '../invertByScale';
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
  // handle hidden axes which will not be a property of dimensions
  if (!config.dimensions.hasOwnProperty(axis)) {
    return () => {};
  }

  const brushRangeMax =
    config.dimensions[axis].type === 'string'
      ? config.dimensions[axis].yscale.range()[
          config.dimensions[axis].yscale.range().length - 1
        ]
      : config.dimensions[axis].yscale.range()[0];

  const _brush = brushY(_selector).extent([[-15, 0], [15, brushRangeMax]]);

  const convertBrushArguments = args => {
    const args_array = Array.prototype.slice.call(args);
    const axis = args_array[0];

    const raw = brushSelection(args_array[2][0]) || [];

    // handle hidden axes which will not have a yscale
    let yscale = null;
    if (config.dimensions.hasOwnProperty(axis)) {
      yscale = config.dimensions[axis].yscale;
    }

    // ordinal scales do not have invert
    const scaled = invertByScale(raw, yscale);

    return {
      axis: args_array[0],
      node: args_array[2][0],
      selection: {
        raw,
        scaled,
      },
    };
  };

  _brush
    .on('start', function() {
      if (event.sourceEvent !== null) {
        events.call(
          'brushstart',
          pc,
          config.brushed,
          convertBrushArguments(arguments)
        );
        if (typeof event.sourceEvent.stopPropagation === 'function') {
          event.sourceEvent.stopPropagation();
        }
      }
    })
    .on('brush', function() {
      brushUpdated(
        config,
        pc,
        events,
        convertBrushArguments(arguments)
      )(selected(state, config, brushGroup)());
    })
    .on('end', function() {
      brushUpdated(config, pc, events)(selected(state, config, brushGroup)());
      events.call(
        'brushend',
        pc,
        config.brushed,
        convertBrushArguments(arguments)
      );
    });

  state.brushes[axis] = _brush;
  state.brushNodes[axis] = _selector.node();

  return _brush;
};

export default brushFor;
