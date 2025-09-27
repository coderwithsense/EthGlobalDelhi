// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 16053937252190422488237597006380766986176055527545309056724267741159534818886;
    uint256 constant alphay  = 7643874008028954239686586784452497977494214257046202684463566018532500483196;
    uint256 constant betax1  = 5873114424203751544825128823281687195827408108343715896361407246924103510908;
    uint256 constant betax2  = 7415062994881777222712218141379033554024278430798357303044254867752157159134;
    uint256 constant betay1  = 17503975051792802707713365377668189044950975941387373607907995311152172240511;
    uint256 constant betay2  = 13737113036871513649539595964307457596998764606440825013928760275559045776468;
    uint256 constant gammax1 = 2183066132499373846334232839988972037611186899614402496210993045975971897086;
    uint256 constant gammax2 = 8397416086787581937275731649884655179933387873750327152048029767903895195910;
    uint256 constant gammay1 = 8519531946114366954801068361851774603457686293819963383978706397103597890688;
    uint256 constant gammay2 = 20461608212309488589725666486959439387475776200613805650431452328829262992317;
    uint256 constant deltax1 = 3249891391040042954161723975090992584340226983287256930158537482335874363324;
    uint256 constant deltax2 = 29849532182924760647284862654286059214983739661173767290470590044386679042;
    uint256 constant deltay1 = 20424308515586401390543531736916076585857019937457743959343023826748227576973;
    uint256 constant deltay2 = 21826337497547394028150601148649596012980058183351694936241452578708345665878;

    
    uint256 constant IC0x = 16268905475538219289933408317306878449549966847964525190359039956513834061190;
    uint256 constant IC0y = 6812733193623496442056541703931574113603429830176726840381461140819797623972;
    
    uint256 constant IC1x = 16499706187790741606126822010457927598031938861660427713799746759004929500455;
    uint256 constant IC1y = 15492584346556263296171378333855826664864592960804311640185313284212239151172;
    
    uint256 constant IC2x = 14416289982461468339736017094079116743023233414125639924747977541435486510397;
    uint256 constant IC2y = 7419031456838984388731776227683647655571430880037045920298824885787424099063;
    
    uint256 constant IC3x = 19582357207893267366770416695143586112118055280290284450192106723993315874151;
    uint256 constant IC3y = 16671032382982301640426820852316024181577511615696065642306066367787672889038;
    
    uint256 constant IC4x = 11973390751165044403677004478232518355862672081567472038832047005143918718903;
    uint256 constant IC4y = 10823052994674155525154176653221045112071640661210449849526485789388842872988;
    
    uint256 constant IC5x = 17124691548990842784402663921479504531049159588590378101451080828745941696044;
    uint256 constant IC5y = 17606189562683930807207806833659516994062900387766490756422119864198565069158;
    
    uint256 constant IC6x = 1076164627632065944373176254804530584541795387589644038563229890578382007849;
    uint256 constant IC6y = 18091002684604214258774420950639413596195478035183813975373247453964200851578;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[6] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }

