const invertCategorical = (selection, scale) => {
  if (selection.length === 0) {
    return [];
  }
  const domain = scale.domain();
  const range = scale.range();
  const found = [];
  range.forEach((d, i) => {
    if (d >= selection[0] && d <= selection[1]) {
      found.push(domain[i]);
    }
  });
  return found;
};

const invertByScale = (selection, scale) => {
  if (scale === null) return [];
  return typeof scale.invert === 'undefined'
    ? invertCategorical(selection, scale)
    : selection.map(d => scale.invert(d));
};

export default invertByScale;
export { invertByScale };
