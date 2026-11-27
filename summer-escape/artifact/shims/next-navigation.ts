export const useRouter = () => ({ push() {}, replace() {}, refresh() {}, back() {} });
export const notFound = () => { throw new Error("not found"); };
export const redirect = () => { throw new Error("redirect"); };
