/* eslint-disable @typescript-eslint/no-var-requires */
const HtmlWebpackPlugin = require('html-webpack-plugin')

class ScriptReorderPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('ScriptReorderPlugin', compilation => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tapAsync(
        'ScriptReorderPlugin',
        (data, cb) => {
          // 找到 prefetch 脚本
          const prefetchScriptIndex = data.headTags.findIndex(tag =>
            tag.attributes.src && tag.attributes.src.includes('prefetch')
          )

          if (prefetchScriptIndex !== -1) {
            // 将 prefetch 脚本移动到 head tags 最前面
            const [prefetchScript] = data.headTags.splice(prefetchScriptIndex, 1)
            data.headTags.unshift(prefetchScript)
          }

          cb(null, data)
        }
      )
    })
  }
}

module.exports = {
  ScriptReorderPlugin
}


// 在 webpack 配置中，添加 prefetch script 打包注入入口，视具体配置而定
/* let entry = {}
if (typeof webpackConfig.entry === 'string') {
    entry = {
        main: webpackConfig.entry,
        prefetch: path.resolve(__dirname, 'src/prefetch/index.js')
    }
} else {
    entry = {
        ...webpackConfig.entry,
        prefetch: path.resolve(__dirname, 'src/prefetch/index.js')
    }
}
webpackConfig.entry = entry */
