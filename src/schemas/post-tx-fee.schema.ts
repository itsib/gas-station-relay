export const POST_TX_FEE_SCHEMA = {
  title: 'Transaction fee request',
  description: 'The fields required to calculate the transaction cost that will be required to complete the transaction.',
  type: 'object',
  required: ['from', 'to', 'data', 'token'],
  properties: {
    from: {
      type: 'string',
      format: 'address',
    },
    to: {
      type: 'string',
      format: 'address',
    },
    data: {
      type: 'string',
      format: 'hex',
    },
    token: {
      type: 'string',
      format: 'address',
    },
  },
  additionalProperties: false,
}
