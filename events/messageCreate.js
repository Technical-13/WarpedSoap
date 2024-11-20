const client = require( '..' );
const { EmbedBuilder, Collection, PermissionsBitField } = require( 'discord.js' );
const ms = require( 'ms' );
const chalk = require( 'chalk' );
const cooldown = new Collection();
const userPerms = require( '../functions/getPerms.js' );
const botVerbosity = client.verbosity;
const strScript = chalk.hex( '#FFA500' ).bold( './events/messageCreate.js' );
const getDebugString = ( thing ) => {
  if ( Array.isArray( thing ) ) { return '{ object-Array: { length: ' + thing.length + ' } }'; }
  else if ( Object.prototype.toString.call( thing ) === '[object Date]' ) { return '{ object-Date: { ISOstring: ' + thing.toISOString() + ', value: ' + thing.valueOf() + ' } }'; }
  else if ( typeof( thing ) != 'object' ) { return thing; }
  else {
    let objType = ( thing ? 'object-' + thing.constructor.name : typeof( thing ) );
    let objId = ( thing ? thing.id : 'no.id' );
    let objName = ( thing ? ( thing.displayName || thing.globalName || thing.name ) : 'no.name' );
    return '{ ' + objType + ': { id: ' + objId + ', name: ' + objName + ' } }';
  }
};

client.on( 'messageCreate', async ( message ) => {
  try {
    const { applicationId, authorId, webhookId } = message.toJSON();
    if ( !applicationId && webhookId === authorId ) return;//It's a webhook
    const { author, channel, content, guild, mentions } = message;
    const members = guild.members.cache;
    if ( channel.type !== 0 ) return;//Not a text channel within a guild
    if ( author.bot ) return;//It's a bot application
    const { clientId, botOwner, prefix, isBotOwner, isBotMod, isGlobalWhitelisted, isBlacklisted, isGuildBlacklisted } = await userPerms( author, guild );
    const bot = client.user;

    const hasPrefix = ( content.startsWith( prefix ) || content.startsWith( '§' ) );
    const meMentionPrefix = '<@' + clientId + '>';
    const mePrefix = content.startsWith( meMentionPrefix );
    const mentionsMe = mentions.users.has( clientId );
    var args = [];
    if ( hasPrefix ) { args = content.slice( prefix.length ).trim().split( / +/g ); }
    else if ( mePrefix ) {
      args = content.slice( meMentionPrefix.length ).trim().split( / +/g );
      if ( args[ 0 ].startsWith( prefix ) ) {
        args[ 0 ] = args[ 0 ].slice( prefix.length ).trim();
        if ( args[ 0 ].length == 0 ) { args = args.shift(); }
      }
    }
    const cmd = ( args.shift() || [] );
    if ( cmd.length != 0 ) {
      let command = client.commands.get( cmd.toLowerCase() );
      if ( !command ) command = client.commands.get( client.aliases.get( cmd ) );

      if ( isBlacklisted && !isGlobalWhitelisted ) {
        return message.reply( { content: 'You\'ve been blacklisted from using my commands' + ( isGuildBlacklisted ? ' in the **`' + guild.name + '`** server.' : '.' ) } );
      }
      else if ( command ) {
        const isOwnerOnly = command.ownerOnly;
        const isModOnly = command.modOnly;
        if ( isOwnerOnly && !isBotOwner ) {
          if ( isBotMod ) { return message.reply( { content: `That is an **owner only command**, speak to <@${botOwner.id}>.` } ); }
          else { /* DO NOTHING */ }
        }
        else if ( isModOnly && !isBotMod ) { /* DO NOTHING */ }
        else {
          if ( command.cooldown ) {
            if ( cooldown.has( `${command.name}${author.id}` ) ) {
              return channel.send( { content: `You are on \`${ms(cooldown.get(`${command.name}${author.id}`) - Date.now(), {long : true})}\` cooldown!` } );
            }
            if ( command.userPerms || command.botPerms ) {
              if ( !message.member.permissions.has( PermissionsBitField.resolve( command.userPerms || [] ) ) ) {
                const userPerms = new EmbedBuilder()
                .setDescription( `🚫 ${author}, You don't have \`${command.userPerms}\` permissions to use this command!` )
                .setColor( 'Red' )
                return message.reply( { embeds: [ userPerms ] } );
              }
              if ( !objGuildMembers.get( bot.id ).permissions.has( PermissionsBitField.resolve( command.botPerms || [] ) ) ) {
                const botPerms = new EmbedBuilder()
                .setDescription( `🚫 ${author}, I don't have \`${command.botPerms}\` permissions to use this command!` )
                .setColor( 'Red' )
                return message.reply( { embeds: [ botPerms ] } );
              }
            }

            command.run( client, message, args );
            cooldown.set( `${command.name}${author.id}`, Date.now() + command.cooldown );
            setTimeout( () => { cooldown.delete( `${command.name}${author.id}` ) }, command.cooldown );
          }
          else {
            if ( command.userPerms || command.botPerms ) {
              if ( !message.member.permissions.has( PermissionsBitField.resolve( command.userPerms || [] ) ) ) {
                const userPerms = new EmbedBuilder()
                .setDescription( `🚫 ${message.author}, You don't have \`${command.userPerms}\` permissions to use this command!` )
                .setColor( 'Red' )
                return message.reply( { embeds: [userPerms] } );
              }

              if ( !objGuildMembers.get( bot.id ).permissions.has( PermissionsBitField.resolve( command.botPerms || [] ) ) ) {
                const botPerms = new EmbedBuilder()
                .setDescription( `🚫 ${author}, I don't have \`${command.botPerms}\` permissions to use this command!` )
                .setColor( 'Red' )
                return message.reply( { embeds: [ botPerms ] } );
              }
            }
            command.run( client, message, args );
          }
        }
      }
    }
  }
  catch ( errObject ) {
    const { author, channel, content, guild } = message;
    console.error( 'Uncaught error in %s:\n\t%s\n\tI was processing a message from %s in https://discord.com/channels/%s/%s\n%s\n-----',
    strScript, errObject.stack, getDebugString( author ), guild.id, channel.id, content );
  }
} );