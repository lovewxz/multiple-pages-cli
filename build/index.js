const { run } = require('runjs')
const chalk = require('chalk')
const config = require('../vue.config.js')
const rawArgv = process.argv.slice(2)
const args = rawArgv.join(' ')
const { diff } = require('./version')

if (process.env.npm_config_update || rawArgv.includes('--update')) {
  const files = diff ? diff.split('\n') : []
  const reg = new RegExp('src\\/views\\/', 'i')
  const updateFiles = []
  files.forEach(file => {
    if (reg.test(file)) {
      updateFiles.push(file)
    }
  })
  if (updateFiles.length === 0) {
    run(`vue-cli-service build ${args}`)
  } else {
    const updateArgs = updateFiles.map(item => item.replace('src/views/', '').split('/')[0].join(','))
    run(`vue-cli-service build ${args} --path=${updateArgs}`)
  }
  return
}

if (process.env.npm_config_preview || rawArgv.includes('--preview')) {
  const report = rawArgv.includes('--report')

  run(`vue-cli-service build ${args}`)

  const port = 9526
  const publicPath = config.publicPath

  var connect = require('connect')
  var serveStatic = require('serve-static')
  const app = connect()

  app.use(
    publicPath,
    serveStatic('./dist', {
      index: ['index.html', '/']
    })
  )

  app.listen(port, function() {
    console.log(chalk.green(`> Preview at  http://localhost:${port}${publicPath}`))
    if (report) {
      console.log(chalk.green(`> Report at  http://localhost:${port}${publicPath}report.html`))
    }
  })
} else {
  run(`vue-cli-service build ${args}`)
}
