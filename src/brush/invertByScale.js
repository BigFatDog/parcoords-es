const invertCategorical = (selection, yscale) => {
  if (selection.length === 0) {
    return [];
  }
  const domain = yscale.domain();
  const range = yscale.range();
  const found = [];
  range.forEach((d, i) => {
    if (d >= selection[0] && d <= selection[1]) {
      found.push(domain[i]);
    }
  });
  return found;
};

const invertByScale = (selection, yScale) => {
  return typeof yScale.invert === 'undefined'
    ? invertCategorical(selection, yScale)
    : selection.map(d => yScale.invert(d));
};

export default invertByScale;
export { invertByScale };
