require("file-loader?name=../index.html!./index.html");
const assert = require("assert");
const truffleContract = require("truffle-contract");
const Web3 = require("web3");
const $ = require("jquery");

const remittanceJson = require("../build/contracts/Remittance.json");
console.log("going to call addEventListener");

window.addEventListener('load', async() => {
   // console.log("Enter into addEventListener " + web3.currentProvider);
    /*if (typeof web3 !== 'undefined') {
        console.log("web3 is not undefined")
        window.web3 = new Web3(web3.currentProvider);
    } else {
        console.log("web3 is undefined")
        window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545')); 
    }*/
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
    Remittance = truffleContract(remittanceJson);
    //Remittance.setProvider(web3.currentProvider);
    Remittance.setProvider(new Web3.providers.HttpProvider('http://localhost:8545'));

    try {
        web3.eth.getAccounts().then(e => console.log(e));
        const accounts = await web3.eth.getAccounts();
        console.log("account "+ accounts);
        console.log("account "+ accounts.length);
        if (accounts.length == 0) {
            $("#balance").html("N/A");
            throw new Error("No account to transact");
        }
        const accountAlice = accounts[1];
        const accountCarol = accounts[2];
        console.log(accountAlice);
        // get ETH Balance of Alice
        const ethAlice = web3.utils.fromWei(await web3.eth.getBalance(accountAlice), "Ether");

        $("#ethAlice").html(ethAlice.toString(10));
        $("input[name='address-carol']").val(accountCarol);
        $('#generate-bob').click(generateBobPw);

        $("#deposit").click(depositFunds);
        $('#getBalance').click(getBalance);
        $('#withdraw').click(withdrawBalance);
        $('#reclaim').click(reclaimBalance);

    } catch (err) {
        console.log(err);
        $("#error").html(err.toString());
    }
});

async function depositFunds() {
    try {
        $("#error").html('');
        console.log("Enter into depositFunds");
        const instance = await Remittance.deployed();
        console.log("instance:"+instance);
        const accounts = await web3.eth.getAccounts();
        const alice = accounts[1];
        const carol = accounts[2];
        const password = $('input[name="password-bob"]').val();
        console.log("password:"+password);
        const deadline = $("input[name='deadline']").val() * 86400;
        console.log("deadline:"+deadline);
        const value = web3.utils.toWei($('input[name="deposit-amount"]').val(), "Ether");
        console.log("value:"+value);
        const puzzle = await instance.generatePuzzle.call(password, carol);
        console.log("puzzle:"+puzzle);
        // trial run with call to see if transaction will be successful
       /* assert(await instance.depositFunds.call(puzzle, deadline, {from: alice, value: value}), 
        "Transaction will fail, didn't send");*/

        // Deposit funds
        const tx = await instance.depositFunds(puzzle, deadline, {from: alice, value: value}).on(
            "transactionHash", 
            txHash => $("#status1").html('Transaction sent, waiting to confirm. txHash: ' + txHash)).
            on("receipt", function(receipt) {
                if (!receipt.status) {
                    console.error(receipt);
                    $("#error").html('Error in transaction: ' + receipt);
                } else if (receipt.logs[0].event != "LogDepositCreated") {
                    console.error("Wrong event: " + receipt)
                    $("#error").html('Wrong event: ' + receipt);
                } else {
                    console.log(receipt);
                    $("#status2").html('Transaction successful, Send <strong>' + password + '</strong> to Bob');
                }
            });
    } 
    catch (err) {
        console.error(err);
        $("#error").html('Fund Deposit failed: ' + err.toString());
    }
};

async function getBalance() {
    try {
        const instance = await Remittance.deployed();
        const accounts = await web3.eth.getAccounts();
        const carol = accounts[2];
        const password = $('input[name="withdrawPw-bob"]').val()
        const puzzle = await instance.generatePuzzle.call(password, carol);
        console.log("puzzle:"+puzzle+":");
        console.log("testy:"+ await instance.balances.call(puzzle));
        console.log("testy:"+ await instance.balances.call(puzzle).value);
        console.log("testy:"+ await instance.balances.call(puzzle).sender);
        console.log("testy:"+ await instance.balances.call(puzzle).deadline);
        const balance = web3.utils.fromWei((await instance.balances.call(puzzle)).value);
        $('#amount-contract').html('You can withdraw ' + balance + ' ETH');
    }
    catch (err) {
        console.error(err);
        $("#errorW").html('Balance Check failed: ' + err.toString());
    }
}

async function withdrawBalance() {
    try {
        const instance = await Remittance.deployed();
        const accounts = await web3.eth.getAccounts();
        const carol = accounts[2];
        const password = $('input[name="withdrawPw-bob"]').val()

        // trial run with call to see if transaction will be successful
        assert(await instance.withdrawFunds.call(password, {from: carol}), 
        "Transaction will fail, didn't send");

        await instance.withdrawFunds(password, {from: carol}).on(
            "transactionHash", 
            txHash => $("#statusW1").html('Withdraw transaction sent, waiting to confirm. txHash: ' + txHash))
            .on("receipt", function(receipt) {
                if (!receipt.status) {
                    console.error(receipt);
                    $("#errorW").html('Error in transaction: ' + receipt);
                } else if (receipt.logs[0].event != "LogWithdrawn") {
                    console.error("Wrong event: " + receipt)
                    $("#errorW").html('Wrong event: ' + receipt.toString());
                } else {
                    console.log(receipt);
                    $("#statusW2").html('Withdraw successful');
                }
            });
    } 
    catch (err) {
        console.error(err);
        $("#errorW").html('Withdrawal failed: ' + err.toString());
    }
}

async function reclaimBalance() {
    try {
        const instance = await Remittance.deployed();
        const accounts = await web3.eth.getAccounts();
        const alice = accounts[1];
        const carol = accounts[2];
        const password = $('input[name="reclaimPw-bob"]').val()
        const puzzle = await instance.generatePuzzle.call(password, carol);

        // trial run with call to see if transaction will be successful
        assert(await instance.reclaimFunds.call(puzzle, {from: alice}), 
        "Transaction will fail, didn't send");

        await instance.reclaimFunds(puzzle, {from: alice}).on(
            "transactionHash", 
            txHash => $("#statusR1").html('Reclaim transaction sent, waiting to confirm. txHash: ' + txHash))
            .on("receipt", function(receipt) {
                if (!receipt.status) {
                    console.error(receipt);
                    $("#errorR").html('Error in transaction: ' + receipt);
                } else if (receipt.logs[0].event != "LogReclaimed") {
                    console.error("Wrong event: " + receipt)
                    $("#errorR").html('Wrong event: ' + receipt.toString());
                } else {
                    console.log(receipt);
                    $("#statusR2").html('Reclaim successful');
                }
            });
    } 
    catch (err) {
        console.error(err);
        $("#errorR").html('Reclaim failed: ' + err.toString());
    }
}

function generateBobPw() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP1234567890";
    let pass = "";
    for (var x = 0; x < 10; x++) {
        var i = Math.floor(Math.random() * chars.length);
        pass += chars.charAt(i);
    }
    $('input[name="password-bob"]').val(pass);
}