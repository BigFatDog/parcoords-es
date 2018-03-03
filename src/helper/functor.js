const _functor = v => {
  return typeof v === 'function'
    ? v
    : function() {
        return v;
      };
};

export default _functor;
