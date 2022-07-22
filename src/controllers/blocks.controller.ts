import { BadRequest } from '@tsed/exceptions';
import { isHexString } from 'ethers/lib/utils';
import { inject } from 'inversify';
import { BaseHttpController, controller, httpGet, queryParam } from 'inversify-express-utils';
import { Example, Get, Query, Route, Tags } from 'tsoa';
import { SerializedBlock } from '../types';
import { Provider } from '../utils';

@Route('/blocks')
@controller('/blocks')
export class BlocksController extends BaseHttpController {

  constructor(@inject('Provider') private _provider: Provider) {
    super();
  }

  /**
   * These methods track the head of the chain.
   * This is how transactions make their way around the network,
   * find their way into blocks, and how clients find out about new blocks.
   *
   * @summary Latest block number
   */
  @Get('/latest')
  @Example<{ number: number }>({
    number: 123543,
  })
  @Tags('Blocks')
  @httpGet('/latest')
  async getBlockNumber(): Promise<{ number: number }> {
    return await this._provider.getBlockNumber().then(number => ({ number }));
  }

  /**
   * Returns information about a block by block number or tag.
   *
   * @summary Block by number
   */
  @Get('/by-number')
  @Example<SerializedBlock>({
    hash: '0x212f79c4210900b21e92060b89db28e2af354f0b02ecb04b38a43d13fc15f06a',
    parentHash: '0x212f79c4210900b21e92060b89db28e2af354f0b02ecb04b38a43d13fc15f06a',
    number: 14162867,
    timestamp: 1658482143,
    nonce: '0xd81bb3',
    difficulty: 14162868,
    _difficulty: '0xd81bb4',
    gasLimit: '0x01312d00',
    gasUsed: '0x2f80d4',
    miner: '0xB2625af7898f3F3C03959e8C5a2DA25740Cf32da',
    extraData: '0xd983010508846765746889676f312e31362e3135856c696e7578000000000000f8ccc0c080b841651a5fccb54c0897d320487494a70d972209c072e18a9b72f5a1e66a186a03c6519f6a62c2f8c43f5c324b9b15394e8a69360d477419cd3eefe79e8cdbfa20a101f8418e262fd5fedfae3f8dfcf857efe13db016302baaa07c41fa74b06a4dec170fc627b9a46fdd8d483c56aba7abfb5d6930999773a9b88f84eb53c62f98cbb4960180f8418e3fffffffffffffffffffffffffffb0f19444993b91e051eed63d0470cd543d6d0668c6592b1d6879ab9f959539d6326f798c9b041ec1e509f1ce316f4a660080',
    baseFeePerGas: null,
    transactions: [
      '0xcfe553c8846b86697454e6e0955620b9259bcdeadb3b35a41eebc033f4a849c7',
      '0x076478f82954783d6dc0b2f13043c4665dfad33ac07c376d8f43e336a86a5029',
      '0x9d7ca00fa4e5da0a41d51f6aedcf9b2066b8af89927752e57999a33ff27c041a',
      '0x8fd5dd6b2336b69c3141500019542b04698ed766f347dc8d68121a9fef52bb02',
      '0x9dcd41c780c9f3dd0e2eca8bf5ee24740013f1d1660626d94579e9d7186fa2c3',
      '0x98e2f81cb472ceaf8f198d3cd7562f1e2b6042a37af10bbcc7c295c4a6dfd9b3',
      '0xa1028f75c37c5049ad0c90604ae4816c3ff6cd83dad6e70b48acc2afb7f65dc2',
      '0x7aa41a878b75760da290146c011adbe5834e455111c3d2d4c00a4009fc3c5882',
      '0x9f15b5df3d6a5c2803d83e2d90faf33addf929c13765d9ddf0e820a399d0c5ae',
    ],
  })
  @Tags('Blocks')
  @httpGet('/by-number')
  async getBlockByNumber(@queryParam('number') @Query() number?: string): Promise<SerializedBlock | null> {
    let blockTag: string | number;
    if (!number) {
      blockTag = 'latest';
    } else if (number === 'earliest' || number === 'pending' || number === 'latest' || isHexString(number)) {
      blockTag = number;
    } else {
      blockTag = parseInt(number);
      if (isNaN(blockTag)) {
        throw new BadRequest('Validation error', [
          { field: '/number', message: 'Invalid block number' },
        ]);
      }
    }
    return await this._provider.getBlock(blockTag).then(block => {
      if (!block) {
        return null;
      }

      return {
        hash: block.hash,
        parentHash: block.hash,
        number: block.number,
        timestamp: block.timestamp,
        nonce: block.nonce,
        difficulty: block.difficulty,
        _difficulty: block._difficulty?.toHexString(),
        gasLimit: block.gasLimit.toHexString(),
        gasUsed: block.gasUsed.toHexString(),
        miner: block.miner,
        extraData: block.extraData,
        baseFeePerGas: block.baseFeePerGas?.toHexString() || null,
        transactions: block.transactions,
      }
    });
  }

