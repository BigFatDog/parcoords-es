// Checks if the first dimension is directly left of the second dimension.
const consecutive = dimensions => (first, second) => {
  const keys = Object.keys(dimensions);

  return keys.some(
    (d, i) =>
      d === first ? i + i < keys.length && dimensions[i + 1] === second : false
  );
};

export default consecutive;
