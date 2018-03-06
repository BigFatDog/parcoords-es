const flip = config =>
  function(d) {
    //__.dimensions[d].yscale.domain().reverse();                               // does not work
    config.dimensions[d].yscale.domain(
      config.dimensions[d].yscale.domain().reverse()
    ); // works

    return this;
  };

export default flip;
