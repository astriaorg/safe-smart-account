import "@nomicfoundation/hardhat-toolbox";
import type { HardhatUserConfig, HttpNetworkUserConfig } from "hardhat/types";
import "@nomicfoundation/hardhat-verify";
import "solidity-coverage";
import "@matterlabs/hardhat-zksync-deploy";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-verify";
import "@matterlabs/hardhat-zksync-ethers";
import "@matterlabs/hardhat-zksync-node";
import "hardhat-deploy";
import dotenv from "dotenv";
import yargs from "yargs";
// import { getSingletonFactoryInfo } from "@safe-global/safe-singleton-factory";

const argv = yargs
    .option("network", {
        type: "string",
        default: "hardhat",
    })
    .help(false)
    .version(false)
    .parseSync();

// Load environment variables.
dotenv.config();
const {
    NODE_URL,
    INFURA_KEY,
    MNEMONIC,
    ETHERSCAN_API_KEY,
    PK,
    SOLIDITY_VERSION,
    SOLIDITY_SETTINGS,
    HARDHAT_ENABLE_ZKSYNC = "0",
    HARDHAT_CHAIN_ID = 31337,
} = process.env;

const DEFAULT_MNEMONIC = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

const sharedNetworkConfig: HttpNetworkUserConfig = {};
if (PK) {
    sharedNetworkConfig.accounts = [PK];
} else {
    sharedNetworkConfig.accounts = {
        mnemonic: MNEMONIC || DEFAULT_MNEMONIC,
    };
}

if (["mainnet", "rinkeby", "kovan", "goerli", "ropsten", "mumbai", "polygon"].includes(argv.network) && INFURA_KEY === undefined) {
    throw new Error(`Could not find Infura key in env, unable to connect to network ${argv.network}`);
}

import "./src/tasks/local_verify";
import "./src/tasks/deploy_contracts";
import "./src/tasks/show_codesize";
import { BigNumber } from "@ethersproject/bignumber";
import { DeterministicDeploymentInfo } from "hardhat-deploy/dist/types";

const defaultSolidityVersion = "0.7.6";
const primarySolidityVersion = SOLIDITY_VERSION || defaultSolidityVersion;
const soliditySettings = SOLIDITY_SETTINGS ? JSON.parse(SOLIDITY_SETTINGS) : undefined;

const deterministicDeployment = (network: string): DeterministicDeploymentInfo => {

    // hardcode this for now because the safe-singleton-factory package isn't updated with the latest

    // const info = getSingletonFactoryInfo(parseInt(network));

    let info;

    // forma testnet
    if (parseInt(network) === 984123) {
        info = {
            "gasPrice": 19000000000,
            "gasLimit": 96586,
            "signerAddress": "0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37",
            "transaction": "0xf8a88085046c7cfe008301794a8080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3831e089aa031eeb9f0234d4aae95e0af160d586d67a04ab9b36685e47fb0f7a1819fde18ada0185adfad0544a9bdeb3dbb90394b0fe0dd586f15ee38437090e2584aa404ddf4",
            "address": "0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7"
        };
    }

    // forma
    if (parseInt(network) === 984122) {
        info = {
            "gasPrice": 25289000000,
            "gasLimit": 96586,
            "signerAddress": "0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37",
            "transaction": "0xf8a8808505e35784408301794a8080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3831e0898a0c781e184013aeaf8a4ac819ddf0e4ec0f503b0839d4342028e03ee1edb45a288a01675cf287d06f936eadb653f1da57a161f7146e9641ebd158f686e448d022282",
            "address": "0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7"
        };
    }

    // flame
    if (parseInt(network) === 253368190) {
        info = {
            "gasPrice": 101000000000,
            "gasLimit": 96586,
            "signerAddress": "0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37",
            "transaction": "0xf8a98085178411b2008301794a8080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3841e342f1fa0170f6d2de5464340cd3d3e0f05ab66d589a7814695516c42cec6f504ae15f6fca03ee5bbac77e4689e9e61bf9ba15b40abbd70e674e89971bc40092bcf8e8ba325",
            "address": "0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7"
        };
    }

    if (!info) {
        throw new Error(`
        Safe factory not found for network ${network}. You can request a new deployment at https://github.com/safe-global/safe-singleton-factory.
        For more information, see https://github.com/safe-global/safe-smart-account#replay-protection-eip-155
      `);
    }

    return {
        factory: info.address,
        deployer: info.signerAddress,
        funding: BigNumber.from(info.gasLimit).mul(BigNumber.from(info.gasPrice)).toString(),
        signedTx: info.transaction,
    };
};

const userConfig: HardhatUserConfig = {
    paths: {
        artifacts: "build/artifacts",
        cache: "build/cache",
        deploy: "src/deploy",
        sources: "contracts",
    },
    typechain: {
        outDir: "typechain-types",
        target: "ethers-v6",
    },
    solidity: {
        compilers: [{ version: primarySolidityVersion, settings: soliditySettings }, { version: defaultSolidityVersion }],
    },
    zksolc: {
        version: "1.5.4",
        settings: {
            suppressedWarnings: ["sendtransfer"],
        },
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
            blockGasLimit: 100000000,
            gas: 100000000,
            zksync: HARDHAT_ENABLE_ZKSYNC === "1",
            chainId: typeof HARDHAT_CHAIN_ID === "string" && !Number.isNaN(parseInt(HARDHAT_CHAIN_ID)) ? parseInt(HARDHAT_CHAIN_ID) : 31337,
        },
        mainnet: {
            ...sharedNetworkConfig,
            url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
        },
        gnosis: {
            ...sharedNetworkConfig,
            url: "https://rpc.gnosischain.com",
        },
        goerli: {
            ...sharedNetworkConfig,
            url: `https://goerli.infura.io/v3/${INFURA_KEY}`,
        },
        mumbai: {
            ...sharedNetworkConfig,
            url: `https://polygon-mumbai.infura.io/v3/${INFURA_KEY}`,
        },
        polygon: {
            ...sharedNetworkConfig,
            url: `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`,
        },
        bsc: {
            ...sharedNetworkConfig,
            url: `https://bsc-dataseed.binance.org/`,
        },
        arbitrum: {
            ...sharedNetworkConfig,
            url: `https://arb1.arbitrum.io/rpc`,
        },
        fantomTestnet: {
            ...sharedNetworkConfig,
            url: `https://rpc.testnet.fantom.network/`,
        },
        avalanche: {
            ...sharedNetworkConfig,
            url: `https://api.avax.network/ext/bc/C/rpc`,
        },
        zkSyncMainnet: {
            ...sharedNetworkConfig,
            url: "https://mainnet.era.zksync.io",
            ethNetwork: "mainnet",
            zksync: true,
            verifyURL: "https://zksync2-mainnet-explorer.zksync.io/contract_verification",
        },
        zkSyncSepolia: {
            ...sharedNetworkConfig,
            url: "https://sepolia.era.zksync.dev",
            ethNetwork: "goerli",
            zksync: true,
            verifyURL: "https://explorer.sepolia.era.zksync.dev/contract_verification",
        },
    },
    deterministicDeployment,
    namedAccounts: {
        deployer: 0,
    },
    mocha: {
        timeout: 2000000,
    },
    etherscan: {
        apiKey: {
            custom: ETHERSCAN_API_KEY!,
        },
    },
};
if (NODE_URL) {
    userConfig.networks!.custom = {
        ...sharedNetworkConfig,
        url: NODE_URL,
    };
}
export default userConfig;
