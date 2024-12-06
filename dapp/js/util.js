import { AergoClient, GrpcWebProvider } from '@herajs/client'

export function sendTxByAergoConnect(endpoint, contractID, payload) {
  let herajs = new AergoClient({}, new GrpcWebProvider({ url: endpoint }))

  var builtTx = {
    to: contractID,
    amount: '0',
    payload_json: payload,
    type: 5,
  }

  return new Promise((resolve, reject) => {
    try {
      // register event handler
      window.addEventListener(
        'AERGO_SEND_TX_RESULT',
        (event) => {
          setTimeout(async () => {
            try {
              if (event.detail.error) {
                reject(event.detail.error)
              } else {
                const receipt = await herajs.getTransactionReceipt(
                  event.detail.hash
                )
                resolve(receipt)
              }
            } catch (err) {
              reject(err)
            }
          }, 2000)
        },
        {
          once: true,
        }
      )
      // send build tx request
      window.postMessage({
        type: 'AERGO_REQUEST',
        action: 'SEND_TX',
        data: builtTx,
      })
    } catch (err) {
      reject(err)
    }
  })
}

// request sign to aergo connect
export function signByAergoConnect(message) {
  return new Promise((resolve, reject) => {
    try {
      // register event handler
      window.addEventListener(
        'AERGO_SIGN_RESULT',
        (event) => {
          if (event.detail.error) {
            reject(event.detail.error)
          } else {
            resolve(event.detail.signature)
          }
        },
        {
          once: true,
        }
      )

      // send sign message request
      window.postMessage({
        type: 'AERGO_REQUEST',
        action: 'SIGN',
        data: { hash: message },
      })
    } catch (err) {
      reject(err)
    }
  })
}

export default {}
