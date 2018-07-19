import { select } from 'd3-selection';

/**
 * Setup a new parallel coordinates chart.
 *
 * @param config
 * @param canvas
 * @param ctx
 * @returns {pc} a parcoords closure
 */
const init = (config, canvas, ctx) => {
  /**
   * Create the chart within a container. The selector can also be a d3 selection.
   *
   * @param selection a d3 selection
   * @returns {pc} instance for chained api
   */
  const pc = function(selection) {
    selection = pc.selection = select(selection);

    config.width = selection.node().clientWidth;
    config.height = selection.node().clientHeight;
    // canvas data layers
    ['dots', 'foreground', 'brushed', 'marked', 'highlight'].forEach(layer => {
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
    // for chained api
    return pc;
  };

  // for partial-application style programming
  return pc;
};

export default init;
