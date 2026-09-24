import { AsyncLocalStorage } from 'async_hooks';

/**
 * Provides AsyncLocalStorage (ALS) storage for MongoDB transactions.
 * Allows deep layers (like EventBus) to know if they are executing inside a transaction,
 * enabling event deferral until successful commit.
 */
const als = new AsyncLocalStorage();

export const TransactionContext = {
  run: (store, callback) => als.run(store, callback),
  getStore: () => als.getStore(),
};

export default TransactionContext;
