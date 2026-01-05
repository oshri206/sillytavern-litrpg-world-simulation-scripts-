import { createPanel, renderList } from './shared.js';

function createMerchantPanel() {
  const panel = createPanel('valdris-merchant', 'Living Economy');
  return {
    panel,
    update(merchants) {
      renderList(
        panel,
        merchants.map((merchant) => `${merchant.name}: ${merchant.inventory.join(', ')}`)
      );
    }
  };
}

export { createMerchantPanel };
