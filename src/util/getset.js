const getset = (obj, state, events, side_effects) => {
  Object.keys(state).forEach(function(key) {
    obj[key] = function(x) {
      if (!arguments.length) {
        return state[key];
      }
      if (
        key === 'dimensions' &&
        Object.prototype.toString.call(x) === '[object Array]'
      ) {
        console.warn('pc.dimensions([]) is deprecated, use pc.dimensions({})');
        x = obj.applyDimensionDefaults(x);
      }
      let old = state[key];
      state[key] = x;
      side_effects.call(key, obj, { value: x, previous: old });
      events.call(key, obj, { value: x, previous: old });
      return obj;
    };
  });
};

export default getset;
