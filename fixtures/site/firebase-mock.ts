// Fixture-only adapter. Never shipped in @sikorsky/site's src-only package.
let count = 7;
const listeners: Array<(snapshot: { val(): number }) => void> = [];
export const getDatabase = () => ({});
export const ref = (_database: unknown, path: string) => ({ path });
export const onValue = (_reference: unknown, callback: (snapshot: { val(): number }) => void) => {
  listeners.push(callback);
  callback({ val: () => count });
};
export const increment = (amount: number) => ({ amount });
export const set = async (_reference: unknown, value: { amount: number }) => {
  count += value.amount;
  listeners.forEach(callback => callback({ val: () => count }));
};
