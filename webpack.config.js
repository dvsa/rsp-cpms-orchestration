const path = require('path');
const { BannerPlugin, Compilation, sources } = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { lambdas } = require('./lambdas.json');

class LegacyEntrypointPlugin {
	apply(compiler) {
		compiler.hooks.thisCompilation.tap('legacy-entrypoint', (compilation) => {
			compilation.hooks.processAssets.tap({
				name: 'legacy-entrypoint',
				stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
			}, () => {
				lambdas.forEach((name) => {
					compilation.emitAsset(`${name}/handler.js`,
						new sources.RawSource("module.exports = require('./app.js');\n"));
				});
			});
		});
	}
}

module.exports = {
	entry: Object.fromEntries(lambdas.map((name) => [name, `./src/functions/${name}.js`])),
	output: {
		filename: '[name]/app.js',
		libraryTarget: 'commonjs2',
		path: path.resolve(__dirname, '.webpack'),
		asyncChunks: false,
		clean: true,
	},
	resolve: { extensions: ['.js'] },
	target: 'node24',
	mode: 'development',
	module: {
		rules: [{
			test: /\.m?js$/,
			exclude: /node_modules/,
			use: {
				loader: 'babel-loader',
				options: { presets: [['@babel/preset-env', { targets: { node: '24' } }]] },
			},
		}],
	},
	plugins: [
		new LegacyEntrypointPlugin(),
		// Preserve named exports and provide the uniform deployment entry point.
		new BannerPlugin({
			banner: ({ chunk }) => `module.exports.handler = module.exports.${chunk.name};`,
			raw: true,
			footer: true,
		}),
		new CopyWebpackPlugin({
			patterns: [{ from: 'serverless/serverless.yml', to: 'serverless.yml' }],
		}),
	],
};
