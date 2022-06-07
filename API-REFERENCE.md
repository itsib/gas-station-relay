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
