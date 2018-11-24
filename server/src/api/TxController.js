import { Router } from 'express'
import db from '../models'
import TransactionHelper from '../helpers/transaction'
import Web3Util from '../helpers/web3'
import TokenTransactionHelper from '../helpers/tokenTransaction'
const config = require('config')
const TxController = Router()
const contractAddress = require('../contracts/contractAddress')

TxController.get('/txs', async (req, res) => {
    try {
        let perPage = !isNaN(req.query.limit) ? parseInt(req.query.limit) : 25
        perPage = Math.min(100, perPage)
        let page = !isNaN(req.query.page) ? parseInt(req.query.page) : 1

        let blockNumber = !isNaN(req.query.block) ? req.query.block : null
        let params = { sort: { blockNumber: -1 } }
        if (blockNumber) {
            params.query = Object.assign({}, params.query, { blockNumber: blockNumber })
        }

        // Check filter type.
        if (req.query.filter) {
            switch (req.query.filter) {
            case 'latest':
                params.sort = { createdAt: -1 }
                break
            }
        }
        let specialAccount = null

        // Check type listing is pending.
        let type = req.query.type
        switch (type) {
        case 'pending':
            specialAccount = 'pendingTransaction'
            params.query = Object.assign({}, params.query, { isPending: true })
            params.sort = { createdAt: -1 }
            break
        case 'token':
            break
        default:
            params.query = Object.assign({}, params.query, { isPending: false })
            break
        }

        let address = req.query.address
        if (typeof address !== 'undefined') {
            address = address.toLowerCase()
            // if account is contract, has more condition
            let account = await db.Account.findOne({ hash: address })
            if (account && account.isContract) {
                params.query = Object.assign({}, params.query,
                    { $or: [{ from: address }, { to: address }, { contractAddress: address }] })
            } else {
                params.query = Object.assign({}, params.query,
                    { $or: [{ from: address }, { to: address }] })
            }
            specialAccount = address
        }
        // Check type of txs
        if (req.query.typeOfTxs) {
            let condition
            if (req.query.typeOfTxs === 'signTxs') {
                specialAccount = 'signTransaction'
                condition = { to: contractAddress.BlockSigner }
            } else if (req.query.typeOfTxs === 'otherTxs') {
                specialAccount = 'otherTransaction'
                condition = { to: { $ne: contractAddress.BlockSigner } }
            }
            if (params.query) {
                params.query = Object.assign({}, params.query, condition || {})
            } else {
                params.query = condition || {}
            }
        }
        if (Object.keys(params.query).length === 1 && params.query.isPending === false) {
            specialAccount = 'allTransaction'
        }
        let total = null
        if (specialAccount != null) {
            let sa = await db.SpecialAccount.findOne({ hash: specialAccount })
            if (sa) {
                total = sa.transactionCount
            }
        }
        if (total === null) {
            total = await db.Tx.countDocuments(params.query)
        }
        let pages = Math.ceil(total / perPage)
        let offset = page > 1 ? (page - 1) * perPage : 0

        let items = await db.Tx.find(params.query)
            .sort(params.sort)
            .skip(offset).limit(perPage)
            .lean().exec()

        if (pages > 500) {
            pages = 500
        }
        let limitedRecords = config.get('LIMITED_RECORDS')
        let newTotal = total > limitedRecords ? limitedRecords : total

        let data = {
            realTotal: total,
            total: newTotal,
            perPage: perPage,
            currentPage: page,
            pages: pages,
            items: items
        }
        // If exist blockNumber & not found txs on db (or less than) will get txs on chain
        if (blockNumber) {
            let block = await db.Block.findOne({ number: blockNumber })
            let blockTx = await db.Tx.countDocuments({ blockNumber: blockNumber })

            const offset = page > 1 ? (page - 1) * perPage : 0
            if (block.e_tx > blockTx) {
                const web3 = await Web3Util.getWeb3()

                const _block = await web3.eth.getBlock(blockNumber)

                const trans = _block.transactions
                const items = []
                let txids = []
                for (let i = offset; i < (offset + perPage); i++) {
                    if (i < trans.length) {
                        txids.push(trans[i])
                    } else {
                        break
                    }
                }
                let map = txids.map(async function (tx) {
                    items.push(await web3.eth.getTransaction(tx))
                })
                await Promise.all(map)
                const pages = Math.ceil(trans.length / perPage)
                data = {
                    realTotal: block.e_tx,
                    total: block.e_tx > limitedRecords ? limitedRecords : block.e_tx,
                    perPage: perPage,
                    currentPage: page,
                    pages: pages,
                    items: items
                }
            }
        }

        let listAddress = []
        for (let i = 0; i < data.items.length; i++) {
            let item = data.items[i]
            listAddress.push(item.from)
            if (item.to) {
                listAddress.push(item.to)
            }
        }
        if (listAddress) {
            let newItem = []
            let accounts = await db.Account.find({ hash: { $in: listAddress } })
            let map1 = data.items.map(async function (d) {
                let map2 = accounts.map(async function (ac) {
                    if (d.from === ac.hash) {
                        d.from_model = ac
                    }
                    if (d.to === ac.hash) {
                        d.to_model = ac
                    }
                })
                newItem.push(d)
            })
            await Promise.all(map1)
            data.items = newItem
        }

        return res.json(data)
    } catch (e) {
        console.trace(e)
        console.log(e)
        return res.status(406).send()
    }
})

