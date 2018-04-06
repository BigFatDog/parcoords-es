import { select } from 'd3-selection';
import { brushSelection } from 'd3-brush';
import newBrush from './newBrush';
import drawBrushes from './drawBrushes';

/**
 *
 * extents are in format of [[2,6], [3,5]]
 *
 * * @param state
 * @param config
 * @param pc
 * @returns {Function}
 */
const brushExtents = (state, config, pc, events, brushGroup) => extents => {
  const { brushes } = state;

  if (typeof extents === 'undefined') {
    return Object.keys(config.dimensions).reduce((acc, cur, pos) => {
      const axisBrushes = brushes[cur];

      if (axisBrushes === undefined || axisBrushes === null) {
        acc[cur] = [];
      } else {
        acc[cur] = axisBrushes.reduce((d, p, i) => {
          const range = brushSelection(
            document.getElementById('brush-' + pos + '-' + i)
          );
          if (range !== null) {
            d = d.push(range);
          }

          return d;
        }, []);
      }

      return acc;
    }, {});
  } else {
    // //first get all the brush selections
    // loop over each dimension and update appropriately (if it was passed in through extents)
    Object.keys(config.dimensions).forEach((d, pos) => {
      if (extents[d] === undefined || extents[d] === null) {
        return;
      }

      const dim = config.dimensions[d];

      const yExtents = extents[d].map(e => e.map(dim.yscale));

      const _bs = yExtents.map((e, j) => {
        const _brush = newBrush(state, config, pc, events, brushGroup)(
          d,
          select('#brush-group-' + pos)
        );
        //update the extent
        //sets the brushable extent to the specified array of points [[x0, y0], [x1, y1]]
        _brush.extent([[-15, e[1]], [15, e[0]]]);

        return {
          id: j,
          brush: _brush,
          ext: e,
        };
      });

      brushes[d] = _bs;

      drawBrushes(_bs, config, pc, d, select('#brush-group-' + pos));

      //redraw the brush
      //https://github.com/d3/d3-brush#brush_move
      // For an x-brush, it must be defined as [x0, x1]; for a y-brush, it must be defined as [y0, y1].
      _bs.forEach((f, k) => {
        select('#brush-' + pos + '-' + k)
          .call(f.brush)
          .call(f.brush.move, f.ext.reverse());
      });
    });

    //redraw the chart
    pc.renderBrushed();

    return pc;
  }
};

export default brushExtents;
