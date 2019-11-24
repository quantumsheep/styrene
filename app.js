/** @type {import('node-latex').default} */
const latex = require('node-latex')
const express = require('express')

const path = require('path')
const fs = require('fs').promises

const app = express()
app.set('trust proxy', true)

const body_parser = require('body-parser')
app.use(body_parser.urlencoded({ extended: false }))
app.use(body_parser.json())

app.use('/static', express.static(path.resolve(__dirname, 'static')))

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'))
})

/**
 * @param {import('express').Request} req 
 * @param {boolean} error 
 */
function log(req, error = false) {
  const now = new Date()
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  console.log(`[${now.toUTCString()}] [${ip}] Sended ${req.body.source.length} bytes buffer.${error ? ' (error)' : ''}`)
}

const empty_buffer = Buffer.from([0x0])
app.post('/compile', (req, res) => {
  if (!req.body.source) return res.send(empty_buffer)

  const pdf = latex(req.body.source)

  res.contentType('application/pdf')
  pdf.pipe(res)
  pdf.on('error', () => {
    res.send(empty_buffer)
    log(req, true)
  })
  pdf.on('end', () => log(req, false))
})

const examples_directory = path.resolve(__dirname, 'examples')
const get_examples = () => fs.readdir(examples_directory)

app.get('/examples', async (req, res) => {
  res.send(await get_examples())
})

app.get('/examples/:file', async (req, res) => {
  const examples = await get_examples()
  if (!examples.includes(req.params.file)) return res.sendStatus(403)
  res.sendFile(path.join(examples_directory, req.params.file))
})

const PORT = 8080
app.listen(PORT, () => console.log(`Starting at http://localhost:${PORT}`))
