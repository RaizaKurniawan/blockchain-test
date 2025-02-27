// SPDX-License MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 public storedValue;

    // Payable function to accept ETH
    function deposit() public payable{
        storedValue += msg.value; // Add sent ETH
    }

    // set new value
    function set(uint256 _value) public{
        storedValue = _value;
    }

    // Get the current value
    function get() public view returns (uint256) {
        return storedValue;
    }
}