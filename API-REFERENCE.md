# Plasma Gas Station Relay Server.
The relay server pays for gas for the user's transaction, takes ERC 20 tokens.

## API Reference

### GET `/info`
Common relay info.
##### Response:
```
{
    "chainId":3,
    "gasStation":"0x3D5305BD441B6D0F4E7c7Ee88ee53972E18c82c6",
    "feeTokens":[
        "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
        "0xaD6D458402F60fD3Bd25163575031ACDce07538D",
        "0x110a13FC3efE6A245B50102D2d79B3E76125Ae83"
    ],
    "balance":"4223057842584335802"
}
```
- **chainId** - ID of the blockchain used by the relayer.
- **gasStation** - Gas Station Contract address.
- **feeTokens** - Addresses of tokens that can be used to pay fee.
- **balance** - The balance of the relay account. In ETH (Raw amount).

<hr />

### GET `/gas`
Returns recommended priority fee or gas price in wei. And also estimated  transaction execution time.
##### Response:
```
{
    "high": {
        "maxFeePerGas": "3904221514",
        "maxPriorityFeePerGas": "3904221504",
        "gasPrice": "3904221504",
        "confirmationTime": "363.06",
    },
    "middle": {
        "maxFeePerGas": "3904221514",
        "maxPriorityFeePerGas": "3904221504",
        "gasPrice": "3904221504",
        "confirmationTime": "363.06",
    },
    "low": {
        "maxFeePerGas": "3904221514",
        "maxPriorityFeePerGas": "3904221504",
        "gasPrice": "3904221504",
        "confirmationTime": "363.06",
    },
    "avgBlockTime": "12.102"
}
```

- **maxFeePerGas** - (Optional) The maxFeePerGas to use for a transaction. This is based on the most recent block's baseFee.
- **maxPriorityFeePerGas** - (Optional) The maxPriorityFeePerGas to use for a transaction. This accounts for the uncle risk and for the majority of current MEV risk.
- **gasPrice** - (Optional) The gasPrice to use for legacy transactions or networks which do not support EIP-1559.
- **confirmationTime** - (Optional) Estimated time of transaction confirmation.
- **avgBlockTime** - (Required) Average block confirmation time.

<hr />

### POST `/tx/estimate-gas`
Returns an estimate of the amount of gas that would be required to submit transaction to the network.
An estimate may not be accurate since there could be another transaction on the network that was not accounted for, but after being mined affected relevant state.

##### Request:
```
{
    "data": "0xd16c7c7500000000000000000...00000000000000000000000000000000000",
    "from": "0xF760BEBB3cD0B717E939fBf534D15Adef94adB98",
    "to": "0x15f8f5df5AfC7b0Ebc25488f845c7C3776a1cD28",
    "value": "0x0",
    "token": ""
}
```
