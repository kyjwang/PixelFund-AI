import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";

type RequestStore = { requestId: string };
const als = new AsyncLocalStorage<RequestStore>();

export const requestContext = {
  run<T>(requestId: string, fn: () => T) {
    return als.run({ requestId }, fn);
  },
  getRequestId() {
    return als.getStore()?.requestId ?? randomUUID();
  }
};
