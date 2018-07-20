import { selectAll } from 'd3-selection';

import { pathMark } from './renderMarked';

// mark an array of data
const mark = (config, pc, canvas, events, ctx, position) =>
  function(data = null) {
    if (data === null) {
      return config.marked;
    }

    // add array to already marked data
    config.marked = config.marked.concat(data);
    selectAll([canvas.foreground, canvas.brushed]).classed('dimmed', true);
    data.forEach(pathMark(config, ctx, position));
    events.call('mark', this, data);
    return this;
  };

export default mark;
