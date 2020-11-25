const SHA256 = require('crypto-js/sha256')
const EC = require('elliptic').ec
const ec = new EC('secp256k1')

class Transaction{
    constructor(fromAddress, toAddress, amount){
        this.fromAddress = fromAddress
        this.toAddress = toAddress
        this.amount = amount
    }
    
    calculateHash(){
        return SHA256(this.fromAddress + this.toAddress + this.amount).toString()
    }

    signTransaction(signingKey){
        if(signingKey.getPublic('hex') !== this.fromAddress){
            throw new Error('You cannot sign transactions for other wallets!')
        }

        const hashTx = this.calculateHash();
        const sig = signingKey.sign(hashTx, 'base64');

        this.signature = sig.toDER('hex');
    }

    isValid(){
        if(this.fromAddress === null) return true

        if(!this.signature || this.signature.length === 0){
            throw new Error('No signature in this transaction')
        }

        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex')
        return publicKey.verify(this.calculateHash(), this.signature)
    }
}

class Block{
    constructor(timestamp, transactions, previousHash = ''){
        this.timestamp = timestamp
        this.transactions = transactions
        this.previousHash = previousHash
        this.hash = this.calculateHash()
        this.nonce = 0
    }

    calculateHash(){
        const hash = SHA256(this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce).toString()
        return hash
    }

    mineBlock(difficulty){
        while(this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")){
            this.nonce++
            this.hash = this.calculateHash();
        }

        console.log('Block mined: ' + this.hash)
    }

    hasValidTransactions(){
        for(const tx of this.transactions){
            if(!tx.isValid()){
                return false
            }
        }

        // Returns true if all transactions are valid
        return true
    }
}

class Blockchain{
    constructor(){
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
        this.pendingTransactions = []
        this.miningReward = 100
    }

    createGenesisBlock(){
        const genesisBlock = new Block("10/01/2020", "Genesis Block", "0")
        return genesisBlock
    }

    getLatestBlock(){
        // The index of the latest block
        const latestBlock = this.chain[this.chain.length - 1]
        return latestBlock
    }

    minePendingTransactions(miningRewardAddress){
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
        this.pendingTransactions.push(rewardTx);

        const block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
        block.mineBlock(this.difficulty);

        console.log('Block successfully mined!');
        this.chain.push(block);

        this.pendingTransactions = [];
    }

    // Sends a new transaction object to the pendingTransactions array
    addTransaction(transaction){

        if(!transaction.fromAddress || !transaction.toAddress){
            throw new Error('Transaction must include from and to address')
        }

        if(!transaction.isValid()){
            throw new Error('Cannot add new transaction to the chain')
        }

        this.pendingTransactions.push(transaction)
    }

    getBalanceOfAddress(address){
        let balance = 0

        // For every block in the chain
        for(const block of this.chain){
            for(const trans of block.transactions){
                // If transaction is being sent from account, reduce balance
                if(trans.fromAddress === address){
                    balance -= trans.amount
                }
                // If transaction is being recieved to account, increase balance
                if(trans.toAddress === address){
                    balance += trans.amount
                }
            }
        }

        return balance
    }

    isChainValid(){
        // Skipping the genesis block
        for(let i = 1; i < this.chain.length; i++){
            const currentBlock = this.chain[i]
            const previousBlock = this.chain[i-1]

            if(!currentBlock.hasValidTransactions()){
                return false
            }

            if(currentBlock.hash !== currentBlock.calculateHash()){
                return false
            }

            if(currentBlock.previousHash !== previousBlock.hash){
                return false
            }
        }
        
        return true;
    }
}

module.exports.Blockchain = Blockchain
module.exports.Transaction = Transaction