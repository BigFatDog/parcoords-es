/** adjusts an axis' default range [h()+1, 1] if a NullValueSeparator is set */
const getRange = config => {
  const h = config.height - config.margin.top - config.margin.bottom;

  if (config.nullValueSeparator == 'bottom') {
    return [
      h +
        1 -
        config.nullValueSeparatorPadding.bottom -
        config.nullValueSeparatorPadding.top,
      1,
    ];
  } else if (config.nullValueSeparator == 'top') {
    return [
      h + 1,
      1 +
        config.nullValueSeparatorPadding.bottom +
        config.nullValueSeparatorPadding.top,
    ];
  }
  return [h + 1, 1];
};

export default getRange;
