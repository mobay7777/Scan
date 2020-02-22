'use strict'

const { formatAscIIJSON } = require('./utils')
const Web3Util = require('./web3')
const BigNumber = require('bignumber.js')
const DEFAULT_ABI = [
    {
        'constant': true,
        'inputs': [
            {
                'name': 'tokenOwner',
                'type': 'address'
            }
        ],
        'name': 'balanceOf',
        'outputs': [
            {
                'name': 'balance',
                'type': 'uint256'
            }
        ],
        'payable': false,
        'stateMutability': 'view',
        'type': 'function'
    },
    {
        'constant': true,
        'inputs': [
            {
                'name': 'tokenOwner',
                'type': 'address'
            },
            {
                'name': 'spender',
                'type': 'address'
            }
        ],
        'name': 'allowance',
        'outputs': [
            {
                'name': 'remaining',
                'type': 'uint256'
            }
        ],
        'payable': false,
        'stateMutability': 'view',
        'type': 'function'
    }
]

let TokenHelper = {
    getTokenFuncs: async () => ({
        'decimals': '0x313ce567', // hex to decimal
        'symbol': '0x95d89b41', // hex to ascii
        'totalSupply': '0x18160ddd',
        'transfer': '0xa9059cbb',
        'name': '0x06fdde03'
    }),

    checkTokenType: async (code) => {
        let rrc20Function = {
            'totalSupply': '0x18160ddd',
            'balanceOf': '0x70a08231',
            'allowance': '0xdd62ed3e',
            'transfer': '0xa9059cbb',
            'approve': '0x095ea7b3',
            'transferFrom': '0x23b872dd',
            'Transfer': '0xddf252ad',
            'Approval': '0x8c5be1e5',
            'name': '0x06fdde03',
            'symbol': '0x95d89b41',
            'decimals': '0x313ce567'
        }
        let rrc721Function = {
            'Transfer': '0xddf252ad',
            'Approval': '0x8c5be1e5',
            'ApprovalForAll': '0x17307eab',
            'balanceOf': '0x70a08231',
            'ownerOf': '0x6352211e',
            'safeTransferFrom1': '0xb88d4fde',
            'safeTransferFrom': '0x42842e0e',
            'transferFrom': '0x23b872dd',
            'approve': '0x095ea7b3',
            // 'setApprovalForAll': '0xa22cb465',
            'getApproved': '0x081812fc',
            // 'isApprovedForAll': '0x7070ce33',
            'supportsInterface': '0x01ffc9a7',
            'totalSupply': '0x18160ddd'
        }
        let rrc21Function = {
            'totalSupply': '0x18160ddd',
            'balanceOf': '0x70a08231',
            'estimateFee': '0x127e8e4d',
            'issuer': '0x1d143848',
            'allowance': '0xdd62ed3e',
            'transfer': '0xa9059cbb',
            'approve': '0x095ea7b3',
            'transferFrom': '0x23b872dd',
            'Transfer': '0xddf252ad',
            'Approval': '0x8c5be1e5',
            'Fee': '0xfcf5b327',
            'name': '0x06fdde03',
            'symbol': '0x95d89b41',
            'decimals': '0x313ce567',
            'minFee': '0x24ec7590'
        }

        let isRrc21 = true
        for (let rrc21 in rrc21Function) {
            let codeCheck = rrc21Function[rrc21]
            codeCheck = codeCheck.replace('0x', '')
            if (code.indexOf(codeCheck) < 0) {
                isRrc21 = false
                break
            }
        }
        if (isRrc21) {
            return 'rrc21'
        }

        let isRrc20 = true
        for (let rrc20 in rrc20Function) {
            let codeCheck = rrc20Function[rrc20]
            codeCheck = codeCheck.replace('0x', '')
            if (code.indexOf(codeCheck) < 0) {
                isRrc20 = false
                break
            }
        }
        if (isRrc20) {
            return 'rrc20'
        }

        let isRrc721 = true
        for (let rrc721 in rrc721Function) {
            let codeCheck = rrc721Function[rrc721]
            codeCheck = codeCheck.replace('0x', '')
            if (code.indexOf(codeCheck) < 0) {
                isRrc721 = false
                break
            }
        }
        if (isRrc721) {
            return 'rrc721'
        }
        return 'other'
    },

    checkIsToken:async (code) => {
        let tokenFuncs = await TokenHelper.getTokenFuncs()
        for (let name in tokenFuncs) {
            let codeCheck = tokenFuncs[name]
            codeCheck = codeCheck.replace('0x', '')
            if (code.indexOf(codeCheck) >= 0) {
                return true
            }
        }

        return false
    },
    checkMintable: async (code) => {
        // mint(address,uint256)
        let mintFunction = '0x40c10f19'.replace('0x', '')
        if (code.indexOf(mintFunction) >= 0) {
            return true
        }
        return false
    },

    formatToken: async (item) => {
        item.name = await formatAscIIJSON(item.name)
        item.symbol = await formatAscIIJSON(item.symbol)

        return item
    },

    getTokenBalance: async (token, holder) => {
        let web3 = await Web3Util.getWeb3()
        let web3Contract = new web3.eth.Contract(DEFAULT_ABI, token.hash)
        let result = await web3Contract.methods.balanceOf(holder).call()

        let quantity = new BigNumber(await web3.utils.hexToNumberString(result.balance))
        let quantityNumber = quantity.dividedBy(10 ** token.decimals).toNumber()
        return { quantity: quantity.toString(10), quantityNumber: quantityNumber }
    }
}

module.exports = TokenHelper
