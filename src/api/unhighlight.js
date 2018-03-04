import { selectAll } from 'd3-selection';

const unhighlight = (config, pc, canvas) =>
  function() {
    config.highlighted = [];
    pc.clear('highlight');
    selectAll([canvas.foreground, canvas.brushed]).classed('faded', false);
    return this;
  };

export default unhighlight;