  /**
   * Returns information about a block by block hash.
   *
   * @summary Block by hash
   */
  @Get('/by-hash')
  @Example<SerializedBlock>({
    hash: '0x212f79c4210900b21e92060b89db28e2af354f0b02ecb04b38a43d13fc15f06a',
    parentHash: '0x212f79c4210900b21e92060b89db28e2af354f0b02ecb04b38a43d13fc15f06a',
    number: 14162867,
    timestamp: 1658482143,
    nonce: '0xd81bb3',
    difficulty: 14162868,
    _difficulty: '0xd81bb4',
    gasLimit: '0x01312d00',
    gasUsed: '0x2f80d4',
    miner: '0xB2625af7898f3F3C03959e8C5a2DA25740Cf32da',
    extraData: '0xd983010508846765746889676f312e31362e3135856c696e7578000000000000f8ccc0c080b841651a5fccb54c0897d320487494a70d972209c072e18a9b72f5a1e66a186a03c6519f6a62c2f8c43f5c324b9b15394e8a69360d477419cd3eefe79e8cdbfa20a101f8418e262fd5fedfae3f8dfcf857efe13db016302baaa07c41fa74b06a4dec170fc627b9a46fdd8d483c56aba7abfb5d6930999773a9b88f84eb53c62f98cbb4960180f8418e3fffffffffffffffffffffffffffb0f19444993b91e051eed63d0470cd543d6d0668c6592b1d6879ab9f959539d6326f798c9b041ec1e509f1ce316f4a660080',
    baseFeePerGas: null,
    transactions: [
      '0xcfe553c8846b86697454e6e0955620b9259bcdeadb3b35a41eebc033f4a849c7',
      '0x076478f82954783d6dc0b2f13043c4665dfad33ac07c376d8f43e336a86a5029',
      '0x9d7ca00fa4e5da0a41d51f6aedcf9b2066b8af89927752e57999a33ff27c041a',
      '0x8fd5dd6b2336b69c3141500019542b04698ed766f347dc8d68121a9fef52bb02',
      '0x9dcd41c780c9f3dd0e2eca8bf5ee24740013f1d1660626d94579e9d7186fa2c3',
      '0x98e2f81cb472ceaf8f198d3cd7562f1e2b6042a37af10bbcc7c295c4a6dfd9b3',
      '0xa1028f75c37c5049ad0c90604ae4816c3ff6cd83dad6e70b48acc2afb7f65dc2',
      '0x7aa41a878b75760da290146c011adbe5834e455111c3d2d4c00a4009fc3c5882',
      '0x9f15b5df3d6a5c2803d83e2d90faf33addf929c13765d9ddf0e820a399d0c5ae',
    ],
  })
  @Tags('Blocks')
  @httpGet('/by-hash')
  async getBlockByHash(@queryParam('hash') @Query() hash: string): Promise<SerializedBlock | null> {
    if (!isHexString(hash, 32)) {
      throw new BadRequest('Validation error', [
        { field: '/hash', message: 'Invalid block hash' },
      ]);
    }
    return await this._provider.getBlock(hash).then(block => {
      if (!block) {
        return null;
      }

      return {
        hash: block.hash,
        parentHash: block.hash,
        number: block.number,
        timestamp: block.timestamp,
        nonce: block.nonce,
        difficulty: block.difficulty,
        _difficulty: block._difficulty?.toHexString(),
        gasLimit: block.gasLimit.toHexString(),
        gasUsed: block.gasUsed.toHexString(),
        miner: block.miner,
        extraData: block.extraData,
        baseFeePerGas: block.baseFeePerGas?.toHexString() || null,
        transactions: block.transactions,
      }
    });
  }
}
