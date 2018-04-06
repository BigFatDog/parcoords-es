import { brushSelection } from 'd3-brush';
import brushFor from './brushFor';
//https://github.com/d3/d3-brush/issues/10
import { keys } from 'd3-collection';
import drawBrushes from './drawBrushes';

// data within extents
const selected = (state, config, pc, events, brushGroup) => (
  axis,
  _selector
) => {
  const { brushes, brushNodes } = state;
  const lastBrushID = brushes[axis][brushes[axis].length - 1].id;
  const lastBrush = brushes[axis][brushes[axis].length - 1].node;

  const _brushSelection = brushSelection(lastBrush);

  console.log('-----');
  drawBrushes(brushes, pc);

  if (_brushSelection && _brushSelection[0] !== _brushSelection[1]) {
    brushFor(state, config, pc, events, brushGroup)(axis, _selector);
  }

  const is_brushed = p => _brushSelection !== null;

  const actives = keys(config.dimensions).filter(is_brushed);
  const extents = actives.map(p => {
    const _brushRange = brushSelection(
      brushNodes[p][brushNodes[p].length - 1].node
    );

    if (typeof config.dimensions[p].yscale.invert === 'function') {
      return [
        config.dimensions[p].yscale.invert(_brushRange[1]),
        config.dimensions[p].yscale.invert(_brushRange[0]),
      ];
    } else {
      return _brushRange;
    }
  });
  // We don't want to return the full data set when there are no axes brushed.
  // Actually, when there are no axes brushed, by definition, no items are
  // selected. So, let's avoid the filtering and just return false.
  //if (actives.length === 0) return false;

  // Resolves broken examples for now. They expect to get the full dataset back from empty brushes
  if (actives.length === 0) return config.data;

  // test if within range
  const within = {
    date: (d, p, dimension) => {
      if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
        // if it is ordinal
        return (
          extents[dimension][0] <= config.dimensions[p].yscale(d[p]) &&
          config.dimensions[p].yscale(d[p]) <= extents[dimension][1]
        );
      } else {
        return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
      }
    },
    number: (d, p, dimension) => {
      if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
        // if it is ordinal
        return (
          extents[dimension][0] <= config.dimensions[p].yscale(d[p]) &&
          config.dimensions[p].yscale(d[p]) <= extents[dimension][1]
        );
      } else {
        return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
      }
    },
    string: (d, p, dimension) => {
      return (
        extents[dimension][0] <= config.dimensions[p].yscale(d[p]) &&
        config.dimensions[p].yscale(d[p]) <= extents[dimension][1]
      );
    },
  };

  return config.data.filter(d => {
    switch (brushGroup.predicate) {
      case 'AND':
        return actives.every(function(p, dimension) {
          return within[config.dimensions[p].type](d, p, dimension);
        });
      case 'OR':
        return actives.some(function(p, dimension) {
          return within[config.dimensions[p].type](d, p, dimension);
        });
      default:
        throw new Error('Unknown brush predicate ' + config.brushPredicate);
    }
  });

  return config.data;
};

export default selected;
