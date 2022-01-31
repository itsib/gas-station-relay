export interface RpcError {
  code: number;
  message: string;
  data: string;
  requestBody: {
    method: string;
    params: any[];
  }
}