TxController.get('/txs/:slug', async (req, res) => {
    try {
        let hash = req.params.slug
        hash = hash ? hash.toLowerCase() : hash

        let tx
        try {
            tx = await TransactionHelper.getTxDetail(hash)
        } catch (e) {
            console.log(e)
            return res.status(404).json({ message: 'Transaction is not found!' })
        }
        if (!tx) {
            return res.status(404).send()
        }
        if (tx._id) {
            tx = tx.toJSON()
        }
        tx.from_model = await db.Account.findOne({ hash: tx.from.toLowerCase() })
        let toModel
        if (tx.to) {
            toModel = await db.Account.findOne({ hash: tx.to.toLowerCase() })
        } else {
            toModel = await db.Account.findOne({ hash: tx.contractAddress.toLowerCase() })
        }
        tx.to_model = toModel

        let tokenTxs = await db.TokenTx.find({ transactionHash: tx.hash })

        tokenTxs = await TokenTransactionHelper.formatTokenTransaction(tokenTxs)
        tx.tokenTxs = tokenTxs

        let web3 = await Web3Util.getWeb3()
        let blk = await web3.eth.getBlock('latest')
        tx.latestBlockNumber = (blk || {}).number || tx.blockNumber

        return res.json(tx)
    } catch (e) {
        console.log(e)
        return res.status(406).send()
    }
})

TxController.get('/txs/status/:hash', async (req, res) => {
    try {
        let hash = req.params.hash
        hash = hash ? hash.toLowerCase() : hash
        let tx = await db.Tx.findOne({ hash: hash })
        let status = false
        if (!tx) {
            let web3 = await Web3Util.getWeb3()
            let receipt = await web3.eth.getTransactionReceipt(hash)
            if (receipt) {
                status = receipt.status
            }
        } else {
            status = tx.status
        }

        return res.json(status)
    } catch (e) {
        console.trace(e)
        console.log(e)
        return res.status(406).send()
    }
})

TxController.get('/txs/list/status', async (req, res) => {
    try {
        let hash = req.query.hash
        let listHash = hash.split(',')
        let tx = await db.Tx.find({ hash: { $in: listHash } })

        let existHash = []
        let resp = {}
        for (let i = 0; i < tx.length; i++) {
            existHash.push(tx[i].hash)
            resp[tx[i].hash] = tx[i].status
        }
        let notExistHash = []
        for (let i = 0; i < listHash.length; i++) {
            if (!existHash.includes(listHash[i])) {
                notExistHash.push(listHash[i])
            }
        }
        if (notExistHash) {
            let web3 = await Web3Util.getWeb3()
            let map = notExistHash.map(async function (tx) {
                let receipt = await web3.eth.getTransactionReceipt(tx)
                if (receipt) {
                    resp[tx] = receipt.status
                } else {
                    resp[tx] = false
                }
            })
            await Promise.all(map)
        }

        return res.json(resp)
    } catch (e) {
        console.trace(e)
        console.log(e)
        return res.status(406).send()
    }
})

export default TxController
