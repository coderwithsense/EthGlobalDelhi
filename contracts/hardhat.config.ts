import '@nomicfoundation/hardhat-ethers';
import 'hardhat-tracer';
import '@nomicfoundation/hardhat-chai-matchers';
import "@nomicfoundation/hardhat-verify";
import '@typechain/hardhat';
import { HardhatUserConfig, vars } from 'hardhat/config';

import './tasks/gen_verifier';
import './tasks/compile';
import './tasks/deploy';

const TEST_HDWALLET = {
  mnemonic: 'test test test test test test test test test test test junk',
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 20,
  passphrase: '',
};

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : TEST_HDWALLET;

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      chainId: 1337, // @see https://hardhat.org/metamask-issue.html
    },
    hardhat_local: {
      url: 'http://127.0.0.1:8545/',
    },
    polygon_amoy: {
      chainId: 80002,
      url: 'https://api.zan.top/polygon-amoy',
      /*
      accounts: [{
        privateKey: vars.get('HIMANSHU_TEST_KEY')
      } as HardhatNetworkAccountUserConfig]
      */
      accounts: [
        vars.get('HIMANSHU_TEST_KEY')
      ]
    }
  },
  /*
  sourcify: {
    enabled: true,
    // Optional: specify a different Sourcify server
    apiUrl: "https://sourcify.dev/server",
    // Optional: specify a different Sourcify repository
    browserUrl: "https://repo.sourcify.dev",
  },
  */
  sourcify: {
    enabled: false
  },
  etherscan: {
    enabled: true,
    apiKey: vars.get('ETHERSCAN_API_KEY'),
    customChains: [
      {
        network: "polygon_amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://amoy.polygonscan.com/"
        }
      }
    ]
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
