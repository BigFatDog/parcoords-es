import { selectAll } from 'd3-selection';

import colorPath from '../util/colorPath';
import functor from '../util/functor';

const pathHighlight = (config, ctx, position) => (d, i) => {
  ctx.highlight.strokeStyle = functor(config.color)(d, i);
  return colorPath(config, position, d, ctx.highlight);
};

// highlight an array of data
const highlight = (config, pc, canvas, events, ctx, position) =>
  function(data = null) {
    if (data === null) {
      return config.highlighted;
    }

    config.highlighted = data;
    pc.clear('highlight');
    selectAll([canvas.foreground, canvas.brushed]).classed('faded', true);
    data.forEach(pathHighlight(config, ctx, position));
    events.call('highlight', this, data);
    return this;
  };

export default highlight;
