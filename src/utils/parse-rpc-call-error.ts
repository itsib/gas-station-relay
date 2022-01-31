import { defaultAbiCoder } from '@ethersproject/abi';
import { RpcError } from '../types';

export function parseRpcCallError(error: any): RpcError | undefined {
  const serverError = getServerError(error);
  if (!serverError) {
    return undefined;
  }

  let rpcError: RpcError;
  try {
    const body = JSON.parse(serverError.body);
    const requestBody = JSON.parse(serverError.requestBody);

    rpcError = {
      code: body.error.code,
      message: body.error.message,
      data: body.error.data,
      requestBody: {
        method: requestBody.method,
        params: requestBody.params,
      }
    }
  } catch (e) {
    return undefined;
  }

  const result = /0x08c379a0([0-9A-Fa-f]*)/.exec(rpcError.data);
  if (!result) {
    return rpcError;
  }
  try {
    const [, data] = result;
    const [message] = defaultAbiCoder.decode(['string'], `0x${data}`);
    rpcError.message = message;
  } catch (e) {}

  return rpcError;
}

function getServerError(error: any): any {
  if (error.code === 'SERVER_ERROR') {
    return error;
  }
  if (error.error && error.error.code === 'SERVER_ERROR') {
    return error.error;
  }
  return undefined;
}
