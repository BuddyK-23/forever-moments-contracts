# Forever Moments - Social NFT Platform on LUKSO

A decentralized social platform built on LUKSO that enables creators to mint, share, and engage with digital moments as LSP8 tokens. The platform features social interactions through LIKES tokens and collection management capabilities.

## Features

- **Moment Creation**: Mint LSP8 tokens representing digital moments with rich metadata
- **Collection Management**: Create and manage collections of moments
- **Social Interactions**: Like and comment on moments using LIKES tokens
- **Open Collections**: Join public collections and contribute moments
- **Universal Profile Integration**: Full integration with LUKSO's Universal Profile system

## Smart Contracts

- `MomentFactory.sol`: Core factory contract for minting moments and managing collections
- `MomentMetadata.sol`: Handles metadata storage and updates for moments
- `LikesToken.sol`: LSP7 token implementation for social interactions
- `MomentURD.sol`: Universal Receiver Delegate for handling likes and comments
- `OpenCollectionManager.sol`: Manages open/public collections
- `CollectionMemberships.sol`: Handles collection membership and permissions

## Prerequisites

1. Node.js (via [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm))
2. [Universal Profile Browser Extension](https://docs.lukso.tech/install-up-browser-extension)
3. [LUKSO Universal Profile](https://my.universalprofile.cloud/)
4. [LUKSO testnet LYX](https://faucet.testnet.lukso.network)

## Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd forever-moments
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Deployment

1. Compile contracts:
   ```bash
   npm run build
   ```

2. Deploy to LUKSO testnet:
   ```bash
   npm run deploy:testnet
   ```

3. Generate and upload metadata:
   ```bash
   npm run generate-metadata
   ```

4. Update token metadata:
   ```bash
   npm run update-metadata:testnet
   ```

5. Mint tokens:
   ```bash
   npm run mint-token-id:testnet
   ```

## Testing

Run the test suite:

```bash
npx hardhat test
```

## Documentation

- [LUKSO Technical Documentation](https://docs.lukso.tech)
- [LSP8 Standard](https://docs.lukso.tech/standards/tokens/LSP8-Identifiable-Digital-Asset)
- [LSP7 Standard](https://docs.lukso.tech/standards/tokens/LSP7-Digital-Asset)

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- Twitter: [@momentsonchain](https://twitter.com/momentsonchain)
- Website: [forevermoments.life](https://forevermoments.life)
