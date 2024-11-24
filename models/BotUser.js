const { model, Schema } = require( 'mongoose' );

let userSchema = new Schema( {
  _id: String,
  Auths: {
    Discord: {
      accessToken: String,
      expiresIn: Number,
      refreshToken: String,
      tokenType: String,
      scopes: [ String ]
    }
  },
  Avatar: {
    hash: String,
    placholder: String,
    url: String
  },
  Bot: Boolean,
  Guilds: [ {
    _id: String,
    Corrections: [ {
      ByID: String,
      ByName: String,
      Duration: String,
      StartedAt: Date,
      Type: { type: String }
    } ],
    Expires: Date,
    GuildName: String,
    MemberName: String,
    Roles: [ String ],
    Score: Number
  } ],
  Guildless: Date,
  Score: Number,
  UserName: String,
  Version: Number
}, { timestamps: true } );

module.exports = model( 'BotUser', userSchema );