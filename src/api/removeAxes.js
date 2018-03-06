const removeAxes = pc =>
  function() {
    pc._g.remove();

    delete pc._g;
    return this;
  };

export default removeAxes;
