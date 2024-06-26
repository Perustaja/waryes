const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const DotenvWebpackPlugin = require('dotenv-webpack');

module.exports = {
  mode: 'development',
  output: {
    publicPath: 'auto',
  },

  devServer: {
    historyApiFallback: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsConfigPathsPlugin()],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: 'ts-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/,
        type: 'asset/resource',
      },
    ],
  },

  plugins: [
    new DotenvWebpackPlugin(),
    new NodePolyfillPlugin(),
    new HtmlWebpackPlugin({template: './src/index.html', hash: true, publicPath: '/'}),
    new CopyPlugin({patterns: [{from: "site-meta", to: "."}, {from: "images/units", to: "images/units/"}, {from: "images/weapons", to: "images/weapons/"}, {from: "images/maps", to: "images/maps/"}]}),

  ],
};
