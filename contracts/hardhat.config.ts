import '@nomicfoundation/hardhat-ethers';
import 'hardhat-tracer';
import '@nomicfoundation/hardhat-chai-matchers';
import "@nomicfoundation/hardhat-verify";
import '@typechain/hardhat';
import { HardhatUserConfig } from 'hardhat/config';

import './tasks/gen_verifier';

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      chainId: 1337, // @see https://hardhat.org/metamask-issue.html
    },
    hardhat_local: {
      url: 'http://127.0.0.1:8545/',
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.27',
        settings: {
          evmVersion: "paris",
          optimizer: {
            enabled: true,
            //enabled: false,
            runs: 2000,
          },
          viaIR: true,
          //viaIR: false,
        },
      }
    ],
  },
  typechain: {
    target: 'ethers-v6',
    outDir: 'src/contracts',
  },
  mocha: {
    require: ['ts-node/register/files'],
    timeout: 50_000,
  },
};

export default config;
