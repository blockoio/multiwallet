import '@babel/polyfill';
import { AergoClient, GrpcWebProvider, Contract, Amount } from '@herajs/client';
import { sendTxByAergoConnect, signByAergoConnect } from './util';


// ================ Handle Contract Address and Aergo Clients ================

var aergoClient; // aergo sdk instance
var contract; // contract interface
var balanceListener; // interval keeper

async function loadContract() {
  // read server address
  const serverAddress = document.getElementById('serverAddressText').value;
  // read contract address
  const contractAddress = document.getElementById('contractAddressText').value;
  try {
    aergoClient = new AergoClient({}, new GrpcWebProvider({ url: serverAddress })); // init client
    const abi = await aergoClient.getABI(contractAddress); // fetch abi from network
    contract = Contract.fromAbi(abi).setAddress(contractAddress); // load contract

    // if success to load contract
    localStorage.server = serverAddress;
    localStorage.wallet = contractAddress;

    document.getElementById('contractStateDiv').innerHTML = '<p style="color: #ffffff; background-color: pink">Load Contract Sucessfully!</p>';
    // clear previous one
    if (balanceListener != null) { clearInterval(balanceListener); }

    // get current balance and staking status periodically 3s
    balanceListener = setInterval(async function () {
      const contractState = await aergoClient.getState(contractAddress);
      const stakeState = await aergoClient.getStaking(contractAddress);

      document.getElementById('contractStateDiv').innerHTML = ` * Balance: ${contractState.balance.toUnit('aer')} (${contractState.balance.toUnit('aergo')})<br> * Staking: ${stakeState.amount.toUnit('aer')} (${stakeState.amount.toUnit('aergo')})`;
    }, 3000)

  } catch (e) {
    // if fail to load contract, reset all infos
    aergoClient = null;
    contract = null;
    if (balanceListener != null) { clearInterval(balanceListener); }
    balanceListener = null;

    // show error msg
    document.getElementById('contractStateDiv').innerHTML = `<p style="color: #ffffff; background-color: red">${e}</p>`;
  }
}

// This reads an address on a text input ,Load Contract
document.getElementById('contractSetButton').addEventListener('click', loadContract);


// ================ Provide Handler for Request Forms ================

var requestType = "" // keep request type

// show only selected div, and hide others
function showDiv(clsId, shortReqName, curDiv) {
  requestType = shortReqName

  var divs = document.getElementsByClassName('tabcontent');
  for (var i = 0, l = divs.length; i < l; i++) {
    if (divs[i].id == curDiv) {
      divs[i].style.display = "block";
    } else {
      divs[i].style.display = "none";
    }
  }

  var tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(clsId).className += " active";
}

// attach event listener to request buttons
document.getElementById('b1').addEventListener('click', function (e) { showDiv('b1', 'W', 'withdrawDiv'); });
document.getElementById('b2').addEventListener('click', function (e) { showDiv('b2', 'S', 'stakeAndUnstakeDiv'); });
document.getElementById('b3').addEventListener('click', function (e) { showDiv('b3', 'U', 'stakeAndUnstakeDiv'); });
document.getElementById('b4').addEventListener('click', function (e) { showDiv('b4', 'V', 'voteDiv'); });
document.getElementById('b5').addEventListener('click', function (e) { showDiv('b5', 'D', 'daoDiv'); });


// add amount unit converter
document.getElementById('amountText').addEventListener('input', function (evt) {
  var conValue = '0';
  if (this.value) conValue = Amount.moveDecimalPoint(this.value, -18);
  document.getElementById('amountConv').innerHTML = conValue;
});

document.getElementById('stakeAndUnstakeAmountText').addEventListener('input', function (evt) {
  var conValue = '0';
  if (this.value) conValue = Amount.moveDecimalPoint(this.value, -18);
  document.getElementById('stakeAmountConv').innerHTML = conValue;
});

// add click and copy function to result texts
document.getElementById('shareRequestText').addEventListener('click', function () {
  this.select(); document.execCommand("copy");
});

document.getElementById('signedMsgText').addEventListener('click', function () {
  this.select(); document.execCommand("copy");
});

