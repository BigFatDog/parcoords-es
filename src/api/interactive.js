const interactive = flags =>
  function() {
    flags.interactive = true;
    return this;
  };

export default interactive;
