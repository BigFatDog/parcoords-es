const scale = (config, pc) =>
  function(d, domain) {
    config.dimensions[d].yscale.domain(domain);
    pc.render().default();

    return this;
  };

export default scale;
