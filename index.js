#!/usr/bin/env node
var argv = require('yargs')
.usage('Send bitcoin when the wallet balance exceeds max\n' +
'Usage: $0 -u [uri] -d [destination] -m [max balance] -n [min balance]')
.demand(['u', 'd', 'm', 'n'])
.default('interval', 10)
.count('v')
.describe('s', 'do not actually send')
.describe('u', 'uri as bitcoin:user:pass@host')
.describe('m', 'send when over this')
.describe('n', 'lower balance limit')
.describe('i', 'interval in seconds')
.describe('d', 'send to this Bitcoin address')
.alias('s', 'simulate')
.alias('i', 'interval')
.alias('u', 'uri')
.alias('d', 'destination')
.alias('m', 'max')
.alias('n', 'min')
.alias('v', 'verbose')
.argv

function warn() { argv.v >= 0 && console.log.apply(console, arguments) }
function info() { argv.v >= 1 && console.log.apply(console, arguments) }
function debug() { argv.v >= 2 && console.log.apply(console, arguments) }

var BitcoinClient = require('bitcoin').Client
var uri = require('url').parse(argv.uri)
var bitcoin = new BitcoinClient({
    host: uri.hostname,
    port: uri.port,
    user: uri.auth.split(':')[0],
    pass: uri.auth.split(':')[1]
})

var stopping, timer

function tick() {
    function done(err) {
        if (err) console.error(err)
        if (stopping) return process.exit()
        timer = setTimeout(tick, argv.interval * 1e3)
    }

    timer = null
    debug('ticking...')

    bitcoin.getBalance(function(err, balance) {
        if (err) return done(err)
        info('balance: %s', balance)
        if (balance < argv.max) {
            info('balance is below max (%s)', argv.max)
            return done()
        }
        var size = (+balance - argv.min).toFixed(8)
        info('will send %s', size)
        if (argv.simulate) {
            warn('will not send when simulate is enabled')
            return done()
        }
        bitcoin.sendToAddress(argv.destination, size, function(err, hash) {
            if (err) return done(err)
            console.log('Sent %s to %s: %s', size, argv.destination, hash)
            done()
        })
    })
}

function stop() {
    info('stop requested')
    if (timer) return process.exit()
    stopping = true
}

tick()

process.on('SIGTERM', stop)
process.on('SIGINT', stop)

