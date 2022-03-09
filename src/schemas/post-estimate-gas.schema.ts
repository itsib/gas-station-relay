export const POST_ESTIMATE_GAS_SCHEMA = {
  title: 'Estimate gas request',
  description: 'The fields required to calculate the gas that will be required to complete the transaction.',
  type: 'object',
  required: ['from', 'to', 'value', 'data', 'token', 'pricePerGas'],
  properties: {
    from: {
      type: 'string',
      format: 'address',
    },
    to: {
      type: 'string',
      format: 'address',
    },
    value: {
      type: 'string',
      pattern: '^[0-9]+$',
    },
    data: {
      type: 'string',
      format: 'hex',
    },
    token: {
      type: 'string',
      format: 'address',
    },
    pricePerGas: {
      type: 'string',
      pattern: '^[0-9]+$',
    },
  },
  additionalProperties: false,
}
