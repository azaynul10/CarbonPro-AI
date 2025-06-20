// tests/AlgorandIntegration.test.js
import { AlgorandWallet, CarbonCreditAsset } from '../src/algorand_integration.js';

describe('AlgorandIntegration', () => {
  let wallet;
  let assetManager;

  beforeEach(() => {
    wallet = new AlgorandWallet();
    assetManager = new CarbonCreditAsset(wallet);
  });

  test('should validate Algorand addresses', () => {
    const validAddress = 'MFRGG424KHUUQJJQFQHQJQJQFQHQJQJQFQHQJQJQFQHQJQJQFQHQJQJQFQHQJQJQ';
    const invalidAddress = 'invalid-address';

    expect(AlgorandUtils.isValidAddress(validAddress)).toBe(true);
    expect(AlgorandUtils.isValidAddress(invalidAddress)).toBe(false);
  });

  test('should format addresses correctly', () => {
    const address = 'MFRGG424KHUUQJJQFQHQJQJQFQHQJQJQFQHQJQJQFQHQJQJQFQHQJQJQFQHQJQJQ';
    const formatted = AlgorandUtils.formatAddress(address, 6);

    expect(formatted).toBe('MFRGG4...QJQJQJ');
  });

  test('should convert between Algos and microAlgos', () => {
    expect(AlgorandUtils.algosToMicroAlgos(1)).toBe(1000000);
    expect(AlgorandUtils.microAlgosToAlgos(1000000)).toBe(1);
  });
});