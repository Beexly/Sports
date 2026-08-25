const { promise, resolve } = Promise.withResolvers();
setTimeout(resolve, 1);
export default promise;
