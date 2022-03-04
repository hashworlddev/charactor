// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";

contract HashworldCharacter is ERC721, ERC721Enumerable, Pausable, Ownable, ERC721Burnable {
    uint256 public constant PRICE_PER_TOKEN = 0.035 ether;
    uint256 public constant MAX_BUY_PER_ADDRESS = 10;
    string private _baseTokenURI;
    uint256 public _maxSupply;

    mapping(uint256 => uint8) public types;
    mapping(uint256 => uint8) public attributes;
    mapping(uint256 => uint8) public names;

    event MintSuccess(
      address indexed to, 
      uint256 indexed tokenId,
      uint8 _type,
      uint8 _attribute,
      uint8 _name
    );

    constructor(uint256 maxSupply) ERC721("HashWorldCharacter", "HASHCT") {
      _maxSupply = maxSupply;
    }

    modifier callerIsUser() {
      require(tx.origin == msg.sender, "The caller is another contract");
      _;
    }

    modifier tokenUrlExist(uint256 tokenId){
      require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
      _;
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    function baseURI() public view returns (string memory) {
        return _baseTokenURI;
    }

    // get type by random distrubution, 1 girl=30%,2 boy=30%,3 mech=15%,4 mega=6%,5 angel=4%,6 orc=15%
    function calculateType(uint256 seed) private pure returns (uint8) {
        uint256 result = seed % 100;
        if (result < 30) {
            return 1;
        } else if (result < 60) {
            return 2;
        } else if (result < 75) {
            return 3;
        } else if (result < 81) {
            return 4;
        } else if (result < 85) {
            return 5;
        } else {
            return 6;
        }
    }

    // get attribute by random distrubution, 1 Normal=60%,2 Excellent=30%,3 Immortal=10%
    function calculateAttribute(uint256 seed) private pure returns (uint8) {
        uint256 result = seed % 10;
        if (result < 6) {
            return 1;
        } else if (result < 9) {
            return 2;
        } else {
            return 3;
        }
    }

    function mint(uint256 amount) external payable callerIsUser {
        require(balanceOf(msg.sender) + amount <= MAX_BUY_PER_ADDRESS, "Exceed max buy per address");
        require(totalSupply() + amount <= _maxSupply, "Exceed max token supply");
        require(msg.value >= amount * PRICE_PER_TOKEN, "Not enough ETH");

        uint256 initSupply = totalSupply();
        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = initSupply + i + 1;
            uint256 randomSeed = uint256(
                keccak256(abi.encodePacked(msg.sender, tokenId, block.difficulty))
            );
            uint8 typeResult = calculateType(randomSeed);
            uint8 attributeResult = calculateAttribute(randomSeed);
            types[tokenId] = typeResult;
            attributes[tokenId] = attributeResult;
            names[tokenId] = uint8(randomSeed % 52);
            _safeMint(msg.sender, tokenId);
            emit MintSuccess(msg.sender, tokenId, typeResult, attributeResult, names[tokenId]);
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
      require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
      string memory _baseURI = _baseTokenURI;
      uint16 index  = uint16(names[tokenId]) * 52 + uint16(types[tokenId]) * 6 +  uint16(attributes[tokenId]) * 3;
      return
          bytes(_baseURI).length > 0 ? string(abi.encodePacked(
            _baseURI, 
            Strings.toString(index)
          )) : "";
    }

    function getType(uint256 tokenId) public view tokenUrlExist(tokenId) returns (uint8) {
        return types[tokenId];
    }

    function getAttribute(uint256 tokenId) public view tokenUrlExist(tokenId) returns (uint8) {
        return attributes[tokenId];
    }    

    function getName(uint256 tokenId) public view tokenUrlExist(tokenId) returns (uint8) {
        return names[tokenId];
    }

    function getCharactherByIndex(address owner,uint256 index) public view returns(uint256,uint256,address,uint8,uint8,uint8){
        uint256 tokenId = tokenOfOwnerByIndex(owner,index);
        return (index,tokenId,owner,getType(tokenId),getAttribute(tokenId),getName(tokenId));
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function setBaseURI(string calldata _baseURI) external onlyOwner {
        _baseTokenURI = _baseURI;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // function burn(uint256 tokenId) public override onlyOwner {
    //     _burn(tokenId);
    // }

    function withdraw(address to) external onlyOwner {
        uint256 balance = address(this).balance;
        payable(to).transfer(balance);
    }
}
