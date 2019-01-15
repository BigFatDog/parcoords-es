import { select, selectAll } from 'd3-selection';

const flipAxisAndUpdatePCP = (config, pc, axis) =>
  function(dimension) {
    pc.flip(dimension);
    pc.brushReset(dimension);

    // select(this.parentElement)
    pc.selection
      .select('svg')
      .selectAll('g.axis')
      .filter(d => d === dimension)
      .transition()
      .duration(config.animationTime)
      .call(axis.scale(config.dimensions[dimension].yscale));
    pc.render();
  };

export default flipAxisAndUpdatePCP;
