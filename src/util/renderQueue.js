import 'requestanimationframe';

const renderQueue = function(func) {
  let _queue = [], // data to be rendered
    _rate = 1000, // number of calls per frame
    _invalidate = function() {}, // invalidate last render queue
    _clear = function() {}; // clearing function

  let rq = function(data) {
    if (data) rq.data(data);
    _invalidate();
    _clear();
    rq.render();
  };

  rq.render = function() {
    let valid = true;
    _invalidate = rq.invalidate = function() {
      valid = false;
    };

    function doFrame() {
      if (!valid) return true;
      let chunk = _queue.splice(0, _rate);
      chunk.map(func);
      requestAnimationFrame(doFrame);
    }

    doFrame();
  };

  rq.data = function(data) {
    _invalidate();
    _queue = data.slice(0); // creates a copy of the data
    return rq;
  };

  rq.add = function(data) {
    _queue = _queue.concat(data);
  };

  rq.rate = function(value) {
    if (!arguments.length) return _rate;
    _rate = value;
    return rq;
  };

  rq.remaining = function() {
    return _queue.length;
  };

  // clear the canvas
  rq.clear = function(func) {
    if (!arguments.length) {
      _clear();
      return rq;
    }
    _clear = func;
    return rq;
  };

  rq.invalidate = _invalidate;

  return rq;
};

export default renderQueue;
