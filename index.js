const { ethers, network } = require('hardhat')
const fs = require('fs')

module.exports.toBN = (n, power = 18) => ethers.BigNumber.from(10).pow(power).mul(n)

module.exports.numberLastBlock = async () => (await ethers.provider.getBlock('latest')).number

module.exports.timeStampLastBlock = async () => (await ethers.provider.getBlock('latest')).timestamp

module.exports.lastNonce = async address => await network.provider.send('eth_getTransactionCount', [address, 'latest'])

module.exports.sleep = ms => new Promise(r => setTimeout(r, ms))

module.exports.logToFile = (_text, _file = 'default.log') => fs.appendFile( _file, `${getDateAsText()}: ${_text}\r\n`, 'utf8', errorMessage => errorMessage && console.log(getDateAsText() + ': ' + errorMessage))

module.exports.extractCost = (tx, additionalData = {}, COIN_PRICE = 275) => {
    const GAS_SPENT = +tx.gasUsed
    const GAS_PRICE = 5e9
    const WEI_PRICE = COIN_PRICE/1e18

    const COST_BNB  = +(GAS_SPENT * GAS_PRICE / 1e18).toFixed(6)
    const COST_USD  = +(GAS_SPENT * GAS_PRICE * WEI_PRICE).toFixed(2)

    const BLOCK_NUMBER = tx.blockNumber
    const ACCOUNT = tx.from.slice(0,8)

    let res = {
        GAS_SPENT,
        COST_BNB,
        COST_USD,
        BLOCK_NUMBER,
        ACCOUNT
    }

    return Object.assign(res, additionalData)
}

module.exports.passTime = async ms => {
    await network.provider.send('evm_increaseTime', [ms])
    await network.provider.send('evm_mine')
}

module.exports.getERC20From_forking = async (from, ERC20_address, howMuch = module.exports.toBN(1), to) => {
    await network.provider.request({method: 'hardhat_impersonateAccount', params: [from]})
    await network.provider.send('hardhat_setBalance', [from, '0x10000000000000000000000000'])
    const ERC20_contract = new ethers.Contract(ERC20_address, ['function transfer(address,uint256) public'], await ethers.provider.getSigner(from))
    await ERC20_contract.transfer(to || (await ethers.getSigners())[0].address, howMuch)
    await network.provider.request({method: 'hardhat_stopImpersonatingAccount', params: [from]})
}

module.exports.getERC721From_forking = async (ERC721_address, tokenId = 1, to) => {
    const ERC721_contract = new ethers.Contract(
        ERC721_address, 
        ['function transferFrom(address,address,uint256) public', 'function ownerOf(uint256) public view returns(address)'], 
        ethers.provider
    )
    const oldNftOwner_address = await ERC721_contract.ownerOf(tokenId)
    await network.provider.request({method: 'hardhat_impersonateAccount', params: [oldNftOwner_address]})
    await network.provider.send('hardhat_setBalance', [oldNftOwner_address, '0x10000000000000000000000000'])
    await ERC721_contract.connect(await ethers.provider.getSigner(oldNftOwner_address))['transferFrom(address,address,uint256)'](
        oldNftOwner_address, 
        to || (await ethers.getSigners())[0].address, 
        tokenId
    )
    await network.provider.request({method: 'hardhat_stopImpersonatingAccount', params: [oldNftOwner_address]})
}

module.exports.becomeOwner = async (contract, newOwnerAddress) => {
    const actualOwnerAddress = await contract.owner()
    await network.provider.request({method: 'hardhat_impersonateAccount', params: [actualOwnerAddress]})
    const actualOwner = await ethers.provider.getSigner(actualOwnerAddress)
    await network.provider.send('hardhat_setBalance', [actualOwnerAddress, '0x10000000000000000000000000'])
    await contract.connect(actualOwner).transferOwnership(newOwnerAddress)
}

