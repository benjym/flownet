const webpack = require("webpack");
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [
  {
    mode: "development",
    // mode: "production",
    entry: {
      "index": './js/index.js',
    },
    plugins: [
      new HtmlWebpackPlugin({
        title: 'Flow nets',
        favicon: "./assets/favicon.png",
        template: "index.html",
        filename: "index.html",
        chunks: ['index']
      })
    ],
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name]-bundle.js',
      clean: true,
    },
    devServer: {
      static: {
        directory: './dist'
      },
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(json|png|svg|jpg|jpeg|gif|mp3|stl|glb)$/i,
          type: 'asset/resource',
          use: ["file-loader?name=[name].[ext]"]
        },
        {
          test: /\.worker\.js$/,
          use: { loader: 'worker-loader' }
        },
        {
          test: /\.json5$/i,
          loader: 'json5-loader',
          type: 'javascript/auto',
        },
      ],
    },
  },
];
