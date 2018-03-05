const detectDimensions = pc =>
  function() {
    pc.dimensions(pc.applyDimensionDefaults());
    return this;
  };

export default detectDimensions;
