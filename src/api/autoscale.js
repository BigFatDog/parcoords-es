import { scaleLinear, scaleOrdinal, scalePoint, scaleTime } from 'd3-scale';
import { keys } from 'd3-collection';
import { extent } from 'd3-array';
import getRange from '../util/getRange';
import w from '../util/width';
import h from '../util/height';

const autoscale = (config, pc, xscale, ctx) =>
  function() {
    // yscale
    let defaultScales = {
      date: function(k) {
        let _extent = extent(config.data, function(d) {
          return d[k] ? d[k].getTime() : null;
        });
        // special case if single value
        if (_extent[0] === _extent[1]) {
          return scalePoint()
            .domain(_extent)
            .range(getRange(config));
        }
        if (config.flipAxes.includes(k)) {
          let tempDate = [];
          _extent.forEach(function(val) {
            tempDate.unshift(val);
          });
          _extent = tempDate;
        }
        return scaleTime()
          .domain(_extent)
          .range(getRange(config));
      },
      number: function(k) {
        let _extent = extent(config.data, function(d) {
          return +d[k];
        });
        // special case if single value
        if (_extent[0] === _extent[1]) {
          return scalePoint()
            .domain(_extent)
            .range(getRange(config));
        }
        if (config.flipAxes.includes(k)) {
          let temp = [];
          _extent.forEach(function(val) {
            temp.unshift(val);
          });
          _extent = temp;
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
        config.data.map(function(p) {
          if (p[k] === undefined && config.nullValueSeparator !== 'undefined') {
            return; // null values will be drawn beyond the horizontal null value separator!
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
    keys(config.dimensions).forEach(function(k) {
      config.dimensions[k].yscale = defaultScales[config.dimensions[k].type](k);
    });

    // xscale
    xscale.range([0, w(config)], 1);
    // Retina display, etc.
    let devicePixelRatio = window.devicePixelRatio || 1;

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
    ctx.foreground.lineWidth = 1.4;
    ctx.foreground.globalCompositeOperation = config.composite;
    ctx.foreground.globalAlpha = config.alpha;
    ctx.foreground.scale(devicePixelRatio, devicePixelRatio);
    ctx.brushed.strokeStyle = config.brushedColor;
    ctx.brushed.lineWidth = 1.4;
    ctx.brushed.globalCompositeOperation = config.composite;
    ctx.brushed.globalAlpha = config.alpha;
    ctx.brushed.scale(devicePixelRatio, devicePixelRatio);
    ctx.highlight.lineWidth = 3;
    ctx.highlight.scale(devicePixelRatio, devicePixelRatio);

    return this;
  };

export default autoscale;
