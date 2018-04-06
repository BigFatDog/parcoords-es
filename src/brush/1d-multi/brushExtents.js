import { select } from 'd3-selection';
import { brushSelection } from 'd3-brush';

const brushExtents = (state, config, pc) => extents => {
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
    //first get all the brush selections
    const brushSelections = {};
    pc
      .g()
      .selectAll('.brush')
      .each(function(d) {
        brushSelections[d] = select(this);
      });

    // loop over each dimension and update appropriately (if it was passed in through extents)
    Object.keys(config.dimensions).forEach(d => {
      if (extents[d] === undefined) {
        return;
      }

      const brush = brushes[d];
      if (brush !== undefined) {
        const dim = config.dimensions[d];
        const yExtent = extents[d].map(dim.yscale);

        //update the extent
        //sets the brushable extent to the specified array of points [[x0, y0], [x1, y1]]
        brush.extent([[-15, yExtent[1]], [15, yExtent[0]]]);

        //redraw the brush
        //https://github.com/d3/d3-brush#brush_move
        // For an x-brush, it must be defined as [x0, x1]; for a y-brush, it must be defined as [y0, y1].
        brushSelections[d].call(brush).call(brush.move, yExtent.reverse());

        //fire some events
        // brush.event(brushSelections[d]);
      }
    });

    //redraw the chart
    pc.renderBrushed();

    return pc;
  }
};

export default brushExtents;
