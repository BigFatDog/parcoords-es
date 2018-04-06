const dimensionsForPoint = (config, pc, xscale, p) => {
  const dims = { i: -1, left: undefined, right: undefined };
  Object.keys(config.dimensions).some((dim, i) => {
    if (xscale(dim) < p[0]) {
      dims.i = i;
      dims.left = dim;
      dims.right = Object.keys(config.dimensions)[
        pc.getOrderedDimensionKeys().indexOf(dim) + 1
      ];
      return false;
    }
    return true;
  });

  if (dims.left === undefined) {
    // Event on the left side of the first axis.
    dims.i = 0;
    dims.left = pc.getOrderedDimensionKeys()[0];
    dims.right = pc.getOrderedDimensionKeys()[1];
  } else if (dims.right === undefined) {
    // Event on the right side of the last axis
    dims.i = Object.keys(config.dimensions).length - 1;
    dims.right = dims.left;
    dims.left = pc.getOrderedDimensionKeys()[
      Object.keys(config.dimensions).length - 2
    ];
  }

  return dims;
};

export default dimensionsForPoint;
