require( 'dotenv' ).config();
const config = require( '../../../config.json' );
const fs = require( 'fs' );
const chalk = require( 'chalk' );
const Users = require( '../../../models/BotUser.js' );
const duration = require( '../../../functions/duration.js' );
const express = require( 'express' );
const router = express.Router();
const jwt = require( 'jsonwebtoken' );
const ENV = process.env;
const bot = ( ENV.BOT_USERNAME || 'Server' );
const endpoint = 'https://discord.com/api/v10';
const clientID = ( ENV.CLIENT_ID || config.clientId );
const CLIENT_SECRET = ENV.secret;
const verUserDB = config.verUserDB;
const strScript = chalk.hex( '#FFA500' ).bold( './routes/auth/discord/index.js' );
const REDIRECT_URI = 'http://node34.lunes.host:' + ( ENV.PORT || 3000 ) + '/auth/discord/callback';

router.get( '/login', ( req, res ) => {
  res.redirect( 'https://discord.com/oauth2/authorize?client_id=' + clientID + '&response_type=code&redirect_uri=' + encodeURIComponent( REDIRECT_URI ) + '&scope=guilds+identify' );
} );
router.get( '/signin', ( req, res ) => {
  res.redirect( 'https://discord.com/oauth2/authorize?client_id=' + clientID + '&response_type=code&redirect_uri=' + encodeURIComponent( REDIRECT_URI ) + '&scope=guilds+identify' );
} );

router.get( '/callback', async ( req, res ) => {
  const { code } = req.query;
  if ( !code ) { return res.status( 400 ).json( { error: 'Authentication "code" not found in URL parameters.' } ); }
/* TRON */console.log( 'new URLSearchParams( {} ).toString(): %o', endpoint + '/oauth2/token?' + new URLSearchParams( { client_id: clientID, client_secret: CLIENT_SECRET, code, grant_type: 'authorization_code', redirect_uri: REDIRECT_URI } ).toString() );/* TROFF */
  const oauthRes = await fetch( 'https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams( {
      client_id: clientID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    } ).toString()
  } );

  if ( !oauthRes.ok ) {
    var errAuth;
    switch ( oauthRes.status ) {
      case 400:// Bad Request
      case 401:// Unauthorized
        errAuth = oauthRes.headers.get( 'www-authenticate' );
      case 405:// Method Not Allowed
        console.error( '(%i) %s: Fatal error - please check code in %s:\n\toauthRes: %o', oauthRes.status, oauthRes.statusText, strScript, oauthRes );
        if ( errAuth ) { console.error( 'errAuth: %o', errAuth ); }
        return res.send( '(' + oauthRes.status + ') ' + oauthRes.statusText + ': Something is wrong with my code, my developer has been notified.' );
        break;
      case 403:// Forbidden
        console.error( '(%i) %s: Fatal error:\n\toauthRes: %o', oauthRes.status, oauthRes.statusText, oauthRes );
        return res.send( 'Unable to connect to Discord servers.' );
        break;
      case 429:// Too Many Requests // Rate Limited
        let msNextTry = ( parseInt( oauthRes.headers.get( 'retry-after' ) ) * 1000 );
        console.error( '(%i) %s: Please try again in %s', oauthRes.status, oauthRes.statusText, await duration( msNextTry, { getDays: false, getSeconds: true, getMs: true }, true ) );
        return res.send( 'Too many requests, please try again in ' + await duration( msNextTry, { getDays: false, getSeconds: true } ) );
        break;
      case 404:// Not Found
      case 502:// Gateway Unavailable
        console.error( '(%i) %s: Please try again later:\n\toauthRes: %o', oauthRes.status, oauthRes.statusText, oauthRes );
        return res.send( 'Unable to connect to Discord servers, please try again later...' );
        break;
      default:
        console.error( 'Failed to fetch tokens: %o', oauthRes );
        return res.send( 'Failed to fetch tokens.' );
    }
  }

  const oauthResJson = await oauthRes.json();

  const userRes = await fetch( endpoint + '/users/@me', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: oauthResJson.token_type + ' ' + oauthResJson.access_token
    },
  } );

  if ( !userRes.ok ) {
    switch ( userRes.status ) {
      case 400:// Bad Request
      case 401:// Unauthorized
      case 405:// Method Not Allowed
        console.error( '(%i) %s: Fatal error - please check code in %s:\n\tuserRes: %o', userRes.status, userRes.statusText, strScript, userRes );
        return res.send( '(' + userRes.status + ') ' + userRes.statusText + ': Something is wrong with my code, my developer has been notified.' );
        break;
      case 403:// Forbidden
        console.error( '(%i) %s: Fatal error:\n\tuserRes: %o', userRes.status, userRes.statusText, userRes );
        return res.send( 'Unable to connect to Discord servers.' );
        break;
      case 404:// Not Found
      case 502:// Gateway Unavailable
        console.error( '(%i) %s: Please try again later:\n\tuserRes: %o', userRes.status, userRes.statusText, userRes );
        return res.send( 'Unable to connect to Discord servers, please try again later...' );
        break;
      default:
        console.error( 'Failed to fetch user: %o', userRes );
        return res.send( 'Failed to fetch user.' );
    }
  }

  const userResJson = await userRes.json();

  let user = await Users.findOne( { _id: userResJson.id } );

  if ( !user ) {
    user = new BotUser( {
      _id: userResJson.id,
      Auths: { Discord: {
        accessToken: oauthResJson.access_token,
        expiresIn: oauthResJson.expires_in,
        refreshToken: oauthResJson.refresh_token,
        tokenType: oauthResJson.token_type
      } },
      Avatar: { hash: userResJson.avatar },
      Bot: ( oauthResJson.bot || false ),
      Guilds: [],
      Score: 0,
      UserName: userResJson.username,
      Version: verUserDB
    } );
  }
  else {
    user.Auths.Discord.accessToken = oauthResJson.access_token;
    user.Auths.Discord.expiresIn = oauthResJson.expires_in;
    user.Auths.Discord.refreshToken = oauthResJson.refresh_token;
    user.Auths.Discord.tokenType = oauthResJson.token_type;
  }

  await Users.findOneAndUpdate( { _id: userResJson.id }, user, { upsert: true } )
  .catch( errUpdate => { console.error( 'Failed to add/update user to/in database: %s', errUpdate.stack ); } );

} );

router.get( '/logout', ( req, res ) => { res/*.clearCookie( 'token' )*/.sendStatus( 200 ); } );
router.get( '/signout', ( req, res ) => { res/*.clearCookie( 'token' )*/.sendStatus( 200 ); } );

module.exports = router;