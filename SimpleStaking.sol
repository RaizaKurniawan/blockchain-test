// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStaking {
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public stakeTimestamps;
    uint256 public lockPeriod = 60;

    function stake() public payable {
        require(msg.value > 0, "Must stake some ETH");
        stakes[msg.sender] += msg.value;
        stakeTimestamps[msg.sender] = block.timestamp;
    }

    function unstake() public {
        require(stakes[msg.sender] > 0, "Nothing staked");
        require(block.timestamp >= stakeTimestamps[msg.sender] + lockPeriod, "Stake still locked");
        uint256 amount = stakes[msg.sender];
        stakes[msg.sender] = 0;
        stakeTimestamps[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function getStake() public view returns (uint256) {
        return stakes[msg.sender];
    }
}