import { select } from 'd3-selection';

import dimensionLabels from '../util/dimensionLabels';
import flipAxisAndUpdatePCP from '../util/flipAxisAndUpdatePCP';
import rotateLabels from '../util/rotateLabels';

import w from '../util/width';
import h from '../util/height';

/**
 * Create static SVG axes with dimension names, ticks, and labels.
 *
 * @param config
 * @param pc
 * @param xscale
 * @param flags
 * @param axis
 * @returns {Function}
 */
const createAxes = (config, pc, xscale, flags, axis) =>
  function() {
    if (pc.g() !== undefined) {
      pc.removeAxes();
    }
    // Add a group element for each dimension.
    pc._g = pc.svg
      .selectAll('.dimension')
      .data(pc.getOrderedDimensionKeys(), function(d) {
        return d;
      })
      .enter()
      .append('svg:g')
      .attr('class', 'dimension')
      .attr('transform', function(d) {
        return 'translate(' + xscale(d) + ')';
      });
    // Add an axis and title.
    pc._g
      .append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(0,0)')
      .each(function(d) {
        let axisElement = select(this).call(
          pc.applyAxisConfig(axis, config.dimensions[d])
        );

        axisElement
          .selectAll('path')
          .style('fill', 'none')
          .style('stroke', '#222')
          .style('shape-rendering', 'crispEdges');

        axisElement
          .selectAll('line')
          .style('fill', 'none')
          .style('stroke', '#222')
          .style('shape-rendering', 'crispEdges');
      })

      .append('svg:text')
      .attr('text-anchor', 'middle')
      .attr('y', 0)
      .attr(
        'transform',
        'translate(0,-5) rotate(' + config.dimensionTitleRotation + ')'
      )
      .attr('x', 0)
      .attr('class', 'label')
      .text(dimensionLabels(config))
      .on('dblclick', flipAxisAndUpdatePCP(config, pc, axis))
      .on('wheel', rotateLabels(config, pc));

    if (config.nullValueSeparator === 'top') {
      pc.svg
        .append('line')
        .attr('x1', 0)
        .attr('y1', 1 + config.nullValueSeparatorPadding.top)
        .attr('x2', w(config))
        .attr('y2', 1 + config.nullValueSeparatorPadding.top)
        .attr('stroke-width', 1)
        .attr('stroke', '#777')
        .attr('fill', 'none')
        .attr('shape-rendering', 'crispEdges');
    } else if (config.nullValueSeparator === 'bottom') {
      pc.svg
        .append('line')
        .attr('x1', 0)
        .attr('y1', h(config) + 1 - config.nullValueSeparatorPadding.bottom)
        .attr('x2', w(config))
        .attr('y2', h(config) + 1 - config.nullValueSeparatorPadding.bottom)
        .attr('stroke-width', 1)
        .attr('stroke', '#777')
        .attr('fill', 'none')
        .attr('shape-rendering', 'crispEdges');
    }

    flags.axes = true;
    return this;
  };

export default createAxes;