// process bp list and make string for json
function genBpList() {
  var bpListText = document.getElementById('bpListText').value;
  var bps = bpListText.split('\n');
  var refinedBps = [];
  var mergedBpStr = ''
  for (var i = 0; i < bps.length; i++) {
    if (bps[i] == '') { continue; } // skip empty line
    else if (mergedBpStr != '' && i < bps.length) { mergedBpStr += ','; } // append comma except last one
    var nonWSBps = bps[i].replace(/\s/g, '');
    mergedBpStr += '"' + nonWSBps + '"' // remove all white space containing
    refinedBps.push(nonWSBps);
  }
  return { str: mergedBpStr, array: refinedBps };
}

// when you click genMsg Button, this queries to the contract using input parmeters according to a type of request.
// This gets a query result and display on a page.
async function queryGenMsg() {
  var result = "(Contract is not loaded)"

  if (requestType == 'W') { // withdraw
    var amount = document.getElementById('amountText').value;
    var toAddress = document.getElementById('toAddressText').value;
    if (contract != null) {
      result = await aergoClient.queryContract(contract.genMsgToSign("W", { "_bignum": amount }, toAddress))
    };
  } else if (requestType == 'S' || requestType == 'U') { // stake and unstake
    var amount = document.getElementById('stakeAndUnstakeAmountText').value;
    if (contract != null) {
      result = await aergoClient.queryContract(contract.genMsgToSign(requestType, { "_bignum": amount }))
    };
  } else if (requestType == 'V') { // vote
    var bps = genBpList() // process input params and get array of bps
    if (contract != null) {
      bps.array.unshift("V");
      result = await aergoClient.queryContract(contract.genMsgToSign.apply(this, bps.array));
    };
  } else if (requestType == 'D') { // DAO Vote
    var value = document.getElementById('daoValueText').value;
    var daoVoteName = document.getElementById('daoVoteNameText').value;
    if (contract != null) {
      result = await aergoClient.queryContract(contract.genMsgToSign("D", { "_bignum": value }, daoVoteName))
    };
  } else {
    // THIS MUST NOT BE HAPPEN
    throw "FATAL EXCEPTION!!! Un-defined requstType " + requestType;
  }

  return result;
};


document.getElementById('shareButton').addEventListener('click', function () {

  var path = window.location.origin;

  // append current tab
  path += '?tab=' + requestType;

  const svrAddr = document.getElementById('serverAddressText').value;
  if (svrAddr) path += '&svrAddr=' + encodeURIComponent(svrAddr)

  const ctrtAddr = document.getElementById('contractAddressText').value;
  if (ctrtAddr) path += '&ctrtAddr=' + encodeURIComponent(ctrtAddr)

  const amount = document.getElementById('amountText').value;
  if (amount) path += '&amount=' + encodeURIComponent(amount)

  const toAddr = document.getElementById('toAddressText').value;
  if (toAddr) path += '&toAddr=' + encodeURIComponent(toAddr)

  const suAmount = document.getElementById('stakeAndUnstakeAmountText').value;
  if (suAmount) path += '&suAmount=' + encodeURIComponent(suAmount)

  const bps = document.getElementById('bpListText').value;
  if (bps) path += '&bps=' + encodeURIComponent(bps)

  const daoName = document.getElementById('daoVoteNameText').value;
  if (daoName) path += '&daoName=' + encodeURIComponent(daoName)

  const daoValue = document.getElementById('daoValueText').value;
  if (daoValue) path += '&daoValue=' + encodeURIComponent(daoValue)

  document.getElementById('shareRequestText').value = path; // display a generated uri
});

document.getElementById('signButton').addEventListener('click', async function () {
  try {
    const message = await queryGenMsg();
    document.getElementById('signedMsgText').value = await signByAergoConnect(message);
  } catch (e) {
    document.getElementById('signedMsgText').value = e;
  }
});

