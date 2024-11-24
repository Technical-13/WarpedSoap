require( 'dotenv' ).config();
const { availableMemory, constrainedMemory, env: ENV, uptime, version } = process;
const fs = require( 'fs' );
const cheerio = require( 'cheerio' );
const express = require( 'express' );
const router = express.Router();
const htmlHome = fs.readFileSync( './web/home.html' );
const { packages } = require( '../../package-lock.json' );
const objTimeString = require( '../../jsonObjects/time.json' );
const duration = require( '../../functions/duration.js' );

router.get( '/', async ( req, res ) => {
  const botVers = [
    'node: ' + version,
    'djs: v' + packages[ "node_modules/discord.js" ].version,
    'mongoose: v' + packages[ "node_modules/mongoose" ].version,
    'express: v' + packages[ "node_modules/express" ].version,
    'axios: v' + packages[ "node_modules/axios" ].version,
    'cheerio: v' + packages[ "node_modules/cheerio" ].version
  ];
  const bot = ( ENV.BOT_USERNAME || 'Server' );
  const usedMemory = constrainedMemory() - availableMemory();
  const memPercent = Math.floor( usedMemory / constrainedMemory() * 1000 ) / 10;
  const msServer = ( new Date() ) - ( ( new Date() ) - Math.floor( uptime() * 1000 ) );
  const upServer = await duration( msServer, { getMonths: true, getWeeks: true, getSeconds: true } );
  new Promise( async ( resolve, reject ) => {
    const pageHome = cheerio.loadBuffer( htmlHome );
    pageHome( 'title' ).text( bot );
    pageHome( 'h1' ).text( bot );
    let status = '';
    switch ( ENV.clientStatus ) {
      case 'starting': status='Initializing'; break;
      case 'connected': status='Connected'; break;
      case 'ready': status='Ready'; break;
      case 'crashed': status='Crashed'; break;
      default: status='Unknown';
    }
    pageHome( '#alist' ).append( '<li>Status: ' + status + '</li>' );
    pageHome( '#alist' ).append( '<li>Uptime: ' + upServer + '</li>' );
    pageHome( '#alist' ).append( '<li>Memory Usage: ' + memPercent + '%</li>' );
    pageHome( '#alist' ).append( '<li>Verbosity Level: ' + ENV.VERBOSITY + '</li>' );
    pageHome( '#alist' ).append( '<li>Package Versions: <ul>\n\t<li>' + botVers.join( '</li>\n\t<li>' ) + '</li>\n</ul></li>' );
    pageHome( '#alist' ).append( '<li>Last restart: ' + ( new Date( ( new Date() ) - Math.floor( uptime() * 1000 ) ) ).toLocaleDateString( 'en-us', objTimeString ) + '</li>' );
    pageHome( '#about' ).toggleClass( 'hidden' );
    resolve( pageHome.html() );
  } )
  .then( ( pageHTML ) => { res.send( pageHTML ); } );
} );

module.exports = router;