import { task } from 'hardhat/config';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { render } from 'ejs';
import { BigNumberish } from 'ethers';

type Coeffs = [BigNumberish,BigNumberish];
function fix_g2_coeffs(x:[Coeffs,Coeffs]) {
    return x.map((x) => [x[1],x[0]]);
}

task<{
    vk: string;
}>('gen-verifier', 'Generate Solidity Verifier')
.addPositionalParam('vk', 'Path to the verification key JSON file')
.setAction(async (args) => {
    const snarkjsPath = dirname(require.resolve('snarkjs'));
    const tplPath = join(snarkjsPath, '../', 'templates', 'verifier_groth16.sol.ejs');
    const tpl = await readFile(tplPath, 'utf8');
    const vk = JSON.parse(await readFile(args.vk, 'utf8'));
    vk.vk_beta_2 = fix_g2_coeffs(vk.vk_beta_2);
    vk.vk_gamma_2 = fix_g2_coeffs(vk.vk_gamma_2);
    vk.vk_delta_2 = fix_g2_coeffs(vk.vk_delta_2);
    console.log(render(tpl, vk));
});
