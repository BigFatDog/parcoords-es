import { selectAll } from 'd3-selection';

// clear marked data arrays
const unmark = (config, pc, canvas) =>
  function() {
    config.marked = [];
    pc.clear('marked');
    selectAll([canvas.foreground, canvas.brushed]).classed('dimmed', false);
    return this;
  };

export default unmark;
