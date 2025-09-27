import { task } from 'hardhat/config';
import { promises as fs } from 'fs';

interface EventInfo {
    criteriaFieldIndex: bigint;
    criteriaOp: bigint;
    criteriaValue: bigint;
    eventName: string;
    eventInfoJson: string;
}

const EXAMPLE_EVENTS:EventInfo[] = [
    {
        criteriaFieldIndex: 0n,
        criteriaOp: 1n,
        criteriaValue: 18n,
        eventName: "ETH Global After Party",
        eventInfoJson: JSON.stringify({
            'loc': 'Secret Location',
            'desc': 'Connect to discord for more info',
            'url': 'https://example.com/'
        })
    },
    {
        criteriaFieldIndex: 0n,
        criteriaOp: 1n,
        criteriaValue: 18n,
        eventName: "Coffee with Harry",
        eventInfoJson: JSON.stringify({
            'loc': 'London',
            'desc': 'Sample a range of coffees from around the world, brewed in a variety of styles',
            'url': 'https://example.com/'
        })
    },
    {
        criteriaFieldIndex: 0n,
        criteriaOp: 1n,
        criteriaValue: 25n,
        eventName: "Risky Rickshaw Race",
        eventInfoJson: JSON.stringify({
            'loc': 'Delhi',
            'desc': 'Test fate with rickshaw rally drivers, 60mph+',
            'url': 'https://example.com/'
        })
    },
];

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

    for( let evt of EXAMPLE_EVENTS ) {
        await r.createEvent(evt);
    }

    console.log('Registry:', await r.getAddress());
    console.log('Poseidon2:', await p.getAddress());
    console.log('Event:', await e.getAddress());
    console.log('Groth16Verifier:', await g.getAddress());
    fs.writeFile(`contracts-deployed-${hre.network.name}.json`, JSON.stringify({
        'Registry': [await r.getAddress(), r.deploymentTransaction()?.hash],
        'Poseidon2': [await p.getAddress(), p.deploymentTransaction()?.hash],
        'Event': [await e.getAddress(), e.deploymentTransaction()?.hash],
        'Groth16Verifier': [await g.getAddress(), g.deploymentTransaction()?.hash]
    }));
});
