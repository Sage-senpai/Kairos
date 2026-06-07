// Generate a fresh Sui keypair and print the address + private key.
// Run from the repo root with: pnpm wallet
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const keypair = Ed25519Keypair.generate();
const address = keypair.getPublicKey().toSuiAddress();
const privateKey = keypair.getSecretKey(); // suiprivkey1...

console.log('');
console.log('  New Sui wallet');
console.log('  ------------------------------------------------------------');
console.log('  Address:      ' + address);
console.log('  Private key:  ' + privateKey);
console.log('  ------------------------------------------------------------');
console.log('');
console.log('  Next:');
console.log('  1. Fund the address with free testnet SUI at https://faucet.sui.io');
console.log('     (choose the Testnet network, paste the address).');
console.log('  2. Put the private key in your agent .env as SUI_PRIVATE_KEY.');
console.log('');
console.log('  Keep the private key secret. Anyone who has it controls the wallet.');
console.log('');
