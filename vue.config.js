'use strict'
const path = require('path')
const utils = require('./build/util')
const defaultSettings = require('./src/settings.js')
const fs = require('fs')

let entries = utils.getEntries(
  path.join(__dirname, './src/views/**/main.*')
)

if (process.env.npm_config_path) {
  entries = utils.getMatchEntries(process.env.npm_config_path, entries)
}

function resolve(dir) {
  return path.join(__dirname, dir)
}

const name = defaultSettings.title || 'Vue Template' // page title

// If your port is set to 80,
// use administrator privileges to execute the command line.
// For example, Mac: sudo npm run
// You can change the port by the following methods:
// port = 9528 npm run dev OR npm run dev --port = 9528
const port = process.env.port || process.env.npm_config_port || 9332 // dev port

const staticResources = {
  images: {
    prefix: 'png|jpe?g|gif|webp',
    path: 'img'
  },
  media: {
    prefix: 'mp4|webm|ogg|mp3|wav|flac|aac',
    path: 'media'
  },
  fonts: {
    prefix: 'woff2?|eot|ttf|otf',
    path: 'fonts'
  }
}

// All configuration item explanations can be find in https://cli.vuejs.org/config/
module.exports = {
  /**
   * You will need to set publicPath if you plan to deploy your site under a sub path,
   * for example GitHub Pages. If you plan to deploy your site to https://foo.github.io/bar/,
   * then publicPath should be set to "/bar/".
   * In most cases please use '/' !!!
   * Detail: https://cli.vuejs.org/config/#publicpath
   */
  pages: entries,
  publicPath: '/',
  outputDir: 'dist',
  assetsDir: 'static',
  lintOnSave: process.env.NODE_ENV === 'development',
  productionSourceMap: false,
  configureWebpack: {
    // provide the app's title in webpack's name field, so that
    // it can be accessed in index.html to inject the correct title.
    name: name,
    resolve: {
      alias: {
        '@': resolve('src')
      }
    }
  },
  chainWebpack(config) {
    Object.keys(entries).forEach(page => {
      config.plugins.delete(`preload-${page}`)
      config.plugins.delete(`prefetch-${page}`)
    })

    config.externals({
      vue: 'Vue'
    })

    // set svg-sprite-loader
    config.module
      .rule('svg')
      .exclude.add(resolve('src/icons'))
      .end()
    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(resolve('src/icons'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]'
      })
      .end()

    // set preserveWhitespace
    config.module
      .rule('vue')
      .use('vue-loader')
      .loader('vue-loader')
      .tap(options => {
        options.compilerOptions.preserveWhitespace = true
        return options
      })
      .end()

    config
    // https://webpack.js.org/configuration/devtool/#development
      .when(process.env.NODE_ENV === 'development',
        config => config.devtool('cheap-source-map')
      )

    config
      .when(process.env.NODE_ENV === 'development',
        config => {
          const proxyPath = resolve('./config/proxy.js')
          config.devServer.port(port).quiet(true).disableHostCheck(true)
          if (fs.existsSync(proxyPath)) {
            config.devServer.proxy(require(proxyPath))
          } else {
            const proxy = require(resolve('./build/proxy-tpl.js'))
            const buffer = fs.readFileSync(resolve('./build/proxy-tpl.js'))
            fs.writeFile(proxyPath, buffer, 'utf8', error => {
              if (error) {
                throw new Error(error)
              }
            })
            config.devServer.proxy(proxy)
          }

          config
            .plugin('friendly-errors')
            .tap(_ => {
              const devUrl = `http://localhost:${config.devServer.store.get('port')}`
              return [{
                compilationSuccessInfo: {
                  messages: [
                    '> 构建完成，请手工复制下面的链接，复制到浏览器里打开。\n',
                    ...Object.keys(entries).map(
                      chunk =>
                        `> Listening at ${devUrl}/${chunk
                          .split(path.sep)
                          .join('/')}.html`
                    )
                  ]
                }
              }]
            })
            .end()
        }
      )
    config
      .plugin('htmlWebpackTagsPlugin')
      .after('html')
      .use('html-webpack-tags-plugin', [{
        tags: ['https://cdnstyle.woqukaoqin.com/style/static/vue/vue.js'],
        usePublicPath: false,
        append: false
      }])
      .end()

    config
      .when(process.env.NODE_ENV !== 'development',
        config => {
          config.output
            .filename('[name]/js/[name].[contenthash:8].js')
            .chunkFilename('[name]/js/[name].[contenthash:8].js')

          config
            .plugin('ScriptExtHtmlWebpackPlugin')
            .after('html')
            .use('script-ext-html-webpack-plugin', [{
            // `runtime` must same as runtimeChunk name. default is `runtime`
              inline: /runtime\..*\.js$/
            }])
            .end()

          config
            .plugin('extract-css')
            .tap(_ => {
              return [{
                filename: '[name]/css/[name].[contenthash:8].css',
                chunkFilename: '[name]/css/[name].[contenthash:8].css'
              }]
            })
            .end()

          /* 设置静态资源的路径 */
          Object.keys(staticResources)
            .forEach(
              resource =>
                config.module
                  .rule(resource)
                  .use('url-loader')
                  .tap(options => {
                    options.fallback.options.name = (path) => {
                      const reg = new RegExp(`\\/(views|assets)\\/([a-z0-9\\/]+)(\\/[a-z0-9]+\\.(${staticResources[resource].prefix})(\\?.*)?$)`, 'ig')
                      const matchedArr = reg.exec(path)
                      return matchedArr ? `${matchedArr[2]}/[name].[contenthash:8].[ext]` : `static/${staticResources[resource].path}/[name].[contenthash:8].[ext]`
                    }
                    return options
                  })
                  .end()
            )

          config.module
            .rule('svg')
            .use('file-loader')
            .tap(options => {
              options.name = (path) => {
                const reg = new RegExp(`\\/(views|assets)\\/([a-z0-9\\/]+)(\\/[a-z0-9]+\\.(svg)(\\?.*)?$)`, 'ig')
                const matchedArr = reg.exec(path)
                return matchedArr ? `${matchedArr[2]}/[name].[contenthash:8].[ext]` : `static/svg/[name].[contenthash:8].[ext]`
              }
              return options
            })
            .end()

          config
            .plugin('cleanWebpackPlugin')
            .use('clean-webpack-plugin', [{
              cleanOnceBeforeBuildPatterns:
              process.env.npm_config_path
                ? [config.output.store.get('path')]
                : (process.env.npm_config_path.split(',') || []).map(
                  item => `${config.output.store.get('path')}/${item}/*`
                )
            }])
            .end()

          config
            .optimization.splitChunks({
              chunks: 'all',
              cacheGroups: {
                libs: {
                  name: 'chunk-libs',
                  test: /[\\/]node_modules[\\/]/,
                  priority: 10,
                  chunks: 'initial' // only package third parties that are initially dependent
                },
                elementUI: {
                  name: 'chunk-elementUI', // split elementUI into a single package
                  priority: 20, // the weight needs to be larger than libs and app or it will be packaged into libs or app
                  test: /[\\/]node_modules[\\/]_?element-ui(.*)/ // in order to adapt to cnpm
                },
                commons: {
                  name: 'chunk-commons',
                  test: resolve('src/components'), // can customize your rules
                  minChunks: 3, //  minimum common number
                  priority: 5,
                  reuseExistingChunk: true
                }
              }
            })

          config.optimization.runtimeChunk('single')
        }
      )
  }
}
