import { entries, keys } from 'd3-collection';
import { axisLeft } from 'd3-axis';
import { dispatch } from 'd3-dispatch';
import { scalePoint } from 'd3-scale';

import DefaultConfig from './defaultConfig';

const initState = userConfig => {
  const config = Object.assign({}, DefaultConfig, userConfig);

  if (userConfig && userConfig.dimensionTitles) {
    console.warn(
      'dimensionTitles passed in userConfig is deprecated. Add title to dimension object.'
    );
    entries(userConfig.dimensionTitles).forEach(d => {
      if (config.dimensions[d.key]) {
        config.dimensions[d.key].title = config.dimensions[d.key].title
          ? config.dimensions[d.key].title
          : d.value;
      } else {
        config.dimensions[d.key] = {
          title: d.value,
        };
      }
    });
  }

  const eventTypes = [
    'render',
    'resize',
    'highlight',
    'mark',
    'brush',
    'brushend',
    'brushstart',
    'axesreorder',
  ].concat(keys(config));

  const events = dispatch.apply(this, eventTypes),
    flags = {
      brushable: false,
      reorderable: false,
      axes: false,
      interactive: false,
      debug: false,
    },
    xscale = scalePoint(),
    dragging = {},
    axis = axisLeft().ticks(5),
    ctx = {},
    canvas = {};

  const brush = {
    modes: {
      None: {
        install: function(pc) {}, // Nothing to be done.
        uninstall: function(pc) {}, // Nothing to be done.
        selected: function() {
          return [];
        }, // Nothing to return
        brushState: function() {
          return {};
        },
      },
    },
    mode: 'None',
    predicate: 'AND',
    currentMode: function() {
      return this.modes[this.mode];
    },
  };

  return {
    config,
    events,
    eventTypes,
    flags,
    xscale,
    dragging,
    axis,
    ctx,
    canvas,
    brush,
  };
};

export default initState;
