import { brushSelection } from 'd3-brush';

// data within extents
const selected = (state, config, pc, events, brushGroup) => {
  const { brushes } = state;

  const is_brushed = (p, pos) => {
    const axisBrushes = brushes[p];

    for (let i = 0; i < axisBrushes.length; i++) {
      const brush = document.getElementById('brush-' + pos + '-' + i);

      if (brush && brushSelection(brush) !== null) {
        return true;
      }
    }

    return false;
  };

  const actives = Object.keys(config.dimensions).filter(is_brushed);
  const extents = actives.map(p => {
    const axisBrushes = brushes[p];

    return axisBrushes
      .filter(d => !pc.hideAxis().includes(d))
      .map((d, i) =>
        brushSelection(
          document.getElementById(
            'brush-' + Object.keys(config.dimensions).indexOf(p) + '-' + i
          )
        )
      )
      .map((d, i) => {
        if (d === null || d === undefined) {
          return null;
        } else if (typeof config.dimensions[p].yscale.invert === 'function') {
          return [
            config.dimensions[p].yscale.invert(d[1]),
            config.dimensions[p].yscale.invert(d[0]),
          ];
        } else {
          return d;
        }
      });
  });

  // We don't want to return the full data set when there are no axes brushed.
  // Actually, when there are no axes brushed, by definition, no items are
  // selected. So, let's avoid the filtering and just return false.
  //if (actives.length === 0) return false;

  // Resolves broken examples for now. They expect to get the full dataset back from empty brushes
  if (actives.length === 0) return config.data;

  // test if within range
  const within = {
    date: (d, p, i) => {
      const dimExt = extents[i];

      if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
        // if it is ordinal
        for (const e of dimExt) {
          if (e === null || e === undefined) {
            continue;
          }

          if (
            e[0] <= config.dimensions[p].yscale(d[p]) &&
            config.dimensions[p].yscale(d[p]) <= e[1]
          ) {
            return true;
          }
        }

        return false;
      } else {
        for (const e of dimExt) {
          if (e === null || e === undefined) {
            continue;
          }

          if (e[0] <= d[p] && d[p] <= e[1]) {
            return true;
          }
        }

        return false;
      }
    },
    number: (d, p, i) => {
      const dimExt = extents[i];

      if (typeof config.dimensions[p].yscale.bandwidth === 'function') {
        // if it is ordinal
        for (const e of dimExt) {
          if (e === null || e === undefined) {
            continue;
          }

          if (
            e[0] <= config.dimensions[p].yscale(d[p]) &&
            config.dimensions[p].yscale(d[p]) <= e[1]
          ) {
            return true;
          }
        }

        return false;
      } else {
        for (const e of dimExt) {
          if (e === null || e === undefined) {
            continue;
          }

          if (e[0] <= d[p] && d[p] <= e[1]) {
            return true;
          }
        }

        return false;
      }
    },
    string: (d, p, i) => {
      const dimExt = extents[i];

      for (const e of dimExt) {
        if (e === null || e === undefined) {
          continue;
        }

        if (
          e[0] <= config.dimensions[p].yscale(d[p]) &&
          config.dimensions[p].yscale(d[p]) <= e[1]
        ) {
          return true;
        }
      }

      return false;
    },
  };

  return config.data.filter(d => {
    switch (brushGroup.predicate) {
      case 'AND':
        return actives.every((p, i) =>
          within[config.dimensions[p].type](d, p, i)
        );
      case 'OR':
        return actives.some((p, i) =>
          within[config.dimensions[p].type](d, p, i)
        );
      default:
        throw new Error('Unknown brush predicate ' + config.brushPredicate);
    }
  });
};

export default selected;
