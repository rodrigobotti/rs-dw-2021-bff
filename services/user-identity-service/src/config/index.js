const { readFileSync } = require('fs')
const { join } = require('path')

const api = Object.freeze({
  host: process.env.API_HOST ?? '0.0.0.0',
  port: parseInt(process.env.API_PORT ?? 3000, 10),
})

const jwt = Object.freeze({
  privateKey: readFileSync(join(__dirname, 'private.pem')),
  publicKey: readFileSync(join(__dirname, 'public.pem')),
  expiration: '1d',
  algorithm: 'RS256',
})

module.exports = Object.freeze({
  api,
  jwt,
})
