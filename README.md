# Multisig Wallet for Withdraw, Stake, Unstake and Vote Aergo

This repository is a dApp implemented as an aergo smart contract that can extract Aergo and vote BPs through 2 of 4 multiple signatures.

## Deploy a Contract

Receive data and deploy the contract to an aergo blockchain.

1. Download or clone this repository.
2. Compile a `contract/multisig2of4.lua` smart contract file using aergoluac. Or use pre-compiled payload file `dapp/build/contract.payload`.
3. Deploy the compiled contract with 4 owners addresses as arguments.
4. Deposit Aergo at any time to this contract's address.

## Running dApp

Run dApp to invoke the user interface. Then load the deployed contract to check the current status and get the its abi.

1. Before you start, you will need a chrome browser and a aergo browser wallet.
2. Open a `dapp/build/index.html` file using the browser.
3. Or launch a local web server (This step requires npm).
4. Put an aergo node address in a form of `http://ip:port` and the deployed contract address.
5. Check that the contract is loaded well and its balance and stake amount are displayed.

## Create and Sign a Message

__This process requires two owners to do the same steps.__
The owners go through a preliminary work to share and agree an administrative request. After agreement, two owners convert the administrative request into a single text via the `genMsgSign` Query. Two owners sign the text with the owner's private key.

1. Select a request type; withdraw, staking, unstaking, and voting.
2. Fill its form. (e.g, withdraw = an amount to send & a receiver's address).
3. Click `Query Gen Msg` button and copy a single text.
4. Log in to the owner account in your browser wallet.
5. Move to the sign tab.
6. Put the copied single text into a message text box and click sign button.
7. Copy a signed message and give it to an tx sender (or operator).

## Create and Send Tx

You can make a request to the wallet contract by sending two signed texts by the 2 owners in the payload of the transaction.

1. Operator runs dApp.
2. Fill the request form with same request parameters.
3. Paste the signed texts and select the owner IDs that matches the signature.
4. Click a `Gen Req Payload' Button and Copy a result payload.
5. Log in to browser wallet and move to a send tab.
6. Enter the contract address to a recipient.
7. Click `Add Data` and paste the copied payload.
8. Continue and send a transaction.
9. Check a result in aergoscan.

## Json args format

It guides you how to create the arguments manually to call the contract in case you use CLI or other SDK.

### genMsgToSign

Commonly, the first argument is a request type charactor in upper case.

- Withdraw: `["W", {"_bignum": "${amount}"}, "${toAddress}"]`
- Stake: `["S", {"_bignum": "${amount}"}]`
- Unstake: `["U", {"_bignum": "${amount}"}]`
- Vote: `["V", "${ballot_peer_id_1}", "${ballot_peer_id_2}", ..., "${ballot_peer_id_N}"]`

### Request

As above, the first argument is a request type charactor in upper case. The second value is the ID of the owner of the first signature, and the third value is the first signed text. The fourth value is the ID of the owner of the second signature, and the fifth value is the second signed text. The rest is the same as above.

- Withdraw: `["W", ${owner_id_1}, "${owner_signed_msg_1}", ${owner_id_2}, "${owner_signed_msg_2}", {"_bignum": "${amount}"}, "${toAddress}"]`
- Stake: `["S", ${owner_id_1}, "${owner_signed_msg_1}", ${owner_id_2}, "${owner_signed_msg_2}", {"_bignum": "${amount}"}]`
- Unstake: `["U", ${owner_id_1}, "${owner_signed_msg_1}", ${owner_id_2}, "${owner_signed_msg_2}", {"_bignum": "${amount}"}]`
- Vote: `["V", ${owner_id_1}, "${owner_signed_msg_1}", ${owner_id_2}, "${owner_signed_msg_2}", "${ballot_peer_id_1}", "${ballot_peer_id_2}", ..., "${ballot_peer_id_N}"]`

## Test

This chapter describes how to run the test code.

### Unit Test using Athena-343

1. (Pre-requisites: native lua 5.1 or luajit)
2. Move to the `test/lua` directory.
3. run `lua unittest.lua` in command line.

### Integration Test using Brick

1. (Pre-requisites: [brick](https://github.com/aergoio/aergo/tree/develop/cmd/brick))
2. Move to the `test/brick` directory.
3. run `brick ${test_brick_file}`
    - init.brick: create accounts and deploy contract.
    - staking.brick: test staking & unstaking aergo.
    - voting.brick: test voting bps.
    - withdraw.brick: test withdraw aergo.

## TODO

- Wallet Integration: don't need to copy and paste
