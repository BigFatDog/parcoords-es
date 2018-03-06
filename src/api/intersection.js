// calculate 2d intersection of line a->b with line c->d
// points are objects with x and y properties
const intersection = (a, b, c, d) => {
  return {
    x:
      ((a.x * b.y - a.y * b.x) * (c.x - d.x) -
        (a.x - b.x) * (c.x * d.y - c.y * d.x)) /
      ((a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x)),
    y:
      ((a.x * b.y - a.y * b.x) * (c.y - d.y) -
        (a.y - b.y) * (c.x * d.y - c.y * d.x)) /
      ((a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x)),
  };
};

export default intersection;
