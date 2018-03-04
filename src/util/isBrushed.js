const isBrushed = (config, brushGroup) => {
  if (config.brushed && config.brushed.length !== config.data.length)
    return true;

  const object = brushGroup.currentMode().brushState();

  for (let key in object) {
    if (object.hasOwnProperty(key)) {
      return true;
    }
  }
  return false;
};

export default isBrushed;
