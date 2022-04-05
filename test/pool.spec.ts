import { expect } from "chai"
import web3 from "web3"
import { PoolContract, PoolInstance } from "../types/truffle-contracts"
const {
    BN,           // Big Number support e.g. new BN(1)
    constant,
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
    time          // Time manipulation
} = require('@openzeppelin/test-helpers');
const poolContract: PoolContract = artifacts.require("Pool");

contract("Eth Pool", accounts => {
    const [owner, A, B, T] = accounts;
    let poolInstance: PoolInstance;
    beforeEach(async () => {
        poolInstance = await poolContract.new({from: owner})
    })
    it("Should allow deposits", async () => {
        const ether10 = web3.utils.toWei('10')
        const result = await poolInstance.sendTransaction({value: ether10, from: owner})
        expectEvent(result, 'Deposited', {account: owner, amount: new BN(ether10)})
        const total = await poolInstance.totalAmount()
        expect(web3.utils.fromWei(total)).to.equal('10')
    })
    it("Should allow deposits from multiple users", async () => {
        const ether10 = web3.utils.toWei('10')
        const ether20 = web3.utils.toWei('20')
        await poolInstance.sendTransaction({value: ether10, from: A})
        await poolInstance.sendTransaction({value: ether20, from: B})
        const total = await poolInstance.totalAmount()
        expect(web3.utils.fromWei(total)).to.equal('30')
    })
    it("Should allow add user to team", async () => {
        await poolInstance.addTeamMember(T, {from: owner})
        expect(await poolInstance.hasRole(await poolInstance.TEAM_MEMBER_ROLE(), T)).to.equal(true)
    })
    it("Should not deposite rewards if pool is empty", async () => {
        const ether10 = web3.utils.toWei('10')
        await poolInstance.addTeamMember(T, {from: owner})
        await expectRevert(
            poolInstance.depositRewards({ value: ether10, from: T}),
            "pool is empty"
        )
    });
    it("Should allow deposits rewards from team member and withdraw", async () => {
        const eth10 = web3.utils.toWei('10')
        const eth20 = web3.utils.toWei('20')
        const eth30 = web3.utils.toWei('30')

        // A and B deposit 10Eth and 30Eth
        await poolInstance.sendTransaction({value: eth10, from: A})
        await poolInstance.sendTransaction({value: eth30, from: B})
        let total = await poolInstance.totalAmount()
        expect(web3.utils.fromWei(total)).to.equal('40')

        // owner add T to team and deposits rewards
        await poolInstance.addTeamMember(T, {from: owner})
        let result = await poolInstance.depositRewards({value: eth20, from: T})
        expectEvent(result, 'RewardsDeposited', {account: T, amount: new BN(eth20)})

        // increase time(1 week)
        await time.increase(604800)

        // A withdraws
        result = await poolInstance.withdrawEth({from: A})
        expectEvent(
            result,
            'Withdrawed',
            {account: A, amount: new BN(web3.utils.toWei('15'))}
        ) // 10 + 5
       
        total = await poolInstance.totalAmount()
        expect(web3.utils.fromWei(total)).to.equal('30')

        // B withdraws
        result = await poolInstance.withdrawEth({from: B})
        expectEvent(
            result,
            'Withdrawed',
            {account: B, amount: new BN(web3.utils.toWei('45'))}
        ) // 30 + 15
       
        total = await poolInstance.totalAmount()
        expect(web3.utils.fromWei(total)).to.equal('0')
    })
    it("Should allow A deposits then T deposits then B deposits then A withdraws and finally B withdraws", async () => {
        const eth10 = web3.utils.toWei('10')
        const eth20 = web3.utils.toWei('20')
        const eth30 = web3.utils.toWei('30')

        // let balance = await poolInstance.getBalance(A)
        // console.log(balance.toString())
        
        // A deposits 10Eth
        await poolInstance.sendTransaction({value: eth10, from: A})

        // await poolInstance.sendTransaction({value: eth30, from: B})
        let total = await poolInstance.totalAmount()
        expect(web3.utils.fromWei(total)).to.equal('10')

        // owner add T to team and deposits rewards
        await poolInstance.addTeamMember(T, {from: owner})
        let result = await poolInstance.depositRewards({value: eth20, from: T})
        expectEvent(result, 'RewardsDeposited', {account: T, amount: new BN(eth20)})

        // B deposits 30Eth
        await poolInstance.sendTransaction({value: eth30, from: B})
        total = await poolInstance.totalAmount()
        expect(web3.utils.fromWei(total)).to.equal('40')

        // increase time(1 week)
        await time.increase(604800)

        // A withdraws
        result = await poolInstance.withdrawEth({from: A})
        expectEvent(
            result,
            'Withdrawed',
            {account: A, amount: new BN(web3.utils.toWei('30'))}
        ) // 10 + 20
        total = await poolInstance.totalAmount()
        expect(web3.utils.fromWei(total)).to.equal('30')
       
        // B withdarws
        result = await poolInstance.withdrawEth({from: B})
        expectEvent(
            result,
            'Withdrawed',
            {account: B, amount: new BN(web3.utils.toWei('30'))}
        ) // 30 + 0
        total = await poolInstance.totalAmount()
        expect(web3.utils.fromWei(total)).to.equal('0')
        // balance = await poolInstance.getBalance(A)
        // console.log(balance.toString())
    })
    it("Should get balance of pool",async () => {
        const eth10 = web3.utils.toWei('10')
        const eth20 = web3.utils.toWei('20')
        const eth30 = web3.utils.toWei('30')

        await poolInstance.sendTransaction({value: eth10, from: A})
        await poolInstance.sendTransaction({value: eth30, from: B})
        await poolInstance.addTeamMember(T, {from: owner})
        await poolInstance.depositRewards({value: eth20, from: T})
        
        const balance = await poolInstance.getBalance(poolInstance.address)
        expect(web3.utils.fromWei(balance)).to.equal('60') // 10+20+30 
    })
})