// generate a payload of request
document.getElementById('sendRequestButton').addEventListener('click', async function () {
  // collect owner num and signed messages
  var ownerSelect1 = document.getElementById('ownerSelect1');
  var ownerId1 = parseInt(ownerSelect1.options[ownerSelect1.selectedIndex].value);

  var ownerSelect2 = document.getElementById('ownerSelect2');
  var ownerId2 = parseInt(ownerSelect2.options[ownerSelect2.selectedIndex].value);

  var signedMsgText1 = document.getElementById('signedMsgText1').value;
  var signedMsgText2 = document.getElementById('signedMsgText2').value;

  if (ownerId1 == ownerId2) {
    alert("ERROR: 2 Owner Id must be different each other!!");
  } else if (signedMsgText1 == '' || signedMsgText2 == '') {
    alert("ERROR: 2 Signed Messages are empty");
  } else {
    var errorMsg = '';
    var payload = { name: "request", args: [requestType, ownerId1, signedMsgText1, ownerId2, signedMsgText2] };

    if (requestType == 'W') { // withdraw
      var amount = document.getElementById('amountText').value;
      var toAddress = document.getElementById('toAddressText').value;
      if (amount == '' || toAddress == '') { errorMsg = `ERROR: Amount or To Address is empty`; }
      else {
        payload.args.push({ _bignum: amount });
        payload.args.push(toAddress);
      }
    }
    else if (requestType == 'S' || requestType == 'U') { // stake and unstake
      var amount = document.getElementById('stakeAndUnstakeAmountText').value;
      if (amount == '') { errorMsg = `ERROR: Amount is empty`; }
      else { payload.args.push({ _bignum: amount }); }
    }
    else if (requestType == 'V') { // vote
      var mergedBpStr = genBpList()
      if (mergedBpStr == '') { errorMsg = `ERROR: List of BPs is empty`; }
      else {
        payload.args = payload.args.concat(mergedBpStr.array);
      }
    } else if (requestType == 'D') { // DAO Vote
      var value = document.getElementById('daoValueText').value;
      var daoVoteName = document.getElementById('daoVoteNameText').value;
      if (value == '' || daoVoteName == '') { errorMsg = `ERROR: Vote Name or Value is empty`; }
      else {
        payload.args.push({ _bignum: value });
        payload.args.push(daoVoteName);
      }
    } else {
      errorMsg = "FATAL: EXCEPTION!!! Unsupported requestType " + requestType;
    }

    // read server address
    const serverAddress = document.getElementById('serverAddressText').value;
    // read contract address
    const contractAddress = document.getElementById('contractAddressText').value;

    if (errorMsg) {
      alert(errorMsg);
    } else {
      try {
        alert(JSON.stringify(await sendTxByAergoConnect(serverAddress, contractAddress, payload))); // display a tx receipt
      } catch (e) {
        alert(e); // display an error
      }
    }
  }
});

// Hide/Display div with id guideDiv
document.getElementById("guideDiv").addEventListener("click", function () {
  this.classList.toggle("opened");
  var content = this.nextElementSibling;
  if (content.style.maxHeight) {
    content.style.maxHeight = null;
  } else {
    content.style.maxHeight = content.scrollHeight + "px";
  }
});

// ================ Fill Forms ================

// Get url query string from a shared link
var params = {};
window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (str, key, value) { params[key] = decodeURIComponent(value); });

// show address from shared url or locally stored address if exist
if (params.svrAddr) document.getElementById('serverAddressText').value = params.svrAddr;
else if (localStorage.server) document.getElementById('serverAddressText').value = localStorage.server;

if (params.ctrtAddr) document.getElementById('contractAddressText').value = params.ctrtAddr;
else if (localStorage.wallet) document.getElementById('contractAddressText').value = localStorage.wallet;


// show div
switch (params.tab) {
  case 'S': //staking
    document.getElementById('stakeAndUnstakeAmountText').value = params.suAmount
    showDiv('b2', 'S', 'stakeAndUnstakeDiv');
    break;
  case 'U': //unstaking
    document.getElementById('stakeAndUnstakeAmountText').value = params.suAmount
    showDiv('b3', 'U', 'stakeAndUnstakeDiv');
    break;
  case 'V':
    document.getElementById('bpListText').value = params.bps
    showDiv('b4', 'V', 'voteDiv');
    break;
  case 'D':
    document.getElementById('daoVoteNameText').value = params.daoName
    document.getElementById('daoValueText').value = params.daoValue
    showDiv('b5', 'D', 'daoDiv');
    break;
  case 'W':
    document.getElementById('amountText').value = params.amount
    document.getElementById('toAddressText').value = params.toAddr
  default:  // display default withdraw div
    showDiv('b1', 'W', 'withdrawDiv', 'withdrawDiv')
};

// load previous contract if exist
if ((params.svrAddr && params.ctrtAddr) || (localStorage.server && localStorage.wallet)) {
  loadContract();
};

