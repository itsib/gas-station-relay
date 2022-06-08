export const POST_SEND_TRANSACTION_SCHEMA = {
  title: 'Send and execute transaction',
  type: 'object',
  required: ['tx', 'fee', 'signature'],
  properties: {
    tx: {
      type: 'object',
      required: ['from', 'to', 'gas', 'nonce', 'deadline', 'data'],
      properties: {
        from: {
          type: 'string',
          format: 'hex',
        },
        to: {
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
        deadline: {
          type: 'string',
          pattern: '^[0-9]+$',
        },
        data: {
          type: 'string',
          format: 'hex',
        },
      },
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
