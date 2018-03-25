//https://github.com/d3/d3-brush/issues/10
import { keys } from 'd3-collection';

// data within extents
const selected = (state, config, brushGroup) => () => {
  const { brushNodes } = state;
  const is_brushed = p => !brushNodes[p].empty();

  const actives = keys(config.dimensions).filter(is_brushed);
  const extents = actives.map(p => brushNodes[p].extent());
  // We don't want to return the full data set when there are no axes brushed.
  // Actually, when there are no axes brushed, by definition, no items are
  // selected. So, let's avoid the filtering and just return false.
  //if (actives.length === 0) return false;

  // Resolves broken examples for now. They expect to get the full dataset back from empty brushes
  if (actives.length === 0) return config.data;

  // test if within range
  const within = {
    date: function(d, p, dimension, b) {
      if (typeof config.dimensions[p].yscale.rangePoints === 'function') {
        // if it is ordinal
        return (
          b[0] <= config.dimensions[p].yscale(d[p]) &&
          config.dimensions[p].yscale(d[p]) <= b[1]
        );
      } else {
        return b[0] <= d[p] && d[p] <= b[1];
      }
    },
    number: function(d, p, dimension, b) {
      if (typeof config.dimensions[p].yscale.rangePoints === 'function') {
        // if it is ordinal
        return (
          b[0] <= config.dimensions[p].yscale(d[p]) &&
          config.dimensions[p].yscale(d[p]) <= b[1]
        );
      } else {
        return b[0] <= d[p] && d[p] <= b[1];
      }
    },
    string: function(d, p, dimension, b) {
      return (
        b[0] <= config.dimensions[p].yscale(d[p]) &&
        config.dimensions[p].yscale(d[p]) <= b[1]
      );
    },
  };

  return config.data.filter(d => {
    switch (brushGroup.predicate) {
      case 'AND':
        return actives.every((p, dimension) => {
          return extents[dimension].some(b =>
            within[config.dimensions[p].type](d, p, dimension, b)
          );
        });
      case 'OR':
        return actives.some((p, dimension) => {
          return extents[dimension].some(b =>
            within[config.dimensions[p].type](d, p, dimension, b)
          );
        });
      default:
        throw new Error('Unknown brush predicate ' + config.brushPredicate);
    }
  });
};

export default selected;
