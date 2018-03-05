import { select } from 'd3-selection';

const init = (config, canvas, ctx) => {
  const pc = function(selection) {
    selection = pc.selection = select(selection);

    config.width = selection.node().clientWidth;
    config.height = selection.node().clientHeight;
    // canvas data layers
    ['marks', 'foreground', 'brushed', 'highlight'].forEach(layer => {
      canvas[layer] = selection
        .append('canvas')
        .attr('class', layer)
        .node();
      ctx[layer] = canvas[layer].getContext('2d');
    });

    // svg tick and brush layers
    pc.svg = selection
      .append('svg')
      .attr('width', config.width)
      .attr('height', config.height)
      .style('font', '14px sans-serif')
      .style('position', 'absolute')

      .append('svg:g')
      .attr(
        'transform',
        'translate(' + config.margin.left + ',' + config.margin.top + ')'
      );
    return pc;
  };

  return pc;
};

export default init;
