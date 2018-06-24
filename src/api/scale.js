const scale = (config, pc) =>
  function(d, domain) {
    config.dimensions[d].yscale.domain(domain);
    pc.render.default();
    pc.updateAxes();

    return this;
  };

export default scale;
