import { defineConfig } from 'cypress';
import { baseConfig } from '@fluentui/scripts-cypress';

/**
 * Extends the base cypress webpack config to add the babel preset
 * to be tested
 */
const webpackConfigWithBabelPreset = () => {
  const baseWebpackConfig = baseConfig.component.devServer.webpackConfig;
  return {
    ...baseWebpackConfig,
    module: {
      ...baseWebpackConfig.module,
      rules: [
        {
          test: /\.(ts|tsx)$/,
          loader: 'babel-loader',
          // Webpack resource paths use the host's native separators.
          include: [/[/\\]fake_node_modules[/\\]context-[^/\\]+[/\\]/],
          options: {
            presets: ['@fluentui/babel-preset-global-context'],
          },
        },
        ...(baseWebpackConfig.module?.rules ?? []),
      ],
    },
  };
};

export default defineConfig({
  ...baseConfig,
  component: {
    ...baseConfig.component,
    devServer: {
      bundler: 'webpack',
      framework: 'react',
      webpackConfig: webpackConfigWithBabelPreset(),
    },
  },
});
