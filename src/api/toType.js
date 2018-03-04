// a better "typeof" from this post: http://stackoverflow.com/questions/7390426/better-way-to-get-type-of-a-javascript-variable
const toType = v => {
  return {}.toString
    .call(v)
    .match(/\s([a-zA-Z]+)/)[1]
    .toLowerCase();
};

export default toType;
