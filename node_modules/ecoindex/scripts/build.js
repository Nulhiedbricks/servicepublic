import fs from 'fs';
import path from 'path';
import {transformFileSync} from "@babel/core";

/**
 * Build cjs.
 * @returns {Promise<void>}
 */
async function getCjsCode(inputFile) {


	const babelConf = {
		exclude: 'node_modules/**',
		presets: [
			[
				'@babel/env',
				{
					modules: "commonjs",
				}
			]
		],
		plugins: [
			[
				'@babel/plugin-syntax-import-attributes',
				{deprecatedAssertSyntax: true}
			]

		]
	};

	const result = await transformFileSync(inputFile, babelConf);

	return result.code
}


// Init dist dir.
const dir = path.resolve(process.cwd(), 'dist');
const inputFile = 'src/index.js';
if (fs.existsSync(dir)) {
	fs.rmSync(dir, {recursive: true, force: true});
}
fs.mkdirSync(dir, {recursive: true});

// Create files.
fs.writeFileSync(path.join(dir, 'index.cjs'), await getCjsCode(inputFile));
fs.copyFileSync(path.resolve(process.cwd(), inputFile), path.join(dir, 'index.js'));
