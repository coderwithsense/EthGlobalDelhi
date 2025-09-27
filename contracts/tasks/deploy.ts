import { task } from 'hardhat/config';
import { promises as fs } from 'fs';

task('deploy', async (_args, hre) => {
    const {ethers} = hre;

    const nFields = 4;
    const pf = await ethers.getContractFactory('Poseidon2');
    const p = await pf.deploy();
    await p.waitForDeployment();

    const gf = await ethers.getContractFactory('Groth16Verifier');
    const g = await gf.deploy();
    await g.waitForDeployment();

    const ef = await ethers.getContractFactory('Event', {libraries: {
        'Poseidon2': await p.getAddress()
    }});
    const e = await ef.deploy();
    await e.waitForDeployment();

    const rf = await ethers.getContractFactory('Registry', {libraries: {
        'Poseidon2': await p.getAddress()
    }});
    const r = await rf.deploy(await g.getAddress(), await e.getAddress());
    await r.waitForDeployment();

    console.log('Registry:', await r.getAddress());
    fs.writeFile('contracts-deployed.json', JSON.stringify({
        'Registry': await r.getAddress()
    }))
});
