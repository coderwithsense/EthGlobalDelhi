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
    uint256 constant alphax  = 20501691375222662079296455153866948958610865912032671497880094924551184666681;
    uint256 constant alphay  = 7747042717903630776956208238013291150569752029708795966730503275713453824157;
    uint256 constant betax1  = 6753992936755498334389134975611241914789242750089082889502285814231280150492;
    uint256 constant betax2  = 485461556985972810208035242222153689779464500670781944375863400001745885174;
    uint256 constant betay1  = 18607055660561624533209336879152897563456216345952041718598120796825350993456;
    uint256 constant betay2  = 18484854777708391075389540943621640953594990104846181453492309810709642289203;
    uint256 constant gammax1 = 8402972870471920605158549359641390385448100427208743647203161064850701534012;
    uint256 constant gammax2 = 20851915592769580526873146683804137605333489633377601079232698374806716580200;
    uint256 constant gammay1 = 19903802146993650091440724091911905136099879297743539884099131623191127055378;
    uint256 constant gammay2 = 12895536604909379374233258270475581061323788409748876474615390919524521048860;
    uint256 constant deltax1 = 9586554049301746748591275303128438195988870107737594454498136320145394281135;
    uint256 constant deltax2 = 21071593223068610740756422375389573617323617906394780872557600799232651709986;
    uint256 constant deltay1 = 7358773898354977616207173954306572584504816463900915238087559024202919007420;
    uint256 constant deltay2 = 8683160754279604625664484577944337188641827916832344119972251759149799402091;

    
    uint256 constant IC0x = 20851096640375639036775242077452603001791652729524267434004832701667761523311;
    uint256 constant IC0y = 13485581124374111375437603552032962332374818176275623222809569089757635954045;
    
    uint256 constant IC1x = 4633307477596307303033126872857282766618429896725493716218414228726191637852;
    uint256 constant IC1y = 20828649398525546197760933373561490474905418102830114276768356665099263138812;
    
    uint256 constant IC2x = 21134219535421421736192357898355423763133730536236148211879763304159060862983;
    uint256 constant IC2y = 16051490812764171214763632494662250147656414472669959933833151745370961075194;
    
    uint256 constant IC3x = 15725761919008847989332240038868217000472289179392885098144604012880790520865;
    uint256 constant IC3y = 9986496614489705167710505738336595222299333452031761156741881447859348455668;
    
    uint256 constant IC4x = 1212363305918968507876626352923785591341864287560358625403010785668255378639;
    uint256 constant IC4y = 9613513441748434968938067826215499159368839735434599997333037403093479690179;
    
    uint256 constant IC5x = 11889445216017868612521935915843772783585714436220178897824714930995999367375;
    uint256 constant IC5y = 21644139407088241635636076061701782116198813626699582833366815093706598174816;
    
    uint256 constant IC6x = 17635810526929960763157345289915995209930456730146467959213842197925302117726;
    uint256 constant IC6y = 3516853625809331016114165306246947078686713231410780093942559483978531847129;
    
 
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

