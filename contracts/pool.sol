//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Pool is AccessControl, Ownable {
    using SafeMath for uint256;
    struct Deposit {
        uint256 amount; // deposited amount
        uint256 rewards; 
        uint64 depositedTime;
        bool hasDeposited;
    }

    bytes32 public constant TEAM_MEMBER_ROLE = keccak256(abi.encodePacked("TEAM_MEMBER_ROLE"));
    uint256 public totalAmount; // total amount of pool
    address[] public users; // users who deposits ether into pool
    mapping(address => Deposit) public deposits; // deposit for specific user

    // event
    /**
     @dev emit when user deposits ETH
     @param account - user who deposited ETH
            amount - amount of ETH
     */
    event Deposited(address indexed account, uint256 amount);

    /**
     @dev emit when user withdraws ETH
     @param account - user who withdrawed ETH
            amount - amount of ETH
     */
    event Withdrawed(address indexed account, uint256 amount);

    /**
     @dev emit when team member deposits rewards
     @param account - team member
            amount - amount of ETH
     */
    event RewardsDeposited(address indexed account, uint256 amount);

    // check if user deposits newly
    modifier onlyNewUser() {
        require(deposits[_msgSender()].hasDeposited == false, "must be only new user");
        _;
    }
    // check if time passed over 1 week 
    modifier isOneWeek() {
        require(1 weeks <= uint64(block.timestamp) - deposits[_msgSender()].depositedTime, "can withdraw after 1 week");
        _;
    }
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(TEAM_MEMBER_ROLE, _msgSender());
    }
    /**
     @dev add user to team
     */
    function addTeamMember(address _account) external onlyOwner() {
        grantRole(TEAM_MEMBER_ROLE, _account);
    }

    /**
     @dev remove user from team
     */
    function removeTeamMember(address _account) external onlyOwner() {
        revokeRole(TEAM_MEMBER_ROLE, _account);
    }

    /**
     @dev get specific account's balance
     */
    function getBalance(address _account) external view returns(uint256) {
        return _account.balance;
    }

    /**
     @dev deposit ETH into pool
     */
    receive() external payable onlyNewUser() {
        require(msg.value > 0, "zero amount");
        address msgSender = _msgSender();
        users.push(msgSender);

        deposits[msgSender].amount = deposits[msgSender].amount.add(msg.value);
        deposits[msgSender].depositedTime = uint64(block.timestamp);
        deposits[msgSender].hasDeposited = true;
        totalAmount = totalAmount.add(msg.value);

        emit Deposited(msgSender, msg.value);
    }
    
    /**
     @dev only team member deposits rewards
          calculate rewards for users
     */
    function depositRewards() public payable onlyRole(TEAM_MEMBER_ROLE) {
        require(totalAmount > 0, "pool is empty");
        for (uint i = 0; i < users.length; i++){
            deposits[users[i]].rewards = deposits[users[i]].amount * msg.value / totalAmount ;
        }
        emit RewardsDeposited(_msgSender(), msg.value);
    }

    /**
     @dev users withdraw their deposits along with their rewards after 1 week
     */
    function withdrawEth() public isOneWeek() {
        address msgSender = _msgSender();
        uint256 amount = deposits[msgSender].amount;
        uint256 rewards = deposits[msgSender].rewards;
        uint256 withdrawAmount = amount + rewards;
        require(amount > 0, "nothing to withdraw");
        
        deposits[msgSender].amount = 0;
        deposits[msgSender].rewards = 0;
        deposits[msgSender].hasDeposited = false;
        (bool success, ) = msgSender.call{value: withdrawAmount}("");
        require(success, "withdraw failed");
        totalAmount = totalAmount.sub(amount);
        emit Withdrawed(msgSender, withdrawAmount);
    }
   
}
