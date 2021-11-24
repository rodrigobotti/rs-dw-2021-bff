
const api = Object.freeze({
  host: process.env.API_HOST ?? '0.0.0.0',
  port: parseInt(process.env.API_PORT ?? 3000, 10),
})

module.exports = Object.freeze({
  api,
})
