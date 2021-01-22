// ==========================================
// Server
//
// This file contains all of the code necessary for managing a
// WebCraft server on the Node.js platform.
// ==========================================

// Parameters
var WORLD_SX = 128;
var WORLD_SY = 128;
var WORLD_SZ = 32;
var WORLD_GROUNDHEIGHT = 16;
var SECONDS_BETWEEN_SAVES = 60; // The interval between games saves
var ADMIN_IP = "::ffff:172.18.0.1"; // deprecated, use ADMIN_PASSWORD instead
var ADMIN_PASSWORD = "Pwd"; // set this to whatever you would like the password to be (no spaces, make sure to follow JS syntax rules.)
var ADMIN_NICKNAMES = [""]; // do not change this value

// Load modules
var modules = {};
modules.helpers = require( "./js/helpers.js" );
modules.blocks = require( "./js/blocks.js" );
modules.world = require( "./js/world.js" );
modules.network = require( "./js/network.js" );
modules.io = require( "socket.io" );
modules.fs = require( "fs" );
var log = require( "util" ).log;
const prompt = require('prompt');

// Set-up evil globals
global.Vector = modules.helpers.Vector;
global.BLOCK = modules.blocks.BLOCK;

// Create new empty world or load one from file
var world = new modules.world.World( WORLD_SX, WORLD_SY, WORLD_SZ );
log( "Creating world..." );
if ( world.loadFromFile( "world" ) ) {
	log( "Loaded the world from file." );
} else {
	log( "Creating a new empty world." );
	world.createFlatWorld( WORLD_GROUNDHEIGHT );
	world.saveToFile( "world" );
}

// Start server
var server = new modules.network.Server( modules.io, 16 );
server.setWorld( world );
server.setLogger( log );
server.setOneUserPerIp( true );
log( "Waiting for clients..." );

// Chat commands
server.on( "chat", function( client, nickname, msg )
{
	if ( msg == "/spawn" ) {
		server.setPos( client, world.spawnPoint.x, world.spawnPoint.y, world.spawnPoint.z );
		return true;
	} else if ( msg.substr( 0, 3 ) == "/tp" ) {
		var target = msg.substr( 4 );
		target = server.findPlayerByName( target );
		
		if ( target != null ) {
				server.setPos( client, target.x, target.y, target.z );
				server.sendMessage( nickname + " was teleported to " + target.nick + "." );
				return true;
		} else {
			server.sendMessage( "Couldn't find that player!", client );
			return false;
		}
	} else if ( msg == "/list" ) {
      var playerlist = "";
      for ( var p in world.players )
        playerlist += p + ", ";
      playerlist = playerlist.substring( 0, playerlist.length - 2 );
      server.sendMessage( "Players: " + playerlist, client );
      return true;
    }else if(msg == "/save"){
      world.saveToFile( "world" );
	    console.log( "Saved world to file, invoked by user: " + nickname );
      server.sendMessage("World saved.");
      return true;
    }else if(msg == "/clean"){
      console.log("World deleted.")
      modules.fs.unlinkSync("world");
      console.log("World deleted.")
      process.exit();

    } else if (msg == "/help"){
      server.sendMessage("/spawn = Sets the spawnpoint at the current player");
      server.sendMessage("/tp <nickname> = Teleport to any player");
      server.sendMessage("/list = Lists all players connected to this server");
      server.sendMessage("/save = Save the game");

      return true;
    } else if ( msg.substr( 0, 1 ) == "/" ) {
      server.sendMessage( "Unknown command!", client );
      return false;
    }
} );

// Send a welcome message to new clients
server.on( "join", function( client, nickname )
{
	server.sendMessage( "Welcome! Enjoy your stay, " + nickname + "!", client );
	server.broadcastMessage( nickname + " joined the game.", client );
} );

// And let players know of a disconnecting user
server.on( "leave", function( nickname )
{
	server.sendMessage( nickname + " left the game." );
  
} );

// Periodical saves
setInterval( function()
{
	world.saveToFile( "world" );
	log( "Saved world to file." );
}, SECONDS_BETWEEN_SAVES * 1000 );