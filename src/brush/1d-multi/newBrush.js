import { brushY, brushSelection } from 'd3-brush';
import { event, select } from 'd3-selection';
import drawBrushes from './drawBrushes';
import selected from './selected';

const brushUpdated = (config, pc, events) => newSelection => {
  config.brushed = newSelection;
  events.call('brush', pc, config.brushed);
  pc.renderBrushed();
};

const newBrush = (state, config, pc, events, brushGroup) => (
  axis,
  _selector
) => {
  const { brushes, brushNodes } = state;

  const brushRangeMax =
    config.dimensions[axis].type === 'string'
      ? config.dimensions[axis].yscale.range()[
          config.dimensions[axis].yscale.range().length - 1
        ]
      : config.dimensions[axis].yscale.range()[0];

  const brush = brushY().extent([[-15, 0], [15, brushRangeMax]]);
  const id = brushes[axis] ? brushes[axis].length : 0;
  const node =
    'brush-' + Object.keys(config.dimensions).indexOf(axis) + '-' + id;

  if (brushes[axis]) {
    brushes[axis].push({
      id,
      brush,
      node,
    });
  } else {
    brushes[axis] = [{ id, brush, node }];
  }

  if (brushNodes[axis]) {
    brushNodes[axis].push({ id, node });
  } else {
    brushNodes[axis] = [{ id, node }];
  }

  brush
    .on('start', function() {
      if (event.sourceEvent !== null) {
        events.call('brushstart', pc, config.brushed);
        if (typeof event.sourceEvent.stopPropagation === 'function') {
          event.sourceEvent.stopPropagation();
        }
      }
    })
    .on('brush', function(e) {
      // record selections
      brushUpdated(
        config,
        pc,
        events
      )(selected(state, config, pc, events, brushGroup));
    })
    .on('end', function() {
      // Figure out if our latest brush has a selection
      const lastBrushID = brushes[axis][brushes[axis].length - 1].id;
      const lastBrush = document.getElementById(
        'brush-' +
          Object.keys(config.dimensions).indexOf(axis) +
          '-' +
          lastBrushID
      );
      const selection = brushSelection(lastBrush);

      if (
        selection !== undefined &&
        selection !== null &&
        selection[0] !== selection[1]
      ) {
        newBrush(state, config, pc, events, brushGroup)(axis, _selector);

        drawBrushes(brushes[axis], config, pc, axis, _selector);

        brushUpdated(config, pc, events)(
          selected(state, config, pc, events, brushGroup)
        );
      } else {
        if (
          event.sourceEvent &&
          event.sourceEvent.toString() === '[object MouseEvent]' &&
          event.selection === null
        ) {
          pc.brushReset(axis);
        }
      }

      events.call('brushend', pc, config.brushed);
    });

  return brush;
};

export default newBrush;
