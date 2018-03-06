// rescale for height, width and margins
// TODO currently assumes chart is brushable, and destroys old brushes
const resize = (config, pc, flags, events) => {
  return function() {
    // selection size
    pc.selection
      .select('svg')
      .attr('width', config.width)
      .attr('height', config.height);
    pc.svg.attr(
      'transform',
      'translate(' + config.margin.left + ',' + config.margin.top + ')'
    );

    // FIXME: the current brush state should pass through
    if (flags.brushable) pc.brushReset();

    // scales
    pc.autoscale();

    // axes, destroys old brushes.
    if (pc.g()) pc.createAxes();
    if (flags.brushable) pc.brushable();
    if (flags.reorderable) pc.reorderable();

    events.call('resize', this, {
      width: config.width,
      height: config.height,
      margin: config.margin,
    });

    return this;
  };
};

export default resize;
