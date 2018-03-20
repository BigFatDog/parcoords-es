import { keys } from 'd3-collection';
import { select } from 'd3-selection';
import { brushSelection } from 'd3-brush';

const brushExtents = (state, config, pc) => extents => {
  const { brushes } = state;

  if (typeof extents === 'undefined') {
    return keys(config.dimensions).reduce((acc, cur) => {
      const brush = brushes[cur];
      //todo: brush check
      if (brush !== undefined && brushSelection(brushNodes[cur]) !== null) {
        acc[d] = brush.extent();
      }

      return acc;
    }, {});
  } else {
    //first get all the brush selections
    const brushSelections = {};
    pc.g().selectAll('.brush').each(function (d) {
        brushSelections[d] = select(this);
    });

    // loop over each dimension and update appropriately (if it was passed in through extents)
    keys(config.dimensions).forEach(function(d) {
      if (extents[d] === undefined) {
        return;
      }

      const brush = brushes[d];
      if (brush !== undefined) {
        //update the extent
        brush.extent(extents[d]);

        //redraw the brush
        brushSelections[d]
          .transition()
          .duration(0)
          .call(brush);

        //fire some events
        brush.event(brushSelections[d]);
      }
    });

    //redraw the chart
    pc.renderBrushed();

    return pc;
  }
};

export default brushExtents;
