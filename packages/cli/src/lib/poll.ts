import ora from 'ora';

export interface PollOptions<T> {
  fn: () => Promise<T>;
  isDone: (result: T) => boolean;
  isFailed?: (result: T) => string | false;
  getProgress?: (result: T) => number;
  intervalMs?: number;
  maxAttempts?: number;
  message?: string;
}

export async function poll<T>(opts: PollOptions<T>): Promise<T> {
  const {
    fn,
    isDone,
    isFailed,
    getProgress,
    intervalMs = 5000,
    maxAttempts = 360, // 30 minutes at 5s intervals
    message = 'Processing',
  } = opts;

  const spinner = ora(message).start();
  let attempts = 0;

  while (attempts < maxAttempts) {
    const result = await fn();
    attempts++;

    if (isFailed) {
      const error = isFailed(result);
      if (error) {
        spinner.fail(error);
        throw new Error(error);
      }
    }

    if (isDone(result)) {
      spinner.succeed();
      return result;
    }

    if (getProgress) {
      const pct = Math.round(getProgress(result) * 100);
      spinner.text = `${message} (${pct}%)`;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  spinner.fail('Timed out');
  throw new Error(`Polling timed out after ${maxAttempts} attempts`);
}
