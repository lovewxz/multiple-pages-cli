const glob = require('glob')
const path = require('path')

const toLinePath = (path) => path.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')

exports.formatEntries = (entries) => {
  const formattedEntries = {}
  for (const [entry, path] of Object.entries(entries)) {
    if (formattedEntries[entry]) return
    formattedEntries[entry] = {
      entry: path,
      template: 'public/index.html',
      chunks: ['chunk-libs', 'chunk-elementUI', 'chunk-commons', entry, 'runtime']
    }
  }
  return formattedEntries
}

/**
 * 获取各页面入口
 * @param  {String} modpath 入口路径
 */
exports.getEntries = modpath => {
  const entries = {}
  glob.sync(modpath).forEach(entry => {
    // 获取包含main.js入口文件的文件夹名称，作为入口名
    const dirname = path
      .normalize(path.dirname(entry))
      .replace(path.normalize(path.join(__dirname, '../src/views/')), '')
    // 驼峰命名文件夹名称改为中横线连接
    entries[
      toLinePath(dirname)
    ] = entry
  })
  // return entries
  return process.env.NODE_ENV === 'development' ? entries : exports.formatEntries(entries)
}

exports.getMatchEntries = (modules = '', entries) => {
  if (!modules) {
    return entries
  }
  const matchedEntries = {}
  const modulesReg = new RegExp(`^(${modules.split(',').map(item => `${toLinePath(item)}$`).join('|')})`)
  Object.keys(entries).map(item => {
    if (modulesReg.test(item)) {
      matchedEntries[item] = entries[item]
    }
  })
  if (Object.keys(matchedEntries).length === 0) {
    throw new Error('传入的模块名有误')
  }
  return matchedEntries
}

// 获取参数匹配相应的入口
exports.getArgsToEntry = () => {
  const args = process.env.npm_config_path || '**'
  const modules = args.split(',')
  let matchedEntries = {}
  modules.forEach(item => {
    const entries = exports.getEntries(
      path.join(__dirname, `../src/views/${item}/**/main.*`)
    )
    matchedEntries = Object.assign({}, matchedEntries, entries)
  })
  return matchedEntries
}

