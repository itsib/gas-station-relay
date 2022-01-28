import { defaultAbiCoder } from '@ethersproject/abi';

export function parseCallError(error: any): string {
  if (!error.error || !error.error.error || !error.error.error.data) {
    return error.message;
  }
  const result = /0x08c379a0([0-9A-Fa-f]*)/.exec(error.error.error.data);
  if (!result) {
    return error.message;
  }
  try {
    const [, data] = result;
    const [message] = defaultAbiCoder.decode(['string'], `0x${data}`);
    return message;
  } catch (e) {
    return error.message;
  }
}
