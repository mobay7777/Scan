const Web3Util = require('./web3')
const BlockSignerABI = require('../contracts/abi/BlockSigner')
const contractAddress = require('../contracts/contractAddress')
const RupxValidatorABI = require('../contracts/abi/RupxValidator')
const logger = require('./logger')

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))

const blockSigner = {
    getBlockSignerContract: async () => {
        const web3 = await Web3Util.getWeb3()
        return new web3.eth.Contract(BlockSignerABI, contractAddress.BlockSigner)
    },
    getSigners: async (blockHash) => {
        const bs = await blockSigner.getBlockSignerContract()
        return bs.methods.getSigners(blockHash).call().catch(e => {
            logger.warn('Cannot get signer of block %s. Sleep 2 seconds and try more', blockHash)
            return sleep(2000).then(() => {
                return blockSigner.getSigners(blockHash)
            })
        })
    }
}
const rupxValidator = {
    getValidatorContract: async () => {
        const web3 = await Web3Util.getWeb3()
        return new web3.eth.Contract(RupxValidatorABI, contractAddress.RupxValidator)
    },
    getValidatorContractWs: async () => {
        const web3 = await Web3Util.getWeb3Socket()
        return new web3.eth.Contract(RupxValidatorABI, contractAddress.RupxValidator)
    },
    getCandidateOwner: async (candidate) => {
        const tc = await rupxValidator.getValidatorContract()
        return tc.methods.getCandidateOwner(candidate).call().catch(e => {
            logger.warn('cannot get owner of candidate %s. Sleep 2 seconds and try more', candidate)
            return sleep(2000).then(() => {
                return rupxValidator.getCandidateOwner(candidate)
            })
        })
    },
    getVoterCapacity: async (candidate, voter) => {
        const tc = await rupxValidator.getValidatorContract()
        return tc.methods.getVoterCap(candidate, voter).call().catch(e => {
            logger.warn('cannot get owner of candidate %s. Sleep 2 seconds and try more', candidate)
            return sleep(2000).then(() => {
                return rupxValidator.getVoterCapacity(candidate, voter)
            })
        })
    }
}

module.exports = { blockSigner, rupxValidator }
