export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const jitter = (minMs = 2000, maxMs = 5000): Promise<void> =>
  sleep(minMs + Math.random() * (maxMs - minMs));
