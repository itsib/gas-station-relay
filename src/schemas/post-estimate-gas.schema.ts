export const POST_ESTIMATE_GAS_SCHEMA = {
  title: 'Estimate gas request',
  type: 'object',
  required: ['from', 'to', 'data', 'value'],
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
    value: {
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
