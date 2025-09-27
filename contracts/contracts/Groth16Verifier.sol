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
    uint256 constant alphax  = 19676422865793855904661641153894935841601611303382156482592455568543306984445;
    uint256 constant alphay  = 6808287969976328960233131222765515007951577713278703196612828564322472694534;
    uint256 constant betax1  = 17131403705964826904209319291260084908493092575698325612374044423358183732169;
    uint256 constant betax2  = 3829762995584698915251325831582626909377075672123355331123808583121670321013;
    uint256 constant betay1  = 17576508549734305524539638227825278064732484614796987427712212253197007260633;
    uint256 constant betay2  = 6677580965524285314053788883896249244212200601558074697862362571118453086154;
    uint256 constant gammax1 = 17791533170397694336770636589265372327483786300025063163067208966125710888965;
    uint256 constant gammax2 = 15157888222748368497859718245897226820491799364251644716405926217475011121141;
    uint256 constant gammay1 = 16963219690340320520842917730190345257255680955306114850476923911682242606872;
    uint256 constant gammay2 = 13113118558247685282727077594425535479776111871595289230216324912014902114764;
    uint256 constant deltax1 = 3697347832395432896726799472221249191019401160859840067420587691563470978138;
    uint256 constant deltax2 = 21307760296215843685818108909705621781869642969242596251647535124682043033721;
    uint256 constant deltay1 = 6728664697159246342682304753102633982802112332927925310954340649456256897895;
    uint256 constant deltay2 = 4755280002538178288542781281348219718566935832229819281918873752263901118255;

    
    uint256 constant IC0x = 8598995920874617415345583443220200740187243030367998151792507118854269716020;
    uint256 constant IC0y = 12317823720286251123960516188695947156744108900038166475754313050786073326321;
    
    uint256 constant IC1x = 1545897384705541990026982361083738619828922183567618284730226256567446583801;
    uint256 constant IC1y = 6104250210980470668824639996521841943113267150709684817387325790057116506383;
    
    uint256 constant IC2x = 903536285291460542894603712685607269811524507789606105046180386011143116148;
    uint256 constant IC2y = 13474066339122084160128460342910336340214841192748724342943494983092362507396;
    
    uint256 constant IC3x = 8196050342262185868243797432590372843123415650208474614448182035498873016856;
    uint256 constant IC3y = 19740978473880630354743707904707813534273821359893861722927433594611998405460;
    
    uint256 constant IC4x = 15191117849270207455061185913275390603189518294912369166142733976311374308586;
    uint256 constant IC4y = 3985202920763690275884320812855531354611163923546435612645505136791751036076;
    
    uint256 constant IC5x = 7448715124788506143422752812502723039994374869204284444348831904329529767478;
    uint256 constant IC5y = 7285539580384527055581218002898162141448567374242198141498303535160341325301;
    
    uint256 constant IC6x = 20137924687823058754614960303138752682048658916902215463516878351642236185396;
    uint256 constant IC6y = 12525663184399584933206160242049250728310916756711913365535523328290227133331;
    
 
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