module.exports.getImplementationAddress = async(proxyAddress) => {
    const implSlotAddress = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' 
    const implHex = await ethers.provider.getStorageAt(proxyAddress,implSlotAddress)
    return ethers.utils.hexStripZeros(implHex)
}

module.exports.becomeProxyAdmin = async (proxyContractAddress, newAdminAddress) => {
    const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103'
    await network.provider.send('hardhat_setStorageAt', [proxyContractAddress, adminSlot, ethers.utils.defaultAbiCoder.encode(['address'],[newAdminAddress])])
}

module.exports.installNewImplementation = async (proxyContractAddress, newImplementationAddress) => {
    const implSlotAddress = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
    await network.provider.send('hardhat_setStorageAt', [proxyContractAddress, implSlotAddress, ethers.utils.defaultAbiCoder.encode(['address'],[newImplementationAddress])])
}

module.exports.phoneBookOfERC20 = {
    '56': {
        USDT:   '0x55d398326f99059fF775485246999027B3197955',
        WETH:   '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
        BSW:    '0x965F527D9159dCe6288a2219DB51fc6Eef120dD1',
        WBNB:   '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
        BUSD:   '0xe9e7cea3dedca5984780bafc599bd69add087d56',
        USDC:   '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
        BTCB:   '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
        CAKE:   '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
        DOT:    '0x7083609fce4d1d8dc0c979aab8c869ea2c873402',
        UNI:    '0xbf5140a22578168fd562dccf235e5d43a02ce9b1',
        ADA:    '0x3ee2200efb3400fabb9aacf31297cbdd1d435d47',
        LTC:    '0x4338665cbb7b2485a8855a139b75d5e34ab0db94',
        XRP:    '0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe',
        DOGE:   '0xba2ae424d960c26247dd6c32edc70b295c744c43',
        LINK:   '0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd',
        DAI:    '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
        BAKE:   '0xe02df9e3e622debdd69fb838bb799e3f168902c5',
        FIL:    '0x0d8ce2a99bb6e3b7db580ed848240e4a0f9ae153',
        XVS:    '0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63',
        TWT:    '0x4b0f1812e5df2a09796481ff14017e6005508003',
        BFG:    '0xbb46693ebbea1ac2070e59b4d043b47e2e095f86',
        TENFI:  '0xd15c444f1199ae72795eba15e8c1db44e47abf62',
        TRX:    '0x85eac5ac2f758618dfa09bdbe0cf174e7d574d5b',
        TKO:    '0x9f589e3eabe42ebc94a44727b3f3531c0c877809',
        REEF:   '0xf21768ccbc73ea5b6fd3c687208a7c2def2d966e',
        SFP:    '0xd41fdb03ba84762dd66a0af1a6c8540ff1ba5dfb',
        SXP:    '0x47bead2563dcbf3bf2c9407fea4dc236faba485a',
        MBOX:   '0x3203c9e46ca618c8c1ce5dc67e7e9d75f5da2377',
        ZIL:    '0xb86abcb37c3a4b64f74f59301aff131a1becc787',
        AXS:    '0x715d400f88c167884bbcc41c5fea407ed4d2f8a0',
        C98:    '0xaec945e04baf28b135fa7c640f624f8d90f1c3a6',
        SHIB:   '0x2859e4544c4bb03966803b044a93563bd2d0dd4d',
        FTM:    '0xad29abb318791d579433d831ed122afeaf29dcfe',
        MATIC:  '0xcc42724c6683b7e57334c4e856f4c9965ed682bd',
        RACA:   '0x12bb890508c125661e03b09ec06e404bc9289040',
        SOL:    '0x570a5d26f7765ecb712c0924e4de545b89fd43df',
        AVAX:   '0x1ce0c2827e2ef14d5c4f29a091d735a204794041',
        NEAR:   '0x1fa4a73a3f0133f0025378af00236f3abdee5d63',
        GALA:   '0x7ddee176f665cd201f93eede625770e2fd911990',
        EOS:    '0x56b6fb708fc5732dec1afc8d8556423a2edccbd6',
        ATOM:   '0x0eb3a705fc54725037cc9e008bdede697f62f335',
        ONE:    '0x03ff0ff224f904be3118461335064bb48df47938',
        TONCOIN:'0x76a797a59ba2c17726896976b7b3747bfd1d220f',
        APE:    '0x0b079b33b6e72311c6be245f9f660cc385029fc3',
        ETC:    '0x3d6545b08693dae087e957cb1180ee38b9e3c25e',
        GMT:    '0x3019bf2a2ef8040c242c9a4c5c4bd4c81678b2a1',
        DAR:    '0x23ce9e926048273ef83be0a3a8ba9cb6d45cd978',
        MANA:   '0x26433c8127d9b4e9b71eaa15111df99ea2eeb2f8',
        VAI:    '0x4BD17003473389A42DAF6a0a729f6Fdb328BbBd7'
    }
}

module.exports.setToContractStorage = (contract, alias, storageName = 'main') => {
    const dir = './storedContracts'
    const path = `${dir}/${storageName}.json`
    let storedContracts = {}

    try {
        const file = fs.readFileSync(path, 'utf8')
        storedContracts = JSON.parse(file)
    } catch (error) {
        fs.existsSync(dir) || fs.mkdirSync(dir)
        fs.writeFileSync(path, JSON.stringify(storedContracts, null, '\t'))
    }

    const lastVersion = storedContracts[alias] ? storedContracts[alias] : storedContracts[alias] = {}

    storedContracts[alias] = {
        address: contract.address,
        deployer: contract.signer.address,
        chainId: contract.provider._network.chainId,
        storingTime: new Date().toUTCString(),
        history: [contract.address, ...lastVersion.history || []].filter( (value, index, self) => self.indexOf(value) === index )
    }
    
    console.log(path, alias, storedContracts[alias])
    fs.writeFileSync(path, JSON.stringify(storedContracts, null, '\t'))
}

module.exports.getFromContractStorage = (alias, storageName = 'main') => {
    const dir = './storedContracts'
    const path = `${dir}/${storageName}.json`
    let storedContracts = {}

    try {
        const file = fs.readFileSync(path, 'utf8')
        storedContracts = JSON.parse(file)
    } catch (error) {
        fs.existsSync(dir) || fs.mkdirSync(dir)
        fs.writeFileSync(path, JSON.stringify(storedContracts, null, '\t'))
    }

    return storedContracts[alias] ? storedContracts[alias] : storedContracts[alias] = {}
}

class MultiCaller{
	static multiCallAddresses = {
		1: '0xeefba1e63905ef1d7acba5a8513c70307c1ce441',
		3: '0xF24b01476a55d635118ca848fbc7Dab69d403be3',
		4: '0x42ad527de7d4e9d9d011ac45b31d8551f8fe9821',
		5: '0x77dca2c955b15e9de4dbbcf1246b4b85b651e50e',
		42: '0x2cc8688c5f75e365aaeeb4ea8d6a480405a48d2a',
		56: '0x1Ee38d535d541c55C9dae27B12edf090C608E6Fb',
		66: '0x94fEadE0D3D832E4A05d459eBeA9350c6cDd3bCa',
		97: '0x3A09ad1B8535F25b48e6Fa0CFd07dB6B017b31B2',
		100: '0xb5b692a88bdfc81ca69dcb1d924f59f0413a602a',
		128: '0x2C55D51804CF5b436BA5AF37bD7b8E5DB70EBf29',
		137: '0x11ce4B23bD875D7F5C6a31084f55fDe1e9A87507',
		250: '0x0118EF741097D0d3cc88e46233Da1e407d9ac139',
		1337: '0x77dca2c955b15e9de4dbbcf1246b4b85b651e50e',
		31337: '0x1Ee38d535d541c55C9dae27B12edf090C608E6Fb',//same as 56
		42161: '0x813715eF627B01f4931d8C6F8D2459F26E19137E',
		43114: '0x7f3aC7C283d7E6662D886F494f7bc6F1993cDacf',
		80001: '0x08411ADd0b5AA8ee47563b146743C13b3556c9Cc',
	}

