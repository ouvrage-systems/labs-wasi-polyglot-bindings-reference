import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  context: __dirname,
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    scriptType: 'module'
  },
  experiments: {
    outputModule: true,
    asyncWebAssembly: true
  },
  resolve: {
    fallback: {
      fs: false,
      os: false,
      path: false,
      crypto: false,
      stream: false
    }
  },
  externals: {
    'node:fs/promises': 'module node:fs/promises',
    'node:fs': 'module node:fs'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      scriptLoading: 'module'
    })
  ],
  devServer: {
    port: 8080,
    hot: true
  }
};
