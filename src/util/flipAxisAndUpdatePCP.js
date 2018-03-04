import { select } from 'd3-selection';

const flipAxisAndUpdatePCP = (config, pc, axis) =>
  function(dimension) {
    pc.flip(dimension);
    pc.brushReset(dimension);
    select(this.parentElement)
      .transition()
      .duration(config.animationTime)
      .call(axis.scale(config.dimensions[dimension].yscale));
    pc.render();
  };

export default flipAxisAndUpdatePCP;