	static multiCallAbi = [
		{ "inputs": [{ "components": [{ "internalType": "address", "name": "target", "type": "address" }, { "internalType": "bytes", "name": "callData", "type": "bytes" }], "internalType": "struct Multicall.Call[]", "name": "calls", "type": "tuple[]" }], "name": "aggregate", "outputs": [{ "internalType": "uint256", "name": "blockNumber", "type": "uint256" }, { "internalType": "bytes[]", "name": "returnData", "type": "bytes[]" }], "stateMutability": "nonpayable", "type": "function" }, 
		{ "inputs": [{ "internalType": "uint256", "name": "blockNumber", "type": "uint256" }], "name": "getBlockHash", "outputs": [{ "internalType": "bytes32", "name": "blockHash", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, 
		{ "inputs": [], "name": "getCurrentBlockCoinbase", "outputs": [{ "internalType": "address", "name": "coinbase", "type": "address" }], "stateMutability": "view", "type": "function" }, 
		{ "inputs": [], "name": "getCurrentBlockDifficulty", "outputs": [{ "internalType": "uint256", "name": "difficulty", "type": "uint256" }], "stateMutability": "view", "type": "function" }, 
		{ "inputs": [], "name": "getCurrentBlockGasLimit", "outputs": [{ "internalType": "uint256", "name": "gaslimit", "type": "uint256" }], "stateMutability": "view", "type": "function" }, 
		{ "inputs": [], "name": "getCurrentBlockTimestamp", "outputs": [{ "internalType": "uint256", "name": "timestamp", "type": "uint256" }], "stateMutability": "view", "type": "function" }, 
		{ "inputs": [{ "internalType": "address", "name": "addr", "type": "address" }], "name": "getEthBalance", "outputs": [{ "internalType": "uint256", "name": "balance", "type": "uint256" }], "stateMutability": "view", "type": "function" }, 
		{ "inputs": [], "name": "getLastBlockHash", "outputs": [{ "internalType": "bytes32", "name": "blockHash", "type": "bytes32" }], "stateMutability": "view", "type": "function" }
	]

	constructor(signer){
		if (!ethers) throw new Error(`'ethers' need to be preinstalled`)
		if (!signer.provider._network) throw new Error(`'provider._network' in not defined`)

		this.multiCallContract = new ethers.Contract(
			MultiCaller.multiCallAddresses[signer.provider._network.chainId],
			MultiCaller.multiCallAbi,
			signer
		)
	}

	static interface = new ethers.utils.Interface( MultiCaller.multiCallAbi )

	aggregate = async calls => {
		return this.multiCallContract.aggregate(calls)
	}

	aggregateStatic = async calls => {
		return this.multiCallContract.callStatic.aggregate(calls)
	}
}

module.exports.MultiCaller = MultiCaller

const getDateAsText = (_date = new Date()) => 
        '['
        + appendZeroToLength(_date.getFullYear(),  4) + '.'
        + appendZeroToLength(_date.getMonth() + 1, 2) + '.'
        + appendZeroToLength(_date.getDate(),      2) + '  '
        + appendZeroToLength(_date.getHours(),     2) + ':'
        + appendZeroToLength(_date.getMinutes(),   2) + ':'
        + appendZeroToLength(_date.getSeconds(),   2)
        + ']'

const appendZeroToLength = (_value, _length) => `${_value}`.padStart(_length, 0)

//array filter that remove not unique elems
const onlyUnique = (value, index, self) => self.indexOf(value) === index

//like unwind aggregation in mongo
const unwind = (key, objArray) => {
    const res = []
    objArray.forEach(obj => {
        const { [key]: _, ...rest } = obj
        res.push(...obj[key].map(val => ({ ...rest, [key]: val }))) 
    })

    return res
}