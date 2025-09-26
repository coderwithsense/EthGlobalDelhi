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
    uint256 constant alphax  = 7000828655996472145800012394564628906363091625446043171210489593667412958914;
    uint256 constant alphay  = 8163888239903422328165519754305136411545856361473512885415134147438492313208;
    uint256 constant betax1  = 19576793071342419859961478482118923365826663422811102682372822096755970865536;
    uint256 constant betax2  = 14184345988397387395148236533611925816294681400066456108103263840468733223856;
    uint256 constant betay1  = 11014930098144234976674961722870389942913020306537525070181783002467056619387;
    uint256 constant betay2  = 13467488043392657891004384046740365073932097842289790705040952898390973443157;
    uint256 constant gammax1 = 14857709959020373224993778547310606442093535529240702836346748006102278970527;
    uint256 constant gammax2 = 13533600504067178020658430448980639075918155555586546792232868090964715894938;
    uint256 constant gammay1 = 13940885740923742484085229462794449906381840987886749609229617459920513024898;
    uint256 constant gammay2 = 997946091594740542109980329506266570482675158905856402689804479330308848928;
    uint256 constant deltax1 = 16328313601221519244183556041499686033650537539750862343583166853421769188386;
    uint256 constant deltax2 = 2174887010039844598297412920731338358450295634385008044729329573070589600274;
    uint256 constant deltay1 = 6617831230812295091466406914214093747781562067525704617322142300307359043843;
    uint256 constant deltay2 = 1577627998130839958299764913032027212459021885000207871380009251321798433274;

    
    uint256 constant IC0x = 8630657082550100265430467143274365463377028278332296117601443339364780071231;
    uint256 constant IC0y = 18602112411608692616088031225668507580461970396528541441422037549726714605104;
    
    uint256 constant IC1x = 15509374968317769653840287100521625089704824969640110879277149624174582773836;
    uint256 constant IC1y = 11014547039142950832911716803952633381346914556746379368943407449126850654256;
    
    uint256 constant IC2x = 17662518223911169558468955061505713151446475800176323959093796227291756015373;
    uint256 constant IC2y = 20706007265131496463527645243984271820970156161531647933386982325687588482483;
    
    uint256 constant IC3x = 1478608214209627022451789342111023683402703962437590749518041723804004256917;
    uint256 constant IC3y = 10756537605529725234421830744751283008082292550031382492813407919785572716790;
    
    uint256 constant IC4x = 67949580812768892107711366088287654588244166912520889986850802961817721683;
    uint256 constant IC4y = 15122557461236844402535952209287719910998400422810484539527348738747728837800;
    
    uint256 constant IC5x = 9343908837336133805597983634575575367760337919981661696117792428043135535779;
    uint256 constant IC5y = 14086435320213575634993592161973582630444103155932904191985187279250151990654;
    
    uint256 constant IC6x = 21103547041353938211660009079987727124246633734608133927901682323590623878948;
    uint256 constant IC6y = 2632659351859879544274133868097152670332455131869924538950794819679575284156;
    
 
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

