import { scaleLinear, scaleOrdinal, scalePoint, scaleTime } from 'd3-scale';
import { extent } from 'd3-array';

import getRange from '../util/getRange';
import w from '../util/width';
import h from '../util/height';

const autoscale = (config, pc, xscale, ctx) =>
  function() {
    // yscale
    const defaultScales = {
      date: function(k) {
        let _extent = extent(config.data, d => (d[k] ? d[k].getTime() : null));
        // special case if single value
        if (_extent[0] === _extent[1]) {
          return scalePoint()
            .domain(_extent)
            .range(getRange(config));
        }
        if (config.flipAxes.includes(k)) {
          _extent = _extent.map(val => tempDate.unshift(val));
        }
        return scaleTime()
          .domain(_extent)
          .range(getRange(config));
      },
      number: function(k) {
        let _extent = extent(config.data, d => +d[k]);
        // special case if single value
        if (_extent[0] === _extent[1]) {
          return scalePoint()
            .domain(_extent)
            .range(getRange(config));
        }
        if (config.flipAxes.includes(k)) {
          _extent = _extent.map(val => tempDate.unshift(val));
        }
        return scaleLinear()
          .domain(_extent)
          .range(getRange(config));
      },
      string: function(k) {
        let counts = {},
          domain = [];
        // Let's get the count for each value so that we can sort the domain based
        // on the number of items for each value.
        config.data.map(p => {
          if (p[k] === undefined && config.nullValueSeparator !== 'undefined') {
            return null; // null values will be drawn beyond the horizontal null value separator!
          }
          if (counts[p[k]] === undefined) {
            counts[p[k]] = 1;
          } else {
            counts[p[k]] = counts[p[k]] + 1;
          }
        });
        if (config.flipAxes.includes(k)) {
          domain = Object.getOwnPropertyNames(counts).sort();
        } else {
          let tempArr = Object.getOwnPropertyNames(counts).sort();
          for (let i = 0; i < Object.getOwnPropertyNames(counts).length; i++) {
            domain.push(tempArr.pop());
          }
        }

        //need to create an ordinal scale for categorical data
        let categoricalRange = [];
        if (domain.length === 1) {
          //edge case
          domain = [' ', domain[0], ' '];
        }
        let addBy = getRange(config)[0] / (domain.length - 1);
        for (let j = 0; j < domain.length; j++) {
          if (categoricalRange.length === 0) {
            categoricalRange.push(0);
            continue;
          }
          categoricalRange.push(categoricalRange[j - 1] + addBy);
        }
        return scaleOrdinal()
          .domain(domain)
          .range(categoricalRange);
      },
    };
    Object.keys(config.dimensions).forEach(function(k) {
      if (
        config.dimensions[k].yscale === undefined ||
        config.dimensions[k].yscale === null
      ) {
        config.dimensions[k].yscale = defaultScales[config.dimensions[k].type](
          k
        );
      }
    });

    // xscale
    // add padding for d3 >= v4 default 0.2
    xscale.range([0, w(config)]).padding(0.2);

    // Retina display, etc.
    const devicePixelRatio = window.devicePixelRatio || 1;

    // canvas sizes
    pc.selection
      .selectAll('canvas')
      .style('margin-top', config.margin.top + 'px')
      .style('margin-left', config.margin.left + 'px')
      .style('width', w(config) + 2 + 'px')
      .style('height', h(config) + 2 + 'px')
      .attr('width', (w(config) + 2) * devicePixelRatio)
      .attr('height', (h(config) + 2) * devicePixelRatio);
    // default styles, needs to be set when canvas width changes
    ctx.foreground.strokeStyle = config.color;
    ctx.foreground.lineWidth = config.lineWidth;
    ctx.foreground.globalCompositeOperation = config.composite;
    ctx.foreground.globalAlpha = config.alpha;
    ctx.foreground.scale(devicePixelRatio, devicePixelRatio);
    ctx.brushed.strokeStyle = config.brushedColor;
    ctx.brushed.lineWidth = config.lineWidth;
    ctx.brushed.globalCompositeOperation = config.composite;
    ctx.brushed.globalAlpha = config.alpha;
    ctx.brushed.scale(devicePixelRatio, devicePixelRatio);
    ctx.highlight.lineWidth = config.highlightedLineWidth;
    ctx.highlight.scale(devicePixelRatio, devicePixelRatio);
    ctx.marked.lineWidth = config.markedLineWidth;
    ctx.marked.shadowColor = config.markedShadowColor;
    ctx.marked.shadowBlur = config.markedShadowBlur;
    ctx.marked.scale(devicePixelRatio, devicePixelRatio);

    return this;
  };

export default autoscale;
