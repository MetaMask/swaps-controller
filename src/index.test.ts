import SwapsController, { swapsUtils } from '.';

describe('SwapsController', () => {
  it('should export controller as default', () => {
    expect(SwapsController).toBeDefined();
  });

  it('should export utils', () => {
    expect(swapsUtils).toBeDefined();
  });
});
