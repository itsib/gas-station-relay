export const POST_SEND_TRANSACTION_SCHEMA = {
  title: 'Send and execute transaction',
  type: 'object',
  required: ['tx', 'fee', 'signature'],
  properties: {
    tx: {
      type: 'object',
      required: ['from', 'to', 'data', 'gas', 'nonce', 'value', 'deadline'],
      properties: {
        from: {
          type: 'string',
          format: 'hex',
        },
        to: {
          type: 'string',
          format: 'hex',
        },
        data: {
          type: 'string',
          format: 'hex',
        },
        gas: {
          type: 'string',
          pattern: '^[0-9]+$',
        },
        nonce: {
          type: 'string',
          pattern: '^[0-9]+$',
        },
        value: {
          type: 'string',
          pattern: '^[0-9]+$',
        },
        deadline: {
          type: 'string',
          pattern: '^[0-9]+$',
        },
        maxFeePerGas: {
          type: 'string',
          pattern: '^[0-9]+$',
        },
        maxPriorityFeePerGas: {
          type: 'string',
          pattern: '^[0-9]+$',
        },
        gasPrice: {
          type: 'string',
          pattern: '^[0-9]+$',
        },
      },
      oneOf: [
        {
          required: ['maxFeePerGas', 'maxPriorityFeePerGas']
        },
        {
          required: ['gasPrice']
        },
      ],
      additionalProperties: false,
    },
    fee: {
      type: 'object',
      required: ['token', 'approvalData'],
      properties: {
        token: {
          type: 'string',
          format: 'hex',
        },
        approvalData: {
          type: 'string',
          format: 'hex',
        },
      },
      additionalProperties: false,
    },
    signature: {
      type: 'string',
      format: 'hex',
    },
  },
  additionalProperties: false,
}
