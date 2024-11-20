const fs = require( 'fs' );
const { Client, GatewayIntentBits, Partials, Collection } = require( 'discord.js' );
require( 'dotenv' ).config();
const ENV = process.env;
const config = require( './config.json' );
const keepAlive = require( './functions/server.js' );
const initDatabase = require( './functions/database.js' );

initDatabase();

const client = new Client( {
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [ Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction ]
} );

/* -------------------- COLLECTIONS -------------------- */
client.aliases = new Collection();
client.commands = new Collection();
client.groups = new Collection();
client.events = new Collection();
client.prefix = config.prefix;
client.slashCommands = new Collection();

/* ------------------ STATIC COMMANDS ------------------ */
var staticCmds = [];
if ( config.staticCmds ) { staticCmds.concat( config.staticCmds ); }
staticCmds.push( 'admin' );
client.groups.set( 'staticCmds', staticCmds );

client.ownerId = ( config.botOwnerId || ENV.OWNER_ID );

module.exports = client;

fs.readdirSync( './handlers' ).forEach( ( handler ) => {
  require( `./handlers/${handler}` )( client );
} );

client.login( ENV.token )
.then( async loggedIn => { console.log( 'Successfully connected!' ); } )
.catch( errLogin => { console.error( 'There was an error logging in:\n%s', errLogin.stack ); } );

keepAlive();