/**
 * SYNARCH Wallet Client for Analyzer Agent
 * See agents/worker/src/wallet-client.js for full documentation.
 * Identical API surface — shared across all agent types.
 */

class WalletClient {
  constructor(logger) {
    this.logger = logger;
    this.appId = process.env.PRIVY_APP_ID;
    this.appSecret = process.env.PRIVY_APP_SECRET;
    this.authKeyId = process.env.PRIVY_AUTHORIZATION_KEY_ID;
    this.authKeyPrivate = process.env.PRIVY_AUTHORIZATION_KEY_PRIVATE_KEY;
    this.walletId = process.env.AGENT_WALLET_ID || null;
    this.walletAddress = null;
    this.policyId = process.env.AGENT_WALLET_POLICY_ID || null;
    this.privyClient = null;
    this.initialized = false;
    this.transactionLog = [];
  }

  isConfigured() {
    return !!(this.appId && this.appSecret);
  }

  async initialize() {
    if (!this.isConfigured()) {
      this.logger.warn("Wallet not configured — skipping (set PRIVY_APP_ID and PRIVY_APP_SECRET)");
      return false;
    }
    try {
      const { PrivyClient } = require("@privy-io/node");
      this.privyClient = new PrivyClient(this.appId, this.appSecret, {
        walletApi: { authorizationPrivateKey: this.authKeyPrivate },
      });
      this.initialized = true;
      this.logger.info("Wallet client initialized");
      return true;
    } catch (err) {
      this.logger.error(`Wallet init failed: ${err.message}`);
      return false;
    }
  }

  async createWallet(chainType = "ethereum") {
    if (!this.initialized) throw new Error("Wallet client not initialized");
    const wallet = await this.privyClient.walletApi.create({
      chainType,
      authorizationKeyIds: this.authKeyId ? [this.authKeyId] : undefined,
      policyIds: this.policyId ? [this.policyId] : undefined,
    });
    this.walletId = wallet.id;
    this.walletAddress = wallet.address;
    this.logger.info("Wallet created", { address: wallet.address });
    return wallet;
  }

  async sendTransaction({ to, value, data, chainId = 1 }) {
    if (!this.initialized || !this.walletId) throw new Error("No wallet");
    const tx = await this.privyClient.walletApi.ethereum.sendTransaction({
      walletId: this.walletId,
      caip2: `eip155:${chainId}`,
      transaction: { to, value, data },
    });
    this.transactionLog.push({ txHash: tx.hash, to, value, chainId, timestamp: new Date().toISOString() });
    this.logger.info("Transaction sent", { txHash: tx.hash?.slice(0, 12) });
    return tx;
  }

  async handleX402Payment({ recipient, amount, chainId, token }) {
    this.logger.info("Processing x402 payment", { recipient, amount, token });
    return this.sendTransaction({ to: recipient, value: amount, chainId: chainId || 1 });
  }

  async signMessage(message) {
    if (!this.initialized || !this.walletId) throw new Error("No wallet");
    return this.privyClient.walletApi.ethereum.signMessage({ walletId: this.walletId, message });
  }

  getTransactionLog() { return [...this.transactionLog]; }

  getSummary() {
    return {
      configured: this.isConfigured(),
      initialized: this.initialized,
      walletId: this.walletId?.slice(0, 12) || null,
      walletAddress: this.walletAddress,
      totalTransactions: this.transactionLog.length,
    };
  }
}

module.exports = { WalletClient };