export async function getPromiseState(promise: Promise<any>): Promise<'pending' | 'fulfilled' | 'rejected'> {
  return Promise.race([promise, 'pending'])
    .then(results => results === 'pending' ? 'pending' : 'fulfilled')
    .catch(() => 'rejected');
}
