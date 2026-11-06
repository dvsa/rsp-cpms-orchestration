const fs = require('node:fs');
const path = require('node:path');
const { merge } = require('webpack-merge');
const common = require('./webpack.config');
const { lambdas } = require('./lambdas.json');

class BundlePlugin {
	apply(compiler) {
		compiler.hooks.afterEmit.tapPromise('zip-pack-plugin', async () => {
			const directory = path.resolve(__dirname, 'dist');
			fs.mkdirSync(directory, { recursive: true });
			await Promise.all(lambdas.map((name) => BundlePlugin.createArchive(name, directory)));
		});
	}

	static async createArchive(name, directory) {
		const { ZipArchive } = await import('archiver');
		return new Promise((resolve, reject) => {
			const output = fs.createWriteStream(path.join(directory, `${name}.zip`));
			const archive = new ZipArchive({ zlib: { level: 9 } });
			output.on('close', resolve);
			output.on('error', reject);
			archive.on('error', reject);
			archive.on('warning', reject);
			archive.pipe(output);
			archive.directory(path.resolve(__dirname, `.webpack/${name}`), false);
			archive.finalize().catch(reject);
		});
	}
}

module.exports = merge(common, {
	mode: 'production',
	plugins: [new BundlePlugin()],
});
