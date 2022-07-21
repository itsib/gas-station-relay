export class TimeoutError extends Error {}

export async function cancelPromiseByTimeout<T = any>(promise: Promise<T>, timeout: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => {
      finished = true;
      reject(new TimeoutError('Request Timeout '));
    }, timeout);

    promise
      .then((result) => {
        if (!finished) {
          clearTimeout(timer);
          resolve(result);
        }
      })
      .catch(error => {
        if (!finished) {
          clearTimeout(timer);
          reject(error);
        }
      });
  });
}
