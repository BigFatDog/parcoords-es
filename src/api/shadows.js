const shadows = (flags, pc) =>
  function() {
    flags.shadows = true;
    pc.alphaOnBrushed(0.1);
    pc.render();
    return this;
  };

export default shadows;
