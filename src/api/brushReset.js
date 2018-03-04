import { select, selectAll } from 'd3-selection';

const brushReset = config =>
  function(dimension) {
    let brushesToKeep = [];
    for (let j = 0; j < config.brushes.length; j++) {
      if (config.brushes[j].data !== dimension) {
        brushesToKeep.push(config.brushes[j]);
      }
    }

    config.brushes = brushesToKeep;
    config.brushed = false;

    if (pc.g() !== undefined) {
      const nodes = selectAll('.brush').nodes();
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].__data__ === dimension) {
          // remove all dummy brushes for this axis or the real brush
          select(select(nodes[i]).nodes()[0].parentNode)
            .selectAll('.dummy')
            .remove();
          config.dimensions[dimension].brush.move(select(nodes[i], null));
        }
      }
    }

    return this;
  };

export default brushReset;
